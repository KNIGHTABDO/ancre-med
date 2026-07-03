"use client";

import type { FormEvent, ReactNode, ChangeEvent, KeyboardEvent } from "react";
import { useMemo, useState, useRef, useEffect } from "react";
import Link from "next/link";



interface RetrievedContextChunk {
  readonly id: string;
  readonly agent_id: string;
  readonly agent_label: string;
  readonly text: string;
  readonly source_identifier: string | null;
  readonly source: string | null;
  readonly page: number | null;
  readonly date: string | null;
  readonly silo: string | null;
  readonly fts_rank: number;
  readonly bm25_score: number;
  readonly section?: string;
}

interface RouterPayload {
  readonly injected_context: readonly RetrievedContextChunk[];
  readonly primary_class: string | null;
  readonly secondary_class: string | null;
  readonly retrieval_plan: Record<string, unknown> | null;
  readonly retrieval_coverage: Record<string, unknown> | null;
  readonly feature_flags: Record<string, boolean> | null;
}

interface ClinicalAssertion {
  readonly assertion_id: string;
  readonly text_claim: string;
  readonly associated_source_urn: string;
  readonly exact_source_quote: string;
  readonly confidence_score: number;
}

interface GeneratePayload {
  readonly sujet_titre: string;
  readonly reponse_clinique: string;
  readonly thinking_trace_fr: string;
  readonly verified_assertions: readonly ClinicalAssertion[];
  readonly dropped_assertion_count: number;
  readonly coverage: CoveragePayload | null;
}

interface GenerateResponse {
  readonly model: string | null;
  readonly payload: GeneratePayload;
}

interface SourceReferenceCard {
  readonly id: string;
  readonly authority: string;
  readonly title: string;
  readonly date: string | null;
  readonly page: number | null;
  readonly href: string | null;
  readonly linkLabel: string;
  readonly sourceBadge: string;
  readonly exactQuote: string;
  readonly confidenceScore: number;
}

interface ClinicalParagraphBlock {
  readonly kind: "paragraph";
  readonly id: string;
  readonly content: string;
}

interface ClinicalHeadingBlock {
  readonly kind: "heading";
  readonly id: string;
  readonly content: string;
}

interface ClinicalListBlock {
  readonly kind: "list";
  readonly id: string;
  readonly items: readonly string[];
}

type ClinicalTextBlock =
  | ClinicalParagraphBlock
  | ClinicalHeadingBlock
  | ClinicalListBlock;

interface QueryFormProps {
  readonly value: string;
  readonly disabled: boolean;
  readonly compact: boolean;
  readonly onValueChange: (value: string) => void;
  readonly onSubmit: () => Promise<void>;
}

interface EndpointFailureVerification {
  readonly total_assertions: number | undefined;
  readonly verified_assertions: number | undefined;
  readonly dropped_assertions: number | undefined;
  readonly minimum_confidence_score: number | undefined;
}

interface CoveragePayload {
  readonly rounds_used: number;
  readonly sub_queries_issued: number;
  readonly total_chunks: number;
  readonly uncovered_sections: readonly string[];
  readonly silos_touched: readonly string[];
  readonly distinct_sources: number;
}

const PRIVACY_NOTICE =
  "Aucune donnée identifiante relative aux patients ne doit figurer dans vos questions.";

const SILO_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  has_recommandations: { label: "HAS", color: "#0c8599", bg: "#e3fafc" },
  ansm_bdpm_vidal: { label: "ANSM / VIDAL", color: "#3b5bdb", bg: "#edf2ff" },
  colles_enseignants_edn: { label: "EDN", color: "#099268", bg: "#e6fcf5" },
  clinical_formulas: { label: "Formules", color: "#e67700", bg: "#fff9db" },
  wikipedia_fr: { label: "Wikipédia", color: "#495057", bg: "#f1f3f5" },
};

const LOADING_STEPS = [
  { icon: "🔍", text: "Recherche dans l'index clinique..." },
  { icon: "📚", text: "Analyse des sources médicales..." },
  { icon: "✍️", text: "Rédaction de la réponse clinique..." },
  { icon: "✅", text: "Vérification des assertions..." },
] as const;

function formatFrenchDate(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return isoDate;
    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return isoDate;
  }
}

function humanizeSiloName(raw: string): { label: string; color: string; bg: string } {
  const entry = SILO_LABELS[raw.trim()];
  if (entry) return entry;
  // fallback: capitalize first letter
  const label = raw.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
  return { label, color: "#495057", bg: "#f1f3f5" };
}

function confidenceStyle(score: number): { color: string; bg: string; border: string } {
  if (score >= 0.95) return { color: "#1e7e34", bg: "#d4edda", border: "rgba(40,167,69,0.12)" };
  if (score >= 0.80) return { color: "#856404", bg: "#fff3cd", border: "rgba(255,193,7,0.2)" };
  return { color: "#a71d2a", bg: "#f8d7da", border: "rgba(220,53,69,0.18)" };
}

function isInternalUrl(value: string): boolean {
  return value.startsWith("hf://") || value.startsWith("file://") || value.startsWith("s3://");
}

interface ChatDateGroup {
  readonly label: string;
  readonly chats: readonly Chat[];
}

function groupChatsByDate(chats: readonly Chat[]): readonly ChatDateGroup[] {
  const oneDay = 86_400_000;
  const todayStart = new Date().setHours(0, 0, 0, 0);
  const yesterdayStart = todayStart - oneDay;
  const weekStart = todayStart - 7 * oneDay;

  const groups: { today: Chat[]; yesterday: Chat[]; week: Chat[]; older: Chat[] } = {
    today: [], yesterday: [], week: [], older: [],
  };

  for (const chat of chats) {
    if (chat.createdAt >= todayStart) groups.today.push(chat);
    else if (chat.createdAt >= yesterdayStart) groups.yesterday.push(chat);
    else if (chat.createdAt >= weekStart) groups.week.push(chat);
    else groups.older.push(chat);
  }

  const result: ChatDateGroup[] = [];
  if (groups.today.length > 0) result.push({ label: "Aujourd'hui", chats: groups.today });
  if (groups.yesterday.length > 0) result.push({ label: "Hier", chats: groups.yesterday });
  if (groups.week.length > 0) result.push({ label: "Cette semaine", chats: groups.week });
  if (groups.older.length > 0) result.push({ label: "Plus ancien", chats: groups.older });
  return result;
}

const KNOWN_SOURCE_LABELS = [
  {
    label: "HAS",
    patterns: ["has_recommandations", "haute autorite de sante", "haute autorité de santé", " has "],
  },
  {
    label: "ANSM",
    patterns: ["ansm_bdpm_vidal", "ansm", "bdpm"],
  },
  {
    label: "VIDAL",
    patterns: ["vidal"],
  },
  {
    label: "Inserm",
    patterns: ["inserm"],
  },
  {
    label: "SFHTA",
    patterns: ["sfhta", "societe francaise d hypertension", "société française d hypertension"],
  },
  {
    label: "SFC",
    patterns: ["sfc", "societe francaise de cardiologie", "société française de cardiologie"],
  },
  {
    label: "SPF",
    patterns: ["spf", "sante publique france", "santé publique france"],
  },
  {
    label: "EDN",
    patterns: ["colles_enseignants_edn", "college des enseignants", "collège des enseignants"],
  },
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function readRequiredString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Le champ '${key}' est absent ou invalide.`);
  }
  return value.trim();
}

function readRequiredNumber(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  if (!isFiniteNumber(value)) {
    throw new Error(`Le champ '${key}' est absent ou invalide.`);
  }
  return value;
}

function readNullableString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== "string") {
    throw new Error(`Le champ '${key}' doit être une chaîne ou null.`);
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readNullableNumber(record: Record<string, unknown>, key: string): number | null {
  const value = record[key];
  if (value === null || value === undefined) {
    return null;
  }
  if (!isFiniteNumber(value)) {
    throw new Error(`Le champ '${key}' doit être un nombre ou null.`);
  }
  return value;
}

function readStringArray(record: Record<string, unknown>, key: string): readonly string[] {
  const value = record[key];
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

function parseCoveragePayload(value: unknown): CoveragePayload | null {
  if (!isRecord(value)) {
    return null;
  }

  return {
    rounds_used: readNullableNumber(value, "rounds_used") ?? 0,
    sub_queries_issued: readNullableNumber(value, "sub_queries_issued") ?? 0,
    total_chunks: readNullableNumber(value, "total_chunks") ?? 0,
    uncovered_sections: readStringArray(value, "uncovered_sections"),
    silos_touched: readStringArray(value, "silos_touched"),
    distinct_sources: readNullableNumber(value, "distinct_sources") ?? 0,
  };
}

function extractErrorMessage(value: unknown, fallback: string): string {
  if (!isRecord(value)) {
    return fallback;
  }

  const error = value["error"];
  if (typeof error === "string" && error.trim().length > 0) {
    return error.trim();
  }

  return fallback;
}

function extractVerification(value: unknown): EndpointFailureVerification | null {
  if (!isRecord(value)) {
    return null;
  }

  const verification = value["verification"];
  if (!isRecord(verification)) {
    return null;
  }

  const totalAssertions = verification["total_assertions"];
  const verifiedAssertions = verification["verified_assertions"];
  const droppedAssertions = verification["dropped_assertions"];
  const minimumConfidenceScore = verification["minimum_confidence_score"];

  return {
    total_assertions: isFiniteNumber(totalAssertions) ? totalAssertions : undefined,
    verified_assertions: isFiniteNumber(verifiedAssertions) ? verifiedAssertions : undefined,
    dropped_assertions: isFiniteNumber(droppedAssertions) ? droppedAssertions : undefined,
    minimum_confidence_score: isFiniteNumber(minimumConfidenceScore)
      ? minimumConfidenceScore
      : undefined,
  };
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text.trim().length === 0) {
    return {};
  }

  try {
    return JSON.parse(text) as unknown;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Réponse JSON illisible.";
    throw new Error(`Réponse serveur invalide: ${message}`);
  }
}

async function postJson(endpoint: string, body: Record<string, unknown>): Promise<unknown> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const payload = await readJson(response);
  if (!response.ok) {
    const verification = extractVerification(payload);
    const baseMessage = extractErrorMessage(
      payload,
      `La requête ${endpoint} a échoué avec le statut ${response.status}.`,
    );

    if (verification !== null && verification.total_assertions !== undefined) {
      throw new Error(
        `${baseMessage} Assertions validées: ${verification.verified_assertions ?? 0}/${verification.total_assertions}.`,
      );
    }

    throw new Error(baseMessage);
  }

  return payload;
}

function parseContextChunk(value: unknown, index: number): RetrievedContextChunk {
  if (!isRecord(value)) {
    throw new Error(`Le fragment de contexte ${index + 1} n'est pas un objet.`);
  }

  const section = readNullableString(value, "section");

  return {
    id: readRequiredString(value, "id"),
    agent_id: readRequiredString(value, "agent_id"),
    agent_label: readRequiredString(value, "agent_label"),
    text: readRequiredString(value, "text"),
    source_identifier: readNullableString(value, "source_identifier"),
    source: readNullableString(value, "source"),
    page: readNullableNumber(value, "page"),
    date: readNullableString(value, "date"),
    silo: readNullableString(value, "silo"),
    fts_rank: readRequiredNumber(value, "fts_rank"),
    bm25_score: readRequiredNumber(value, "bm25_score"),
    ...(section !== null ? { section } : {}),
  };
}

function parseRouterPayload(value: unknown): RouterPayload {
  if (!isRecord(value)) {
    throw new Error("La réponse du routeur Sadiq n'est pas un objet JSON.");
  }
  if (value["success"] !== true) {
    throw new Error(extractErrorMessage(value, "Le routeur Sadiq a refusé la requête."));
  }

  const injectedContext = value["injected_context"];
  if (!Array.isArray(injectedContext) || injectedContext.length === 0) {
    throw new Error("Le routeur Sadiq n'a retourné aucun fragment de contexte.");
  }

  return {
    injected_context: injectedContext.map((chunk, index) => parseContextChunk(chunk, index)),
    primary_class: readNullableString(value, "primary_class") ?? readNullableString(value, "topic_class"),
    secondary_class: readNullableString(value, "secondary_class"),
    retrieval_plan: isRecord(value["retrieval_plan"]) ? value["retrieval_plan"] : null,
    retrieval_coverage: isRecord(value["retrieval_coverage"]) ? value["retrieval_coverage"] : null,
    feature_flags: isRecord(value["feature_flags"])
      ? Object.fromEntries(
          Object.entries(value["feature_flags"]).filter(
            (entry): entry is [string, boolean] => typeof entry[1] === "boolean",
          ),
        )
      : null,
  };
}

function parseClinicalAssertion(value: unknown, index: number): ClinicalAssertion {
  if (!isRecord(value)) {
    throw new Error(`L'assertion clinique ${index + 1} n'est pas un objet.`);
  }

  return {
    assertion_id: readRequiredString(value, "assertion_id"),
    text_claim: readRequiredString(value, "text_claim"),
    associated_source_urn: readRequiredString(value, "associated_source_urn"),
    exact_source_quote: readRequiredString(value, "exact_source_quote"),
    confidence_score: readRequiredNumber(value, "confidence_score"),
  };
}

function parseGeneratePayload(value: unknown): GenerateResponse {
  if (!isRecord(value)) {
    throw new Error("La réponse du moteur de génération n'est pas un objet JSON.");
  }
  if (value["success"] !== true) {
    throw new Error(extractErrorMessage(value, "Le moteur de génération a refusé la requête."));
  }

  const payload = value["payload"];
  if (!isRecord(payload)) {
    throw new Error("La réponse générée ne contient pas de payload clinique.");
  }

  const assertions = payload["verified_assertions"];
  if (!Array.isArray(assertions)) {
    throw new Error("La réponse générée ne contient pas de tableau verified_assertions.");
  }

  return {
    model: readNullableString(value, "model"),
      payload: {
        sujet_titre: readRequiredString(payload, "sujet_titre"),
        reponse_clinique: readRequiredString(payload, "reponse_clinique"),
        thinking_trace_fr: readRequiredString(payload, "thinking_trace_fr"),
        verified_assertions: assertions.map((assertion, index) =>
          parseClinicalAssertion(assertion, index),
        ),
        dropped_assertion_count: readRequiredNumber(payload, "dropped_assertion_count"),
        coverage: parseCoveragePayload(payload["coverage"]),
      },
  };
}

async function runMedicalPipeline(prompt: string): Promise<{
  readonly router: RouterPayload;
  readonly generation: GenerateResponse;
}> {
  const routerPayload = parseRouterPayload(await postJson("/api/router", { prompt }));
  const generationPayload = parseGeneratePayload(
    await postJson("/api/generate", {
      query: prompt,
      retrievedContext: routerPayload.injected_context,
      topicClass: routerPayload.primary_class,
      secondaryClass: routerPayload.secondary_class,
      retrievalPlan: routerPayload.retrieval_plan,
      retrievalCoverage: routerPayload.retrieval_coverage,
    }),
  );

  return {
    router: routerPayload,
    generation: generationPayload,
  };
}

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function cleanAsymmetricText(value: string): string {
  const marker = " | text: ";
  const markerIndex = value.indexOf(marker);
  if (value.startsWith("title: ") && markerIndex !== -1) {
    return value.slice(markerIndex + marker.length).trim();
  }
  return value.trim();
}

function matchingSourceLabels(chunk: RetrievedContextChunk): readonly string[] {
  const combined = ` ${chunk.source ?? ""} ${chunk.source_identifier ?? ""} ${chunk.silo ?? ""} `;
  const normalized = normalizeSearchText(combined);
  const labels: string[] = [];

  for (const sourcePattern of KNOWN_SOURCE_LABELS) {
    const hasMatch = sourcePattern.patterns.some((pattern) =>
      normalized.includes(normalizeSearchText(pattern)),
    );
    if (hasMatch) {
      labels.push(sourcePattern.label);
    }
  }

  return labels;
}

function fallbackSourceBadge(chunk: RetrievedContextChunk | null): string {
  const silo = chunk?.silo;
  if (silo === "has_recommandations") {
    return "HAS";
  }
  if (silo === "ansm_bdpm_vidal") {
    return "ANSM";
  }
  if (silo === "colles_enseignants_edn") {
    return "EDN";
  }
  return "Référence";
}



function quoteInChunk(assertion: ClinicalAssertion, chunk: RetrievedContextChunk): boolean {
  const quote = normalizeSearchText(assertion.exact_source_quote);
  const chunkText = normalizeSearchText(cleanAsymmetricText(chunk.text));
  return quote.length > 0 && chunkText.includes(quote);
}

function sourceUrnMatchesChunk(assertion: ClinicalAssertion, chunk: RetrievedContextChunk): boolean {
  const urn = normalizeSearchText(assertion.associated_source_urn);
  const combined = normalizeSearchText(
    `${chunk.source ?? ""} ${chunk.source_identifier ?? ""} ${chunk.silo ?? ""}`,
  );
  return urn.length > 0 && combined.includes(urn);
}

function findContextForAssertion(
  assertion: ClinicalAssertion,
  context: readonly RetrievedContextChunk[],
): RetrievedContextChunk | null {
  const quoteMatch = context.find((chunk) => quoteInChunk(assertion, chunk));
  if (quoteMatch !== undefined) {
    return quoteMatch;
  }

  const urnMatch = context.find((chunk) => sourceUrnMatchesChunk(assertion, chunk));
  return urnMatch ?? null;
}

function inferAuthority(chunk: RetrievedContextChunk | null, sourceUrn: string): string {
  const combined = normalizeSearchText(
    `${chunk?.source ?? ""} ${chunk?.source_identifier ?? ""} ${chunk?.silo ?? ""} ${sourceUrn}`,
  );

  if (combined.includes("haute autorite de sante") || combined.includes("has_recommandations")) {
    return "Haute Autorité de Santé";
  }
  if (combined.includes("ansm")) {
    return "Agence nationale de sécurité du médicament";
  }
  if (combined.includes("vidal")) {
    return "VIDAL";
  }
  if (combined.includes("inserm")) {
    return "Inserm";
  }
  if (combined.includes("sfhta")) {
    return "Société Française d'Hypertension Artérielle";
  }
  if (combined.includes("sfc")) {
    return "Société Française de Cardiologie";
  }
  if (combined.includes("sante publique france") || combined.includes("spf")) {
    return "Santé publique France";
  }
  if (combined.includes("colles_enseignants_edn") || combined.includes("college")) {
    return "Collège des enseignants EDN";
  }

  return chunk?.source ?? sourceUrn;
}

function parseHttpUrl(value: string | null): string | null {
  if (value === null) {
    return null;
  }

  try {
    const url = new URL(value);
    if (url.protocol === "https:" || url.protocol === "http:") {
      return url.toString();
    }
    return null;
  } catch {
    return null;
  }
}

function buildReferenceCards(
  assertions: readonly ClinicalAssertion[],
  context: readonly RetrievedContextChunk[],
): readonly SourceReferenceCard[] {
  return assertions.map((assertion, index) => {
    const chunk = findContextForAssertion(assertion, context);
    const sourceIdentifier = chunk?.source_identifier ?? assertion.associated_source_urn;
    const href = parseHttpUrl(sourceIdentifier);
    const badgeLabels = chunk === null ? [] : matchingSourceLabels(chunk);
    const title = chunk?.source ?? assertion.associated_source_urn;

    return {
      id: assertion.assertion_id.length > 0 ? assertion.assertion_id : `assertion-${index + 1}`,
      authority: inferAuthority(chunk, assertion.associated_source_urn),
      title,
      date: chunk?.date ?? null,
      page: chunk?.page ?? null,
      href,
      linkLabel: sourceIdentifier,
      sourceBadge: badgeLabels[0] ?? fallbackSourceBadge(chunk),
      exactQuote: assertion.exact_source_quote,
      confidenceScore: assertion.confidence_score,
    };
  });
}

function cleanMarkdownHeading(value: string): string {
  return value.replace(/^#{1,6}\s+/, "").trim();
}

function isHeadingLine(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.startsWith("#")) {
    return true;
  }
  if (trimmed.endsWith(":") && trimmed.length <= 80) {
    return true;
  }
  return /^\*\*[^*]+:\*\*$/.test(trimmed) || /^\*\*[^*]+\*\*$/.test(trimmed);
}

function bulletContent(value: string): string | null {
  const bulletMatch = value.match(/^\s*(?:[-*•]|[0-9]+[.)])\s+(.+)$/u);
  const content = bulletMatch?.[1];
  return content === undefined ? null : cleanMarkdownHeading(content);
}

function parseClinicalBlocks(text: string): readonly ClinicalTextBlock[] {
  const blocks: ClinicalTextBlock[] = [];
  const lines = text
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  let pendingList: string[] = [];

  function flushList(): void {
    if (pendingList.length > 0) {
      blocks.push({
        kind: "list",
        id: `list-${blocks.length + 1}`,
        items: pendingList,
      });
      pendingList = [];
    }
  }

  for (const line of lines) {
    const bullet = bulletContent(line);
    if (bullet !== null) {
      pendingList.push(bullet);
      continue;
    }

    flushList();

    if (isHeadingLine(line)) {
      blocks.push({
        kind: "heading",
        id: `heading-${blocks.length + 1}`,
        content: cleanMarkdownHeading(line).replace(/:$/u, ""),
      });
    } else {
      blocks.push({
        kind: "paragraph",
        id: `paragraph-${blocks.length + 1}`,
        content: cleanMarkdownHeading(line),
      });
    }
  }

  flushList();
  return blocks;
}

function isCitationToken(value: string): boolean {
  return /^\[[A-Za-zÀ-ÖØ-öø-ÿ0-9+._ -]{2,48}\]$/u.test(value.trim());
}

function renderTextWithBold(text: string, keyPrefix: string): readonly ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/gu);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong className="clinical-bold" key={`${keyPrefix}-bold-${index}`}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={`${keyPrefix}-text-${index}`}>{part}</span>;
  });
}

function inlineCitations(text: string): readonly ReactNode[] {
  const parts = text.split(/(\[[A-Za-zÀ-ÖØ-öø-ÿ0-9+._ -]{2,48}\])/gu);
  return parts
    .filter((part) => part.length > 0)
    .flatMap((part, index): readonly ReactNode[] =>
      isCitationToken(part) ? (
        [
          <span className="citation-tag" key={`${part}-${index}`}>
            {part}
          </span>
        ]
      ) : (
        renderTextWithBold(part, `part-${index}`)
      )
    );
}

function renderClinicalResponse(text: string): ReactNode {
  const blocks = parseClinicalBlocks(text);

  return (
    <div className="clinical-copy">
      {blocks.map((block) => {
        if (block.kind === "heading") {
          return (
            <h3 className="clinical-heading" key={block.id}>
              {inlineCitations(block.content)}
            </h3>
          );
        }

        if (block.kind === "list") {
          return (
            <ul className="clinical-list" key={block.id}>
              {block.items.map((item, index) => (
                <li key={`${block.id}-${index}`}>{inlineCitations(item)}</li>
              ))}
            </ul>
          );
        }

        return (
          <p className="clinical-paragraph" key={block.id}>
            {inlineCitations(block.content)}
          </p>
        );
      })}
    </div>
  );
}

function QueryForm({
  value,
  disabled,
  compact,
  onValueChange,
  onSubmit,
}: QueryFormProps): JSX.Element {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (value.trim().length > 0) void onSubmit();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (value.trim().length > 0 && !disabled) void onSubmit();
    }
  }

  function handleChange(event: ChangeEvent<HTMLTextAreaElement>): void {
    onValueChange(event.target.value);
    const el = event.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, compact ? 120 : 160) + "px";
  }

  return (
    <form
      aria-label="Question médicale"
      className={compact ? "query-form query-form-compact" : "query-form"}
      onSubmit={handleSubmit}
    >
      <label className="sr-only" htmlFor={compact ? "medical-query-compact" : "medical-query"}>
        Question médicale
      </label>
      <textarea
        ref={textareaRef}
        autoComplete="off"
        className="query-input"
        disabled={disabled}
        id={compact ? "medical-query-compact" : "medical-query"}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Posez une question médicale..."
        rows={1}
        spellCheck={true}
        value={value}
      />
      <button
        aria-label="Envoyer la question"
        className={`query-submit ${disabled && value.trim().length > 0 ? "query-submit-loading" : ""}`}
        disabled={disabled || value.trim().length === 0}
        type="submit"
      >
        {disabled && value.trim().length > 0 ? (
          <svg className="submit-spinner" viewBox="0 0 24 24" width="18" height="18" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.25" />
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ) : (
          <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
            <path
              d="M5 12h13M13 6l6 6-6 6"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
            />
          </svg>
        )}
      </button>
    </form>
  );
}

interface Message {
  readonly id: string;
  readonly role: "user" | "assistant";
  readonly content: string;
  readonly thinking?: string;
  readonly context?: readonly RetrievedContextChunk[];
  readonly verified_assertions?: readonly ClinicalAssertion[];
  readonly coverage?: CoveragePayload | null;
  readonly error?: string;
  readonly processing?: boolean;
}

interface Chat {
  readonly id: string;
  readonly title: string;
  readonly createdAt: number;
  readonly messages: readonly Message[];
}

interface GroupedReferenceDoc {
  readonly authority: string;
  readonly title: string;
  readonly href: string | null;
  readonly linkLabel: string;
  readonly sourceBadge: string;
  readonly date: string | null;
  readonly quotes: readonly {
    readonly id: string;
    readonly exactQuote: string;
    readonly page: number | null;
    readonly confidenceScore: number;
  }[];
}

const LOCAL_STORAGE_KEY = "ancre_med_chats";

function loadSavedChats(): readonly Chat[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw === null) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed as readonly Chat[];
  } catch {
    return [];
  }
}

function saveChats(chats: readonly Chat[]): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(chats));
  } catch (error) {
    console.error("Failed to save chats to localStorage:", error);
  }
}

function getGroupedReferences(
  assertions: readonly ClinicalAssertion[],
  context: readonly RetrievedContextChunk[]
): readonly GroupedReferenceDoc[] {
  const cards = buildReferenceCards(assertions, context);
  const docs: GroupedReferenceDoc[] = [];

  for (const card of cards) {
    const matchIndex = docs.findIndex(
      (doc) =>
        doc.authority === card.authority &&
        doc.title === card.title &&
        doc.href === card.href
    );

    const quoteItem = {
      id: card.id,
      exactQuote: card.exactQuote,
      page: card.page,
      confidenceScore: card.confidenceScore,
    };

    if (matchIndex !== -1) {
      const existing = docs[matchIndex];
      if (existing) {
        docs[matchIndex] = {
          ...existing,
          quotes: [...existing.quotes, quoteItem],
        };
      }
    } else {
      docs.push({
        authority: card.authority,
        title: card.title,
        href: card.href,
        linkLabel: card.linkLabel,
        sourceBadge: card.sourceBadge,
        date: card.date,
        quotes: [quoteItem],
      });
    }
  }
  return docs;
}

function CoverageIndicator({ coverage }: { readonly coverage: CoveragePayload }): JSX.Element {
  return (
    <div className="coverage-indicator">
      <span className="coverage-pill">
        <svg fill="none" height="12" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="12"><path d="M9 12l2 2 4-4" /></svg>
        {coverage.distinct_sources} source{coverage.distinct_sources > 1 ? "s" : ""}
      </span>
      {coverage.silos_touched.map((silo) => {
        const info = humanizeSiloName(silo);
        return (
          <span
            key={silo}
            className="coverage-pill"
            style={{ color: info.color, background: info.bg, borderColor: `${info.color}22` }}
          >
            {info.label}
          </span>
        );
      })}
      <span className="coverage-pill">
        {coverage.rounds_used} round{coverage.rounds_used > 1 ? "s" : ""}
      </span>
      <span className="coverage-pill">
        {coverage.total_chunks} extrait{coverage.total_chunks > 1 ? "s" : ""}
      </span>
    </div>
  );
}

export default function HomePage(): JSX.Element {
  const [inputValue, setInputValue] = useState<string>("");
  const [chats, setChats] = useState<readonly Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [expandedSourceMsgId, setExpandedSourceMsgId] = useState<string | null>(null);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState<boolean>(true);
  const [silosModalOpen, setSilosModalOpen] = useState<boolean>(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [showScrollBottom, setShowScrollBottom] = useState<boolean>(false);
  const [loadingStepIndex, setLoadingStepIndex] = useState<number>(0);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  // Load chats on client mount
  useEffect(() => {
    const saved = loadSavedChats();
    setChats(saved);
    if (saved.length > 0 && saved[0]) {
      setActiveChatId(saved[0].id);
    }
  }, []);

  const activeChat = useMemo(() => {
    return chats.find((c) => c.id === activeChatId) ?? null;
  }, [chats, activeChatId]);

  const chatGroups = useMemo(() => groupChatsByDate(chats), [chats]);

  const isProcessing = activeChat?.messages.some((m) => m.processing) ?? false;

  // Loading step animation
  useEffect(() => {
    if (!isProcessing) {
      setLoadingStepIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setLoadingStepIndex((prev) => (prev + 1) % LOADING_STEPS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [isProcessing]);

  async function submitCurrentPrompt(): Promise<void> {
    const prompt = inputValue.trim();
    if (prompt.length === 0) {
      return;
    }

    setInputValue("");
    let currentChatId = activeChatId;
    let currentChat = activeChat;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: prompt,
    };

    const assistantMsg: Message = {
      id: `assistant-${Date.now()}`,
      role: "assistant",
      content: "",
      processing: true,
    };

    let updatedChats: readonly Chat[];

    if (currentChat === null) {
      const newId = `chat-${Date.now()}`;
      const newChat: Chat = {
        id: newId,
        title: "Nouvelle question...",
        createdAt: Date.now(),
        messages: [userMsg, assistantMsg],
      };
      updatedChats = [newChat, ...chats];
      currentChatId = newId;
      setActiveChatId(newId);
    } else {
      updatedChats = chats.map((c) => {
        if (c.id === currentChatId) {
          return {
            ...c,
            messages: [...c.messages, userMsg, assistantMsg],
          };
        }
        return c;
      });
    }

    setChats(updatedChats);
    saveChats(updatedChats);

    try {
      const pipelineResult = await runMedicalPipeline(prompt);
      const updatedAssistantMsg: Message = {
        id: assistantMsg.id,
        role: "assistant",
        content: pipelineResult.generation.payload.reponse_clinique,
        thinking: pipelineResult.generation.payload.thinking_trace_fr,
        context: pipelineResult.router.injected_context,
        verified_assertions: pipelineResult.generation.payload.verified_assertions,
        coverage: pipelineResult.generation.payload.coverage,
      };

      const finalChats = updatedChats.map((c) => {
        if (c.id === currentChatId) {
          const isFirstTurn = c.messages.length <= 2;
          const nextTitle = isFirstTurn
            ? pipelineResult.generation.payload.sujet_titre
            : c.title;

          return {
            ...c,
            title: nextTitle,
            messages: c.messages.map((m) =>
              m.id === assistantMsg.id ? updatedAssistantMsg : m
            ),
          };
        }
        return c;
      });

      setChats(finalChats);
      saveChats(finalChats);
    } catch (error: unknown) {
      const errorMsg: Message = {
        id: assistantMsg.id,
        role: "assistant",
        content: "",
        error:
          error instanceof Error
            ? error.message
            : "La chaîne de validation clinique a interrompu la requête.",
      };

      const finalChats = updatedChats.map((c) => {
        if (c.id === currentChatId) {
          return {
            ...c,
            title: c.title === "Nouvelle question..." ? "Erreur d'analyse" : c.title,
            messages: c.messages.map((m) =>
              m.id === assistantMsg.id ? errorMsg : m
            ),
          };
        }
        return c;
      });

      setChats(finalChats);
      saveChats(finalChats);
    }
  }

  function startNewChat(): void {
    const newId = `chat-${Date.now()}`;
    const newChat: Chat = {
      id: newId,
      title: "Nouvelle discussion",
      createdAt: Date.now(),
      messages: [],
    };
    const updated = [newChat, ...chats];
    setChats(updated);
    saveChats(updated);
    setActiveChatId(newId);
    setSidebarOpen(false);
  }

  function requestDeleteChat(id: string, event: React.MouseEvent): void {
    event.stopPropagation();
    setDeleteConfirmId(id);
  }

  function confirmDeleteChat(): void {
    if (deleteConfirmId === null) return;
    const updated = chats.filter((c) => c.id !== deleteConfirmId);
    setChats(updated);
    saveChats(updated);
    if (activeChatId === deleteConfirmId) {
      setActiveChatId(updated.length > 0 && updated[0] ? updated[0].id : null);
    }
    setDeleteConfirmId(null);
  }

  function copyResponse(msgId: string, text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedMsgId(msgId);
      setTimeout(() => setCopiedMsgId(null), 2000);
    }).catch(() => { /* silent */ });
  }

  function scrollToBottom(): void {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  // Auto-scroll on new messages
  const lastMessageContent = activeChat?.messages[activeChat.messages.length - 1]?.content;
  useEffect(() => {
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
    return () => clearTimeout(timer);
  }, [activeChat?.messages.length, lastMessageContent, isProcessing, expandedSourceMsgId]);

  // Show/hide scroll-to-bottom button
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    function onScroll(): void {
      if (!scroller) return;
      const distanceFromBottom = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
      setShowScrollBottom(distanceFromBottom > 300);
    }
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => scroller.removeEventListener("scroll", onScroll);
  }, [activeChat?.id]);

  return (
    <main className="workspace-shell">
      {/* Navigation Header */}
      <header className="app-global-header">
        <div className="header-container">
          <Link href="/" className="logo-brand">
            AncreMed
          </Link>
          <nav className="header-nav-menu">
            <Link href="/chat" className="nav-menu-link highlight-btn">
              Console Clinique
            </Link>
            <Link href="/paper" className="nav-menu-link">
              Rapport Scientifique
            </Link>
            <Link href="/changelog" className="nav-menu-link">
              Changelog
            </Link>
          </nav>
        </div>
      </header>

      {/* Mobile Top Bar */}
      <header className="mobile-header">
        <button
          aria-label="Ouvrir le menu"
          className="menu-toggle-btn"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <svg fill="none" height="24" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="24">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <Link href="/" className="mobile-logo">AncreMed</Link>
        <button
          aria-label="Nouvelle discussion"
          className="mobile-new-chat-btn"
          onClick={startNewChat}
        >
          <svg fill="none" height="20" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" width="20">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </header>

      <div className="app-container">
        {/* Sidebar */}
        <aside className={`sidebar ${sidebarOpen ? "open" : ""} ${!desktopSidebarOpen ? "collapsed" : ""}`} aria-label="Historique des discussions">
          <div className="sidebar-header">
            <div className="sidebar-top-row">
              <button className="btn-new-chat-compact" onClick={startNewChat}>
                <svg fill="none" height="14" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" width="14">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                <span>Nouvelle discussion</span>
              </button>

              <div className="sidebar-controls">
                <button
                  aria-label="Réduire la barre latérale"
                  className="btn-collapse-sidebar"
                  onClick={() => setDesktopSidebarOpen(false)}
                >
                  <svg fill="none" height="18" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="18">
                    <rect width="18" height="18" x="3" y="3" rx="2" />
                    <path d="M9 3v16M14 15l-3-3 3-3" />
                  </svg>
                </button>
                <button
                  aria-label="Fermer le menu"
                  className="menu-close-btn"
                  onClick={() => setSidebarOpen(false)}
                >
                  <svg fill="none" height="20" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="20">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div className="chat-list">
            {chats.length === 0 ? (
              <div className="sidebar-empty-state">
                <svg fill="none" height="32" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" width="32" opacity="0.4">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <p>Posez votre première question pour démarrer</p>
              </div>
            ) : (
              chatGroups.map((group) => (
                <div key={group.label} className="chat-group">
                  <p className="chat-group-label">{group.label}</p>
                  {group.chats.map((c) => (
                    <button
                      className={`chat-item ${c.id === activeChatId ? "active" : ""}`}
                      key={c.id}
                      onClick={() => {
                        setActiveChatId(c.id);
                        setSidebarOpen(false);
                      }}
                      title={c.title}
                    >
                      <span className="chat-item-title">{c.title}</span>
                      <button
                        aria-label="Supprimer la discussion"
                        className="btn-delete-chat"
                        onClick={(e) => requestDeleteChat(c.id, e)}
                      >
                        <svg fill="none" height="14" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="14">
                          <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>

          <div className="sidebar-footer">
            <span className="version-tag">
              <svg fill="none" height="10" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="10"><circle cx="12" cy="12" r="10" /><path d="M12 8v4l2 2" /></svg>
              v1.0 — Clinique
            </span>
          </div>
        </aside>

        {/* Overlay backdrop for mobile */}
        {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}

        {/* Main Canvas */}
        <section className={`main-viewport ${!desktopSidebarOpen ? "expanded" : ""}`} aria-label="Zone de discussion">
          {!desktopSidebarOpen && (
            <button
              aria-label="Développer la barre latérale"
              className="floating-expand-btn"
              onClick={() => setDesktopSidebarOpen(true)}
            >
              <svg fill="none" height="20" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="20">
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M9 3v16M11 9l3 3-3 3" />
              </svg>
            </button>
          )}
          {(!activeChat || activeChat.messages.length === 0) ? (
            <div className="idle-stage">
              <div className="idle-content">
                <div className="brand-mark-premium" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="brand-logo-svg">
                    <defs>
                      <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#005c53" />
                        <stop offset="100%" stopColor="#2ecc71" />
                      </linearGradient>
                    </defs>
                    <path d="M12 5V19M12 19C9.5 19 6 16.5 6 14M12 19C14.5 19 18 16.5 18 14M12 5C13.1046 5 14 4.10457 14 3C14 1.89543 13.1046 1 12 1C10.8954 1 10 1.89543 10 3C10 4.10457 10.8954 5 12 5Z" stroke="url(#logo-grad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M8 9H16" stroke="url(#logo-grad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h1>AncreMed</h1>
                <p className="subtitle">
                  Des réponses médicales fondées sur des sources de référence
                </p>
                <div className="idle-input-box">
                  <QueryForm
                    compact={false}
                    disabled={false}
                    onSubmit={submitCurrentPrompt}
                    onValueChange={setInputValue}
                    value={inputValue}
                  />
                </div>
              </div>
              <p className="privacy-anchor">{PRIVACY_NOTICE}</p>
            </div>
          ) : (
            <div className="chat-interface">
              <div className="chat-scroller" ref={scrollerRef}>
                <div className="chat-scroller-content">
                  {activeChat.messages.map((msg) => {
                    if (msg.role === "user") {
                      return (
                        <div className="message-row user-row" key={msg.id}>
                          <div className="message-bubble user-bubble">
                            {msg.content}
                          </div>
                        </div>
                      );
                    }

                    if (msg.processing) {
                      return (
                        <div className="message-row assistant-row" key={msg.id}>
                          <div className="message-bubble assistant-bubble processing-bubble-premium">
                            <div className="progressive-loading-container">
                              <div className="loading-steps-list">
                                {LOADING_STEPS.map((step, idx) => {
                                  let stepStatus = "pending";
                                  if (idx < loadingStepIndex) stepStatus = "completed";
                                  else if (idx === loadingStepIndex) stepStatus = "active";

                                  return (
                                    <div key={idx} className={`loading-step-item step-${stepStatus}`}>
                                      <span className="step-icon">
                                        {stepStatus === "completed" ? "✓" : step.icon}
                                      </span>
                                      <span className="step-text">{step.text}</span>
                                      {stepStatus === "active" && (
                                        <span className="step-pulse-dot" />
                                      )}
                                    </div>
                                  );
                                })}
                              </div>

                              <div className="skeleton-paragraphs-container">
                                <div className="skeleton-line line-1 animate-shimmer" />
                                <div className="skeleton-line line-2 animate-shimmer" />
                                <div className="skeleton-line line-3 animate-shimmer" />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    if (msg.error) {
                      return (
                        <div className="message-row assistant-row" key={msg.id}>
                          <div className="message-bubble assistant-bubble error-bubble">
                            <p className="error-title">La réponse a été arrêtée.</p>
                            <p className="error-message">{msg.error}</p>
                          </div>
                        </div>
                      );
                    }

                    // Render successful response
                    const msgGroupedRefs = (msg.verified_assertions && msg.context)
                      ? getGroupedReferences(msg.verified_assertions, msg.context)
                      : [];
                    const isExpanded = expandedSourceMsgId === msg.id;

                    return (
                      <div className="message-row assistant-row fade-in-up" key={msg.id}>
                        <div className="message-bubble assistant-bubble">
                          <div className="assistant-bubble-header">
                            <p className="assistant-badge-premium">
                              <svg viewBox="0 0 24 24" fill="none" width="12" height="12" stroke="currentColor" strokeWidth="2.5" className="badge-shield-icon">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                              </svg>
                              RÉPONSE CLINIQUE
                            </p>
                            <button
                              className="btn-copy-response"
                              onClick={() => copyResponse(msg.id, msg.content)}
                              title="Copier la réponse"
                            >
                              {copiedMsgId === msg.id ? (
                                <span className="copy-status-text">Copié !</span>
                              ) : (
                                <svg fill="none" height="14" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="14">
                                  <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                                  <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                                </svg>
                              )}
                            </button>
                          </div>

                          {msg.coverage !== undefined && msg.coverage !== null && (
                            <CoverageIndicator coverage={msg.coverage} />
                          )}
                          <div className="clinical-response-content">
                            {renderClinicalResponse(msg.content)}
                          </div>

                          {msgGroupedRefs.length > 0 && (
                            <div className="msg-sources-section">
                              <button
                                className={`sources-toggle-btn ${isExpanded ? "active" : ""}`}
                                onClick={() => setExpandedSourceMsgId(isExpanded ? null : msg.id)}
                              >
                                <svg fill="none" height="14" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="14" className="toggle-chevron-icon">
                                  {isExpanded ? (
                                    <path d="M5 12h14" />
                                  ) : (
                                    <path d="M12 5v14M5 12h14" />
                                  )}
                                </svg>
                                <span>
                                  {isExpanded ? "Masquer les sources" : `Sources consultées (${msgGroupedRefs.length})`}
                                </span>
                              </button>

                              {isExpanded && (
                                <div className="msg-sources-list">
                                  {msgGroupedRefs.map((doc, docIndex) => (
                                    <article className="source-card" key={`doc-${docIndex}`}>
                                      <div className="source-card-header">
                                        <div>
                                          <p className="authority-line">
                                            {doc.authority}
                                            {doc.date !== null ? ` • ${formatFrenchDate(doc.date)}` : ""}
                                          </p>
                                          <h3>{doc.title}</h3>
                                        </div>
                                        <span className="source-chip card-chip">{doc.sourceBadge}</span>
                                      </div>

                                      {!isInternalUrl(doc.linkLabel) && doc.href !== null && (
                                        <div className="source-meta-row">
                                          <a href={doc.href} rel="noreferrer" target="_blank" className="source-external-link">
                                            <span>Consulter la source</span>
                                            <svg fill="none" height="10" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" width="10">
                                              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
                                            </svg>
                                          </a>
                                        </div>
                                      )}

                                      <div className="doc-quotes-container">
                                        {doc.quotes.map((quote, qIndex) => {
                                          const confStyle = confidenceStyle(quote.confidenceScore);
                                          return (
                                            <div className="quote-item-wrapper" key={quote.id}>
                                              <div className="quote-item-header">
                                                <span className="quote-number-badge">
                                                  Extrait {doc.quotes.length > 1 ? `${qIndex + 1}` : ""}
                                                </span>
                                                <div className="quote-item-meta">
                                                  {quote.page !== null && (
                                                    <span className="quote-meta-tag quote-page-tag">Page {quote.page}</span>
                                                  )}
                                                  <span
                                                    className="quote-meta-tag quote-confidence-tag"
                                                    style={{
                                                      color: confStyle.color,
                                                      background: confStyle.bg,
                                                      borderColor: confStyle.border
                                                    }}
                                                  >
                                                    Attribution {Math.round(quote.confidenceScore * 100)}%
                                                  </span>
                                                </div>
                                              </div>
                                              <blockquote>{quote.exactQuote}</blockquote>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </article>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div className="chat-spacer" />
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Floating scroll bottom button */}
              {showScrollBottom && (
                <button
                  className="floating-scroll-bottom-btn"
                  onClick={scrollToBottom}
                  aria-label="Défiler vers le bas"
                >
                  <svg fill="none" height="18" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" width="18">
                    <path d="M19 13l-7 7-7-7M12 5v15" />
                  </svg>
                </button>
              )}

              {/* Bottom Sticky Input */}
              <div className="bottom-input-container">
                <div className="input-wrap">
                  <QueryForm
                    compact={true}
                    disabled={activeChat.messages.some((m) => m.processing)}
                    onSubmit={submitCurrentPrompt}
                    onValueChange={setInputValue}
                    value={inputValue}
                  />
                  <p className="privacy-base">{PRIVACY_NOTICE}</p>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId !== null && (
        <div className="modal-backdrop" onClick={() => setDeleteConfirmId(null)}>
          <div className="modal-card modal-card-small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Supprimer la discussion ?</h2>
              <button
                aria-label="Fermer le dialogue"
                className="modal-close-btn"
                onClick={() => setDeleteConfirmId(null)}
              >
                <svg fill="none" height="18" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="18">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <p className="modal-desc">
                Cette action est irréversible. Toutes les réponses et sources associées à cette session seront définitivement effacées.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn-modal-secondary" onClick={() => setDeleteConfirmId(null)}>
                Annuler
              </button>
              <button className="btn-modal-danger" onClick={confirmDeleteChat}>
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar */}
      <nav className="mobile-bottom-nav" aria-label="Navigation mobile">
        <button
          className="mobile-nav-item"
          onClick={() => setSidebarOpen(true)}
        >
          <svg fill="none" height="20" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="20">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span>Discussions</span>
        </button>
        <button
          className="mobile-nav-item"
          onClick={startNewChat}
        >
          <svg fill="none" height="20" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="20">
            <path d="M12 5v14M5 12h14" />
          </svg>
          <span>Nouveau</span>
        </button>
        <button
          className="mobile-nav-item"
          onClick={() => setSilosModalOpen(true)}
        >
          <svg fill="none" height="20" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="20">
            <ellipse cx="12" cy="5" rx="9" ry="3" />
            <path d="M3 5v6c0 1.66 4 3 9 3s9-1.34 9-3V5M3 11v6c0 1.66 4 3 9 3s9-1.34 9-3v-6" />
          </svg>
          <span>Silos</span>
        </button>
      </nav>

      {/* Silos Info Modal */}
      {silosModalOpen && (
        <div className="modal-backdrop" onClick={() => setSilosModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Silos Cliniques AncreMed</h2>
              <button
                aria-label="Fermer le dialogue"
                className="modal-close-btn"
                onClick={() => setSilosModalOpen(false)}
              >
                <svg fill="none" height="18" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="18">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <p className="modal-desc">
                AncreMed interroge une base locale de 76 303 fiches réparties dans les silos réglementaires suivants :
              </p>
              <div className="silo-info-list">
                <div className="silo-info-item">
                  <span className="silo-info-badge badge-has">HAS</span>
                  <div>
                    <h4>Haute Autorité de Santé</h4>
                    <p>Recommandations de bonne pratique, évaluations des médicaments (SMR) et transcriptions officielles.</p>
                  </div>
                </div>
                <div className="silo-info-item">
                  <span className="silo-info-badge badge-ansm">ANSM</span>
                  <div>
                    <h4>Base de Données BDPM</h4>
                    <p>Spécialités pharmaceutiques (dénominations, substances actives, dosages, taux de remboursement).</p>
                  </div>
                </div>
                <div className="silo-info-item">
                  <span className="silo-info-badge badge-edn">EDN</span>
                  <div>
                    <h4>Collèges des Enseignants</h4>
                    <p>Questions cliniques, cas pratiques et grilles d'évaluation pour la préparation de l'EDN.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-modal-primary" onClick={() => setSilosModalOpen(false)}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }

        html {
          background: #fafafa;
        }

        body {
          margin: 0;
          color: #21313a;
          background: #fafafa;
          font-family:
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        button,
        input {
          font: inherit;
        }

        button {
          cursor: pointer;
        }

        button:disabled,
        input:disabled {
          cursor: not-allowed;
        }

        .workspace-shell {
          min-height: 100dvh;
          position: relative;
          overflow: hidden;
          background: #fbfcfb;
        }

        .workspace-shell::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background-image:
            linear-gradient(rgba(0, 92, 83, 0.055) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 92, 83, 0.045) 1px, transparent 1px);
          background-size: 32px 32px;
          mask-image: linear-gradient(to bottom, black 0%, black 70%, transparent 100%);
          opacity: 0.7;
          z-index: 1;
        }

        .app-global-header {
          position: sticky;
          top: 0;
          left: 0;
          right: 0;
          height: 64px;
          border-bottom: 1px solid rgba(134, 148, 144, 0.16);
          background: rgba(251, 252, 251, 0.92);
          backdrop-filter: blur(16px);
          z-index: 110;
        }

        .header-container {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
        }

        .logo-brand {
          font-size: 20px;
          font-weight: 760;
          color: #005c53;
          text-decoration: none;
          letter-spacing: -0.015em;
        }

        .header-nav-menu {
          display: flex;
          align-items: center;
          gap: 24px;
        }

        .nav-menu-link {
          font-size: 13.5px;
          font-weight: 600;
          color: #4a5553;
          text-decoration: none;
          transition: color 160ms ease;
        }

        .nav-menu-link:hover {
          color: #005c53;
        }

        .highlight-btn {
          background: #005c53;
          color: #ffffff;
          padding: 8px 16px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 92, 83, 0.14);
          transition: all 180ms ease;
        }

        .highlight-btn:hover {
          background: #064c45;
          color: #ffffff;
          box-shadow: 0 6px 16px rgba(0, 92, 83, 0.18);
        }

        .app-container {
          display: flex;
          height: calc(100dvh - 64px);
          width: 100%;
          position: relative;
          z-index: 2;
        }

        /* Sidebar Styles */
        .sidebar {
          width: 280px;
          height: calc(100dvh - 64px);
          border-right: 1px solid rgba(134, 148, 144, 0.22);
          background: rgba(245, 246, 245, 0.88);
          backdrop-filter: blur(14px);
          display: flex;
          flex-direction: column;
          padding: 24px 18px 0;
          flex-shrink: 0;
          z-index: 10;
        }

        .sidebar-header {
          display: flex;
          flex-direction: column;
          gap: 20px;
          flex-shrink: 0;
        }

        .sidebar-brand-row {
          display: flex;
          align-items: center;
          justify-content: flex-end;
        }

        .menu-close-btn {
          display: none;
          align-items: center;
          justify-content: center;
          min-width: 32px;
          min-height: 32px;
          background: transparent;
          border: 0;
          color: #64716d;
          padding: 4px;
          border-radius: 8px;
          transition: all 160ms ease;
        }

        .menu-close-btn:hover {
          background: rgba(134, 148, 144, 0.14);
          color: #005c53;
        }

        .btn-new-chat {
          width: 100%;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: 1px solid rgba(0, 92, 83, 0.18);
          border-radius: 12px;
          background: #005c53;
          color: #ffffff;
          font-size: 13.5px;
          font-weight: 620;
          box-shadow: 0 4px 12px rgba(0, 92, 83, 0.12);
          transition: all 180ms ease;
        }

        .btn-new-chat:hover {
          background: #064c45;
          box-shadow: 0 6px 16px rgba(0, 92, 83, 0.18);
        }

        .chat-list {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 6px;
          overflow-y: auto;
          margin-top: 20px;
          padding-right: 4px;
        }

        .chat-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          border-radius: 10px;
          background: transparent;
          cursor: pointer;
          transition: all 180ms ease;
          border: 0;
          text-align: left;
          width: 100%;
        }

        .chat-item:hover {
          background: rgba(134, 148, 144, 0.1);
        }

        .chat-item.active {
          background: rgba(0, 92, 83, 0.08);
        }

        .chat-item-title {
          font-size: 13px;
          font-weight: 580;
          color: #4a5553;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          flex: 1;
          margin-right: 8px;
        }

        .chat-item.active .chat-item-title {
          color: #005c53;
          font-weight: 660;
        }

        .btn-delete-chat {
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: 0;
          color: #9aa4a0;
          padding: 4px;
          border-radius: 6px;
          opacity: 0;
          transition: all 160ms ease;
        }

        .chat-item:hover .btn-delete-chat {
          opacity: 1;
        }

        .btn-delete-chat:hover {
          color: #e74c3c;
          background: rgba(231, 76, 60, 0.08);
        }

        .sidebar-footer {
          flex-shrink: 0;
          margin-top: auto;
          margin-left: -18px;
          margin-right: -18px;
          padding: 12px 18px 18px;
          border-top: 1px solid rgba(134, 148, 144, 0.16);
          background: rgba(238, 240, 239, 0.6);
        }

        .version-tag {
          display: block;
          font-size: 11px;
          color: #9aa4a0;
          font-weight: 600;
          letter-spacing: 0.02em;
          text-align: center;
        }

        /* Mobile Header */
        .mobile-header {
          display: none;
          height: 56px;
          border-bottom: 1px solid rgba(134, 148, 144, 0.2);
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(12px);
          align-items: center;
          justify-content: space-between;
          padding: 0 16px;
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          z-index: 20;
        }

        .menu-toggle-btn,
        .mobile-new-chat-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: 0;
          color: #005c53;
          padding: 6px;
          border-radius: 8px;
        }

        .mobile-logo {
          font-weight: 760;
          font-size: 17px;
          color: #005c53;
          text-decoration: none;
          cursor: pointer;
        }

        /* Main Viewport Styles */
        .main-viewport {
          flex: 1;
          height: 100%;
          min-height: 0;
          display: flex;
          flex-direction: column;
          position: relative;
          min-width: 0;
        }

        /* Idle State Styles */
        .idle-stage {
          min-height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 100px 24px 60px;
          align-items: center;
        }

        .idle-content {
          width: min(720px, 100%);
          text-align: center;
          margin: auto;
        }

        .brand-mark {
          width: 38px;
          height: 38px;
          display: inline-grid;
          place-items: center;
          margin: 0 0 20px;
          border: 1px solid rgba(0, 92, 83, 0.22);
          border-radius: 10px;
          color: #005c53;
          background: rgba(255, 255, 255, 0.82);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
        }

        .idle-content h1 {
          margin: 0;
          color: #005c53;
          font-size: 52px;
          line-height: 1;
          font-weight: 760;
          letter-spacing: -0.01em;
        }

        .subtitle {
          max-width: 580px;
          margin: 18px auto 36px;
          color: #2c3e50;
          font-size: 24px;
          line-height: 1.35;
          font-weight: 420;
        }

        .privacy-anchor {
          color: #8f9996;
          text-align: center;
          font-size: 12.5px;
          line-height: 1.4;
          margin: 0;
        }

        /* Chat Interface Styles */
        .chat-interface {
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: 0;
          width: 100%;
          position: relative;
        }

        .chat-scroller {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          padding: 40px 24px 24px;
          display: flex;
          justify-content: center;
        }

        .chat-scroller-content {
          width: min(860px, 100%);
          display: flex;
          flex-direction: column;
          gap: 28px;
        }

        .chat-spacer {
          height: 110px;
          flex-shrink: 0;
        }

        .message-row {
          display: flex;
          width: 100%;
        }

        .user-row {
          justify-content: flex-end;
        }

        .assistant-row {
          justify-content: flex-start;
        }

        .message-bubble {
          max-width: 90%;
          border-radius: 16px;
          padding: 22px;
          font-size: 15px;
          line-height: 1.6;
          position: relative;
        }

        .user-bubble {
          background: #eef2f1;
          border: 1px solid rgba(134, 148, 144, 0.18);
          color: #21313a;
          font-weight: 560;
          border-top-right-radius: 4px;
          max-width: 70%;
        }

        .assistant-bubble {
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid rgba(134, 148, 144, 0.28);
          box-shadow: 0 10px 30px rgba(25, 42, 38, 0.04);
          color: #2d3d44;
          border-top-left-radius: 4px;
          width: 100%;
        }

        .assistant-badge {
          margin: 0 0 10px;
          color: #697672;
          font-size: 11px;
          font-weight: 780;
          letter-spacing: 0.06em;
        }

        .coverage-indicator {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 6px;
          margin: 0 0 14px;
          color: #4e625e;
          font-size: 11.5px;
          line-height: 1.35;
        }

        .coverage-indicator span {
          display: inline-flex;
          align-items: center;
          min-height: 22px;
          padding: 0 7px;
          border: 1px solid rgba(0, 92, 83, 0.14);
          border-radius: 6px;
          background: rgba(232, 248, 245, 0.5);
        }

        .processing-bubble {
          background: transparent;
          border: 0;
          box-shadow: none;
          padding: 8px 12px;
        }

        .processing-stack {
          display: inline-flex;
          align-items: center;
        }

        .shimmer-line {
          margin: 0;
          color: #005c53;
          font-size: 15px;
          font-weight: 600;
          animation: pulse 1.8s ease-in-out infinite;
        }

        .error-bubble {
          border-color: rgba(231, 76, 60, 0.32);
          background: #fff8f8;
        }

        .error-title {
          margin: 0 0 6px;
          color: #c0392b;
          font-size: 15px;
          font-weight: 720;
        }

        .error-message {
          margin: 0;
          color: #636e72;
          font-size: 13.5px;
        }

        /* Bottom sticky input area */
        .bottom-input-container {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: linear-gradient(to top, #fbfcfb 80%, rgba(251, 252, 251, 0) 100%);
          padding: 24px 24px 20px;
          display: flex;
          justify-content: center;
          z-index: 10;
        }

        .bottom-input-container .input-wrap {
          width: min(860px, 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }

        .privacy-base {
          margin: 0;
          color: #8f9996;
          font-size: 12px;
          text-align: center;
          line-height: 1.4;
        }

        /* Source Section styles in chat turns */
        .msg-sources-section {
          margin-top: 18px;
          border-top: 1px solid rgba(134, 148, 144, 0.18);
          padding-top: 14px;
        }

        .sources-toggle-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: transparent;
          border: 0;
          color: #005c53;
          font-size: 12px;
          font-weight: 700;
          padding: 6px 0;
          transition: color 160ms ease;
        }

        .sources-toggle-btn:hover {
          color: #064c45;
        }

        .msg-sources-list {
          margin-top: 14px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          animation: fade-in 240ms ease both;
        }

        /* Styles replicated from document view */
        .source-card {
          padding: 16px;
          border: 1px solid rgba(134, 148, 144, 0.22);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.7);
        }

        .source-card-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 8px;
        }

        .authority-line {
          margin: 0 0 4px;
          color: #66736f;
          font-size: 11.5px;
          line-height: 1.4;
          font-weight: 650;
        }

        .source-card h3 {
          margin: 0;
          color: #1f3037;
          font-size: 14.5px;
          line-height: 1.35;
          font-weight: 740;
          letter-spacing: 0;
        }

        .card-chip {
          flex: 0 0 auto;
        }

        .source-meta-row {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px 12px;
          margin: 0 0 10px;
          color: #66736f;
          font-size: 11.5px;
          line-height: 1.4;
        }

        .source-meta-row a {
          color: #005c53;
          text-decoration: none;
          border-bottom: 1px solid rgba(0, 92, 83, 0.3);
          word-break: break-all;
        }

        .source-meta-row a:hover {
          border-bottom-color: #005c53;
        }

        .doc-quotes-container {
          display: flex;
          flex-direction: column;
          gap: 14px;
          margin-top: 10px;
        }

        .quote-item-wrapper {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding-top: 10px;
          border-top: 1px dashed rgba(134, 148, 144, 0.16);
        }

        .quote-item-wrapper:first-child {
          border-top: 0;
          padding-top: 0;
        }

        .quote-item-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 4px;
        }

        .quote-number-badge {
          color: #005c53;
          font-size: 10px;
          font-weight: 750;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .quote-item-meta {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .quote-meta-tag {
          display: inline-flex;
          align-items: center;
          height: 18px;
          padding: 0 6px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 600;
        }

        .quote-page-tag {
          color: #495057;
          background: #e9ecef;
        }

        .quote-confidence-tag {
          color: #1e7e34;
          background: #d4edda;
          border: 1px solid rgba(40, 167, 69, 0.12);
        }

        .source-card blockquote {
          margin: 0;
          padding: 12px 14px;
          border-left: 3px solid #2ecc71;
          border-radius: 6px;
          color: #2b3a41;
          background: rgba(232, 248, 245, 0.38);
          font-size: 13.5px;
          line-height: 1.58;
        }

        .query-form {
          position: relative;
          width: 100%;
          min-height: 64px;
          display: flex;
          align-items: flex-end;
          border: 1px solid rgba(126, 141, 136, 0.38);
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.92);
          box-shadow: 0 12px 32px rgba(25, 42, 38, 0.05);
          overflow: hidden;
          padding: 8px 64px 8px 0;
          transition:
            border-color 180ms ease,
            box-shadow 180ms ease,
            transform 180ms ease;
        }

        .query-form:focus-within {
          border-color: rgba(0, 92, 83, 0.68);
          box-shadow: 0 16px 36px rgba(25, 42, 38, 0.07);
        }

        .query-form-compact {
          min-height: 52px;
          border-radius: 14px;
          box-shadow: none;
          padding: 6px 54px 6px 0;
        }

        .query-input {
          width: 100%;
          min-height: 24px;
          max-height: 160px;
          border: 0;
          outline: 0;
          padding: 10px 10px 10px 24px;
          color: #21313a;
          background: transparent;
          font-size: 15px;
          line-height: 1.5;
          resize: none;
          overflow-y: auto;
          display: block;
        }

        .query-form-compact .query-input {
          padding: 8px 8px 8px 18px;
          font-size: 14px;
          max-height: 120px;
        }

        .query-input::placeholder {
          color: #9aa4a0;
        }

        .query-submit {
          position: absolute;
          right: 10px;
          bottom: 10px;
          width: 44px;
          height: 44px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(0, 92, 83, 0.24);
          border-radius: 12px;
          color: #ffffff;
          background: #005c53;
          cursor: pointer;
          transition:
            opacity 160ms ease,
            transform 160ms ease,
            background 160ms ease;
        }

        .query-submit:hover:not(:disabled) {
          background: #074e48;
        }

        .query-submit:active:not(:disabled) {
          transform: scale(0.96);
        }

        .query-submit:disabled {
          opacity: 0.38;
        }

        .query-form-compact .query-submit {
          width: 38px;
          height: 38px;
          right: 7px;
          bottom: 7px;
          border-radius: 10px;
        }

        .submit-spinner {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .workspace-shell {
          min-height: 100dvh;
          position: relative;
          overflow: hidden;
          background: #fafbfa;
        }

        .workspace-shell::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: radial-gradient(circle at 80% 20%, rgba(0, 92, 83, 0.035) 0%, transparent 50%),
                      radial-gradient(circle at 10% 80%, rgba(46, 204, 113, 0.02) 0%, transparent 40%);
          z-index: 1;
        }

        .app-global-header {
          position: sticky;
          top: 0;
          left: 0;
          right: 0;
          height: 64px;
          border-bottom: 1px solid rgba(134, 148, 144, 0.12);
          background: rgba(251, 252, 251, 0.85);
          backdrop-filter: blur(12px);
          z-index: 110;
        }

        .header-container {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
        }

        .logo-brand {
          font-size: 20px;
          font-weight: 800;
          color: #005c53;
          text-decoration: none;
          letter-spacing: -0.02em;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .header-nav-menu {
          display: flex;
          align-items: center;
          gap: 24px;
        }

        .nav-menu-link {
          font-size: 13.5px;
          font-weight: 500;
          color: #4a5553;
          text-decoration: none;
          transition: color 160ms ease;
        }

        .nav-menu-link:hover {
          color: #005c53;
        }

        .highlight-btn {
          background: #005c53;
          color: #ffffff;
          padding: 8px 16px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 92, 83, 0.14);
          transition: all 180ms ease;
        }

        .highlight-btn:hover {
          background: #064c45;
          color: #ffffff;
          box-shadow: 0 6px 16px rgba(0, 92, 83, 0.18);
        }

        .app-container {
          display: flex;
          height: calc(100dvh - 64px);
          width: 100%;
          position: relative;
          z-index: 2;
        }

        /* Sidebar Styles */
        .sidebar {
          width: 280px;
          height: calc(100dvh - 64px);
          border-right: 1px solid rgba(134, 148, 144, 0.16);
          background: rgba(246, 248, 247, 0.85);
          backdrop-filter: blur(14px);
          display: flex;
          flex-direction: column;
          padding: 20px 16px 0;
          flex-shrink: 0;
          z-index: 10;
        }

        .sidebar-header {
          display: flex;
          flex-direction: column;
          gap: 16px;
          flex-shrink: 0;
        }

        .sidebar-top-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          width: 100%;
        }

        .btn-new-chat-compact {
          flex: 1;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: flex-start;
          gap: 6px;
          padding: 0 12px;
          border: 1px solid rgba(0, 92, 83, 0.12);
          border-radius: 8px;
          background: #ffffff;
          color: #005c53;
          font-size: 12px;
          font-weight: 600;
          box-shadow: 0 2px 5px rgba(0, 92, 83, 0.03);
          transition: all 180ms ease;
          white-space: nowrap;
          overflow: hidden;
        }

        .btn-new-chat-compact:hover {
          background: #f4faf8;
          border-color: rgba(0, 92, 83, 0.24);
          transform: translateY(-0.5px);
        }

        .btn-new-chat-compact:active {
          transform: translateY(0);
        }

        .menu-close-btn {
          display: none;
          align-items: center;
          justify-content: center;
          min-width: 32px;
          min-height: 32px;
          background: transparent;
          border: 0;
          color: #64716d;
          padding: 4px;
          border-radius: 8px;
          transition: all 160ms ease;
        }

        .menu-close-btn:hover {
          background: rgba(134, 148, 144, 0.14);
          color: #005c53;
        }

        .chat-list {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 14px;
          overflow-y: auto;
          margin-top: 16px;
          padding-right: 4px;
        }

        .chat-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .chat-group-label {
          font-size: 11px;
          font-weight: 700;
          color: #8c9895;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 0 0 6px 8px;
        }

        .chat-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 10px;
          border-radius: 8px;
          background: transparent;
          cursor: pointer;
          transition: all 180ms ease;
          border: 0;
          text-align: left;
          width: 100%;
        }

        .chat-item:hover {
          background: rgba(134, 148, 144, 0.08);
        }

        .chat-item.active {
          background: rgba(0, 92, 83, 0.06);
        }

        .chat-item-title {
          font-size: 13px;
          font-weight: 500;
          color: #4a5553;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          flex: 1;
          margin-right: 8px;
        }

        .chat-item.active .chat-item-title {
          color: #005c53;
          font-weight: 600;
        }

        .btn-delete-chat {
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: 0;
          color: #9aa4a0;
          padding: 4px;
          border-radius: 6px;
          opacity: 0;
          transition: all 160ms ease;
        }

        .chat-item:hover .btn-delete-chat {
          opacity: 1;
        }

        .btn-delete-chat:hover {
          color: #e74c3c;
          background: rgba(231, 76, 60, 0.08);
        }

        .sidebar-empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 32px 16px;
          color: #8c9895;
          gap: 10px;
        }

        .sidebar-empty-state p {
          margin: 0;
          font-size: 12px;
          line-height: 1.4;
        }

        .sidebar-footer {
          flex-shrink: 0;
          margin-top: auto;
          margin-left: -16px;
          margin-right: -16px;
          padding: 12px 16px 16px;
          border-top: 1px solid rgba(134, 148, 144, 0.1);
          background: rgba(238, 240, 239, 0.4);
        }

        .version-tag {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-size: 11px;
          color: #8c9895;
          font-weight: 600;
          letter-spacing: 0.02em;
          text-align: center;
        }

        /* Mobile Header */
        .mobile-header {
          display: none;
          height: 56px;
          border-bottom: 1px solid rgba(134, 148, 144, 0.16);
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(12px);
          align-items: center;
          justify-content: space-between;
          padding: 0 16px;
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          z-index: 20;
        }

        .menu-toggle-btn,
        .mobile-new-chat-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: 0;
          color: #005c53;
          padding: 6px;
          border-radius: 8px;
        }

        .mobile-logo {
          font-weight: 800;
          font-size: 17px;
          color: #005c53;
          text-decoration: none;
          cursor: pointer;
        }

        /* Main Viewport Styles */
        .main-viewport {
          flex: 1;
          height: 100%;
          min-height: 0;
          display: flex;
          flex-direction: column;
          position: relative;
          min-width: 0;
        }

        /* Idle State Styles */
        .idle-stage {
          min-height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 80px 24px 40px;
          align-items: center;
        }

        .idle-content {
          width: min(680px, 100%);
          text-align: center;
          margin: auto;
        }

        .brand-mark-premium {
          width: 64px;
          height: 64px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 24px;
          background: #ffffff;
          border-radius: 18px;
          box-shadow: 0 8px 24px rgba(0, 92, 83, 0.06);
          border: 1px solid rgba(0, 92, 83, 0.08);
          animation: float 6s ease-in-out infinite;
        }

        .brand-logo-svg {
          width: 36px;
          height: 36px;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }

        .idle-content h1 {
          margin: 0;
          color: #1a2a26;
          font-size: 38px;
          line-height: 1.15;
          font-weight: 800;
          letter-spacing: -0.03em;
        }

        .subtitle {
          max-width: 480px;
          margin: 12px auto 32px;
          color: #5c6a6f;
          font-size: 16px;
          line-height: 1.5;
          font-weight: 400;
        }

        /* Chat Interface Styles */
        .chat-interface {
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: 0;
          width: 100%;
          position: relative;
        }

        .chat-scroller {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          padding: 40px 24px 24px;
          display: flex;
          justify-content: center;
        }

        .chat-scroller-content {
          width: min(800px, 100%);
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .chat-spacer {
          height: 120px;
          flex-shrink: 0;
        }

        .message-row {
          display: flex;
          width: 100%;
        }

        .user-row {
          justify-content: flex-end;
        }

        .assistant-row {
          justify-content: flex-start;
        }

        .message-bubble {
          max-width: 85%;
          border-radius: 16px;
          padding: 20px;
          font-size: 15px;
          line-height: 1.6;
          position: relative;
        }

        .user-bubble {
          background: #eef2f0;
          border: 1px solid rgba(134, 148, 144, 0.12);
          color: #1a2a26;
          font-weight: 500;
          border-top-right-radius: 4px;
        }

        .assistant-bubble {
          background: #ffffff;
          border: 1px solid rgba(134, 148, 144, 0.16);
          box-shadow: 0 4px 20px rgba(25, 42, 38, 0.02);
          color: #2c3539;
          border-top-left-radius: 4px;
          width: 100%;
          max-width: 100%;
        }

        .assistant-bubble-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
          border-bottom: 1px solid rgba(134, 148, 144, 0.08);
          padding-bottom: 8px;
        }

        .assistant-badge-premium {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin: 0;
          color: #005c53;
          background: rgba(0, 92, 83, 0.05);
          border: 1px solid rgba(0, 92, 83, 0.1);
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.05em;
        }

        .badge-shield-icon {
          color: #005c53;
        }

        .btn-copy-response {
          background: transparent;
          border: 0;
          color: #8c9895;
          padding: 6px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 160ms ease;
        }

        .btn-copy-response:hover {
          color: #005c53;
          background: rgba(0, 92, 83, 0.05);
        }

        .copy-status-text {
          font-size: 11px;
          font-weight: 600;
          color: #2ecc71;
        }

        .coverage-indicator {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 6px;
          margin: 0 0 16px;
        }

        .coverage-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          min-height: 22px;
          padding: 0 8px;
          border: 1px solid rgba(134, 148, 144, 0.16);
          border-radius: 6px;
          background: #f8f9f8;
          color: #5c6a6f;
          font-size: 11px;
          font-weight: 600;
        }

        /* Loading Skeleton Screens */
        .processing-bubble-premium {
          background: #ffffff;
          border: 1px solid rgba(0, 92, 83, 0.12);
          box-shadow: 0 4px 20px rgba(0, 92, 83, 0.03);
          width: 100%;
        }

        .progressive-loading-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .loading-steps-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          border-bottom: 1px dashed rgba(134, 148, 144, 0.16);
          padding-bottom: 16px;
        }

        .loading-step-item {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13.5px;
          color: #8c9895;
          transition: color 300ms ease;
        }

        .loading-step-item.step-active {
          color: #005c53;
          font-weight: 600;
        }

        .loading-step-item.step-completed {
          color: #2ecc71;
          font-weight: 500;
        }

        .step-icon {
          width: 22px;
          height: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #f1f3f2;
          font-size: 11px;
          font-weight: bold;
        }

        .step-active .step-icon {
          background: rgba(0, 92, 83, 0.1);
          color: #005c53;
        }

        .step-completed .step-icon {
          background: rgba(46, 204, 113, 0.1);
          color: #2ecc71;
        }

        .step-pulse-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background-color: #005c53;
          animation: dot-pulse 1.2s ease-in-out infinite;
        }

        @keyframes dot-pulse {
          0%, 100% { transform: scale(0.6); opacity: 0.4; }
          50% { transform: scale(1.2); opacity: 1; }
        }

        .skeleton-paragraphs-container {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .skeleton-line {
          height: 14px;
          border-radius: 4px;
          background: linear-gradient(90deg, #f0f2f1 25%, #e1e4e3 50%, #f0f2f1 75%);
          background-size: 200% 100%;
        }

        .skeleton-line.line-1 { width: 90%; }
        .skeleton-line.line-2 { width: 75%; }
        .skeleton-line.line-3 { width: 45%; }

        .animate-shimmer {
          animation: shimmer-swipe 1.6s infinite linear;
        }

        @keyframes shimmer-swipe {
          from { background-position: 200% 0; }
          to { background-position: -200% 0; }
        }

        .error-bubble {
          border-color: rgba(231, 76, 60, 0.2);
          background: #fffafa;
        }

        .error-title {
          margin: 0 0 6px;
          color: #c0392b;
          font-size: 15px;
          font-weight: 600;
        }

        .error-message {
          margin: 0;
          color: #7f8c8d;
          font-size: 13.5px;
        }

        /* Floating Scroll Bottom Button */
        .floating-scroll-bottom-btn {
          position: absolute;
          bottom: 110px;
          right: 32px;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #ffffff;
          border: 1px solid rgba(134, 148, 144, 0.2);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          color: #005c53;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 90;
          transition: all 160ms ease;
          animation: fade-in 200ms ease both;
        }

        .floating-scroll-bottom-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0, 92, 83, 0.12);
        }

        /* Bottom sticky input area */
        .bottom-input-container {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: linear-gradient(to top, #fafbfa 80%, rgba(250, 251, 250, 0) 100%);
          padding: 24px 24px 20px;
          display: flex;
          justify-content: center;
          z-index: 10;
        }

        .bottom-input-container .input-wrap {
          width: min(800px, 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }

        .privacy-base {
          margin: 0;
          color: #8f9996;
          font-size: 12px;
          text-align: center;
          line-height: 1.4;
        }

        /* Source Section styles in chat turns */
        .msg-sources-section {
          margin-top: 18px;
          border-top: 1px solid rgba(134, 148, 144, 0.12);
          padding-top: 14px;
        }

        .sources-toggle-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: transparent;
          border: 0;
          color: #005c53;
          font-size: 12px;
          font-weight: 600;
          padding: 6px 0;
          transition: color 160ms ease;
        }

        .sources-toggle-btn:hover {
          color: #064c45;
        }

        .toggle-chevron-icon {
          transition: transform 200ms ease;
        }

        .msg-sources-list {
          margin-top: 14px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          animation: fade-in 240ms ease both;
        }

        /* Source Cards */
        .source-card {
          padding: 16px;
          border: 1px solid rgba(134, 148, 144, 0.16);
          border-radius: 10px;
          background: #fbfcfb;
        }

        .source-card-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 8px;
        }

        .authority-line {
          margin: 0 0 4px;
          color: #7f8c8d;
          font-size: 11px;
          font-weight: 600;
        }

        .source-card h3 {
          margin: 0;
          color: #1a2a26;
          font-size: 14px;
          line-height: 1.4;
          font-weight: 700;
        }

        .card-chip {
          flex: 0 0 auto;
        }

        .source-chip {
          display: inline-flex;
          align-items: center;
          padding: 2px 6px;
          border-radius: 4px;
          background: #eef2f0;
          color: #5c6a6f;
          font-size: 9.5px;
          font-weight: 700;
          border: 1px solid rgba(134, 148, 144, 0.1);
        }

        .source-meta-row {
          margin: 4px 0 10px;
        }

        .source-external-link {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          color: #005c53;
          text-decoration: none;
          font-size: 11.5px;
          font-weight: 600;
          border-bottom: 1.5px solid rgba(0, 92, 83, 0.15);
          transition: all 160ms ease;
          padding-bottom: 1px;
        }

        .source-external-link:hover {
          color: #064c45;
          border-bottom-color: #064c45;
        }

        .doc-quotes-container {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 12px;
        }

        .quote-item-wrapper {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding-top: 10px;
          border-top: 1px dashed rgba(134, 148, 144, 0.12);
        }

        .quote-item-wrapper:first-child {
          border-top: 0;
          padding-top: 0;
        }

        .quote-item-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 4px;
        }

        .quote-number-badge {
          color: #7f8c8d;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }

        .quote-item-meta {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .quote-meta-tag {
          display: inline-flex;
          align-items: center;
          height: 18px;
          padding: 0 6px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 600;
        }

        .quote-page-tag {
          color: #495057;
          background: #e9ecef;
        }

        .quote-confidence-tag {
          border: 1px solid transparent;
        }

        .source-card blockquote {
          margin: 0;
          padding: 10px 12px;
          border-left: 3px solid #2ecc71;
          border-radius: 4px;
          color: #2c3539;
          background: rgba(46, 204, 113, 0.04);
          font-size: 13px;
          line-height: 1.5;
        }

        .privacy-anchor {
          color: #8c9895;
          text-align: center;
          font-size: 12.5px;
          line-height: 1.4;
          margin: 0;
        }

        .clinical-copy {
          color: #2c3539;
        }

        .clinical-heading {
          margin: 24px 0 8px;
          color: #1a2a26;
          font-size: 16px;
          line-height: 1.4;
          font-weight: 700;
        }

        .clinical-heading:first-child {
          margin-top: 0;
        }

        .clinical-paragraph {
          margin: 0 0 12px;
          font-size: 14.5px;
          line-height: 1.65;
        }

        .clinical-list {
          margin: 0 0 16px;
          padding-left: 20px;
        }

        .clinical-list li {
          margin: 6px 0;
          font-size: 14.5px;
          line-height: 1.6;
        }

        .citation-tag {
          display: inline-flex;
          align-items: center;
          min-height: 20px;
          margin: 0 3px;
          padding: 0 5px;
          border: 1px solid rgba(0, 92, 83, 0.16);
          border-radius: 5px;
          color: #005c53;
          background: rgba(0, 92, 83, 0.04);
          font-size: 11px;
          font-weight: 700;
          vertical-align: 0.5px;
        }

        .clinical-bold {
          color: #003a34;
          font-weight: 600;
        }

        /* Animations */
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }

        @keyframes fade-in {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .fade-in-up {
          animation: fade-in-up-anim 350ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        @keyframes fade-in-up-anim {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes lift-in {
          from { opacity: 0; transform: scale(0.96) translateY(16px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }

        /* Sidebar transition and collapse */
        .sidebar {
          transition: width 240ms cubic-bezier(0.16, 1, 0.3, 1), padding 240ms, opacity 240ms;
        }
        .sidebar.collapsed {
          width: 0;
          padding-left: 0;
          padding-right: 0;
          opacity: 0;
          border-right: none;
          pointer-events: none;
        }
        .sidebar-controls {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .btn-collapse-sidebar {
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 32px;
          min-height: 32px;
          background: transparent;
          border: 0;
          color: #64716d;
          padding: 6px;
          border-radius: 8px;
          transition: all 160ms ease;
        }
        .btn-collapse-sidebar:hover {
          background: rgba(134, 148, 144, 0.14);
          color: #005c53;
        }
        .floating-expand-btn {
          position: fixed;
          top: 78px;
          left: 18px;
          z-index: 120;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          background: rgba(255, 255, 255, 0.96);
          border: 1px solid rgba(134, 148, 144, 0.28);
          border-radius: 10px;
          color: #005c53;
          box-shadow: 0 4px 14px rgba(25, 42, 38, 0.1);
          transition: all 180ms ease;
          animation: fade-in 180ms ease both;
        }
        .floating-expand-btn:hover {
          background: #ffffff;
          transform: scale(1.05);
          box-shadow: 0 6px 18px rgba(0, 92, 83, 0.16);
        }

        /* Mobile bottom navigation */
        .mobile-bottom-nav {
          display: none;
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: 64px;
          background: rgba(255, 255, 255, 0.88);
          backdrop-filter: blur(16px);
          border-top: 1px solid rgba(134, 148, 144, 0.16);
          justify-content: space-around;
          align-items: center;
          z-index: 90;
          padding: 0 8px;
        }
        .mobile-nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          background: transparent;
          border: 0;
          color: #64716d;
          font-size: 10.5px;
          font-weight: 600;
          padding: 4px 12px;
          border-radius: 8px;
          transition: all 160ms ease;
          flex: 1;
        }
        .mobile-nav-item:active {
          background: rgba(0, 92, 83, 0.06);
          color: #005c53;
        }
        .mobile-nav-item svg {
          transition: transform 160ms ease;
        }
        .mobile-nav-item:active svg {
          transform: scale(1.1);
        }

        /* Modal styling */
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 200;
          animation: fade-in 200ms ease both;
        }
        .modal-card {
          width: min(520px, 92%);
          background: #ffffff;
          border: 1px solid rgba(134, 148, 144, 0.18);
          border-radius: 16px;
          box-shadow: 0 24px 64px rgba(25, 42, 38, 0.12);
          display: flex;
          flex-direction: column;
          animation: lift-in 280ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .modal-card-small {
          width: min(400px, 92%);
        }
        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid rgba(134, 148, 144, 0.1);
        }
        .modal-header h2 {
          margin: 0;
          font-size: 16px;
          font-weight: 700;
          color: #1a2a26;
        }
        .modal-close-btn {
          background: transparent;
          border: 0;
          color: #64716d;
          padding: 4px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .modal-close-btn:hover {
          background: rgba(134, 148, 144, 0.1);
        }
        .modal-body {
          padding: 20px;
          overflow-y: auto;
          max-height: 60vh;
        }
        .modal-desc {
          margin: 0;
          font-size: 13.5px;
          color: #5c6a6f;
          line-height: 1.5;
        }
        .silo-info-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .silo-info-item {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          padding: 12px;
          background: #fafbfa;
          border: 1px solid rgba(134, 148, 144, 0.14);
          border-radius: 10px;
        }
        .silo-info-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 20px;
          padding: 0 6px;
          border-radius: 4px;
          font-size: 9.5px;
          font-weight: 750;
          text-transform: uppercase;
        }
        .badge-has {
          color: #0c8599;
          background: #e3fafc;
          border: 1px solid rgba(12, 133, 153, 0.15);
        }
        .badge-ansm {
          color: #3b5bdb;
          background: #edf2ff;
          border: 1px solid rgba(59, 91, 219, 0.15);
        }
        .badge-edn {
          color: #099268;
          background: #e6fcf5;
          border: 1px solid rgba(9, 146, 104, 0.15);
        }
        .silo-info-item h4 {
          margin: 0 0 3px;
          font-size: 13.5px;
          font-weight: 700;
          color: #1f3037;
        }
        .silo-info-item p {
          margin: 0;
          font-size: 12px;
          color: #64716d;
          line-height: 1.45;
        }
        .modal-footer {
          padding: 12px 20px;
          border-top: 1px solid rgba(134, 148, 144, 0.1);
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }
        .btn-modal-primary {
          background: #005c53;
          border: 0;
          color: #ffffff;
          padding: 8px 18px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
        }
        .btn-modal-primary:hover {
          background: #064c45;
        }
        .btn-modal-secondary {
          background: #f8f9f8;
          border: 1px solid rgba(134, 148, 144, 0.2);
          color: #5c6a6f;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
        }
        .btn-modal-secondary:hover {
          background: #f1f3f2;
          color: #2c3539;
        }
        .btn-modal-danger {
          background: #e74c3c;
          border: 0;
          color: #ffffff;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
        }
        .btn-modal-danger:hover {
          background: #c0392b;
        }

        /* Responsiveness and break points */
        @media (max-width: 920px) {
          .app-global-header {
            display: none !important;
          }

          .app-container {
            height: 100dvh !important;
          }

          .mobile-header {
            display: flex;
          }

          .sidebar {
            position: fixed;
            left: -280px;
            top: 0;
            bottom: 0;
            height: 100dvh !important;
            transition: left 240ms cubic-bezier(0.16, 1, 0.3, 1);
            z-index: 150;
            box-shadow: 10px 0 40px rgba(0, 0, 0, 0.12);
          }

          .sidebar.open {
            left: 0;
          }

          .menu-close-btn {
            display: flex;
          }

          .btn-collapse-sidebar,
          .floating-expand-btn {
            display: none !important;
          }

          .sidebar-backdrop {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.24);
            backdrop-filter: blur(4px);
            z-index: 140;
            animation: fade-in 200ms ease both;
          }

          .main-viewport {
            height: 100dvh;
            padding-top: 56px;
          }

          .idle-stage {
            padding: 40px 18px 80px;
          }

          .idle-content h1 {
            font-size: 34px;
          }

          .subtitle {
            font-size: 15px;
            margin-bottom: 24px;
          }

          .chat-scroller {
            padding: 20px 16px 20px;
          }

          .message-bubble {
            max-width: 95%;
            padding: 16px;
          }

          .user-bubble {
            max-width: 85%;
          }

          .bottom-input-container {
            bottom: 64px;
            padding: 16px 16px 12px;
          }

          .mobile-bottom-nav {
            display: flex;
          }

          .chat-spacer {
            height: 160px;
          }
        }

        @media (max-width: 640px) {
          .idle-content h1 {
            font-size: 28px;
          }

          .query-form {
            border-radius: 16px;
          }

          .query-input {
            padding-left: 18px;
            padding-right: 64px;
            font-size: 14px;
          }

          .query-submit {
            width: 38px;
            height: 38px;
            right: 10px;
            border-radius: 10px;
          }

          .privacy-anchor {
            bottom: 18px;
            font-size: 12px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            animation-duration: 1ms !important;
            animation-iteration-count: 1 !important;
            scroll-behavior: auto !important;
            transition-duration: 1ms !important;
          }
        }
      `}</style>
    </main>
  );
}
