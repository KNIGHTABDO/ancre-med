import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from "@libsql/client";

import { SADIQ_AGENTS, agentForSilo, type CategorySilo, type RetrievedContextChunk } from "@/lib/clinicalTypes";
import { conversationalContext, deepSearch } from "@/lib/deepSearch";
import { featureFlagSnapshot, isFeatureEnabled } from "@/lib/featureFlags";
import { searchClinicalFormulas } from "@/lib/formulaBank";
import { ensureFreshnessSchema } from "@/lib/freshness";
import { correctMedicalTypos } from "@/lib/typoCorrection";

export interface PipelineResult {
  readonly status: number;
  readonly body: Record<string, unknown>;
}

function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value.trim();
}

const routingSchema = {
  type: Type.OBJECT,
  properties: {
    is_conversational: {
      type: Type.BOOLEAN,
      description: "True if the query is a simple greeting, thank you, goodbye, or non-medical chat (e.g. 'hi', 'bonjour', 'merci', 'ok bye'). False if it is an actual medical question, case analysis, or requires clinical/pharmacological facts."
    },
    search_query: {
      type: Type.STRING,
      description: "A reformulated and expanded search query in French optimized for keyword search (FTS5 / database). Translate/expand abbreviations, add clinical synonyms, or include relevant medical concepts. Keep empty if is_conversational is True."
    }
  },
  required: ["is_conversational", "search_query"]
};

const ROUTING_INSTRUCTION = `
You are the routing and search optimization agent for a medical RAG application.
Your task is to analyze the user's message and decide:
1. Set is_conversational to true ONLY if the message has zero clinical content: a bare greeting, thanks, goodbye, or generic chit-chat (e.g., "bonjour", "merci", "salut", "ok bye", "hello"). If there is ANY clinical, pharmacological, or medical-study content, is_conversational is false — even if the message is terse, SMS-style, ungrammatical, or a short follow-up.
2. Otherwise (any medical query, case analysis, drug question, or request for factual medical knowledge), set is_conversational to false.
3. If is_conversational is false, write an optimized search_query in French. Reformulate the user's query to maximize keyword search hits in a database (e.g., 'Qu'est-ce que le tirzépatide ?' -> 'tirzepatide indications posologie avis'). Include key medical terms, synonyms, and variations of the condition or drug name.

Examples of medical messages that are NOT conversational (is_conversational = false):
- "c koi le ttt" -> false (asks about a treatment)
- "et pour la grossesse ?" -> false (clinical follow-up about pregnancy)
- "dose max paracetamol ?" -> false
- "dfg a 40 je fais quoi" -> false
Examples that ARE conversational (is_conversational = true):
- "bonjour" -> true
- "merci beaucoup" -> true
- "ok à plus" -> true
`.trim();

type SadiqAgent = (typeof SADIQ_AGENTS)[number];

interface RouterRequestBody {
  prompt: string;
}

interface RankedCandidate {
  id: string;
  agent_id: SadiqAgent["id"] | string;
  agent_label: SadiqAgent["label"] | string;
  text: string;
  source_identifier: string | null;
  source: string | null;
  page: number | null;
  date: string | null;
  silo: CategorySilo | string | null;
  fts_rank: number;
  bm25_score: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parsePromptBody(value: unknown): RouterRequestBody {
  if (!isRecord(value)) {
    throw new Error("Request body must be a JSON object.");
  }

  const prompt = value["prompt"];
  if (typeof prompt !== "string" || prompt.trim().length === 0) {
    throw new Error("Request body must include a non-empty text 'prompt' parameter.");
  }

  return { prompt: prompt.trim() };
}

// Safety net for classifier misroutes: terse/SMS-style medical questions
// ("c koi le ttt", "dfg a 40 ?") sometimes get labelled conversational. If the
// raw message hits any of these clinical keywords, we override to
// non-conversational and run retrieval anyway rather than answering blind.
const MEDICAL_SAFETY_NET_PATTERN =
  /\b(ttt|traitement|posologie|dose|dfg|douleur|fi[eè]vre|sympt[oô]me|diagnostic|ordonnance|m[eé]dicament|grossesse|mg|ml)\b/i;

function looksMedical(text: string): boolean {
  return MEDICAL_SAFETY_NET_PATTERN.test(text);
}

const dbConfig: { url: string; authToken?: string } = {
  url: process.env["TURSO_DATABASE_URL"] || "file:clinical_ground_truth.db",
};
if (process.env["TURSO_AUTH_TOKEN"]) {
  dbConfig.authToken = process.env["TURSO_AUTH_TOKEN"];
}
const libsqlClient = createClient(dbConfig);

function cleanFtsQuery(query: string): string {
  const words = query.match(/\w+/g) || [];
  return words
    .filter(word => word.trim().length > 0)
    .map(word => `"${word}"`)
    .join(" OR ");
}

async function runLibSqlSearch(query: string): Promise<any[]> {
  const ftsQuery = cleanFtsQuery(query);
  const results: any[] = [];

  if (ftsQuery) {
    try {
      const res = await libsqlClient.execute({
        sql: `
          SELECT d.id, d.text_content, d.origin_title, d.category_silo, d.source_identifier, d.regulatory_date, d.page_number, d.chunk_index, fts.rank
          FROM documents_fts fts
          JOIN documents d ON d.rowid = fts.rowid
          WHERE documents_fts MATCH ?
          ORDER BY fts.rank
          LIMIT 15;
        `,
        args: [ftsQuery],
      });

      for (const row of res.rows as any[]) {
        results.push({
          id: String(row["id"]),
          text_content: String(row["text_content"]),
          origin_title: row["origin_title"] ? String(row["origin_title"]) : null,
          category_silo: String(row["category_silo"]),
          source_identifier: row["source_identifier"] ? String(row["source_identifier"]) : null,
          regulatory_date: row["regulatory_date"] ? String(row["regulatory_date"]) : null,
          page_number: row["page_number"] !== null && row["page_number"] !== undefined ? Number(row["page_number"]) : null,
          chunk_index: row["chunk_index"] !== null && row["chunk_index"] !== undefined ? Number(row["chunk_index"]) : null,
          score: row["rank"] !== null && row["rank"] !== undefined ? Number(row["rank"]) : 0.0,
        });
      }
    } catch (e) {
      console.error("FTS5 query failed via libSQL, falling back to LIKE:", e);
    }
  }

  if (results.length === 0) {
    try {
      const words = query.match(/\w+/g) || [];
      const likeClause = words.map(() => "text_content LIKE ?").join(" OR ");
      const params = words.map(w => `%${w}%`);

      if (likeClause) {
        const res = await libsqlClient.execute({
          sql: `
            SELECT id, text_content, origin_title, category_silo, source_identifier, regulatory_date, page_number, chunk_index
            FROM documents
            WHERE ${likeClause}
            LIMIT 15;
          `,
          args: params,
        });

        for (let i = 0; i < res.rows.length; i++) {
          const row = res.rows[i] as any;
          results.push({
            id: String(row["id"]),
            text_content: String(row["text_content"]),
            origin_title: row["origin_title"] ? String(row["origin_title"]) : null,
            category_silo: String(row["category_silo"]),
            source_identifier: row["source_identifier"] ? String(row["source_identifier"]) : null,
            regulatory_date: row["regulatory_date"] ? String(row["regulatory_date"]) : null,
            page_number: row["page_number"] !== null && row["page_number"] !== undefined ? Number(row["page_number"]) : null,
            chunk_index: row["chunk_index"] !== null && row["chunk_index"] !== undefined ? Number(row["chunk_index"]) : null,
            score: -1.0 * i,
          });
        }
      }
    } catch (e) {
      console.error("LIKE fallback query failed via libSQL:", e);
    }
  }

  return results;
}

async function fetchWikipediaSummary(query: string): Promise<RetrievedContextChunk | null> {
  try {
    const searchUrl = `https://fr.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`;
    const searchResponse = await fetch(searchUrl, { signal: AbortSignal.timeout(3000) });
    if (!searchResponse.ok) return null;

    const searchJson = await searchResponse.json();
    const firstHit = searchJson?.query?.search?.[0];
    if (!firstHit) return null;

    const title = firstHit.title;

    const summaryUrl = `https://fr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
    const summaryResponse = await fetch(summaryUrl, { signal: AbortSignal.timeout(3000) });
    if (!summaryResponse.ok) return null;

    const summaryJson = await summaryResponse.json();
    if (!summaryJson.extract) return null;

    return {
      id: `wiki_${summaryJson.pageid || Math.random().toString(36).substr(2, 9)}`,
      agent_id: "agent_a_semiologie",
      agent_label: "Encyclopédie Wikipedia",
      text: `[Source: Encyclopédie Wikipedia - Sujet: ${title}] ${summaryJson.extract}`,
      source_identifier: summaryJson.content_urls?.desktop?.page || `https://fr.wikipedia.org/wiki/${encodeURIComponent(title)}`,
      source: `Wikipedia - ${title}`,
      page: null,
      date: null,
      silo: "colles_enseignants_edn",
      fts_rank: 1.0,
      bm25_score: 1.0
    };
  } catch (error) {
    console.warn("Wikipedia fetch failed:", error);
    return null;
  }
}

async function fetchApiMedicaments(query: string): Promise<RetrievedContextChunk | null> {
  try {
    const searchUrl = `https://api-medicaments.fr/api/v1/medicaments?query=${encodeURIComponent(query)}`;
    const searchResponse = await fetch(searchUrl, { signal: AbortSignal.timeout(3000) });
    if (!searchResponse.ok) return null;

    const drugs = await searchResponse.json();
    if (!Array.isArray(drugs) || drugs.length === 0) return null;

    const firstDrug = drugs[0];
    const codeCIS = firstDrug.codeCIS;

    const detailUrl = `https://api-medicaments.fr/api/v1/medicaments/${codeCIS}`;
    const detailResponse = await fetch(detailUrl, { signal: AbortSignal.timeout(3000) });
    if (!detailResponse.ok) return null;

    const details = await detailResponse.json();
    if (!details) return null;

    const denom = details.denomination || firstDrug.denomination;
    const composition = details.substancesActivees ? details.substancesActivees.map((s: any) => `${s.denominationSubstance} (${s.dosageSubstance})`).join(", ") : "Non spécifiée";
    const condition = details.conditionsPrescriptionDelivrance ? details.conditionsPrescriptionDelivrance.join(" | ") : "Non spécifiées";

    return {
      id: `drug_${codeCIS}`,
      agent_id: "agent_b_pharmacologie",
      agent_label: "Base Nationale des Médicaments (Live API)",
      text: `[Source: api-medicaments.fr] Médicament: ${denom} (CIS: ${codeCIS}). Substances actives: ${composition}. Conditions de prescription: ${condition}`,
      source_identifier: `https://base-donnees-publique.medicaments.gouv.fr/affichageDoc.php?specid=${codeCIS}&typedoc=R`,
      source: `api-medicaments.fr - ${denom}`,
      page: null,
      date: null,
      silo: "ansm_bdpm_vidal",
      fts_rank: 1.0,
      bm25_score: 1.0
    };
  } catch (error) {
    console.warn("api-medicaments fetch failed:", error);
    return null;
  }
}

export async function runRouterPipeline(rawBody: unknown): Promise<PipelineResult> {
  let body: RouterRequestBody;
  try {
    body = parsePromptBody(rawBody);
  } catch (error: unknown) {
    return { status: 400, body: { success: false, error: String(error) } };
  }

  try {
    const apiKey = getRequiredEnv("GEMINI_API_KEY");
    const aiStudio = new GoogleGenAI({ apiKey });
    const retrievalPrompt = isFeatureEnabled("qualityPolish")
      ? await correctMedicalTypos(libsqlClient, body.prompt)
      : body.prompt;

    if (isFeatureEnabled("deepSearch")) {
      if (isFeatureEnabled("verifierFreshness")) {
        await ensureFreshnessSchema(libsqlClient);
      }

      const searchResult = await deepSearch({
        prompt: retrievalPrompt,
        aiStudio,
        db: libsqlClient,
        excludeSuperseded: isFeatureEnabled("verifierFreshness"),
      });

      const agents = SADIQ_AGENTS.map((agent) => ({
        id: agent.id,
        label: agent.label,
        category_silo: agent.silo,
      }));

      const classifiedConversational = searchResult.plan.primary_class === "conversationnel";
      const overrideToMedical = classifiedConversational && looksMedical(body.prompt);

      if (classifiedConversational && !overrideToMedical) {
        return {
          status: 200,
          body: {
            success: true,
            is_conversational: true,
            topic_class: searchResult.plan.primary_class,
            primary_class: searchResult.plan.primary_class,
            secondary_class: searchResult.plan.secondary_class,
            similarity_formula: "BM25 full-text match ranking",
            feature_flags: featureFlagSnapshot(),
            agents,
            retrieval_coverage: {
              rounds_used: searchResult.roundsUsed,
              sub_queries_issued: searchResult.subQueriesIssued,
              total_chunks: searchResult.totalChunks,
              uncovered_sections: searchResult.uncoveredSections,
              sections_covered: searchResult.sectionsCovered,
            },
            injected_context: conversationalContext(),
          },
        };
      }

      const effectivePrimaryClass = overrideToMedical
        ? "definition_item_edn"
        : searchResult.plan.primary_class;

      const liveLookupQuery =
        searchResult.plan.sub_queries.map((subQuery) => subQuery.query).join(" ") || retrievalPrompt;
      const [wikiHit, drugHit, formulaHits, overrideLocalHits] = await Promise.all([
        fetchWikipediaSummary(liveLookupQuery),
        fetchApiMedicaments(liveLookupQuery),
        isFeatureEnabled("formulaBank")
          ? searchClinicalFormulas(libsqlClient, liveLookupQuery, 4)
          : Promise.resolve([]),
        overrideToMedical ? runLibSqlSearch(retrievalPrompt) : Promise.resolve([]),
      ]);
      const liveHits = [drugHit, wikiHit].filter(
        (hit): hit is RetrievedContextChunk => hit !== null,
      );
      const overrideContext: RetrievedContextChunk[] = overrideLocalHits.map((hit) => {
        const agent = agentForSilo(hit.category_silo);
        return {
          id: hit.id,
          agent_id: agent.id,
          agent_label: agent.label,
          text: hit.text_content,
          source_identifier: hit.source_identifier || null,
          source: hit.origin_title || null,
          page: hit.page_number || null,
          date: hit.regulatory_date || null,
          silo: hit.category_silo as CategorySilo,
          fts_rank: hit.score,
          bm25_score: 1.0,
        };
      });
      const finalContext = [
        ...formulaHits,
        ...liveHits,
        ...overrideContext,
        ...searchResult.injectedContext,
      ].slice(0, 30);
      const formulaCoveredSections = formulaHits.length > 0 ? ["formule", "interpretation"] : [];
      const uncoveredSections = searchResult.uncoveredSections.filter(
        (section) => !formulaCoveredSections.includes(section),
      );
      const sectionsCovered = [
        ...searchResult.sectionsCovered,
        ...formulaCoveredSections.map((section) => ({
          section,
          chunkIds: formulaHits.map((hit) => hit.id),
        })),
      ];

      return {
        status: 200,
        body: {
          success: true,
          is_conversational: false,
          topic_class: effectivePrimaryClass,
          primary_class: effectivePrimaryClass,
          secondary_class: searchResult.plan.secondary_class,
          retrieval_plan: searchResult.plan,
          similarity_formula: "BM25 full-text match ranking",
          feature_flags: featureFlagSnapshot(),
          agents,
          retrieval_coverage: {
            rounds_used: searchResult.roundsUsed,
            sub_queries_issued: searchResult.subQueriesIssued,
            total_chunks: searchResult.totalChunks + formulaHits.length,
            uncovered_sections: uncoveredSections,
            sections_covered: sectionsCovered,
            used_queries: searchResult.usedQueries,
          },
          injected_context: finalContext,
        },
      };
    }

    const routingResponse = await aiStudio.models.generateContent({
      model: "gemini-3.5-flash",
      contents: retrievalPrompt,
      config: {
        systemInstruction: ROUTING_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: routingSchema,
        temperature: 0.0,
      }
    });

    const routingData = JSON.parse(routingResponse.text || "{}");

    if (routingData.is_conversational && !looksMedical(body.prompt)) {
      return {
        status: 200,
        body: {
          success: true,
          is_conversational: true,
          similarity_formula: "BM25 full-text match ranking",
          agents: SADIQ_AGENTS.map((agent) => ({
            id: agent.id,
            label: agent.label,
            category_silo: agent.silo,
          })),
          injected_context: [
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
              fts_rank: 1.0,
              bm25_score: 1.0
            }
          ]
        },
      };
    }

    const searchQuery = routingData.search_query || retrievalPrompt;

    const [localHits, wikiHit, drugHit, formulaHits] = await Promise.all([
      runLibSqlSearch(searchQuery),
      fetchWikipediaSummary(searchQuery),
      fetchApiMedicaments(searchQuery),
      isFeatureEnabled("formulaBank")
        ? searchClinicalFormulas(libsqlClient, searchQuery, 4)
        : Promise.resolve([]),
    ]);

    const candidates: RankedCandidate[] = localHits.map((hit) => {
      const agent = agentForSilo(hit.category_silo);
      return {
        id: hit.id,
        agent_id: agent.id,
        agent_label: agent.label,
        text: hit.text_content,
        source_identifier: hit.source_identifier || null,
        source: hit.origin_title || null,
        page: hit.page_number || null,
        date: hit.regulatory_date || null,
        silo: hit.category_silo as CategorySilo,
        fts_rank: hit.score,
        bm25_score: 1.0
      };
    });

    if (wikiHit) {
      candidates.unshift(wikiHit);
    }
    if (drugHit) {
      candidates.unshift(drugHit);
    }
    if (formulaHits.length > 0) {
      candidates.unshift(...formulaHits);
    }

    const finalContext = candidates.slice(0, isFeatureEnabled("formulaBank") ? 10 : 6);

    return {
      status: 200,
      body: {
        success: true,
        is_conversational: false,
        similarity_formula: "BM25 full-text match ranking",
        agents: SADIQ_AGENTS.map((agent) => ({
          id: agent.id,
          label: agent.label,
          category_silo: agent.silo,
        })),
        injected_context: finalContext,
      },
    };
  } catch (error: unknown) {
    return { status: 502, body: { success: false, error: String(error) } };
  }
}
