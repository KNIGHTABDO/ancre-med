import { GoogleGenAI, Type, type Schema } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

const GENERATION_MODEL = "gemini-3.1-flash-lite";
const ATTRIBUTION_CONFIDENCE_THRESHOLD = 0.85;
const MINIMUM_VERIFIED_ASSERTION_RATIO = 0.7;

const medicalResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    sujet_titre: {
      type: Type.STRING,
      description:
        "Un titre très court de 3 à 5 mots en français résumant le sujet médical de la question et de la réponse (ex: 'Avis HAS PREVENAR 20').",
    },
    reponse_clinique: {
      type: Type.STRING,
      description:
        "La réponse finale claire, rédigée exclusivement en français médical à destination de l'étudiant.",
    },
    thinking_trace_fr: {
      type: Type.STRING,
      description:
        "Le cheminement clinique interne, étape par étape, justifiant les choix thérapeutiques et diagnostiques.",
    },
    clinical_assertions: {
      type: Type.ARRAY,
      description:
        "Extraction atomique de chaque affirmation médicale, dosage ou diagnostic posé pour vérification d'attribution.",
      items: {
        type: Type.OBJECT,
        properties: {
          assertion_id: {
            type: Type.STRING,
          },
          text_claim: {
            type: Type.STRING,
            description:
              "La déclaration médicale précise, par exemple un dosage, un diagnostic ou une conduite à tenir.",
          },
          associated_source_urn: {
            type: Type.STRING,
            description:
              "Le titre ou l'identifiant de la source injectée validant ce fait.",
          },
          exact_source_quote: {
            type: Type.STRING,
            description:
              "La citation mot à mot extraite du contexte fourni qui prouve l'affirmation.",
          },
          confidence_score: {
            type: Type.NUMBER,
            description:
              "Calcul de certitude d'alignement logique entre 0 et 1.",
          },
        },
        required: [
          "assertion_id",
          "text_claim",
          "associated_source_urn",
          "exact_source_quote",
          "confidence_score",
        ],
      },
    },
  },
  required: ["reponse_clinique", "thinking_trace_fr", "clinical_assertions", "sujet_titre"],
};

interface GenerateRequestBody {
  query: string;
  retrievedContext: RetrievedContextChunk[];
}

interface RetrievedContextChunk {
  index: number;
  raw_text_payload: string;
  original_text: string;
  source: string | null;
  source_identifier: string | null;
  page: number | null;
  date: string | null;
  silo: string | null;
}

interface ClinicalAssertion {
  assertion_id: string;
  text_claim: string;
  associated_source_urn: string;
  exact_source_quote: string;
  confidence_score: number;
}

interface MedicalResponsePayload {
  sujet_titre: string;
  reponse_clinique: string;
  thinking_trace_fr: string;
  clinical_assertions: ClinicalAssertion[];
}

interface VerificationResult {
  verifiedAssertions: ClinicalAssertion[];
  droppedAssertions: ClinicalAssertion[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function getRequiredEnv(key: "GEMINI_API_KEY"): string {
  const value = process.env[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value.trim();
}

function readStringField(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readNumberField(record: Record<string, unknown>, key: string): number | null {
  const value = record[key];
  return isFiniteNumber(value) ? value : null;
}

function extractPrefixedTitle(text: string): string | null {
  const marker = " | text: ";
  if (!text.startsWith("title: ")) {
    return null;
  }

  const markerIndex = text.indexOf(marker);
  if (markerIndex === -1) {
    return null;
  }

  const title = text.slice("title: ".length, markerIndex).trim();
  return title.length > 0 && title !== "none" ? title : null;
}

function isolateRawTextPayload(text: string): string {
  const marker = " | text: ";
  const markerIndex = text.indexOf(marker);
  if (text.startsWith("title: ") && markerIndex !== -1) {
    return text.slice(markerIndex + marker.length).trim();
  }
  return text.trim();
}

function readTextFromContextRecord(record: Record<string, unknown>): string | null {
  const directText = readStringField(record, "text") ?? readStringField(record, "text_content");
  if (directText !== null) {
    return directText;
  }

  const payload = record["payload"];
  if (isRecord(payload)) {
    return readStringField(payload, "text") ?? readStringField(payload, "text_content");
  }

  return null;
}

function parseRetrievedContextChunk(value: unknown, index: number): RetrievedContextChunk {
  if (typeof value === "string") {
    const rawTextPayload = isolateRawTextPayload(value);
    if (rawTextPayload.length === 0) {
      throw new Error(`Retrieved context chunk ${index} is empty.`);
    }

    return {
      index,
      raw_text_payload: rawTextPayload,
      original_text: value,
      source: extractPrefixedTitle(value),
      source_identifier: null,
      page: null,
      date: null,
      silo: null,
    };
  }

  if (!isRecord(value)) {
    throw new Error(`Retrieved context chunk ${index} must be an object or string.`);
  }

  const text = readTextFromContextRecord(value);
  if (text === null) {
    throw new Error(`Retrieved context chunk ${index} is missing text content.`);
  }

  const rawTextPayload = isolateRawTextPayload(text);
  if (rawTextPayload.length === 0) {
    throw new Error(`Retrieved context chunk ${index} has an empty text payload.`);
  }

  return {
    index,
    raw_text_payload: rawTextPayload,
    original_text: text,
    source:
      readStringField(value, "source") ??
      readStringField(value, "origin_title") ??
      extractPrefixedTitle(text),
    source_identifier: readStringField(value, "source_identifier"),
    page: readNumberField(value, "page") ?? readNumberField(value, "page_number"),
    date: readStringField(value, "date") ?? readStringField(value, "regulatory_date"),
    silo: readStringField(value, "silo") ?? readStringField(value, "category_silo"),
  };
}

function parseGenerateRequestBody(value: unknown): GenerateRequestBody {
  if (!isRecord(value)) {
    throw new Error("Request body must be a JSON object.");
  }

  const query = readStringField(value, "query") ?? readStringField(value, "prompt");
  if (query === null) {
    throw new Error("Request body must include a non-empty 'query' string.");
  }

  const rawContext =
    value["retrievedContext"] ?? value["retrieved_context"] ?? value["injected_context"];
  if (!Array.isArray(rawContext) || rawContext.length === 0) {
    throw new Error("Request body must include a non-empty retrieved context array.");
  }

  return {
    query,
    retrievedContext: rawContext.map((chunk, index) =>
      parseRetrievedContextChunk(chunk, index),
    ),
  };
}

function normalizeForIncludes(value: string): string {
  return value.normalize("NFC").trim().toLowerCase();
}

function verificationCorpus(contextChunks: RetrievedContextChunk[]): string {
  return contextChunks
    .map((chunk) => normalizeForIncludes(chunk.raw_text_payload))
    .join("\n\n");
}

function parseClinicalAssertion(value: unknown, index: number): ClinicalAssertion {
  if (!isRecord(value)) {
    throw new Error(`clinical_assertions[${index}] must be an object.`);
  }

  const assertionId = readStringField(value, "assertion_id");
  const textClaim = readStringField(value, "text_claim");
  const associatedSourceUrn = readStringField(value, "associated_source_urn");
  const exactSourceQuote = readStringField(value, "exact_source_quote");
  const confidenceScore = value["confidence_score"];

  if (
    assertionId === null ||
    textClaim === null ||
    associatedSourceUrn === null ||
    exactSourceQuote === null ||
    !isFiniteNumber(confidenceScore)
  ) {
    throw new Error(`clinical_assertions[${index}] does not match the required schema.`);
  }

  return {
    assertion_id: assertionId,
    text_claim: textClaim,
    associated_source_urn: associatedSourceUrn,
    exact_source_quote: exactSourceQuote,
    confidence_score: confidenceScore,
  };
}

function parseMedicalResponsePayload(value: unknown): MedicalResponsePayload {
  if (!isRecord(value)) {
    throw new Error("Gemini response JSON must be an object.");
  }

  const sujetTitre = readStringField(value, "sujet_titre");
  const reponseClinique = readStringField(value, "reponse_clinique");
  const thinkingTraceFr = readStringField(value, "thinking_trace_fr");
  const clinicalAssertions = value["clinical_assertions"];

  if (
    sujetTitre === null ||
    reponseClinique === null ||
    thinkingTraceFr === null ||
    !Array.isArray(clinicalAssertions)
  ) {
    throw new Error("Gemini response JSON does not match the medical response schema.");
  }

  return {
    sujet_titre: sujetTitre,
    reponse_clinique: reponseClinique,
    thinking_trace_fr: thinkingTraceFr,
    clinical_assertions: clinicalAssertions.map((assertion, index) =>
      parseClinicalAssertion(assertion, index),
    ),
  };
}

function parseGeminiJson(text: string): MedicalResponsePayload {
  try {
    return parseMedicalResponsePayload(JSON.parse(text));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown JSON parsing failure.";
    throw new Error(`Unable to parse structured Gemini response: ${message}`);
  }
}

function runAttributionGate(
  payload: MedicalResponsePayload,
  contextChunks: RetrievedContextChunk[],
): VerificationResult {
  const corpus = verificationCorpus(contextChunks);
  const verifiedAssertions: ClinicalAssertion[] = [];
  const droppedAssertions: ClinicalAssertion[] = [];

  for (const assertion of payload.clinical_assertions) {
    const quote = normalizeForIncludes(assertion.exact_source_quote);
    const quoteExistsInRetrievedText = quote.length > 0 && corpus.includes(quote);
    const scorePassesThreshold =
      assertion.confidence_score >= ATTRIBUTION_CONFIDENCE_THRESHOLD;

    if (quoteExistsInRetrievedText && scorePassesThreshold) {
      verifiedAssertions.push(assertion);
    } else {
      droppedAssertions.push(assertion);
    }
  }

  return { verifiedAssertions, droppedAssertions };
}

function shouldRejectAttribution(result: VerificationResult, totalAssertions: number): boolean {
  if (totalAssertions === 0) {
    return true;
  }

  if (result.verifiedAssertions.length === 0) {
    return true;
  }

  return result.verifiedAssertions.length / totalAssertions < MINIMUM_VERIFIED_ASSERTION_RATIO;
}

function buildSystemInstruction(isConversational: boolean): string {
  if (isConversational) {
    return `
Act as a friendly, professional medical student assistant. Your objective is to respond to casual user messages, greetings, thank yous, and goodbyes.
Answer directly, politely, and briefly in French. Do not make any complex clinical or pharmacological claims.
Return only JSON matching the declared schema. You can leave 'clinical_assertions' as an empty array [].
`.trim();
  }

  return `
Act as an elite professor of medicine in a French faculty. Your primary objective is to resolve clinical inquiries or academic cases with zero structural mistakes.
You are provided only with verified context fragments retrieved from French medical knowledge silos: HAS recommendations, ANSM/BDPM pharmacological registries, and official Collèges des Enseignants materials.

CRITICAL INSTRUCTIONS:
1. Ground the entire response exclusively within the provided context chunks.
2. If an assertion cannot be directly proven by the injected French source text, do not generate it.
3. Execute the clinical reasoning steps natively in French inside the 'thinking_trace_fr' schema field.
4. Avoid hidden English translation, US-centric defaults, DSM/ACC/AHA substitutions, or non-French guideline assumptions unless the source context explicitly provides them.
5. For every clinical assertion, provide an exact_source_quote copied from the injected raw text payload, not from the asymmetric title prefix.
6. Return only JSON matching the declared schema.
7. Format 'reponse_clinique' to be highly readable, structured, and visually engaging. Use bolding '**' to highlight key clinical terms, drug names, active substances, therapeutic statuses, and important numbers or dates. Organize recommendations into clear bullet lists or numbered steps. Avoid using markdown headers (like '#' or '##').
`.trim();
}

function buildModelPrompt(query: string, contextChunks: RetrievedContextChunk[]): string {
  const contextPayload = contextChunks.map((chunk) => ({
    context_id: `context_${chunk.index}`,
    source: chunk.source,
    source_identifier: chunk.source_identifier,
    page: chunk.page,
    regulatory_date: chunk.date,
    silo: chunk.silo,
    raw_text_payload: chunk.raw_text_payload,
  }));

  return JSON.stringify(
    {
      contexte_injecte: contextPayload,
      question_de_l_etudiant: query,
      attribution_rule:
        "Chaque exact_source_quote doit etre une sous-chaine exacte de raw_text_payload.",
    },
    null,
    2,
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown generation failure.";
}

function jsonResponse(payload: Record<string, unknown>, status: number): NextResponse {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: GenerateRequestBody;
  try {
    body = parseGenerateRequestBody(await request.json());
  } catch (error: unknown) {
    return jsonResponse({ success: false, error: errorMessage(error) }, 400);
  }

  try {
    const isConversational = body.retrievedContext.some((chunk) => chunk.silo === "chat");

    const aiStudio = new GoogleGenAI({ apiKey: getRequiredEnv("GEMINI_API_KEY") });
    const response = await aiStudio.models.generateContent({
      model: GENERATION_MODEL,
      contents: buildModelPrompt(body.query, body.retrievedContext),
      config: {
        systemInstruction: buildSystemInstruction(isConversational),
        responseMimeType: "application/json",
        responseSchema: medicalResponseSchema,
        temperature: 0.0,
      },
    });

    const responseText = response.text;
    if (typeof responseText !== "string" || responseText.trim().length === 0) {
      throw new Error("Gemini returned an empty structured response.");
    }

    const parsedPayload = parseGeminiJson(responseText);

    if (isConversational) {
      return jsonResponse(
        {
          success: true,
          model: GENERATION_MODEL,
          payload: {
            sujet_titre: parsedPayload.sujet_titre,
            reponse_clinique: parsedPayload.reponse_clinique,
            thinking_trace_fr: parsedPayload.thinking_trace_fr,
            verified_assertions: [],
            dropped_assertion_count: 0,
          },
        },
        200,
      );
    }

    const verificationResult = runAttributionGate(parsedPayload, body.retrievedContext);

    if (
      shouldRejectAttribution(
        verificationResult,
        parsedPayload.clinical_assertions.length,
      )
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "Le système a détecté une dérive factuelle potentielle. La réponse a été bloquée par la valve de revue clinique.",
          verification: {
            total_assertions: parsedPayload.clinical_assertions.length,
            verified_assertions: verificationResult.verifiedAssertions.length,
            dropped_assertions: verificationResult.droppedAssertions.length,
            minimum_confidence_score: ATTRIBUTION_CONFIDENCE_THRESHOLD,
          },
        },
        422,
      );
    }

    return jsonResponse(
      {
        success: true,
        model: GENERATION_MODEL,
        payload: {
          sujet_titre: parsedPayload.sujet_titre,
          reponse_clinique: parsedPayload.reponse_clinique,
          thinking_trace_fr: parsedPayload.thinking_trace_fr,
          verified_assertions: verificationResult.verifiedAssertions,
          dropped_assertion_count: verificationResult.droppedAssertions.length,
        },
      },
      200,
    );
  } catch (error: unknown) {
    return jsonResponse({ success: false, error: errorMessage(error) }, 502);
  }
}
