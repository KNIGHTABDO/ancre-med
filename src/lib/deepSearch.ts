import { Type, type GoogleGenAI, type Schema } from "@google/genai";
import type { InArgs, InValue, Row } from "@libsql/client";

import {
  PLAYBOOKS,
  agentForSilo,
  categorySiloForTarget,
  isTopicClass,
  requiredSectionsForPlan,
  type CategorySilo,
  type RetrievalPlan,
  type RetrievalSubQuery,
  type RetrievalTargetSilo,
  type RetrievedContextChunk,
  type TopicClass,
} from "@/lib/clinicalTypes";

interface SqlExecuteResult {
  readonly rows: readonly Row[];
}

export interface SqlExecutor {
  execute(input: { sql: string; args?: InArgs }): Promise<SqlExecuteResult>;
}

interface DeepSearchOptions {
  readonly prompt: string;
  readonly aiStudio: GoogleGenAI;
  readonly db: SqlExecutor;
  readonly maxRounds?: number;
  readonly perQueryLimit?: number;
  readonly excludeSuperseded?: boolean;
}

export interface SectionCoverage {
  readonly section: string;
  readonly chunkIds: readonly string[];
}

export interface DeepSearchResult {
  readonly plan: RetrievalPlan;
  readonly injectedContext: readonly RetrievedContextChunk[];
  readonly uncoveredSections: readonly string[];
  readonly sectionsCovered: readonly SectionCoverage[];
  readonly roundsUsed: number;
  readonly subQueriesIssued: number;
  readonly usedQueries: readonly string[];
  readonly totalChunks: number;
}

interface GapCheckerPayload {
  readonly gap_queries?: unknown;
}

const PLANNER_MODEL = "gemini-3.1-flash-lite";
const DEFAULT_MAX_ROUNDS = 3;
const DEFAULT_PER_QUERY_LIMIT = 6;

const plannerSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    primary_class: {
      type: Type.STRING,
      description:
        "Une categorie: definition_item_edn, semiologie_cas_clinique, pharmacologie_therapeutique, anatomie_physiologie, calcul_clinique, urgence_conduite_a_tenir, conversationnel.",
    },
    secondary_class: {
      type: Type.STRING,
      description:
        "Categorie secondaire si la question couvre clairement deux classes, sinon chaine vide.",
    },
    sub_queries: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          section: { type: Type.STRING },
          query: { type: Type.STRING },
          target_silo: {
            type: Type.STRING,
            description: "edn, has, bdpm, formulas, or any",
          },
        },
        required: ["section", "query", "target_silo"],
      },
    },
  },
  required: ["primary_class", "sub_queries"],
};

const gapCheckerSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    gap_queries: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          section: { type: Type.STRING },
          query: { type: Type.STRING },
          target_silo: { type: Type.STRING },
        },
        required: ["section", "query", "target_silo"],
      },
    },
  },
  required: ["gap_queries"],
};

const PLANNER_INSTRUCTION = `
Tu es le planificateur de recherche d'AncreMed. Tu ne réponds JAMAIS à la question
médicale toi-même — tu prépares uniquement le plan de recherche.

Étapes :
1. Classe la question dans une catégorie : definition_item_edn, semiologie_cas_clinique,
   pharmacologie_therapeutique, anatomie_physiologie, calcul_clinique,
   urgence_conduite_a_tenir, conversationnel. Ajoute une secondary_class si la question
   en couvre clairement deux.
2. Si conversationnel : sub_queries = [].
3. Sinon, génère 2 à 5 sous-requêtes, chacune ciblant UNE SEULE section du plan de
   réponse de cette catégorie. Chaque sous-requête : français, dense en mots-clés
   médicaux, PAS une phrase complète, ciblant un silo (edn, has, bdpm, formulas, any).

Raisonne exclusivement en français médical. N'utilise jamais l'anglais, même en
interne — une traduction implicite peut déformer un terme clinique (ex. "angine"
n'est pas "angina").

Réponds UNIQUEMENT en JSON valide, sans texte autour :
{"primary_class": "...", "secondary_class": "..." | null,
 "sub_queries": [{"section": "...", "query": "...", "target_silo": "..."}]}
`.trim();

const GAP_CHECKER_INSTRUCTION = `
Tu vérifies la couverture d'un plan de recherche médicale.

Pour chaque section NON couverte, propose une nouvelle sous-requête : plus large ou
reformulée différemment de toute requête déjà essayée pour cette section.

Réponds UNIQUEMENT en JSON :
{"gap_queries": [{"section": "...", "query": "...", "target_silo": "..."}]}
Si tout est couvert : {"gap_queries": []}
`.trim();

const MEDICAL_ACRONYMS: readonly [RegExp, string][] = [
  [/\bHTA\b/giu, "HTA hypertension arterielle"],
  [/\bBPCO\b/giu, "BPCO bronchopneumopathie chronique obstructive"],
  [/\bAVC\b/giu, "AVC accident vasculaire cerebral"],
  [/\bIDM\b/giu, "IDM infarctus myocarde"],
  [/\bIRC\b/giu, "IRC insuffisance renale chronique"],
  [/\bIRA\b/giu, "IRA insuffisance renale aigue"],
  [/\bSCA\b/giu, "SCA syndrome coronarien aigu"],
  [/\bEP\b/giu, "EP embolie pulmonaire"],
  [/\bIC\b/giu, "IC insuffisance cardiaque"],
  [/\bDT2\b/giu, "DT2 diabete type 2"],
  [/\bDT1\b/giu, "DT1 diabete type 1"],
  [/\bVEMS\b/giu, "VEMS volume expiratoire maximal seconde"],
  [/\bDFG\b/giu, "DFG debit filtration glomerulaire"],
  [/\bATCD\b/giu, "ATCD antecedents"],
  [/\bCI\b/giu, "CI contre indication"],
  [/\bTP\b/giu, "TP taux prothrombine"],
  [/\bqSOFA\b/giu, "qSOFA quick sequential organ failure assessment"],
  [/\bAAG\b/giu, "AAG asthme aigu grave"],
  [/\bPFLA\b/giu, "PFLA pneumonie franche lobaire aigue"],
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readNumber(record: Record<string, unknown>, key: string): number | null {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeKey(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function normalizeTargetSilo(value: unknown): RetrievalTargetSilo {
  if (
    value === "edn" ||
    value === "has" ||
    value === "bdpm" ||
    value === "formulas" ||
    value === "any"
  ) {
    return value;
  }
  return "any";
}

function escapeFtsToken(token: string): string {
  return token.replace(/"/g, "\"\"");
}

function tokenizeQuery(query: string): readonly string[] {
  const tokens = query.match(/[\p{L}\p{N}]+/gu) ?? [];
  return Array.from(
    new Set(
      tokens
        .map((token) => token.trim())
        .filter((token) => token.length > 1)
        .slice(0, 24),
    ),
  );
}

export function expandMedicalAcronyms(query: string): string {
  let expanded = query;
  for (const [pattern, replacement] of MEDICAL_ACRONYMS) {
    expanded = expanded.replace(pattern, replacement);
  }
  return expanded;
}

export function cleanFtsQuery(query: string): string {
  return tokenizeQuery(expandMedicalAcronyms(query))
    .map((token) => `"${escapeFtsToken(token)}"`)
    .join(" OR ");
}

function topicClassFromPrompt(prompt: string): TopicClass {
  const normalized = normalizeKey(prompt);
  if (/^(bonjour|salut|merci|ok|hello|bonsoir|au revoir|bye)[\s!.?]*$/u.test(normalized)) {
    return "conversationnel";
  }
  if (
    normalized.includes("clairance") ||
    normalized.includes("score") ||
    normalized.includes("calcul") ||
    normalized.includes("chads") ||
    normalized.includes("qsofa") ||
    normalized.includes("child")
  ) {
    return "calcul_clinique";
  }
  if (
    normalized.includes("urgence") ||
    normalized.includes("conduite a tenir") ||
    normalized.includes("cat ") ||
    normalized.includes("asthme aigu grave")
  ) {
    return "urgence_conduite_a_tenir";
  }
  if (
    normalized.includes("traitement") ||
    normalized.includes("posologie") ||
    normalized.includes("medicament") ||
    normalized.includes("dose")
  ) {
    return "pharmacologie_therapeutique";
  }
  if (
    normalized.includes("patient") ||
    normalized.includes("diagnostic") ||
    normalized.includes("demarche") ||
    normalized.includes("signe")
  ) {
    return "semiologie_cas_clinique";
  }
  if (
    normalized.includes("innervation") ||
    normalized.includes("anatomie") ||
    normalized.includes("physiologie")
  ) {
    return "anatomie_physiologie";
  }
  return "definition_item_edn";
}

function fallbackPlan(prompt: string): RetrievalPlan {
  const primaryClass = topicClassFromPrompt(prompt);
  const secondaryClass =
    primaryClass !== "calcul_clinique" &&
    /\b(adapt|clairance|posologie|dose|renal|renale|dfg|irc)\b/iu.test(normalizeKey(prompt))
      ? "calcul_clinique"
      : null;
  const playbook = PLAYBOOKS[primaryClass];
  const subQueries = playbook.defaultSubQueries.map((subQuery) => ({
    ...subQuery,
    query: `${prompt} ${subQuery.query}`,
  }));
  return {
    primary_class: primaryClass,
    secondary_class: secondaryClass,
    sub_queries: subQueries.slice(0, 5),
  };
}

function parseSubQuery(value: unknown): RetrievalSubQuery | null {
  if (!isRecord(value)) {
    return null;
  }

  const section = readString(value, "section");
  const query = readString(value, "query");
  if (section === null || query === null) {
    return null;
  }

  return {
    section: normalizeKey(section).replace(/\s+/g, "_"),
    query,
    target_silo: normalizeTargetSilo(value["target_silo"]),
  };
}

function normalizePlan(value: unknown, prompt: string): RetrievalPlan {
  if (!isRecord(value)) {
    return fallbackPlan(prompt);
  }

  const primaryClassRaw = readString(value, "primary_class");
  const primaryClass = isTopicClass(primaryClassRaw) ? primaryClassRaw : topicClassFromPrompt(prompt);
  const secondaryClassRaw = value["secondary_class"];
  const secondaryClass = isTopicClass(secondaryClassRaw) ? secondaryClassRaw : null;
  const rawSubQueries = value["sub_queries"];
  const parsedSubQueries = Array.isArray(rawSubQueries)
    ? rawSubQueries.map(parseSubQuery).filter((item): item is RetrievalSubQuery => item !== null)
    : [];
  const fallbackSubQueries = fallbackPlan(prompt).sub_queries;
  const subQueries = parsedSubQueries.length > 0 ? parsedSubQueries : fallbackSubQueries;

  return {
    primary_class: primaryClass,
    secondary_class: secondaryClass,
    sub_queries: subQueries.slice(0, 5),
  };
}

export async function planQuery(aiStudio: GoogleGenAI, prompt: string): Promise<RetrievalPlan> {
  try {
    const response = await aiStudio.models.generateContent({
      model: PLANNER_MODEL,
      contents: prompt,
      config: {
        systemInstruction: PLANNER_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: plannerSchema,
        temperature: 0.0,
      },
    });
    return normalizePlan(JSON.parse(response.text ?? "{}"), prompt);
  } catch (error: unknown) {
    console.warn("Deep-search planner failed, using deterministic fallback:", error);
    return fallbackPlan(prompt);
  }
}

function mapRowToContextChunk(
  row: Record<string, unknown>,
  section: string,
  fallbackIndex: number,
): RetrievedContextChunk {
  const silo = readString(row, "category_silo") as CategorySilo | null;
  const agent = agentForSilo(silo);
  const id = readString(row, "id") ?? `retrieved_${fallbackIndex}`;

  return {
    id,
    agent_id: agent.id,
    agent_label: agent.label,
    text: readString(row, "text_content") ?? "",
    source_identifier: readString(row, "source_identifier"),
    source: readString(row, "origin_title"),
    page: readNumber(row, "page_number"),
    date: readString(row, "regulatory_date"),
    silo,
    qdrant_score: readNumber(row, "score") ?? 0,
    cosine_similarity: 1,
    section,
  };
}

export async function runFtsSearch(
  db: SqlExecutor,
  query: string,
  targetSilo: RetrievalTargetSilo,
  limit: number,
  section = "general",
  excludeSuperseded = false,
): Promise<readonly RetrievedContextChunk[]> {
  const ftsQuery = cleanFtsQuery(query);
  if (ftsQuery.length === 0) {
    return [];
  }

  const categorySilo = categorySiloForTarget(targetSilo);
  const categoryClause =
    categorySilo !== null && categorySilo !== "clinical_formulas" ? "AND d.category_silo = ?" : "";
  const activeClause = excludeSuperseded ? "AND COALESCE(d.superseded, 0) = 0" : "";
  const ftsArgs: InValue[] = [ftsQuery];
  if (categoryClause.length > 0) {
    ftsArgs.push(categorySilo);
  }
  ftsArgs.push(limit);

  try {
    const response = await db.execute({
      sql: `
        SELECT d.id, d.text_content, d.origin_title, d.category_silo, d.source_identifier,
               d.regulatory_date, d.page_number, d.chunk_index,
               bm25(documents_fts, 5.0, 1.0) AS score
        FROM documents_fts
        JOIN documents d ON d.rowid = documents_fts.rowid
        WHERE documents_fts MATCH ?
        ${categoryClause}
        ${activeClause}
        ORDER BY score ASC
        LIMIT ?;
      `,
      args: ftsArgs,
    });
    const chunks = response.rows.map((row, index) => mapRowToContextChunk(row, section, index));
    if (chunks.length > 0) {
      return chunks;
    }
  } catch (error: unknown) {
    console.error("Deep-search FTS query failed, falling back to LIKE:", error);
  }

  const tokens = tokenizeQuery(query).slice(0, 8);
  if (tokens.length === 0) {
    return [];
  }

  const likeParts = tokens.map(() => "(d.text_content LIKE ? OR d.origin_title LIKE ?)");
  const likeArgs: InValue[] = [];
  for (const token of tokens) {
    likeArgs.push(`%${token}%`, `%${token}%`);
  }
  const likeCategoryClause =
    categorySilo !== null && categorySilo !== "clinical_formulas" ? "AND d.category_silo = ?" : "";
  const likeActiveClause = excludeSuperseded ? "AND COALESCE(d.superseded, 0) = 0" : "";
  if (likeCategoryClause.length > 0) {
    likeArgs.push(categorySilo);
  }
  likeArgs.push(limit);

  try {
    const response = await db.execute({
      sql: `
        SELECT d.id, d.text_content, d.origin_title, d.category_silo, d.source_identifier,
               d.regulatory_date, d.page_number, d.chunk_index
        FROM documents d
        WHERE (${likeParts.join(" OR ")})
        ${likeCategoryClause}
        ${likeActiveClause}
        LIMIT ?;
      `,
      args: likeArgs,
    });
    return response.rows.map((row, index) => ({
      ...mapRowToContextChunk(row, section, index),
      qdrant_score: -1 * index,
    }));
  } catch (error: unknown) {
    console.error("Deep-search LIKE fallback failed:", error);
    return [];
  }
}

function broadenQuery(query: string): string {
  const tokens = tokenizeQuery(query);
  if (tokens.length <= 2) {
    return query;
  }
  return tokens.slice(0, -1).join(" ");
}

function queryKey(query: string): string {
  return normalizeKey(query).replace(/\s+/g, " ");
}

function buildHeuristicGapQueries(
  plan: RetrievalPlan,
  prompt: string,
  coveredSections: ReadonlyMap<string, readonly RetrievedContextChunk[]>,
  usedQueries: ReadonlySet<string>,
): readonly RetrievalSubQuery[] {
  const requiredSections = requiredSectionsForPlan(plan.primary_class, plan.secondary_class);
  const subQueriesBySection = new Map<string, RetrievalSubQuery>();
  for (const subQuery of plan.sub_queries) {
    if (!subQueriesBySection.has(subQuery.section)) {
      subQueriesBySection.set(subQuery.section, subQuery);
    }
  }

  const gapQueries: RetrievalSubQuery[] = [];
  for (const section of requiredSections) {
    if ((coveredSections.get(section)?.length ?? 0) > 0) {
      continue;
    }
    const original =
      subQueriesBySection.get(section) ??
      ({
        section,
        query: `${prompt} ${section.replace(/_/g, " ")}`,
        target_silo: PLAYBOOKS[plan.primary_class].defaultTargetSilo,
      } satisfies RetrievalSubQuery);
    const broadenedQuery = broadenQuery(original.query);
    const nextQuery = usedQueries.has(queryKey(broadenedQuery))
      ? `${prompt} ${section.replace(/_/g, " ")}`
      : broadenedQuery;
    if (!usedQueries.has(queryKey(nextQuery))) {
      gapQueries.push({
        section,
        query: nextQuery,
        target_silo: original.target_silo,
      });
    }
  }
  return gapQueries.slice(0, 5);
}

async function checkCoverageGapsWithLlm(
  aiStudio: GoogleGenAI,
  plan: RetrievalPlan,
  coveredSections: readonly string[],
  usedQueries: readonly string[],
): Promise<readonly RetrievalSubQuery[]> {
  const requiredSections = requiredSectionsForPlan(plan.primary_class, plan.secondary_class);
  try {
    const response = await aiStudio.models.generateContent({
      model: PLANNER_MODEL,
      contents: JSON.stringify(
        {
          required_sections: requiredSections,
          covered_sections: coveredSections,
          used_queries: usedQueries,
        },
        null,
        2,
      ),
      config: {
        systemInstruction: GAP_CHECKER_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: gapCheckerSchema,
        temperature: 0.0,
      },
    });
    const parsed = JSON.parse(response.text ?? "{}") as GapCheckerPayload;
    if (!Array.isArray(parsed.gap_queries)) {
      return [];
    }
    return parsed.gap_queries
      .map(parseSubQuery)
      .filter((subQuery): subQuery is RetrievalSubQuery => subQuery !== null)
      .slice(0, 5);
  } catch (error: unknown) {
    console.warn("Deep-search LLM gap checker failed:", error);
    return [];
  }
}

export async function deepSearch(options: DeepSearchOptions): Promise<DeepSearchResult> {
  const maxRounds = options.maxRounds ?? DEFAULT_MAX_ROUNDS;
  const perQueryLimit = options.perQueryLimit ?? DEFAULT_PER_QUERY_LIMIT;
  const plan = await planQuery(options.aiStudio, options.prompt);
  const requiredSections = requiredSectionsForPlan(plan.primary_class, plan.secondary_class);
  const usedQueries = new Set<string>();
  const foundChunkIds = new Set<string>();
  const sectionsCovered = new Map<string, RetrievedContextChunk[]>();
  let pending: readonly RetrievalSubQuery[] = plan.sub_queries;
  let roundsUsed = 0;
  let subQueriesIssued = 0;
  let heuristicAlreadyMissed = false;

  while (pending.length > 0 && roundsUsed < maxRounds) {
    const searchJobs = pending
      .filter((subQuery) => {
        const key = queryKey(subQuery.query);
        if (usedQueries.has(key)) {
          return false;
        }
        usedQueries.add(key);
        return true;
      })
      .map(async (subQuery) => ({
        subQuery,
        rows: await runFtsSearch(
          options.db,
          subQuery.query,
          subQuery.target_silo,
          perQueryLimit,
          subQuery.section,
          options.excludeSuperseded ?? false,
        ),
      }));

    if (searchJobs.length === 0) {
      break;
    }

    subQueriesIssued += searchJobs.length;
    const searchResults = await Promise.all(searchJobs);
    let newChunksThisRound = 0;

    for (const result of searchResults) {
      const fresh = result.rows.filter((row) => !foundChunkIds.has(row.id));
      for (const chunk of fresh) {
        foundChunkIds.add(chunk.id);
      }
      newChunksThisRound += fresh.length;
      if (fresh.length > 0) {
        sectionsCovered.set(result.subQuery.section, [
          ...(sectionsCovered.get(result.subQuery.section) ?? []),
          ...fresh,
        ]);
      }
    }

    roundsUsed++;
    if (newChunksThisRound === 0) {
      if (heuristicAlreadyMissed) {
        break;
      }
      heuristicAlreadyMissed = true;
    }

    const coveredSectionNames = requiredSections.filter(
      (section) => (sectionsCovered.get(section)?.length ?? 0) > 0,
    );
    if (coveredSectionNames.length === requiredSections.length) {
      break;
    }

    const heuristicGaps = buildHeuristicGapQueries(
      plan,
      options.prompt,
      sectionsCovered,
      usedQueries,
    );

    pending =
      heuristicGaps.length > 0
        ? heuristicGaps
        : await checkCoverageGapsWithLlm(
            options.aiStudio,
            plan,
            coveredSectionNames,
            Array.from(usedQueries),
          );
  }

  const injectedContext = Array.from(sectionsCovered.values())
    .flat()
    .slice(0, 30);
  const uncoveredSections = requiredSections.filter(
    (section) => (sectionsCovered.get(section)?.length ?? 0) === 0,
  );
  const sectionCoverage = Array.from(sectionsCovered.entries()).map(([section, chunks]) => ({
    section,
    chunkIds: chunks.map((chunk) => chunk.id),
  }));

  return {
    plan,
    injectedContext,
    uncoveredSections,
    sectionsCovered: sectionCoverage,
    roundsUsed,
    subQueriesIssued,
    usedQueries: Array.from(usedQueries),
    totalChunks: foundChunkIds.size,
  };
}

export function conversationalContext(): readonly RetrievedContextChunk[] {
  return [
    {
      id: "chat_direct",
      agent_id: "system",
      agent_label: "Assistant",
      text: "CONVERSATIONAL_DIRECT_RESPONSE: This query is conversational. Direct response authorized.",
      source_identifier: "system",
      source: "System",
      page: null,
      date: null,
      silo: "chat",
      qdrant_score: 1,
      cosine_similarity: 1,
      section: "conversationnel",
    },
  ];
}
