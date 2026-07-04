import { Type, type GoogleGenAI, type Schema } from "@google/genai";
import { withGeminiRetry } from "@/lib/geminiRetry";
import { serviceTierConfig } from "@/lib/serviceTier";

interface VerifierContextChunk {
  readonly raw_text_payload: string;
  readonly source: string | null;
  readonly source_identifier: string | null;
}

export interface VerifierAssertion {
  readonly assertion_id: string;
  readonly text: string;
  readonly exact_source_quote: string;
  readonly source_urn: string;
}

export interface VerifierDecision {
  readonly assertion_id: string;
  readonly entailed: boolean;
  readonly reason: string;
}

const VERIFIER_MODEL = "gemini-3.5-flash";

const verifierSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    verifications: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          assertion_id: { type: Type.STRING },
          entailed: { type: Type.BOOLEAN },
          reason: { type: Type.STRING },
        },
        required: ["assertion_id", "entailed", "reason"],
      },
    },
  },
  required: ["verifications"],
};

const VERIFIER_PROMPT = `
Tu es un vérificateur clinique indépendant. Tu N'AS PAS écrit la réponse que tu
vérifies.

Pour chaque affirmation, tu reçois : le texte de l'affirmation, la citation source
exacte revendiquée, et le document source complet dont elle est tirée.

Pour CHAQUE affirmation, réponds à une seule question : le document source, lu dans
son contexte complet, soutient-il réellement le contenu clinique de cette
affirmation — le bon médicament, la bonne pathologie, le bon sous-groupe de patients,
la bonne valeur numérique ou le bon seuil ?

Rejette une affirmation seulement si l'une de ces conditions est vraie :
- elle contredit la source ;
- elle invente un chiffre, un seuil, une posologie ou une recommandation absente du
  document ;
- elle attache une citation vraie au mauvais sujet (mauvais médicament, mauvaise
  pathologie, mauvais sous-groupe de patients).

N'invalide PAS une affirmation uniquement parce qu'elle est reformulée, résumée, ou
qu'elle ajoute une nuance de style qui reste fidèle au sens clinique de la source.
Le doute raisonnable profite à l'affirmation tant que le fond clinique est exact et
correctement attribué.

Réponds UNIQUEMENT en JSON :
{"verifications": [{"assertion_id": "...", "entailed": true|false, "reason": "..."}]}
`.trim();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalize(value: string): string {
  return value.normalize("NFC").trim().toLowerCase();
}

function findSourceDocument(
  assertion: VerifierAssertion,
  contextChunks: readonly VerifierContextChunk[],
): VerifierContextChunk | null {
  const quote = normalize(assertion.exact_source_quote);
  return (
    contextChunks.find((chunk) => normalize(chunk.raw_text_payload).includes(quote)) ?? null
  );
}

function parseVerifierDecision(value: unknown): VerifierDecision | null {
  if (!isRecord(value)) {
    return null;
  }
  const assertionId = value["assertion_id"];
  const entailed = value["entailed"];
  const reason = value["reason"];
  if (typeof assertionId !== "string" || typeof entailed !== "boolean") {
    return null;
  }
  return {
    assertion_id: assertionId,
    entailed,
    reason: typeof reason === "string" ? reason : "",
  };
}

export async function verifyClinicalAssertions(
  aiStudio: GoogleGenAI,
  assertions: readonly VerifierAssertion[],
  contextChunks: readonly VerifierContextChunk[],
): Promise<readonly VerifierDecision[]> {
  if (assertions.length === 0) {
    return [];
  }

  const verifierInput = assertions.map((assertion) => {
    const sourceDocument = findSourceDocument(assertion, contextChunks);
    return {
      assertion_id: assertion.assertion_id,
      affirmation: assertion.text,
      citation_source_revendiquer: assertion.exact_source_quote,
      source_urn: assertion.source_urn,
      document_source_complet: sourceDocument?.raw_text_payload ?? "",
      document_source_identifier: sourceDocument?.source_identifier ?? null,
      document_source_title: sourceDocument?.source ?? null,
    };
  });

  const response = await withGeminiRetry(() => aiStudio.models.generateContent({
    model: VERIFIER_MODEL,
    contents: JSON.stringify({ assertions: verifierInput }, null, 2),
    config: {
      ...serviceTierConfig(),
      systemInstruction: VERIFIER_PROMPT,
      responseMimeType: "application/json",
      responseSchema: verifierSchema,
      temperature: 0.0,
    },
  }));

  const parsed = JSON.parse(response.text ?? "{}") as unknown;
  if (!isRecord(parsed) || !Array.isArray(parsed["verifications"])) {
    throw new Error("Verifier returned invalid JSON.");
  }

  const decisions = parsed["verifications"]
    .map(parseVerifierDecision)
    .filter((decision): decision is VerifierDecision => decision !== null);
  const decisionIds = new Set(decisions.map((decision) => decision.assertion_id));
  const missingDecisions = assertions.filter((assertion) => !decisionIds.has(assertion.assertion_id));

  return [
    ...decisions,
    ...missingDecisions.map((assertion) => ({
      assertion_id: assertion.assertion_id,
      entailed: false,
      reason: "Aucune decision du verificateur pour cette affirmation.",
    })),
  ];
}
