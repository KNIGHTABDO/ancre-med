"use client";

import type { FormEvent, ReactNode } from "react";
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
  readonly qdrant_score: number;
  readonly cosine_similarity: number;
}

interface RouterPayload {
  readonly injected_context: readonly RetrievedContextChunk[];
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

const PRIVACY_NOTICE =
  "Aucune donnée identifiante relative aux patients ne doit figurer dans vos questions.";

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
    qdrant_score: readRequiredNumber(value, "qdrant_score"),
    cosine_similarity: readRequiredNumber(value, "cosine_similarity"),
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
  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    void onSubmit();
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
      <input
        autoComplete="off"
        className="query-input"
        disabled={disabled}
        id={compact ? "medical-query-compact" : "medical-query"}
        onChange={(event) => onValueChange(event.target.value)}
        placeholder="Posez une question médicale..."
        spellCheck={true}
        type="text"
        value={value}
      />
      <button
        aria-label="Envoyer la question"
        className="query-submit"
        disabled={disabled || value.trim().length === 0}
        type="submit"
      >
        <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
          <path
            d="M5 12h13M13 6l6 6-6 6"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </svg>
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

export default function HomePage(): JSX.Element {
  const [inputValue, setInputValue] = useState<string>("");
  const [chats, setChats] = useState<readonly Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [expandedSourceMsgId, setExpandedSourceMsgId] = useState<string | null>(null);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState<boolean>(true);
  const [silosModalOpen, setSilosModalOpen] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

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

  const lastMessageContent = activeChat?.messages[activeChat.messages.length - 1]?.content;
  const lastMessageProcessing = activeChat?.messages[activeChat.messages.length - 1]?.processing;

  useEffect(() => {
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
    return () => clearTimeout(timer);
  }, [activeChat?.messages.length, lastMessageContent, lastMessageProcessing, expandedSourceMsgId]);

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

  function deleteChat(id: string, event: React.MouseEvent): void {
    event.stopPropagation();
    const updated = chats.filter((c) => c.id !== id);
    setChats(updated);
    saveChats(updated);
    if (activeChatId === id) {
      setActiveChatId(updated.length > 0 && updated[0] ? updated[0].id : null);
    }
  }

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
            <Link href="/terms" className="nav-menu-link">
              CGU
            </Link>
            <Link href="/privacy" className="nav-menu-link">
              Confidentialité
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
            <div className="sidebar-brand-row">
              <p className="sidebar-brand">AncreMed</p>
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
            <button className="btn-new-chat" onClick={startNewChat}>
              <svg fill="none" height="16" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" width="16">
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span>Nouvelle discussion</span>
            </button>
          </div>

          <div className="chat-list">
            {chats.map((c) => (
              <button
                className={`chat-item ${c.id === activeChatId ? "active" : ""}`}
                key={c.id}
                onClick={() => {
                  setActiveChatId(c.id);
                  setSidebarOpen(false);
                }}
              >
                <span className="chat-item-title">{c.title}</span>
                <button
                  aria-label="Supprimer la discussion"
                  className="btn-delete-chat"
                  onClick={(e) => deleteChat(c.id, e)}
                >
                  <svg fill="none" height="14" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="14">
                    <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </button>
            ))}
          </div>

          <div className="sidebar-footer">
            <span className="version-tag">Version Clinique 1.0</span>
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
                <p className="brand-mark" aria-hidden="true">
                  AM
                </p>
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
              <div className="chat-scroller">
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
                          <div className="message-bubble assistant-bubble processing-bubble">
                            <div className="processing-stack">
                              <p className="shimmer-line">Analyse de votre question...</p>
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
                      <div className="message-row assistant-row" key={msg.id}>
                        <div className="message-bubble assistant-bubble">
                          <p className="assistant-badge">RÉPONSE CLINIQUE</p>
                          <div className="clinical-response-content">
                            {renderClinicalResponse(msg.content)}
                          </div>

                          {msgGroupedRefs.length > 0 && (
                            <div className="msg-sources-section">
                              <button
                                className={`sources-toggle-btn ${isExpanded ? "active" : ""}`}
                                onClick={() => setExpandedSourceMsgId(isExpanded ? null : msg.id)}
                              >
                                <svg fill="none" height="14" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="14">
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
                                            {doc.date !== null ? ` | ${doc.date}` : ""}
                                          </p>
                                          <h3>{doc.title}</h3>
                                        </div>
                                        <span className="source-chip card-chip">{doc.sourceBadge}</span>
                                      </div>

                                      <div className="source-meta-row">
                                        {doc.href !== null ? (
                                          <a href={doc.href} rel="noreferrer" target="_blank">
                                            {doc.href}
                                          </a>
                                        ) : (
                                          <span>{doc.linkLabel}</span>
                                        )}
                                      </div>

                                      <div className="doc-quotes-container">
                                        {doc.quotes.map((quote, qIndex) => (
                                          <div className="quote-item-wrapper" key={quote.id}>
                                            <div className="quote-item-header">
                                              <span className="quote-number-badge">
                                                Extrait {doc.quotes.length > 1 ? `${qIndex + 1}` : ""}
                                              </span>
                                              <div className="quote-item-meta">
                                                {quote.page !== null && (
                                                  <span className="quote-meta-tag quote-page-tag">Page {quote.page}</span>
                                                )}
                                                <span className="quote-meta-tag quote-confidence-tag">
                                                  Confiance {Math.round(quote.confidenceScore * 100)}%
                                                </span>
                                              </div>
                                            </div>
                                            <blockquote>{quote.exactQuote}</blockquote>
                                          </div>
                                        ))}
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
          max-width: 1100px;
          margin: 0 auto;
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
          justify-content: space-between;
          padding: 24px 18px 18px;
          flex-shrink: 0;
          z-index: 10;
        }

        .sidebar-header {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .sidebar-brand-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .sidebar-brand {
          margin: 0;
          color: #005c53;
          font-size: 22px;
          font-weight: 760;
          letter-spacing: -0.012em;
        }

        .menu-close-btn {
          display: none;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: 0;
          color: #64716d;
          padding: 4px;
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
          border-top: 1px solid rgba(134, 148, 144, 0.14);
          padding-top: 12px;
          margin-top: auto;
        }

        .version-tag {
          font-size: 11px;
          color: #9aa4a0;
          font-weight: 600;
          letter-spacing: 0.02em;
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
          height: 100dvh;
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
          width: 100%;
          position: relative;
        }

        .chat-scroller {
          flex: 1;
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
          height: 72px;
          display: flex;
          align-items: center;
          border: 1px solid rgba(126, 141, 136, 0.42);
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.88);
          box-shadow: 0 18px 42px rgba(25, 42, 38, 0.06);
          overflow: hidden;
          transition:
            border-color 180ms ease,
            box-shadow 180ms ease,
            transform 180ms ease;
        }

        .query-form:focus-within {
          border-color: rgba(0, 92, 83, 0.68);
          box-shadow: 0 22px 48px rgba(25, 42, 38, 0.08);
        }

        .query-form-compact {
          height: 58px;
          border-radius: 14px;
          box-shadow: none;
        }

        .query-input {
          width: 100%;
          height: 100%;
          border: 0;
          outline: 0;
          padding: 0 74px 0 24px;
          color: #21313a;
          background: transparent;
          font-size: 16px;
        }

        .query-form-compact .query-input {
          padding-right: 62px;
          padding-left: 18px;
          font-size: 14px;
        }

        .query-input::placeholder {
          color: #9aa4a0;
        }

        .query-submit {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
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
          transform: translateY(-50%);
        }

        .query-submit:active:not(:disabled) {
          transform: translateY(-50%) scale(0.96);
        }

        .query-submit:disabled {
          opacity: 0.38;
        }

        .query-form-compact .query-submit {
          width: 36px;
          height: 36px;
          right: 10px;
          border-radius: 10px;
        }

        .privacy-anchor {
          position: absolute;
          left: 50%;
          bottom: 26px;
          width: min(680px, calc(100% - 48px));
          margin: 0;
          transform: translateX(-50%);
          color: #8f9996;
          text-align: center;
          font-size: 13px;
          line-height: 1.4;
        }

        .privacy-inline {
          margin: 18px auto 0;
          color: #8f9996;
          font-size: 13px;
          line-height: 1.4;
        }

        .clinical-copy {
          max-width: 860px;
          color: #263840;
        }

        .clinical-heading {
          margin: 28px 0 10px;
          color: #1d3037;
          font-size: 17px;
          line-height: 1.35;
          font-weight: 760;
          letter-spacing: 0;
        }

        .clinical-heading:first-child {
          margin-top: 0;
        }

        .clinical-paragraph {
          margin: 0 0 16px;
          color: #2d3d44;
          font-size: 16px;
          line-height: 1.78;
        }

        .clinical-list {
          margin: 0 0 20px;
          padding-left: 20px;
          color: #2d3d44;
        }

        .clinical-list li {
          margin: 7px 0;
          padding-left: 5px;
          font-size: 16px;
          line-height: 1.68;
        }

        .citation-tag {
          display: inline-flex;
          align-items: center;
          min-height: 21px;
          margin: 0 3px;
          padding: 0 6px;
          border: 1px solid rgba(0, 92, 83, 0.2);
          border-radius: 6px;
          color: #005c53;
          background: #e8f8f5;
          font-size: 12px;
          font-weight: 780;
          vertical-align: 1px;
        }

        .clinical-bold {
          color: #004d45;
          font-weight: 700;
        }

        /* Animations */
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }

        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes lift-in {
          from {
            opacity: 0;
            transform: translateY(24px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
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
          top: 18px;
          left: 18px;
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid rgba(134, 148, 144, 0.28);
          border-radius: 10px;
          color: #005c53;
          box-shadow: 0 4px 14px rgba(25, 42, 38, 0.06);
          transition: all 180ms ease;
          animation: fade-in 180ms ease both;
        }
        .floating-expand-btn:hover {
          background: #ffffff;
          transform: scale(1.05);
          box-shadow: 0 6px 18px rgba(0, 92, 83, 0.12);
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
          border-top: 1px solid rgba(134, 148, 144, 0.2);
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
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 200;
          animation: fade-in 200ms ease both;
        }
        .modal-card {
          width: min(520px, 92%);
          background: #ffffff;
          border: 1px solid rgba(134, 148, 144, 0.28);
          border-radius: 16px;
          box-shadow: 0 24px 64px rgba(25, 42, 38, 0.16);
          display: flex;
          flex-direction: column;
          animation: lift-in 280ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 20px;
          border-bottom: 1px solid rgba(134, 148, 144, 0.14);
        }
        .modal-header h2 {
          margin: 0;
          font-size: 17px;
          font-weight: 760;
          color: #005c53;
        }
        .modal-close-btn {
          background: transparent;
          border: 0;
          color: #64716d;
          padding: 4px;
          border-radius: 6px;
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
          margin: 0 0 16px;
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
          padding: 14px 20px;
          border-top: 1px solid rgba(134, 148, 144, 0.14);
          display: flex;
          justify-content: flex-end;
        }
        .btn-modal-primary {
          background: #005c53;
          border: 0;
          color: #ffffff;
          padding: 8px 18px;
          border-radius: 8px;
          font-size: 13.5px;
          font-weight: 600;
        }
        .btn-modal-primary:hover {
          background: #064c45;
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
            font-size: 42px;
          }

          .subtitle {
            font-size: 20px;
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
            font-size: 34px;
          }

          .query-form {
            height: 64px;
            border-radius: 16px;
          }

          .query-input {
            padding-left: 18px;
            padding-right: 64px;
            font-size: 15px;
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
