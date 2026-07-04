import { GoogleGenAI, Type, type Schema } from "@google/genai";
import { withGeminiRetry } from "@/lib/geminiRetry";
import { createClient } from "@libsql/client";

import { isFeatureEnabled } from "@/lib/featureFlags";
import { writeQueryLog, type QueryLogInput } from "@/lib/queryLogs";
import { getCachedResponse, storeCachedResponse, type CachedResponsePayload } from "@/lib/responseCache";
import { verifyClinicalAssertions, type VerifierAssertion } from "@/lib/verifier";

export interface PipelineResult {
  readonly status: number;
  readonly body: Record<string, unknown>;
}

export interface GeneratePipelineHooks {
  /** Fired when the deterministic gate has passed and the semantic verifier is about to run. */
  readonly onVerifying?: () => void;
  /** Fired when a cached response is served (no Gemini call happened). */
  readonly onCacheHit?: () => void;
}

const GENERATION_MODEL = "gemini-3.5-flash";
const ATTRIBUTION_CONFIDENCE_THRESHOLD = 0.85;
const MINIMUM_VERIFIED_ASSERTION_RATIO = 0.7;

const dbConfig: { url: string; authToken?: string } = {
  url: process.env["TURSO_DATABASE_URL"] || "file:clinical_ground_truth.db",
};
if (process.env["TURSO_AUTH_TOKEN"]) {
  dbConfig.authToken = process.env["TURSO_AUTH_TOKEN"];
}
const libsqlClient = createClient(dbConfig);

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

const spanResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    sujet_titre: {
      type: Type.STRING,
      description: "Un titre tres court de 3 a 5 mots en francais.",
    },
    thinking_trace_fr: {
      type: Type.STRING,
      description: "Cheminement clinique bref en francais, fonde sur les extraits fournis.",
    },
    response_spans: {
      type: Type.ARRAY,
      description:
        "Suite de spans narrative, clinical_assertion, ou abstention. Les sections non couvertes doivent etre representees par un span abstention.",
      items: {
        type: Type.OBJECT,
        properties: {
          type: {
            type: Type.STRING,
            description: "narrative, clinical_assertion, ou abstention",
          },
          text: {
            type: Type.STRING,
            description: "Texte a afficher pour narrative ou clinical_assertion.",
          },
          assertion_id: {
            type: Type.STRING,
          },
          exact_source_quote: {
            type: Type.STRING,
            description:
              "Citation exacte, mot a mot, extraite du raw_text_payload pour clinical_assertion.",
          },
          source_urn: {
            type: Type.STRING,
            description:
              "Identifiant ou titre source. Preferer source_identifier quand il existe.",
          },
          subject_entity_id: {
            type: Type.STRING,
            description:
              "Doit copier exactement le source_identifier du document source quand il existe.",
          },
          confidence_score: {
            type: Type.NUMBER,
          },
          section: {
            type: Type.STRING,
            description: "Section manquante pour abstention.",
          },
          reason: {
            type: Type.STRING,
            description: "Raison courte pour abstention.",
          },
        },
        required: ["type"],
      },
    },
  },
  required: ["sujet_titre", "thinking_trace_fr", "response_spans"],
};

interface GenerateRequestBody {
  query: string;
  retrievedContext: RetrievedContextChunk[];
  topicClass: string | null;
  secondaryClass: string | null;
  retrievalPlan: Record<string, unknown> | null;
  retrievalCoverage: RetrievalCoverage | null;
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
  section: string | null;
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

interface RetrievalCoverage {
  rounds_used: number | null;
  sub_queries_issued: number | null;
  total_chunks: number | null;
  uncovered_sections: string[];
  sections_covered: unknown[];
  used_queries: string[];
}

interface NarrativeSpan {
  type: "narrative";
  text: string;
}

interface ClinicalAssertionSpan {
  type: "clinical_assertion";
  assertion_id: string;
  text: string;
  exact_source_quote: string;
  source_urn: string;
  subject_entity_id: string;
  confidence_score: number;
}

interface AbstentionSpan {
  type: "abstention";
  section: string;
  reason: string;
}

type ResponseSpan = NarrativeSpan | ClinicalAssertionSpan | AbstentionSpan;

interface SpanMedicalResponsePayload {
  sujet_titre: string;
  thinking_trace_fr: string;
  response_spans: ResponseSpan[];
}

interface SpanVerificationResult {
  verifiedAssertions: ClinicalAssertion[];
  failedSubstringCount: number;
  failedEntityCount: number;
  droppedAssertionCount: number;
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

function readStringArrayField(record: Record<string, unknown>, key: string): string[] {
  const value = record[key];
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function parseRetrievalCoverage(value: unknown): RetrievalCoverage | null {
  if (!isRecord(value)) {
    return null;
  }

  const sectionsCovered = value["sections_covered"];
  return {
    rounds_used: readNumberField(value, "rounds_used"),
    sub_queries_issued: readNumberField(value, "sub_queries_issued"),
    total_chunks: readNumberField(value, "total_chunks"),
    uncovered_sections: readStringArrayField(value, "uncovered_sections"),
    sections_covered: Array.isArray(sectionsCovered) ? sectionsCovered : [],
    used_queries: readStringArrayField(value, "used_queries"),
  };
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
      section: null,
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
    section: readStringField(value, "section"),
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
    topicClass: readStringField(value, "topicClass") ?? readStringField(value, "topic_class"),
    secondaryClass:
      readStringField(value, "secondaryClass") ?? readStringField(value, "secondary_class"),
    retrievalPlan:
      isRecord(value["retrievalPlan"]) ? value["retrievalPlan"] : isRecord(value["retrieval_plan"]) ? value["retrieval_plan"] : null,
    retrievalCoverage:
      parseRetrievalCoverage(value["retrievalCoverage"]) ??
      parseRetrievalCoverage(value["retrieval_coverage"]),
  };
}

function prioritizeFormulaBankForCalculations(body: GenerateRequestBody): GenerateRequestBody {
  if (body.topicClass !== "calcul_clinique") {
    return body;
  }

  const formulaChunks = body.retrievedContext.filter((chunk) => chunk.silo === "clinical_formulas");
  if (formulaChunks.length === 0) {
    return body;
  }

  const supportingChunks = body.retrievedContext.filter(
    (chunk) => chunk.silo !== "clinical_formulas" && chunk.silo !== "colles_enseignants_edn",
  );

  return {
    ...body,
    retrievedContext: [...formulaChunks, ...supportingChunks].slice(0, 20),
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

function parseResponseSpan(value: unknown, index: number): ResponseSpan | null {
  if (!isRecord(value)) {
    console.warn(`response_spans[${index}] is not an object; dropping span.`);
    return null;
  }

  const type = readStringField(value, "type");
  if (type === "narrative") {
    const text = readStringField(value, "text");
    if (text === null) {
      console.warn(`response_spans[${index}] narrative is missing text; dropping span.`);
      return null;
    }
    return { type, text };
  }

  if (type === "clinical_assertion") {
    const text = readStringField(value, "text");
    const exactSourceQuote = readStringField(value, "exact_source_quote");
    const sourceUrn = readStringField(value, "source_urn");
    const subjectEntityId = readStringField(value, "subject_entity_id");
    const confidenceScore = value["confidence_score"];
    if (
      text === null ||
      exactSourceQuote === null ||
      sourceUrn === null ||
      subjectEntityId === null ||
      !isFiniteNumber(confidenceScore)
    ) {
      console.warn(`response_spans[${index}] clinical_assertion is incomplete; dropping span.`);
      return null;
    }

    return {
      type,
      assertion_id: readStringField(value, "assertion_id") ?? `assertion_${index + 1}`,
      text,
      exact_source_quote: exactSourceQuote,
      source_urn: sourceUrn,
      subject_entity_id: subjectEntityId,
      confidence_score: confidenceScore,
    };
  }

  if (type === "abstention") {
    const section = readStringField(value, "section");
    const reason = readStringField(value, "reason");
    if (section === null || reason === null) {
      console.warn(`response_spans[${index}] abstention is incomplete; dropping span.`);
      return null;
    }
    return { type, section, reason };
  }

  console.warn(`response_spans[${index}] has unknown type '${type ?? "missing"}'; dropping span.`);
  return null;
}

function parseSpanMedicalResponsePayload(value: unknown): SpanMedicalResponsePayload {
  if (!isRecord(value)) {
    throw new Error("Gemini span response JSON must be an object.");
  }

  const sujetTitre = readStringField(value, "sujet_titre");
  const thinkingTraceFr = readStringField(value, "thinking_trace_fr");
  const responseSpans = value["response_spans"];

  if (sujetTitre === null || thinkingTraceFr === null || !Array.isArray(responseSpans)) {
    throw new Error("Gemini span response JSON does not match the medical response schema.");
  }

  return {
    sujet_titre: sujetTitre,
    thinking_trace_fr: thinkingTraceFr,
    response_spans: responseSpans
      .map((span, index) => parseResponseSpan(span, index))
      .filter((span): span is ResponseSpan => span !== null),
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

function parseGeminiSpanJson(text: string): SpanMedicalResponsePayload {
  try {
    return parseSpanMedicalResponsePayload(JSON.parse(text));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown JSON parsing failure.";
    throw new Error(`Unable to parse structured Gemini span response: ${message}`);
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

function normalizeIdentifier(value: string | null): string {
  return normalizeForIncludes(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ");
}

function spanToClinicalAssertion(span: ClinicalAssertionSpan): ClinicalAssertion {
  return {
    assertion_id: span.assertion_id,
    text_claim: span.text,
    associated_source_urn: span.source_urn,
    exact_source_quote: span.exact_source_quote,
    confidence_score: span.confidence_score,
  };
}

function findChunkForQuote(
  quote: string,
  contextChunks: readonly RetrievedContextChunk[],
): RetrievedContextChunk | null {
  const normalizedQuote = normalizeForIncludes(quote);
  return (
    contextChunks.find((chunk) =>
      normalizeForIncludes(chunk.raw_text_payload).includes(normalizedQuote),
    ) ?? null
  );
}

function subjectEntityMatchesChunk(
  span: ClinicalAssertionSpan,
  chunk: RetrievedContextChunk,
): boolean {
  if (chunk.source_identifier !== null) {
    return normalizeIdentifier(span.subject_entity_id) === normalizeIdentifier(chunk.source_identifier);
  }

  const normalizedSourceUrn = normalizeIdentifier(span.source_urn);
  const normalizedSource = normalizeIdentifier(chunk.source);
  return normalizedSource.length > 0 && normalizedSourceUrn === normalizedSource;
}

const QUESTION_QUOTE_PATTERN = /^(quel(le)?s? |que |comment |pourquoi )/i;

function quoteIsNonFactual(quote: string): boolean {
  const trimmed = quote.trim();
  if (trimmed.length === 0) {
    return true;
  }
  return trimmed.endsWith("?") || QUESTION_QUOTE_PATTERN.test(trimmed);
}

function runSpanAttributionGate(
  payload: SpanMedicalResponsePayload,
  contextChunks: RetrievedContextChunk[],
): SpanVerificationResult {
  const verifiedAssertions: ClinicalAssertion[] = [];
  let failedSubstringCount = 0;
  let failedEntityCount = 0;
  let droppedAssertionCount = 0;

  for (const span of payload.response_spans) {
    if (span.type === "narrative" || span.type === "abstention") {
      continue;
    }

    if (quoteIsNonFactual(span.exact_source_quote)) {
      failedSubstringCount++;
      droppedAssertionCount++;
      continue;
    }

    const matchedChunk = findChunkForQuote(span.exact_source_quote, contextChunks);
    const scorePassesThreshold = span.confidence_score >= ATTRIBUTION_CONFIDENCE_THRESHOLD;
    if (matchedChunk === null || !scorePassesThreshold) {
      failedSubstringCount++;
      droppedAssertionCount++;
      continue;
    }

    if (!subjectEntityMatchesChunk(span, matchedChunk)) {
      failedEntityCount++;
      droppedAssertionCount++;
      continue;
    }

    verifiedAssertions.push(spanToClinicalAssertion(span));
  }

  return {
    verifiedAssertions,
    failedSubstringCount,
    failedEntityCount,
    droppedAssertionCount,
  };
}

function hasRenderableContent(
  spans: readonly ResponseSpan[],
  verifiedAssertionIds: ReadonlySet<string>,
): boolean {
  return spans.some((span) => {
    if (span.type === "narrative") {
      return span.text.trim().length > 0;
    }
    if (span.type === "abstention") {
      return true;
    }
    return verifiedAssertionIds.has(span.assertion_id);
  });
}

function filterSpansForRendering(
  spans: readonly ResponseSpan[],
  verifiedAssertionIds: ReadonlySet<string>,
): readonly ResponseSpan[] {
  return spans.filter((span) => {
    if (span.type !== "clinical_assertion") {
      return true;
    }
    return verifiedAssertionIds.has(span.assertion_id);
  });
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
If the user's message is unrelated to medicine or healthcare, do not answer it: reply in French that you are an assistant scoped to French medical/EDN topics and can only help with clinical, pharmacological, or medical-study questions.
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

function buildSpanSystemInstruction(isConversational: boolean, includeTemplateHints: boolean): string {
  if (isConversational) {
    return `
Act as a friendly, professional medical student assistant.
Answer directly, politely, and briefly in French.
If the user's message is unrelated to medicine or healthcare, do not answer it: reply in French that you are an assistant scoped to French medical/EDN topics and can only help with clinical, pharmacological, or medical-study questions.
Return JSON matching the schema with one or more narrative spans only. Do not make complex clinical claims.
`.trim();
  }

  const baseInstruction = `
Act as an elite professor of medicine in a French faculty. You write only from the provided French source excerpts.

Return JSON matching the declared schema.

Response span rules:
1. Use "narrative" spans only for connective explanation, definitions without numbers, and transitions.
2. A narrative span MUST NOT contain numbers, doses, thresholds, named scores, named guideline claims, contraindications, or source-specific recommendations. Any quantitative or guideline-specific claim belongs in a "clinical_assertion" span instead, even if it feels minor.
3. Put every dosage, contraindication, named recommendation, score threshold, date, or quantitative claim in a "clinical_assertion" span.
4. Every "clinical_assertion" must include exact_source_quote copied verbatim (identical characters, no paraphrase) from raw_text_payload. If you cannot find a verbatim quote that supports the claim, do not make the claim.
5. Every "clinical_assertion" must set source_urn and subject_entity_id. If source_identifier exists, subject_entity_id must copy it exactly. When several sources cover close but distinct entities (e.g. two versions of the same score), attribute each assertion strictly to the source it was drawn from and say so explicitly rather than blending them.
6. If a required section is listed as uncovered, emit an "abstention" span for that section instead of inventing content.
7. Write in French medical language for an EDN student and include useful depth only when the provided source excerpts support it. Assertions that cannot be grounded this way are silently dropped before reaching the student, so prefer a well-attributed assertion over an unattributed one.
8. Every exact_source_quote MUST be a factual, declarative statement copied from raw_text_payload — never a question, a QCM/MCQ stem, or a section heading. If the only supporting excerpt is phrased as a question (e.g. « Quel est... ? »), locate a factual sentence in the same chunk that states the answer and quote that instead, or emit an abstention rather than quoting the question.
`.trim();

  if (!includeTemplateHints) {
    return baseInstruction;
  }

  return `
${baseInstruction}

Response composition templates:
- Pharmacologie: Mécanisme/Indication -> Posologie -> Contre-indications -> Interactions -> Surveillance -> Points clés EDN -> Sources.
- Sémiologie/Cas clinique: Signes cliniques -> Examens paracliniques -> Diagnostics différentiels -> Conduite à tenir -> Points clés EDN -> Sources.
- Urgence: Reconnaissance -> Gestes immédiats -> Traitement -> Orientation -> Points clés EDN -> Sources.
- Calcul clinique: Formule -> Variables et unités -> Substitution numérique -> Résultat -> Interprétation -> Source.

Pour un calcul_clinique, la section Résultat DOIT contenir un clinical_assertion span avec le résultat numérique final entièrement calculé et son unité (ex. « DFG = 72 mL/min/1,73 m² »). Ne t'arrête pas à la formule ou à la substitution. Si tu ne peux pas fournir ce résultat chiffré depuis les sources, émets une abstention pour la section « resultat » au lieu de laisser le calcul incomplet.

End with 3 to 5 "Points clés EDN" bullets whenever the retrieved context supports them. If a section is unsupported, use abstention rather than filler.
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

function buildSpanModelPrompt(body: GenerateRequestBody): string {
  const contextPayload = body.retrievedContext.map((chunk) => ({
    context_id: `context_${chunk.index}`,
    source: chunk.source,
    source_identifier: chunk.source_identifier,
    page: chunk.page,
    regulatory_date: chunk.date,
    silo: chunk.silo,
    section: chunk.section,
    raw_text_payload: chunk.raw_text_payload,
  }));

  return JSON.stringify(
    {
      contexte_injecte: contextPayload,
      question_de_l_etudiant: body.query,
      topic_class: body.topicClass,
      secondary_class: body.secondaryClass,
      retrieval_plan: body.retrievalPlan,
      retrieval_coverage: body.retrievalCoverage,
      uncovered_sections: body.retrievalCoverage?.uncovered_sections ?? [],
      attribution_rule:
        "Chaque exact_source_quote doit etre une sous-chaine exacte de raw_text_payload; subject_entity_id doit copier source_identifier quand disponible.",
      formula_bank_rule:
        body.topicClass === "calcul_clinique" &&
          body.retrievedContext.some((chunk) => chunk.silo === "clinical_formulas")
          ? "Pour les formules, variables, unites, seuils et interpretation d'un calcul clinique, cite prioritairement les extraits dont silo vaut clinical_formulas. N'utilise pas un QCM ou une question d'entrainement comme source d'une formule si clinical_formulas est disponible."
          : null,
      abstention_rule:
        "Toute section uncovered_sections doit produire un span abstention visible.",
    },
    null,
    2,
  );
}

function abstentionReason(section: string): string {
  return `Non trouvé dans le corpus indexé pour la section ${section.replace(/_/g, " ")} — à vérifier auprès d'une source spécialisée.`;
}

function enforceRequiredAbstentions(
  payload: SpanMedicalResponsePayload,
  uncoveredSections: readonly string[],
): SpanMedicalResponsePayload {
  if (uncoveredSections.length === 0) {
    return payload;
  }

  const existingAbstentions = new Set(
    payload.response_spans
      .filter((span): span is AbstentionSpan => span.type === "abstention")
      .map((span) => normalizeForIncludes(span.section)),
  );
  const missingAbstentions = uncoveredSections
    .filter((section) => !existingAbstentions.has(normalizeForIncludes(section)))
    .map(
      (section): AbstentionSpan => ({
        type: "abstention",
        section,
        reason: abstentionReason(section),
      }),
    );

  if (missingAbstentions.length === 0) {
    return payload;
  }

  return {
    ...payload,
    response_spans: [...payload.response_spans, ...missingAbstentions],
  };
}

const RESOLVED_NUMERIC_RESULT_PATTERN = /=\s*\d+([.,]\d+)?\s*\w/;

function enforceCalculResult(
  payload: SpanMedicalResponsePayload,
  topicClass: string | null | undefined,
): SpanMedicalResponsePayload {
  if (topicClass !== "calcul_clinique") {
    return payload;
  }

  const hasResolvedResult = payload.response_spans.some((span) => {
    if (span.type === "abstention") {
      return false;
    }
    return RESOLVED_NUMERIC_RESULT_PATTERN.test(span.text);
  });
  if (hasResolvedResult) {
    return payload;
  }

  const hasResultAbstention = payload.response_spans.some(
    (span) =>
      span.type === "abstention" &&
      (normalizeForIncludes(span.section).includes("resultat") ||
        normalizeForIncludes(span.section).includes("interpretation")),
  );
  if (hasResultAbstention) {
    return payload;
  }

  return {
    ...payload,
    response_spans: [
      ...payload.response_spans,
      { type: "abstention", section: "resultat", reason: abstentionReason("resultat") },
    ],
  };
}

function renderSpanResponse(spans: readonly ResponseSpan[]): string {
  return spans
    .map((span) => {
      if (span.type === "abstention") {
        return `**${span.section.replace(/_/g, " ")}:**\n${span.reason}`;
      }
      return span.text;
    })
    .filter((text) => text.trim().length > 0)
    .join("\n\n");
}

function clinicalSpans(payload: SpanMedicalResponsePayload): readonly ClinicalAssertionSpan[] {
  return payload.response_spans.filter(
    (span): span is ClinicalAssertionSpan => span.type === "clinical_assertion",
  );
}

function abstentionSections(payload: SpanMedicalResponsePayload): readonly string[] {
  return payload.response_spans
    .filter((span): span is AbstentionSpan => span.type === "abstention")
    .map((span) => span.section);
}

function verifierAssertionsFromSpans(
  spans: readonly ClinicalAssertionSpan[],
): readonly VerifierAssertion[] {
  return spans.map((span) => ({
    assertion_id: span.assertion_id,
    text: span.text,
    exact_source_quote: span.exact_source_quote,
    source_urn: span.source_urn,
  }));
}

function estimateGeminiFlashLiteCostUsd(inputText: string, outputText: string): number {
  const inputTokens = Math.ceil(inputText.length / 4);
  const outputTokens = Math.ceil(outputText.length / 4);
  return (inputTokens / 1_000_000) * 0.25 + (outputTokens / 1_000_000) * 1.5;
}

function buildQueryLogInput({
  requestId,
  body,
  payload,
  verificationResult,
  failedVerifierCount,
  latencyMs,
  estimatedCostUsd,
  gateBlocked,
}: {
  readonly requestId: string;
  readonly body: GenerateRequestBody;
  readonly payload: SpanMedicalResponsePayload;
  readonly verificationResult: SpanVerificationResult;
  readonly failedVerifierCount: number;
  readonly latencyMs: number;
  readonly estimatedCostUsd: number;
  readonly gateBlocked: boolean;
}): QueryLogInput {
  const citedSources = new Set(
    verificationResult.verifiedAssertions.map((assertion) => assertion.associated_source_urn),
  );
  const silos = new Set(
    body.retrievedContext
      .map((chunk) => chunk.silo)
      .filter((silo): silo is string => typeof silo === "string" && silo.length > 0),
  );

  return {
    request_id: requestId,
    timestamp: new Date().toISOString(),
    primary_class: body.topicClass ?? "unknown",
    secondary_class: body.secondaryClass,
    rounds_used: body.retrievalCoverage?.rounds_used ?? 0,
    sub_queries_issued: body.retrievalCoverage?.sub_queries_issued ?? 0,
    distinct_sources_cited: citedSources.size,
    silos_touched: Array.from(silos),
    clinical_assertions_total: clinicalSpans(payload).length,
    clinical_assertions_passed_gate: verificationResult.verifiedAssertions.length,
    clinical_assertions_failed_substring: verificationResult.failedSubstringCount,
    clinical_assertions_failed_entity: verificationResult.failedEntityCount,
    clinical_assertions_failed_verifier: failedVerifierCount,
    abstained_sections: abstentionSections(payload),
    latency_ms: latencyMs,
    estimated_cost_usd: estimatedCostUsd,
    gate_blocked: gateBlocked,
  };
}

async function writeQueryLogIfEnabled(input: QueryLogInput): Promise<void> {
  if (!isFeatureEnabled("verifierFreshness")) {
    return;
  }

  try {
    await writeQueryLog(libsqlClient, input);
  } catch (error: unknown) {
    console.warn("Failed to write query log:", error);
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown generation failure.";
}

export async function runGeneratePipeline(
  rawBody: unknown,
  hooks?: GeneratePipelineHooks,
): Promise<PipelineResult> {
  let body: GenerateRequestBody;
  try {
    body = parseGenerateRequestBody(rawBody);
    body = prioritizeFormulaBankForCalculations(body);
  } catch (error: unknown) {
    return { status: 400, body: { success: false, error: errorMessage(error) } };
  }

  try {
    const requestId = crypto.randomUUID();
    const startedAt = Date.now();
    const isConversational = body.retrievedContext.some((chunk) => chunk.silo === "chat");

    const aiStudio = new GoogleGenAI({ apiKey: getRequiredEnv("GEMINI_API_KEY") });

    if (isFeatureEnabled("gateSpans")) {
      if (isFeatureEnabled("qualityPolish")) {
        const cached = await getCachedResponse(
          libsqlClient,
          body.topicClass,
          body.query,
          body.retrievalPlan,
        );
        if (cached !== null) {
          hooks?.onCacheHit?.();
          return {
            status: 200,
            body: {
              success: true,
              model: cached.model,
              cached: true,
              payload: cached.payload,
            },
          };
        }
      }

      const spanPrompt = buildSpanModelPrompt(body);
      const response = await withGeminiRetry(() => aiStudio.models.generateContent({
        model: GENERATION_MODEL,
        contents: spanPrompt,
        config: {
          systemInstruction: buildSpanSystemInstruction(
            isConversational,
            isFeatureEnabled("qualityPolish"),
          ),
          responseMimeType: "application/json",
          responseSchema: spanResponseSchema,
          temperature: 0.0,
        },
      }));

      const responseText = response.text;
      if (typeof responseText !== "string" || responseText.trim().length === 0) {
        throw new Error("Gemini returned an empty structured span response.");
      }

      const parsedPayload = enforceCalculResult(
        enforceRequiredAbstentions(
          parseGeminiSpanJson(responseText),
          body.retrievalCoverage?.uncovered_sections ?? [],
        ),
        body.topicClass,
      );

      const verificationResult = runSpanAttributionGate(parsedPayload, body.retrievedContext);
      let verifierFailedIds = new Set<string>();
      let verifierReasons: readonly string[] = [];
      let estimatedCostUsd = estimateGeminiFlashLiteCostUsd(spanPrompt, responseText);

      if (
        isFeatureEnabled("verifierFreshness") &&
        !isConversational &&
        clinicalSpans(parsedPayload).length > 0
      ) {
        hooks?.onVerifying?.();
        const gateVerifiedIds = new Set(
          verificationResult.verifiedAssertions.map((assertion) => assertion.assertion_id),
        );
        const verifierAssertions = verifierAssertionsFromSpans(
          clinicalSpans(parsedPayload).filter((span) => gateVerifiedIds.has(span.assertion_id)),
        );
        const verifierDecisions = await verifyClinicalAssertions(
          aiStudio,
          verifierAssertions,
          body.retrievedContext,
        );
        const failedVerifierDecisions = verifierDecisions.filter((decision) => !decision.entailed);
        verifierFailedIds = new Set(failedVerifierDecisions.map((decision) => decision.assertion_id));
        verifierReasons = failedVerifierDecisions.map(
          (decision) => `${decision.assertion_id}: ${decision.reason}`,
        );
        estimatedCostUsd += estimateGeminiFlashLiteCostUsd(
          JSON.stringify(verifierAssertions),
          JSON.stringify(verifierDecisions),
        );
      }

      const finalVerifiedAssertions = verificationResult.verifiedAssertions.filter(
        (assertion) => !verifierFailedIds.has(assertion.assertion_id),
      );
      const finalVerifiedIds = new Set(finalVerifiedAssertions.map((assertion) => assertion.assertion_id));
      const totalAssertionCount = clinicalSpans(parsedPayload).length;
      const droppedAssertionCount = totalAssertionCount - finalVerifiedAssertions.length;
      const failedVerifierCount = verifierFailedIds.size;

      const shouldBlock =
        !isConversational && !hasRenderableContent(parsedPayload.response_spans, finalVerifiedIds);

      await writeQueryLogIfEnabled(
        buildQueryLogInput({
          requestId,
          body,
          payload: parsedPayload,
          verificationResult,
          failedVerifierCount,
          latencyMs: Date.now() - startedAt,
          estimatedCostUsd,
          gateBlocked: shouldBlock,
        }),
      );

      if (shouldBlock) {
        return {
          status: 422,
          body: {
            success: false,
            error:
              "Le système n'a trouvé aucune affirmation vérifiable ni aucune section à signaler comme non couverte pour cette question. Reformulez votre question ou précisez le contexte clinique.",
            verification: {
              total_assertions: totalAssertionCount,
              verified_assertions: finalVerifiedAssertions.length,
              dropped_assertions: droppedAssertionCount,
              failed_substring: verificationResult.failedSubstringCount,
              failed_entity: verificationResult.failedEntityCount,
              failed_verifier: failedVerifierCount,
              verifier_reasons: verifierReasons,
              minimum_confidence_score: ATTRIBUTION_CONFIDENCE_THRESHOLD,
            },
          },
        };
      }

      const renderedSpans = filterSpansForRendering(parsedPayload.response_spans, finalVerifiedIds);

      const responsePayload: Record<string, unknown> = {
        sujet_titre: parsedPayload.sujet_titre,
        reponse_clinique: renderSpanResponse(renderedSpans),
        thinking_trace_fr: parsedPayload.thinking_trace_fr,
        verified_assertions: finalVerifiedAssertions,
        dropped_assertion_count: droppedAssertionCount,
        response_spans: renderedSpans,
        abstained_sections: abstentionSections(parsedPayload),
        coverage: isFeatureEnabled("qualityPolish")
          ? {
            rounds_used: body.retrievalCoverage?.rounds_used ?? 0,
            sub_queries_issued: body.retrievalCoverage?.sub_queries_issued ?? 0,
            total_chunks: body.retrievalCoverage?.total_chunks ?? body.retrievedContext.length,
            uncovered_sections: body.retrievalCoverage?.uncovered_sections ?? [],
            silos_touched: Array.from(
              new Set(
                body.retrievedContext
                  .map((chunk) => chunk.silo)
                  .filter((silo): silo is string => typeof silo === "string" && silo.length > 0),
              ),
            ),
            distinct_sources: new Set(
              finalVerifiedAssertions.map((assertion) => assertion.associated_source_urn),
            ).size,
          }
          : null,
      };
      const responseEnvelope: CachedResponsePayload = {
        model: GENERATION_MODEL,
        payload: responsePayload,
      };

      if (isFeatureEnabled("qualityPolish")) {
        await storeCachedResponse({
          db: libsqlClient,
          topicClass: body.topicClass,
          query: body.query,
          retrievalPlan: body.retrievalPlan,
          response: responseEnvelope,
          citedSourceIds: finalVerifiedAssertions.map(
            (assertion) => assertion.associated_source_urn,
          ),
        });
      }

      return {
        status: 200,
        body: {
          success: true,
          model: responseEnvelope.model,
          payload: responseEnvelope.payload,
        },
      };
    }

    const response = await withGeminiRetry(() => aiStudio.models.generateContent({
      model: GENERATION_MODEL,
      contents: buildModelPrompt(body.query, body.retrievedContext),
      config: {
        systemInstruction: buildSystemInstruction(isConversational),
        responseMimeType: "application/json",
        responseSchema: medicalResponseSchema,
        temperature: 0.0,
      },
    }));

    const responseText = response.text;
    if (typeof responseText !== "string" || responseText.trim().length === 0) {
      throw new Error("Gemini returned an empty structured response.");
    }

    const parsedPayload = parseGeminiJson(responseText);

    if (isConversational) {
      return {
        status: 200,
        body: {
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
      };
    }

    const verificationResult = runAttributionGate(parsedPayload, body.retrievedContext);

    if (
      shouldRejectAttribution(
        verificationResult,
        parsedPayload.clinical_assertions.length,
      )
    ) {
      return {
        status: 422,
        body: {
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
      };
    }

    return {
      status: 200,
      body: {
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
    };
  } catch (error: unknown) {
    return { status: 502, body: { success: false, error: errorMessage(error) } };
  }
}
