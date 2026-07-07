"use client";

import type { FormEvent, ReactNode, ChangeEvent, KeyboardEvent } from "react";
import { useMemo, useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Logo, LogoMark } from "../../components/Logo";
import { LangToggle } from "../../components/LangToggle";
import { useLang, type Lang } from "../../lib/i18n";



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

const PRIVACY_NOTICE: Record<Lang, string> = {
  fr: "Aucune donnée identifiante relative aux patients ne doit figurer dans vos questions.",
  en: "No patient-identifying data may appear in your questions.",
};

const CHAT_UI = {
  fr: {
    navReport: "Rapport scientifique",
    openMenu: "Ouvrir le menu",
    newChatAria: "Nouvelle discussion",
    newChat: "Nouvelle discussion",
    historyAria: "Historique des discussions",
    collapseSidebar: "Réduire la barre latérale",
    expandSidebar: "Développer la barre latérale",
    closeMenu: "Fermer le menu",
    sidebarEmpty: "Posez votre première question pour démarrer",
    deleteChatAria: "Supprimer la discussion",
    chatAreaAria: "Zone de discussion",
    versionTag: "v1.0 — Clinique",
    idleTitle: "Posez votre question clinique",
    idleSubtitle: "Chaque réponse est fondée sur les référentiels HAS, ANSM et EDN, puis vérifiée mot à mot.",
    examples: [
      "Quels sont les critères diagnostiques de la BPCO ?",
      "Dose initiale du tirzépatide chez l'adulte ?",
      "Conduite à tenir devant un qSOFA à 2 ?",
    ],
    inputAria: "Question médicale",
    inputPlaceholder: "Posez une question médicale...",
    sendAria: "Envoyer la question",
    responseStopped: "La réponse a été arrêtée.",
    copyResponse: "Copier la réponse",
    copied: "Copié !",
    sourcesConsulted: (n: number): string => `Sources consultées (${n})`,
    hideSources: "Masquer les sources",
    viewSource: "Consulter la source",
    excerpt: "Extrait",
    pageLabel: "Page",
    attribution: "Attribution",
    coverageSources: (n: number): string => `${n} source${n > 1 ? "s" : ""}`,
    coverageRounds: (n: number): string => `${n} round${n > 1 ? "s" : ""}`,
    coverageChunks: (n: number): string => `${n} extrait${n > 1 ? "s" : ""}`,
    scrollBottomAria: "Défiler vers le bas",
    deleteModalTitle: "Supprimer la discussion ?",
    closeDialogAria: "Fermer le dialogue",
    deleteModalDesc:
      "Cette action est irréversible. Toutes les réponses et sources associées à cette session seront définitivement effacées.",
    cancel: "Annuler",
    confirmDelete: "Supprimer",
    close: "Fermer",
    mobileNavAria: "Navigation mobile",
    mobileNavChats: "Discussions",
    mobileNavNew: "Nouveau",
    mobileNavSilos: "Silos",
    silosModalTitle: "Silos Cliniques AncreMed",
    silosModalDesc:
      "AncreMed interroge une base locale de 76 303 fiches réparties dans les silos réglementaires suivants :",
    siloHasTitle: "Haute Autorité de Santé",
    siloHasDesc: "Recommandations de bonne pratique, évaluations des médicaments (SMR) et transcriptions officielles.",
    siloAnsmTitle: "Base de Données BDPM",
    siloAnsmDesc: "Spécialités pharmaceutiques (dénominations, substances actives, dosages, taux de remboursement).",
    siloEdnTitle: "Collèges des Enseignants",
    siloEdnDesc: "Questions cliniques, cas pratiques et grilles d'évaluation pour la préparation de l'EDN.",
    newQuestionTitle: "Nouvelle question...",
    analysisErrorTitle: "Erreur d'analyse",
    validationInterrupted: "La chaîne de validation clinique a interrompu la requête.",
    dateToday: "Aujourd'hui",
    dateYesterday: "Hier",
    dateWeek: "Cette semaine",
    dateOlder: "Plus ancien",
  },
  en: {
    navReport: "Scientific report",
    openMenu: "Open menu",
    newChatAria: "New chat",
    newChat: "New chat",
    historyAria: "Chat history",
    collapseSidebar: "Collapse sidebar",
    expandSidebar: "Expand sidebar",
    closeMenu: "Close menu",
    sidebarEmpty: "Ask your first question to get started",
    deleteChatAria: "Delete chat",
    chatAreaAria: "Chat area",
    versionTag: "v1.0 — Clinical",
    idleTitle: "Ask your clinical question",
    idleSubtitle: "Every answer is grounded in the HAS, ANSM and EDN references, then verified word for word.",
    examples: [
      "What are the diagnostic criteria for COPD?",
      "Initial tirzepatide dose in adults?",
      "Management of a patient with a qSOFA of 2?",
    ],
    inputAria: "Medical question",
    inputPlaceholder: "Ask a medical question...",
    sendAria: "Send the question",
    responseStopped: "The response was stopped.",
    copyResponse: "Copy response",
    copied: "Copied!",
    sourcesConsulted: (n: number): string => `Sources consulted (${n})`,
    hideSources: "Hide sources",
    viewSource: "View source",
    excerpt: "Excerpt",
    pageLabel: "Page",
    attribution: "Attribution",
    coverageSources: (n: number): string => `${n} source${n > 1 ? "s" : ""}`,
    coverageRounds: (n: number): string => `${n} round${n > 1 ? "s" : ""}`,
    coverageChunks: (n: number): string => `${n} excerpt${n > 1 ? "s" : ""}`,
    scrollBottomAria: "Scroll to bottom",
    deleteModalTitle: "Delete this chat?",
    closeDialogAria: "Close dialog",
    deleteModalDesc:
      "This action is irreversible. All answers and sources associated with this session will be permanently erased.",
    cancel: "Cancel",
    confirmDelete: "Delete",
    close: "Close",
    mobileNavAria: "Mobile navigation",
    mobileNavChats: "Chats",
    mobileNavNew: "New",
    mobileNavSilos: "Silos",
    silosModalTitle: "AncreMed Clinical Silos",
    silosModalDesc:
      "AncreMed queries a local base of 76,303 sheets distributed across the following regulatory silos:",
    siloHasTitle: "Haute Autorité de Santé",
    siloHasDesc: "Best-practice guidelines, drug evaluations (SMR) and official transcriptions.",
    siloAnsmTitle: "BDPM Drug Database",
    siloAnsmDesc: "Pharmaceutical specialties (names, active substances, dosages, reimbursement rates).",
    siloEdnTitle: "Collèges des Enseignants",
    siloEdnDesc: "Clinical questions, practical cases and evaluation grids for EDN preparation.",
    newQuestionTitle: "New question...",
    analysisErrorTitle: "Analysis error",
    validationInterrupted: "The clinical validation chain interrupted this request.",
    dateToday: "Today",
    dateYesterday: "Yesterday",
    dateWeek: "This week",
    dateOlder: "Older",
  },
} as const;

type ChatUi = (typeof CHAT_UI)[Lang];

const SILO_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  has_recommandations: { label: "HAS", color: "var(--tag-has-ink)", bg: "var(--tag-has-bg)" },
  ansm_bdpm_vidal: { label: "ANSM / VIDAL", color: "var(--tag-ansm-ink)", bg: "var(--tag-ansm-bg)" },
  colles_enseignants_edn: { label: "EDN", color: "var(--tag-edn-ink)", bg: "var(--tag-edn-bg)" },
  clinical_formulas: { label: "Formules", color: "var(--tag-form-ink)", bg: "var(--tag-form-bg)" },
  wikipedia_fr: { label: "Wikipédia", color: "var(--tag-neutral-ink)", bg: "var(--tag-neutral-bg)" },
};

type ThinkingPhase = "routing" | "searching" | "direct";

const THINKING_WORDS: Record<Lang, Record<ThinkingPhase, readonly string[]>> = {
  fr: {
    routing: ["Réflexion…", "Analyse de la question…"],
    searching: [
      "Exploration des référentiels…",
      "Lecture des fiches HAS…",
      "Croisement des sources ANSM…",
      "Parcours des collèges EDN…",
      "Vérification mot à mot…",
      "Rédaction clinique…",
    ],
    direct: ["Rédaction…"],
  },
  en: {
    routing: ["Thinking…", "Analyzing the question…"],
    searching: [
      "Exploring the reference bases…",
      "Reading HAS guidelines…",
      "Cross-checking ANSM sources…",
      "Scanning EDN course books…",
      "Verifying word for word…",
      "Drafting the clinical answer…",
    ],
    direct: ["Drafting…"],
  },
};

function formatLocalizedDate(isoDate: string, lang: Lang): string {
  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return isoDate;
    return date.toLocaleDateString(lang === "fr" ? "fr-FR" : "en-GB", {
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
  return { label, color: "var(--tag-neutral-ink)", bg: "var(--tag-neutral-bg)" };
}

function confidenceStyle(score: number): { color: string; bg: string; border: string } {
  if (score >= 0.95) return { color: "var(--ok)", bg: "var(--ok-bg)", border: "var(--ok-border)" };
  if (score >= 0.80) return { color: "var(--warn)", bg: "var(--warn-bg)", border: "var(--warn-border)" };
  return { color: "var(--error)", bg: "var(--error-bg)", border: "var(--error-border)" };
}

function isInternalUrl(value: string): boolean {
  return value.startsWith("hf://") || value.startsWith("file://") || value.startsWith("s3://");
}

interface ChatDateGroup {
  readonly label: string;
  readonly chats: readonly Chat[];
}

function groupChatsByDate(chats: readonly Chat[], t: ChatUi): readonly ChatDateGroup[] {
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
  if (groups.today.length > 0) result.push({ label: t.dateToday, chats: groups.today });
  if (groups.yesterday.length > 0) result.push({ label: t.dateYesterday, chats: groups.yesterday });
  if (groups.week.length > 0) result.push({ label: t.dateWeek, chats: groups.week });
  if (groups.older.length > 0) result.push({ label: t.dateOlder, chats: groups.older });
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

function routerIsConversational(value: unknown): boolean {
  return isRecord(value) && value["success"] === true && value["is_conversational"] === true;
}

async function runGeneration(
  prompt: string,
  routerPayload: RouterPayload,
): Promise<GenerateResponse> {
  return parseGeneratePayload(
    await postJson("/api/generate", {
      query: prompt,
      retrievedContext: routerPayload.injected_context,
      topicClass: routerPayload.primary_class,
      secondaryClass: routerPayload.secondary_class,
      retrievalPlan: routerPayload.retrieval_plan,
      retrievalCoverage: routerPayload.retrieval_coverage,
    }),
  );
}

async function streamDirectAnswer(
  prompt: string,
  onChunk: (accumulated: string) => void,
): Promise<string> {
  const response = await fetch("/api/chat-direct", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok || response.body === null) {
    let detail = "La réponse directe a échoué.";
    try {
      const errJson = (await response.json()) as Record<string, unknown>;
      if (typeof errJson["error"] === "string") detail = errJson["error"];
    } catch {
      /* keep default */
    }
    throw new Error(detail);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let accumulated = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    accumulated += decoder.decode(value, { stream: true });
    onChunk(accumulated);
  }
  accumulated += decoder.decode();
  if (accumulated.trim().length === 0) {
    throw new Error("La réponse directe est vide.");
  }
  return accumulated;
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
  const { lang } = useLang();
  const t = CHAT_UI[lang];

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
      aria-label={t.inputAria}
      className={compact ? "query-form query-form-compact" : "query-form"}
      onSubmit={handleSubmit}
    >
      <label className="sr-only" htmlFor={compact ? "medical-query-compact" : "medical-query"}>
        {t.inputAria}
      </label>
      <textarea
        ref={textareaRef}
        autoComplete="off"
        className="query-input"
        disabled={disabled}
        id={compact ? "medical-query-compact" : "medical-query"}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={t.inputPlaceholder}
        rows={1}
        spellCheck={true}
        value={value}
      />
      <button
        aria-label={t.sendAria}
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
  readonly phase?: ThinkingPhase;
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
  const { lang } = useLang();
  const t = CHAT_UI[lang];
  return (
    <div className="coverage-indicator">
      <span className="coverage-pill">
        <svg fill="none" height="12" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="12"><path d="M9 12l2 2 4-4" /></svg>
        {t.coverageSources(coverage.distinct_sources)}
      </span>
      {coverage.silos_touched.map((silo) => {
        const info = humanizeSiloName(silo);
        return (
          <span
            key={silo}
            className="coverage-pill"
            style={{
              color: info.color,
              background: info.bg,
              borderColor: `color-mix(in srgb, ${info.color} 15%, transparent)`,
            }}
          >
            {info.label}
          </span>
        );
      })}
      <span className="coverage-pill">
        {t.coverageRounds(coverage.rounds_used)}
      </span>
      <span className="coverage-pill">
        {t.coverageChunks(coverage.total_chunks)}
      </span>
    </div>
  );
}

export default function HomePage(): JSX.Element {
  const { lang } = useLang();
  const t = CHAT_UI[lang];
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

  const chatGroups = useMemo(() => groupChatsByDate(chats, t), [chats, t]);

  const isProcessing = activeChat?.messages.some((m) => m.processing) ?? false;

  // Loading step animation
  useEffect(() => {
    if (!isProcessing) {
      setLoadingStepIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setLoadingStepIndex((prev) => prev + 1);
    }, 2400);
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
      phase: "routing",
    };

    let updatedChats: readonly Chat[];

    if (currentChat === null) {
      const newId = `chat-${Date.now()}`;
      const newChat: Chat = {
        id: newId,
        title: t.newQuestionTitle,
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

    function patchAssistantMessage(patch: Partial<Message>): void {
      setChats((prev) =>
        prev.map((c) =>
          c.id === currentChatId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantMsg.id ? { ...m, ...patch } : m,
                ),
              }
            : c,
        ),
      );
    }

    function finalizeAssistantMessage(finalMsg: Message, titleForFirstTurn: string): void {
      setChats((prev) => {
        const next = prev.map((c) => {
          if (c.id !== currentChatId) return c;
          const isFirstTurn = c.messages.length <= 2;
          return {
            ...c,
            title: isFirstTurn ? titleForFirstTurn : c.title,
            messages: c.messages.map((m) => (m.id === assistantMsg.id ? finalMsg : m)),
          };
        });
        saveChats(next);
        return next;
      });
    }

    try {
      const routerRaw = await postJson("/api/router", { prompt });

      if (routerIsConversational(routerRaw)) {
        // Fast conversational path: stream the answer token by token.
        patchAssistantMessage({ phase: "direct" });
        const fullText = await streamDirectAnswer(prompt, (accumulated) => {
          patchAssistantMessage({ content: accumulated });
        });
        finalizeAssistantMessage(
          {
            id: assistantMsg.id,
            role: "assistant",
            content: fullText,
          },
          prompt.length > 48 ? `${prompt.slice(0, 48)}…` : prompt,
        );
        return;
      }

      patchAssistantMessage({ phase: "searching" });
      const routerPayload = parseRouterPayload(routerRaw);
      const generation = await runGeneration(prompt, routerPayload);

      finalizeAssistantMessage(
        {
          id: assistantMsg.id,
          role: "assistant",
          content: generation.payload.reponse_clinique,
          thinking: generation.payload.thinking_trace_fr,
          context: routerPayload.injected_context,
          verified_assertions: generation.payload.verified_assertions,
          coverage: generation.payload.coverage,
        },
        generation.payload.sujet_titre,
      );
      return;
    } catch (error: unknown) {
      const errorMsg: Message = {
        id: assistantMsg.id,
        role: "assistant",
        content: "",
        error:
          error instanceof Error
            ? error.message
            : t.validationInterrupted,
      };

      setChats((prev) => {
        const next = prev.map((c) => {
          if (c.id === currentChatId) {
            return {
              ...c,
              title:
                c.title === CHAT_UI.fr.newQuestionTitle || c.title === CHAT_UI.en.newQuestionTitle
                  ? t.analysisErrorTitle
                  : c.title,
              messages: c.messages.map((m) =>
                m.id === assistantMsg.id ? errorMsg : m
              ),
            };
          }
          return c;
        });
        saveChats(next);
        return next;
      });
    }
  }

  function startNewChat(): void {
    const newId = `chat-${Date.now()}`;
    const newChat: Chat = {
      id: newId,
      title: t.newChat,
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
          <Logo />
          <nav className="header-nav-menu">
            <Link href="/paper" className="nav-menu-link">
              {t.navReport}
            </Link>
            <Link href="/changelog" className="nav-menu-link">
              Changelog
            </Link>
            <LangToggle />
          </nav>
        </div>
      </header>

      {/* Mobile Top Bar */}
      <header className="mobile-header">
        <button
          aria-label={t.openMenu}
          className="menu-toggle-btn"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <svg fill="none" height="24" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="24">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <Link href="/" className="mobile-logo">AncreMed</Link>
        <button
          aria-label={t.newChatAria}
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
        <aside className={`sidebar ${sidebarOpen ? "open" : ""} ${!desktopSidebarOpen ? "collapsed" : ""}`} aria-label={t.historyAria}>
          <div className="sidebar-header">
            <div className="sidebar-top-row">
              <button className="btn-new-chat-compact" onClick={startNewChat}>
                <svg fill="none" height="14" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" width="14">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                <span>{t.newChat}</span>
              </button>

              <div className="sidebar-controls">
                <button
                  aria-label={t.collapseSidebar}
                  className="btn-collapse-sidebar"
                  onClick={() => setDesktopSidebarOpen(false)}
                >
                  <svg fill="none" height="18" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="18">
                    <rect width="18" height="18" x="3" y="3" rx="2" />
                    <path d="M9 3v16M14 15l-3-3 3-3" />
                  </svg>
                </button>
                <button
                  aria-label={t.closeMenu}
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
                <p>{t.sidebarEmpty}</p>
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
                        aria-label={t.deleteChatAria}
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
              {t.versionTag}
            </span>
            <LangToggle />
          </div>
        </aside>

        {/* Overlay backdrop for mobile */}
        {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}

        {/* Main Canvas */}
        <section className={`main-viewport ${!desktopSidebarOpen ? "expanded" : ""}`} aria-label={t.chatAreaAria}>
          {!desktopSidebarOpen && (
            <button
              aria-label={t.expandSidebar}
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
                <div className="idle-brand-mark" aria-hidden="true">
                  <LogoMark size={28} />
                </div>
                <h1>{t.idleTitle}</h1>
                <p className="subtitle">{t.idleSubtitle}</p>
                <div className="idle-input-box">
                  <QueryForm
                    compact={false}
                    disabled={false}
                    onSubmit={submitCurrentPrompt}
                    onValueChange={setInputValue}
                    value={inputValue}
                  />
                </div>
                <div className="idle-examples">
                  {t.examples.map((q) => (
                    <button key={q} className="idle-example-btn" onClick={() => setInputValue(q)}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
              <p className="privacy-anchor">{PRIVACY_NOTICE[lang]}</p>
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

                    if (msg.processing && msg.content.length === 0) {
                      const phase: ThinkingPhase = msg.phase ?? "routing";
                      const words = THINKING_WORDS[lang][phase];
                      const word = words[loadingStepIndex % words.length];
                      return (
                        <div className="message-row assistant-row" key={msg.id}>
                          <div className="message-bubble assistant-bubble processing-bubble-premium">
                            <div className="progressive-loading-container">
                              <div className="thinking-line">
                                <span className="thinking-mark" aria-hidden="true">
                                  <LogoMark size={16} />
                                </span>
                                <span className="thinking-word" key={`${phase}-${loadingStepIndex}`}>
                                  {word}
                                </span>
                              </div>
                              {phase === "searching" && (
                                <div className="skeleton-paragraphs-container">
                                  <div className="skeleton-line line-1 animate-shimmer" />
                                  <div className="skeleton-line line-2 animate-shimmer" />
                                  <div className="skeleton-line line-3 animate-shimmer" />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    }

                    if (msg.processing) {
                      // Streaming direct answer: render partial text live.
                      return (
                        <div className="message-row assistant-row" key={msg.id}>
                          <div className="message-bubble assistant-bubble">
                            <div className="assistant-bubble-header">
                              <p className="assistant-badge-premium">
                                <span className="thinking-mark" aria-hidden="true">
                                  <LogoMark size={13} />
                                </span>
                                AncreMed
                              </p>
                            </div>
                            <div className="clinical-response-content">
                              {renderClinicalResponse(msg.content)}
                              <span className="stream-cursor" aria-hidden="true" />
                            </div>
                          </div>
                        </div>
                      );
                    }

                    if (msg.error) {
                      return (
                        <div className="message-row assistant-row" key={msg.id}>
                          <div className="message-bubble assistant-bubble error-bubble">
                            <p className="error-title">{t.responseStopped}</p>
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
                              <LogoMark size={13} />
                              AncreMed
                            </p>
                            <button
                              className="btn-copy-response"
                              onClick={() => copyResponse(msg.id, msg.content)}
                              title={t.copyResponse}
                            >
                              {copiedMsgId === msg.id ? (
                                <span className="copy-status-text">{t.copied}</span>
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
                                  {isExpanded ? t.hideSources : t.sourcesConsulted(msgGroupedRefs.length)}
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
                                            {doc.date !== null ? ` • ${formatLocalizedDate(doc.date, lang)}` : ""}
                                          </p>
                                          <h3>{doc.title}</h3>
                                        </div>
                                        <span className="source-chip card-chip">{doc.sourceBadge}</span>
                                      </div>

                                      {!isInternalUrl(doc.linkLabel) && doc.href !== null && (
                                        <div className="source-meta-row">
                                          <a href={doc.href} rel="noreferrer" target="_blank" className="source-external-link">
                                            <span>{t.viewSource}</span>
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
                                                  {t.excerpt} {doc.quotes.length > 1 ? `${qIndex + 1}` : ""}
                                                </span>
                                                <div className="quote-item-meta">
                                                  {quote.page !== null && (
                                                    <span className="quote-meta-tag quote-page-tag">{t.pageLabel} {quote.page}</span>
                                                  )}
                                                  <span
                                                    className="quote-meta-tag quote-confidence-tag"
                                                    style={{
                                                      color: confStyle.color,
                                                      background: confStyle.bg,
                                                      borderColor: confStyle.border
                                                    }}
                                                  >
                                                    {t.attribution} {Math.round(quote.confidenceScore * 100)}%
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
                  aria-label={t.scrollBottomAria}
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
                  <p className="privacy-base">{PRIVACY_NOTICE[lang]}</p>
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
              <h2>{t.deleteModalTitle}</h2>
              <button
                aria-label={t.closeDialogAria}
                className="modal-close-btn"
                onClick={() => setDeleteConfirmId(null)}
              >
                <svg fill="none" height="18" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="18">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <p className="modal-desc">{t.deleteModalDesc}</p>
            </div>
            <div className="modal-footer">
              <button className="btn-modal-secondary" onClick={() => setDeleteConfirmId(null)}>
                {t.cancel}
              </button>
              <button className="btn-modal-danger" onClick={confirmDeleteChat}>
                {t.confirmDelete}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar */}
      <nav className="mobile-bottom-nav" aria-label={t.mobileNavAria}>
        <button
          className="mobile-nav-item"
          onClick={() => setSidebarOpen(true)}
        >
          <svg fill="none" height="20" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="20">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span>{t.mobileNavChats}</span>
        </button>
        <button
          className="mobile-nav-item"
          onClick={startNewChat}
        >
          <svg fill="none" height="20" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="20">
            <path d="M12 5v14M5 12h14" />
          </svg>
          <span>{t.mobileNavNew}</span>
        </button>
        <button
          className="mobile-nav-item"
          onClick={() => setSilosModalOpen(true)}
        >
          <svg fill="none" height="20" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="20">
            <ellipse cx="12" cy="5" rx="9" ry="3" />
            <path d="M3 5v6c0 1.66 4 3 9 3s9-1.34 9-3V5M3 11v6c0 1.66 4 3 9 3s9-1.34 9-3v-6" />
          </svg>
          <span>{t.mobileNavSilos}</span>
        </button>
      </nav>

      {/* Silos Info Modal */}
      {silosModalOpen && (
        <div className="modal-backdrop" onClick={() => setSilosModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t.silosModalTitle}</h2>
              <button
                aria-label={t.closeDialogAria}
                className="modal-close-btn"
                onClick={() => setSilosModalOpen(false)}
              >
                <svg fill="none" height="18" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="18">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <p className="modal-desc">{t.silosModalDesc}</p>
              <div className="silo-info-list">
                <div className="silo-info-item">
                  <span className="silo-info-badge badge-has">HAS</span>
                  <div>
                    <h4>{t.siloHasTitle}</h4>
                    <p>{t.siloHasDesc}</p>
                  </div>
                </div>
                <div className="silo-info-item">
                  <span className="silo-info-badge badge-ansm">ANSM</span>
                  <div>
                    <h4>{t.siloAnsmTitle}</h4>
                    <p>{t.siloAnsmDesc}</p>
                  </div>
                </div>
                <div className="silo-info-item">
                  <span className="silo-info-badge badge-edn">EDN</span>
                  <div>
                    <h4>{t.siloEdnTitle}</h4>
                    <p>{t.siloEdnDesc}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-modal-primary" onClick={() => setSilosModalOpen(false)}>
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        /* ============ Shell & header ============ */
        .workspace-shell {
          height: 100vh;
          height: 100dvh;
          display: flex;
          flex-direction: column;
          background: transparent;
          overflow: hidden;
        }

        .app-global-header {
          flex-shrink: 0;
          height: 56px;
          border-bottom: 1px solid var(--glass-border);
          background: var(--glass-bg-strong);
          -webkit-backdrop-filter: blur(var(--blur-lg)) saturate(var(--glass-saturate));
          backdrop-filter: blur(var(--blur-lg)) saturate(var(--glass-saturate));
          box-shadow: inset 0 1px 0 0 var(--glass-highlight);
          z-index: 100;
        }
        .header-container {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 var(--space-5);
        }
        .header-nav-menu {
          display: flex;
          align-items: center;
          gap: var(--space-5);
        }
        .nav-menu-link {
          font-size: var(--text-sm);
          font-weight: 500;
          color: var(--ink-secondary);
          text-decoration: none;
          transition: color var(--dur-fast) var(--ease-in-out);
        }
        .nav-menu-link:hover {
          color: var(--ink);
        }

        /* ============ Mobile top bar ============ */
        .mobile-header {
          display: none;
          flex-shrink: 0;
          height: 52px;
          align-items: center;
          justify-content: space-between;
          padding: 0 var(--space-3);
          border-bottom: 1px solid var(--glass-border);
          background: var(--glass-bg-strong);
          -webkit-backdrop-filter: blur(var(--blur-lg)) saturate(var(--glass-saturate));
          backdrop-filter: blur(var(--blur-lg)) saturate(var(--glass-saturate));
          box-shadow: inset 0 1px 0 0 var(--glass-highlight);
          z-index: 90;
        }
        .menu-toggle-btn,
        .mobile-new-chat-btn {
          background: transparent;
          border: 0;
          color: var(--ink);
          padding: 8px;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
        }
        .menu-toggle-btn:hover,
        .mobile-new-chat-btn:hover {
          background: var(--bg-hover);
        }
        .mobile-logo {
          font-family: var(--font-serif);
          font-size: 19px;
          font-weight: 500;
          color: var(--ink);
          text-decoration: none;
        }

        /* ============ Layout ============ */
        .app-container {
          flex: 1;
          display: flex;
          min-height: 0;
        }

        /* ============ Sidebar ============ */
        .sidebar {
          width: 268px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          background: var(--glass-bg);
          -webkit-backdrop-filter: blur(var(--blur-lg)) saturate(var(--glass-saturate));
          backdrop-filter: blur(var(--blur-lg)) saturate(var(--glass-saturate));
          border-right: 1px solid var(--glass-border);
          transition: margin-left var(--dur-base) var(--ease-in-out);
        }
        .sidebar.collapsed {
          margin-left: -268px;
        }
        .sidebar-header {
          padding: var(--space-4) var(--space-3) var(--space-2);
        }
        .sidebar-top-row {
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }
        .btn-new-chat-compact {
          flex: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          height: 36px;
          padding: 0 var(--space-3);
          background: var(--glass-bg-soft);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-full);
          box-shadow: inset 0 1px 0 0 var(--glass-highlight);
          color: var(--ink);
          font-size: var(--text-sm);
          font-weight: 500;
          transition:
            border-color var(--dur-fast) var(--ease-in-out),
            background var(--dur-fast) var(--ease-in-out);
        }
        .btn-new-chat-compact:hover {
          border-color: var(--border-strong);
          background: var(--glass-bg);
        }
        .sidebar-controls {
          display: flex;
          align-items: center;
        }
        .btn-collapse-sidebar,
        .menu-close-btn {
          background: transparent;
          border: 0;
          color: var(--ink-tertiary);
          padding: 8px;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          transition: color var(--dur-fast) var(--ease-in-out), background var(--dur-fast) var(--ease-in-out);
        }
        .btn-collapse-sidebar:hover,
        .menu-close-btn:hover {
          color: var(--ink);
          background: var(--bg-hover);
        }
        .menu-close-btn {
          display: none;
        }

        .chat-list {
          flex: 1;
          overflow-y: auto;
          padding: var(--space-2) var(--space-3);
        }
        .sidebar-empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-7) var(--space-4);
          text-align: center;
          color: var(--ink-tertiary);
        }
        .sidebar-empty-state p {
          font-size: var(--text-sm);
          margin: 0;
          line-height: 1.5;
        }
        .chat-group {
          margin-bottom: var(--space-4);
        }
        .chat-group-label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--ink-tertiary);
          margin: var(--space-2) var(--space-2) var(--space-1);
        }
        .chat-item {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--space-2);
          padding: 8px var(--space-3);
          border: 0;
          border-radius: var(--radius-md);
          background: transparent;
          color: var(--ink-secondary);
          text-align: left;
          transition: background var(--dur-fast) var(--ease-in-out), color var(--dur-fast) var(--ease-in-out);
        }
        .chat-item:hover {
          background: var(--bg-hover);
          color: var(--ink);
        }
        .chat-item.active {
          background: var(--accent-soft);
          color: var(--ink);
        }
        .chat-item-title {
          flex: 1;
          font-size: var(--text-sm);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .btn-delete-chat {
          flex-shrink: 0;
          background: transparent;
          border: 0;
          color: var(--ink-tertiary);
          padding: 4px;
          border-radius: 4px;
          opacity: 0;
          display: flex;
          transition: opacity var(--dur-fast) var(--ease-in-out), color var(--dur-fast) var(--ease-in-out);
        }
        .chat-item:hover .btn-delete-chat {
          opacity: 1;
        }
        .btn-delete-chat:hover {
          color: var(--error);
        }
        .sidebar-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--space-2);
          padding: var(--space-3) var(--space-4);
          border-top: 1px solid var(--border);
        }
        .version-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: var(--text-xs);
          color: var(--ink-tertiary);
        }
        .sidebar-backdrop {
          display: none;
        }

        /* ============ Main viewport ============ */
        .main-viewport {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
          position: relative;
        }
        .floating-expand-btn {
          position: absolute;
          top: var(--space-3);
          left: var(--space-3);
          z-index: 20;
          background: var(--glass-bg);
          -webkit-backdrop-filter: blur(var(--blur-sm)) saturate(var(--glass-saturate));
          backdrop-filter: blur(var(--blur-sm)) saturate(var(--glass-saturate));
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-full);
          box-shadow: inset 0 1px 0 0 var(--glass-highlight), var(--shadow-sm);
          color: var(--ink-tertiary);
          padding: 7px;
          display: flex;
          transition: color var(--dur-fast) var(--ease-in-out), border-color var(--dur-fast) var(--ease-in-out);
        }
        .floating-expand-btn:hover {
          color: var(--ink);
          border-color: var(--border-strong);
        }

        /* ============ Idle stage ============ */
        .idle-stage {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: var(--space-5);
          animation: fade-up var(--dur-slow) var(--ease-out) both;
        }
        .idle-content {
          width: 100%;
          max-width: 680px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        .idle-brand-mark {
          color: var(--ink-tertiary);
          margin-bottom: var(--space-4);
        }
        .idle-content h1 {
          font-family: var(--font-serif);
          font-size: var(--text-3xl);
          font-weight: 400;
          letter-spacing: -0.01em;
          line-height: 1.2;
          color: var(--ink);
          margin: 0 0 var(--space-3);
        }
        .idle-content .subtitle {
          font-size: var(--text-base);
          color: var(--ink-secondary);
          margin: 0 0 var(--space-6);
        }
        .idle-input-box {
          width: 100%;
        }
        .idle-examples {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          margin-top: var(--space-5);
        }
        .idle-example-btn {
          background: transparent;
          border: 0;
          padding: 4px 0;
          font-size: var(--text-sm);
          color: var(--ink-tertiary);
          transition: color var(--dur-fast) var(--ease-in-out);
        }
        .idle-example-btn:hover {
          color: var(--accent);
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        .privacy-anchor {
          position: absolute;
          bottom: var(--space-4);
          left: 0;
          right: 0;
          text-align: center;
          font-size: var(--text-xs);
          color: var(--ink-tertiary);
          margin: 0;
          padding: 0 var(--space-4);
        }

        /* ============ Composer ============ */
        .query-form {
          position: relative;
          display: flex;
          align-items: flex-end;
          gap: var(--space-2);
          background: var(--glass-bg-strong);
          -webkit-backdrop-filter: blur(var(--blur-lg)) saturate(var(--glass-saturate));
          backdrop-filter: blur(var(--blur-lg)) saturate(var(--glass-saturate));
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-xl);
          padding: 10px 10px 10px var(--space-4);
          box-shadow: inset 0 1px 0 0 var(--glass-highlight), var(--glass-shadow);
          transition: border-color var(--dur-fast) var(--ease-in-out), box-shadow var(--dur-fast) var(--ease-in-out);
        }
        @supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
          .query-form {
            background: var(--glass-fallback);
          }
        }
        .query-form:focus-within {
          border-color: color-mix(in srgb, var(--accent) 45%, transparent);
          box-shadow:
            inset 0 1px 0 0 var(--glass-highlight),
            0 0 0 3px var(--accent-soft),
            var(--glass-shadow);
        }
        .query-input {
          flex: 1;
          resize: none;
          border: 0;
          outline: none;
          background: transparent;
          font-size: var(--text-base);
          line-height: 1.5;
          color: var(--ink);
          padding: 6px 0;
          max-height: 160px;
        }
        .query-input::placeholder {
          color: var(--ink-tertiary);
        }
        .query-submit {
          flex-shrink: 0;
          width: 34px;
          height: 34px;
          border: 0;
          border-radius: var(--radius-full);
          background: linear-gradient(
            180deg,
            color-mix(in srgb, var(--accent) 85%, white) 0%,
            var(--accent) 100%
          );
          color: var(--accent-ink);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.35),
            0 4px 14px color-mix(in srgb, var(--accent) 35%, transparent);
          display: flex;
          align-items: center;
          justify-content: center;
          transition:
            background var(--dur-fast) var(--ease-in-out),
            transform var(--dur-fast) var(--ease-spring);
        }
        .query-submit:hover:not(:disabled) {
          background: linear-gradient(
            180deg,
            color-mix(in srgb, var(--accent-hover) 85%, white) 0%,
            var(--accent-hover) 100%
          );
        }
        .query-submit:active:not(:disabled) {
          transform: scale(0.94);
        }
        .query-submit:disabled {
          background: var(--bg-hover);
          color: var(--ink-tertiary);
          box-shadow: none;
        }
        .query-submit-loading:disabled {
          background: var(--accent-soft);
          color: var(--accent);
        }
        .submit-spinner {
          animation: spin 0.9s linear infinite;
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        /* ============ Chat interface ============ */
        .chat-interface {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 0;
          position: relative;
        }
        .chat-scroller {
          flex: 1;
          overflow-y: auto;
        }
        .chat-scroller-content {
          max-width: 760px;
          margin: 0 auto;
          padding: var(--space-6) var(--space-5) 0;
        }
        .chat-spacer {
          height: 120px;
        }

        .message-row {
          display: flex;
          margin-bottom: var(--space-5);
        }
        .user-row {
          justify-content: flex-end;
        }
        .assistant-row {
          justify-content: flex-start;
        }
        .message-bubble {
          min-width: 0;
        }
        .user-bubble {
          max-width: 78%;
          /* Frosted tint, no backdrop blur: bubbles are unbounded in the scroller */
          background: var(--accent-soft);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-xl);
          box-shadow: inset 0 1px 0 0 var(--glass-highlight);
          padding: var(--space-3) var(--space-4);
          font-size: var(--text-base);
          line-height: 1.6;
          color: var(--ink);
          white-space: pre-wrap;
          word-break: break-word;
        }
        .assistant-bubble {
          width: 100%;
        }
        .fade-in-up {
          animation: fade-up var(--dur-slow) var(--ease-out) both;
        }

        .assistant-bubble-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: var(--space-2);
        }
        .assistant-badge-premium {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: var(--text-xs);
          font-weight: 500;
          color: var(--ink-tertiary);
          margin: 0;
        }
        .assistant-badge-premium svg {
          color: var(--accent);
        }
        .btn-copy-response {
          background: transparent;
          border: 0;
          color: var(--ink-tertiary);
          padding: 5px;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          transition: color var(--dur-fast) var(--ease-in-out), background var(--dur-fast) var(--ease-in-out);
        }
        .btn-copy-response:hover {
          color: var(--ink);
          background: var(--bg-hover);
        }
        .copy-status-text {
          font-size: var(--text-xs);
          color: var(--ok);
        }

        /* ============ Loading state ============ */
        .processing-bubble-premium {
          position: relative;
          padding-top: var(--space-2);
        }
        .thinking-line {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: var(--space-4);
        }
        .thinking-mark {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--accent);
          flex-shrink: 0;
        }
        .thinking-mark svg {
          animation: logo-think 1.8s var(--ease-in-out) infinite;
          transform-origin: 50% 40%;
        }
        @keyframes logo-think {
          0%,
          100% {
            transform: rotate(-9deg) scale(0.94);
            opacity: 0.65;
          }
          50% {
            transform: rotate(9deg) scale(1.08);
            opacity: 1;
          }
        }
        .thinking-word {
          font-family: var(--font-serif);
          font-style: italic;
          font-size: var(--text-base);
          color: var(--ink-secondary);
          animation: fade-up var(--dur-base) var(--ease-out) both;
        }
        .stream-cursor {
          display: inline-block;
          width: 7px;
          height: 15px;
          margin-left: 3px;
          vertical-align: baseline;
          background: var(--accent);
          border-radius: 2px;
          animation: pulse-dot 1s var(--ease-in-out) infinite;
        }
        .skeleton-paragraphs-container {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }
        .skeleton-line {
          height: 13px;
          border-radius: var(--radius-sm);
        }
        .skeleton-line.line-1 {
          width: 92%;
        }
        .skeleton-line.line-2 {
          width: 100%;
        }
        .skeleton-line.line-3 {
          width: 64%;
        }
        .animate-shimmer {
          background: linear-gradient(
            90deg,
            var(--bg-sunken) 25%,
            var(--bg-hover) 50%,
            var(--bg-sunken) 75%
          );
          background-size: 200% 100%;
          animation: shimmer 1.8s linear infinite;
        }

        /* ============ Error state ============ */
        .error-bubble {
          background: var(--error-bg);
          border: 1px solid var(--error-border);
          border-radius: var(--radius-lg);
          padding: var(--space-4);
        }
        .error-title {
          font-size: var(--text-sm);
          font-weight: 600;
          color: var(--error);
          margin: 0 0 var(--space-1);
        }
        .error-message {
          font-size: var(--text-sm);
          line-height: 1.6;
          color: var(--ink-secondary);
          margin: 0;
          word-break: break-word;
        }

        /* ============ Coverage ============ */
        .coverage-indicator {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: var(--space-4);
        }
        .coverage-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          font-weight: 500;
          padding: 3px 9px;
          border-radius: var(--radius-full);
          background: var(--tag-neutral-bg);
          border: 1px solid var(--glass-border);
          color: var(--ink-secondary);
        }

        /* ============ Clinical copy ============ */
        .clinical-response-content {
          font-size: var(--text-base);
          line-height: 1.7;
          color: var(--ink);
        }
        .clinical-heading {
          font-family: var(--font-serif);
          font-size: var(--text-lg);
          font-weight: 500;
          color: var(--ink);
          margin: var(--space-5) 0 var(--space-2);
        }
        .clinical-heading:first-child {
          margin-top: 0;
        }
        .clinical-paragraph {
          margin: 0 0 var(--space-3);
          color: var(--ink-secondary);
        }
        .clinical-list {
          margin: 0 0 var(--space-3);
          padding-left: 20px;
        }
        .clinical-list li {
          margin-bottom: var(--space-1);
          color: var(--ink-secondary);
        }
        .clinical-bold {
          font-weight: 600;
          color: var(--ink);
        }
        .citation-tag {
          display: inline-block;
          font-size: 11px;
          font-weight: 500;
          color: var(--accent);
          background: var(--accent-soft);
          border-radius: var(--radius-full);
          padding: 0 7px;
          margin: 0 2px;
          vertical-align: baseline;
          white-space: nowrap;
        }

        /* ============ Sources ============ */
        .msg-sources-section {
          margin-top: var(--space-4);
          padding-top: var(--space-3);
          border-top: 1px solid var(--border);
        }
        .sources-toggle-btn {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          background: transparent;
          border: 0;
          padding: 4px 0;
          font-size: var(--text-sm);
          font-weight: 500;
          color: var(--ink-secondary);
          transition: color var(--dur-fast) var(--ease-in-out);
        }
        .sources-toggle-btn:hover,
        .sources-toggle-btn.active {
          color: var(--accent);
        }
        .msg-sources-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
          margin-top: var(--space-3);
          animation: fade-up var(--dur-base) var(--ease-out) both;
        }
        .source-card {
          /* Real glass: bounded count, rendered only when sources are expanded.
             Downgrade to the tint recipe if profiling shows scroll jank. */
          background: var(--glass-bg);
          -webkit-backdrop-filter: blur(var(--blur-md)) saturate(var(--glass-saturate));
          backdrop-filter: blur(var(--blur-md)) saturate(var(--glass-saturate));
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-lg);
          box-shadow: inset 0 1px 0 0 var(--glass-highlight), var(--glass-shadow);
          padding: var(--space-4);
          transition:
            border-color var(--dur-fast) var(--ease-in-out),
            transform var(--dur-fast) var(--ease-spring);
        }
        @supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
          .source-card {
            background: var(--glass-fallback);
          }
        }
        .source-card:hover {
          border-color: var(--border-strong);
          transform: translateY(-1px);
        }
        .source-card-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: var(--space-3);
        }
        .authority-line {
          font-size: var(--text-xs);
          color: var(--ink-tertiary);
          margin: 0 0 3px;
        }
        .source-card h3 {
          font-size: var(--text-sm);
          font-weight: 600;
          line-height: 1.45;
          color: var(--ink);
          margin: 0;
        }
        .source-chip {
          flex-shrink: 0;
          font-size: 11px;
          font-weight: 600;
          padding: 3px 9px;
          border-radius: var(--radius-full);
          background: var(--tag-neutral-bg);
          color: var(--tag-neutral-ink);
        }
        .source-meta-row {
          margin-top: var(--space-2);
        }
        .source-external-link {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: var(--text-xs);
          font-weight: 500;
          color: var(--accent);
          text-decoration: none;
        }
        .source-external-link:hover {
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        .doc-quotes-container {
          margin-top: var(--space-3);
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }
        .quote-item-wrapper {
          border-left: 2px solid var(--border-strong);
          padding-left: var(--space-3);
        }
        .quote-item-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--space-2);
          margin-bottom: 4px;
        }
        .quote-number-badge {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: var(--ink-tertiary);
        }
        .quote-item-meta {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .quote-meta-tag {
          font-size: 11px;
          font-weight: 500;
          padding: 2px 8px;
          border-radius: var(--radius-full);
          border: 1px solid var(--glass-border);
          background: var(--tag-neutral-bg);
          color: var(--ink-secondary);
        }
        .quote-item-wrapper blockquote {
          margin: 0;
          font-size: var(--text-sm);
          line-height: 1.6;
          font-style: italic;
          color: var(--ink-secondary);
        }

        /* ============ Scroll to bottom ============ */
        .floating-scroll-bottom-btn {
          position: absolute;
          bottom: 128px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 30;
          width: 36px;
          height: 36px;
          border-radius: var(--radius-full);
          background: var(--glass-bg);
          -webkit-backdrop-filter: blur(var(--blur-sm)) saturate(var(--glass-saturate));
          backdrop-filter: blur(var(--blur-sm)) saturate(var(--glass-saturate));
          border: 1px solid var(--glass-border);
          box-shadow: inset 0 1px 0 0 var(--glass-highlight), var(--shadow-md);
          color: var(--ink-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color var(--dur-fast) var(--ease-in-out), border-color var(--dur-fast) var(--ease-in-out);
        }
        .floating-scroll-bottom-btn:hover {
          color: var(--ink);
          border-color: var(--border-strong);
        }

        /* ============ Bottom input ============ */
        .bottom-input-container {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 0 var(--space-5) var(--space-3);
          /* No opaque fade: content scrolls under the floating glass composer */
          background: transparent;
          pointer-events: none;
        }
        .input-wrap {
          max-width: 760px;
          margin: 0 auto;
          pointer-events: auto;
        }
        .privacy-base {
          display: table;
          text-align: center;
          font-size: var(--text-xs);
          color: var(--ink-tertiary);
          margin: var(--space-2) auto 0;
          padding: 2px 12px;
          border-radius: var(--radius-full);
          background: var(--glass-bg-soft);
        }

        /* ============ Modals ============ */
        .modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 300;
          background: var(--scrim);
          /* The one blurred backdrop; the card inside must NOT blur (nesting rule) */
          -webkit-backdrop-filter: blur(8px);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--space-4);
          animation: modal-backdrop-in var(--dur-base) var(--ease-out) both;
        }
        @keyframes modal-backdrop-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .modal-card {
          width: 100%;
          max-width: 480px;
          max-height: 85vh;
          overflow-y: auto;
          background: var(--glass-bg-strong);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-xl);
          box-shadow: inset 0 1px 0 0 var(--glass-highlight), var(--shadow-lg);
          animation: fade-up var(--dur-base) var(--ease-out) both;
        }
        .modal-card-small {
          max-width: 400px;
        }
        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--space-4) var(--space-5);
          border-bottom: 1px solid var(--border);
        }
        .modal-header h2 {
          font-family: var(--font-serif);
          font-size: var(--text-lg);
          font-weight: 500;
          color: var(--ink);
          margin: 0;
        }
        .modal-close-btn {
          background: transparent;
          border: 0;
          color: var(--ink-tertiary);
          padding: 6px;
          border-radius: var(--radius-sm);
          display: flex;
        }
        .modal-close-btn:hover {
          color: var(--ink);
          background: var(--bg-hover);
        }
        .modal-body {
          padding: var(--space-4) var(--space-5);
        }
        .modal-desc {
          font-size: var(--text-sm);
          line-height: 1.65;
          color: var(--ink-secondary);
          margin: 0 0 var(--space-3);
        }
        .modal-footer {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: var(--space-2);
          padding: var(--space-3) var(--space-5) var(--space-4);
        }
        .btn-modal-secondary,
        .btn-modal-primary,
        .btn-modal-danger {
          height: 36px;
          padding: 0 var(--space-4);
          border-radius: var(--radius-full);
          font-size: var(--text-sm);
          font-weight: 500;
          border: 1px solid transparent;
          transition:
            background var(--dur-fast) var(--ease-in-out),
            border-color var(--dur-fast) var(--ease-in-out),
            transform var(--dur-fast) var(--ease-spring);
        }
        .btn-modal-secondary:active,
        .btn-modal-primary:active,
        .btn-modal-danger:active {
          transform: scale(0.97);
        }
        .btn-modal-secondary {
          background: var(--glass-bg-soft);
          border-color: var(--glass-border);
          color: var(--ink);
          box-shadow: inset 0 1px 0 0 var(--glass-highlight);
        }
        .btn-modal-secondary:hover {
          border-color: var(--border-strong);
          background: var(--glass-bg);
        }
        .btn-modal-primary {
          background: linear-gradient(
            180deg,
            color-mix(in srgb, var(--accent) 85%, white) 0%,
            var(--accent) 100%
          );
          color: var(--accent-ink);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35);
        }
        .btn-modal-primary:hover {
          background: linear-gradient(
            180deg,
            color-mix(in srgb, var(--accent-hover) 85%, white) 0%,
            var(--accent-hover) 100%
          );
        }
        .btn-modal-danger {
          background: var(--error);
          color: var(--error-ink);
        }
        .btn-modal-danger:hover {
          background: var(--error-strong);
        }

        .silo-info-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }
        .silo-info-item {
          display: flex;
          align-items: flex-start;
          gap: var(--space-3);
        }
        .silo-info-badge {
          flex-shrink: 0;
          font-size: 11px;
          font-weight: 600;
          padding: 3px 9px;
          border-radius: var(--radius-full);
          margin-top: 2px;
        }
        .badge-has {
          background: var(--accent-soft);
          color: var(--accent);
        }
        .badge-ansm {
          background: var(--tag-ansm-bg);
          color: var(--tag-ansm-ink);
        }
        .badge-edn {
          background: var(--ok-bg);
          color: var(--ok);
        }
        .silo-info-item h4 {
          font-size: var(--text-sm);
          font-weight: 600;
          color: var(--ink);
          margin: 0 0 3px;
        }
        .silo-info-item p {
          font-size: var(--text-sm);
          line-height: 1.55;
          color: var(--ink-secondary);
          margin: 0;
        }

        /* ============ Mobile bottom nav ============ */
        .mobile-bottom-nav {
          display: none;
          flex-shrink: 0;
          border-top: 1px solid var(--glass-border);
          background: var(--glass-bg-strong);
          -webkit-backdrop-filter: blur(var(--blur-lg)) saturate(var(--glass-saturate));
          backdrop-filter: blur(var(--blur-lg)) saturate(var(--glass-saturate));
          box-shadow: inset 0 1px 0 0 var(--glass-highlight);
          padding: 6px 0 calc(6px + env(safe-area-inset-bottom));
          z-index: 90;
        }
        .mobile-nav-item {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
          background: transparent;
          border: 0;
          padding: 6px 0;
          color: var(--ink-tertiary);
          font-size: 11px;
          font-weight: 500;
        }
        .mobile-nav-item:hover {
          color: var(--ink);
        }

        /* ============ Responsive ============ */
        @media (max-width: 768px) {
          .app-global-header {
            display: none;
          }
          .mobile-header {
            display: flex;
          }
          .mobile-bottom-nav {
            display: flex;
          }
          .sidebar {
            position: fixed;
            top: 0;
            bottom: 0;
            left: 0;
            z-index: 200;
            width: 300px;
            max-width: 85vw;
            margin-left: 0;
            transform: translateX(-100%);
            transition: transform var(--dur-base) var(--ease-in-out);
            border-right: 1px solid var(--glass-border);
            background: var(--glass-bg-strong);
          }
          .sidebar.collapsed {
            margin-left: 0;
          }
          .sidebar.open {
            transform: translateX(0);
          }
          .menu-close-btn {
            display: flex;
          }
          .btn-collapse-sidebar {
            display: none;
          }
          .floating-expand-btn {
            display: none;
          }
          .sidebar-backdrop {
            display: block;
            position: fixed;
            inset: 0;
            z-index: 150;
            /* Plain scrim — the sliding sidebar itself does the blurring */
            background: var(--scrim);
          }
          .idle-content h1 {
            font-size: var(--text-2xl);
          }
          .chat-scroller-content {
            padding: var(--space-4) var(--space-4) 0;
          }
          .bottom-input-container {
            padding: 0 var(--space-3) var(--space-2);
          }
          .user-bubble {
            max-width: 88%;
          }
          .privacy-base {
            display: none;
          }
          .privacy-anchor {
            bottom: var(--space-2);
          }
          .floating-scroll-bottom-btn {
            bottom: 110px;
          }
        }
      `}</style>
    </main>
  );
}
