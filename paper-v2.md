# AncreMed v2 — Deep Retrieval & Clinical Reasoning Specification

**Status:** Engineering brief for implementation by an AI coding agent (Codex / Antigravity) against `KNIGHTABDO/ancre-med`.

**Relationship to `/paper` (v1):** v1 stays as the public architecture document. This is the internal build spec for everything that changes on top of it. Where they disagree, this document wins.

**Revision note:** this replaces the first draft of this spec from earlier in this session. Everything from that draft is folded in here, deepened, and extended — treat this file as the single source of truth, not a diff against the old one.

---

## What's new in this revision

- Exact, copy-pasteable system prompts for the planner, gap-checker, and a new independent verifier stage (§3.5, §3.6, §4.4)
- A full worked trace of your own failing example — "parle-moi des bactéries" — through the entire new pipeline (§3.7)
- The gate now has a third leg: an **independent verifier**, run by a model that did not write the answer, because your own uploaded research (Zhang et al., 2024) shows generative LLMs are weak claim verifiers relative to discriminative checks (§4.4)
- An explicit **abstention contract** — what the system says when the corpus genuinely doesn't have the answer, instead of silently omitting or quietly improvising (§4.5)
- Three more clinical calculators, fully verified against current sources (not named-only): CHA₂DS₂-VASc, qSOFA, Child-Pugh (§6)
- A real fuzzy-matching approach for French med-student typos — and a correction to the first draft, which would have recommended something that doesn't run on your actual hosted database (§5.5)
- A source freshness/versioning pipeline so superseded HAS guidelines and old BDPM entries stop being retrievable instead of just being flagged (§8)
- A cost table with real Gemini 3.1 Flash-Lite pricing, and a latency budget per topic class (§9)
- A logging schema so you can watch quality trends instead of guessing (§10)
- Curriculum-aware caching, using the actual structure of the French EDN program (§11)
- A phased rollout order so you ship this without breaking what already works (§14)
- Five adversarial eval cases added to the original seven, designed to break the gate on purpose (§15)

---

## Table of Contents

0. [Non-Negotiable Constraints](#0-non-negotiable-constraints)
1. [Diagnosis: Why the Model "Says One Sentence and Shuts Up"](#1-diagnosis)
2. [Topic Taxonomy & Per-Topic Playbooks](#2-topic-taxonomy--per-topic-playbooks)
3. [The Deep Search Loop](#3-the-deep-search-loop)
4. [Tiered Attribution Gate, Independent Verifier & Abstention](#4-tiered-attribution-gate-independent-verifier--abstention)
5. [Local-First Retrieval Quality](#5-local-first-retrieval-quality)
6. [Verified Clinical Calculation Bank](#6-verified-clinical-calculation-bank)
7. [Response Composition Templates](#7-response-composition-templates)
8. [Source Freshness & Versioning Pipeline](#8-source-freshness--versioning-pipeline)
9. [Cost & Latency Budget](#9-cost--latency-budget)
10. [Observability & Logging](#10-observability--logging)
11. [Curriculum-Aware Caching](#11-curriculum-aware-caching)
12. [Honesty Pass on Claims & Trust UI](#12-honesty-pass-on-claims--trust-ui)
13. [File-Level Implementation Map](#13-file-level-implementation-map)
14. [Phased Rollout Plan](#14-phased-rollout-plan)
15. [Evaluation Set](#15-evaluation-set)

---

## 0. Non-Negotiable Constraints

Read before touching anything else. These are guardrails for the coding agent — do not "fix" them.

1. **No vector database. No embedding model.** Stay on SQLite/Turso FTS5, `unicode61` tokenizer, BM25 ranking. Every improvement here sits *on top of* lexical search, never instead of it.
2. **Stay cheap.** `gemini-3.5-flash` remains the workhorse for routing, planning, gap-checking, and verification. Reserve the larger/more expensive generation call for the final answer pass only.
3. **Stay local-first wherever a problem can be solved without an LLM call.** Deterministic dictionaries and SQL beat an extra model round-trip.
4. **Never relax the no-hallucination guarantee to produce "more words."** Every fix below adds depth by giving the generator more *real* retrieved material and more *room* to explain it — never by loosening verification on the facts that matter (dosages, contraindications, named recommendations, numbers).
5. **Every formula or score in the calculation bank must be sourced from an authoritative reference and manually verified before going live.** Do not let an LLM — including the one that wrote this spec — populate it from memorized training data. §6 gives four fully-verified worked examples specifically so the agent has a correct pattern to copy; it should not extend the bank past those without the same verification step.
6. **The abstention contract (§4.5) is not optional polish.** A section the corpus can't support must be visibly marked missing in the response — never silently folded into a neighboring section, never quietly generated from unsourced general knowledge.

---

## 1. Diagnosis

Two independent causes, both visible in the v1 `/paper` architecture:

**Cause A — the gate punishes verbosity.** Every clinical claim must carry an `exact_source_quote` that survives a literal, word-for-word substring match, and the whole response is rejected (422) if fewer than 70% of declared assertions clear that bar. A model under that constraint has a rational incentive to minimize the number of claims it makes. Asked about "les bactéries," the safest move is one short, easily-verifiable sentence, not a structured explanation. Fixed in §4.

**Cause B — the generator doesn't have enough material.** Today's pipeline is one reformulated query → top-K FTS5 rows → one generation pass. A real EDN-style question spans definition, classification, physiopathology, signs, workup, treatment, and complications — almost certainly scattered across multiple chunks. One keyword query won't surface that breadth, so the generator has nothing to elaborate on even once the gate is loosened. Fixed in §3.

Fix B before A: there's no point loosening the gate if the model still only has three thin chunks to talk about.

---

## 2. Topic Taxonomy & Per-Topic Playbooks

Replace the current binary router (`is_conversational: boolean`) with a 7-way classifier. Each class gets its own retrieval depth, silo priority, and response shape.

| `topic_class` | Trigger example | Sub-queries planned | Silos prioritized | Math bank? | Required sections |
|---|---|---|---|---|---|
| `definition_item_edn` | "Qu'est-ce que la PFLA ?" | 3–4 | EDN/MediQAl, HAS | No | définition, physiopathologie, épidémiologie, classification |
| `semiologie_cas_clinique` | "Patient fébrile, crépitants — démarche ?" | 4–5 | EDN/MediQAl, HAS | Often | signes_cliniques, paraclinique, diagnostics_differentiels, criteres_gravite, conduite_a_tenir |
| `pharmacologie_therapeutique` | "Traitement de l'HTA du sujet âgé ?" | 3–4 | BDPM, HAS | Often | indication, posologie, contre_indications, surveillance |
| `anatomie_physiologie` | "Innervation du muscle temporal ?" | 2–3 | EDN/MediQAl | Sometimes | structure, rapports, fonction |
| `calcul_clinique` | "Clairance créat., 70kg, 65 ans, créat 110 ?" | 2 | Banque de formules (§6) | Always | formule, interpretation |
| `urgence_conduite_a_tenir` | "CAT devant un AAG de l'enfant ?" | 4–5 | HAS, EDN/MediQAl, BDPM | Often | reconnaissance, gestes_immediats, traitement, orientation |
| `conversationnel` | "merci", "bonjour" | 0 | — | No | — (unchanged from v1, bypass) |

The router's job: classify `topic_class`, then hand off to the matching playbook in §3 instead of one generic reformulation.

**Multi-class questions.** A real student question can straddle two classes — "quel est le traitement de l'IRC et comment adapter la posologie ?" is `pharmacologie_therapeutique` *and* `calcul_clinique`. Don't force a single label: let the planner emit a `primary_class` plus an optional `secondary_class`, and union their required-sections lists. This is a genuine architectural addition, not an edge case to special-case away — test case 12 in §15 exists specifically to check this path works.

---

## 3. The Deep Search Loop

This is the fix for Cause B. Instead of one query → one generation pass, the router becomes a **planner** that fans out multiple FTS5 calls, checks section coverage, and only stops when the playbook's sections are populated or a round budget is hit — the same query-decomposition pattern used in agentic RAG generally, just running against local SQLite instead of a network retrieval backend, which is why 3–5 rounds still costs single-digit milliseconds of DB time.

### 3.1 Planner output schema

```ts
interface RetrievalPlan {
  primary_class: TopicClass;
  secondary_class?: TopicClass;
  sub_queries: {
    section: string;
    query: string;              // FTS5-ready, French, keyword-dense
    target_silo: "edn" | "has" | "bdpm" | "formulas" | "any";
  }[];
}
```

### 3.2 Loop

```ts
async function deepSearch(userPrompt: string): Promise<RetrievedContext> {
  const plan = await planQuery(userPrompt); // gemini-3.5-flash, see §3.5
  const usedQueries = new Set<string>();
  const foundChunkIds = new Set<string>();
  const sectionsCovered = new Map<string, ChunkRow[]>();

  let round = 0;
  const MAX_ROUNDS = 3;
  let pending = plan.sub_queries;

  while (pending.length > 0 && round < MAX_ROUNDS) {
    let newChunksThisRound = 0;

    for (const sq of pending) {
      if (usedQueries.has(sq.query)) continue;
      usedQueries.add(sq.query);

      const rows = await ftsSearch(sq.query, sq.target_silo, /*limit*/ 6);
      const fresh = rows.filter(r => !foundChunkIds.has(r.id));
      fresh.forEach(r => foundChunkIds.add(r.id));
      newChunksThisRound += fresh.length;

      if (fresh.length > 0) {
        sectionsCovered.set(sq.section, [...(sectionsCovered.get(sq.section) ?? []), ...fresh]);
      }
    }

    round++;
    if (newChunksThisRound === 0) break; // diminishing returns — stop even if incomplete
    pending = await checkCoverageGaps(plan, sectionsCovered, usedQueries); // §3.4 / §3.6
  }

  const requiredSections = PLAYBOOKS[plan.primary_class].requiredSections;
  const uncoveredSections = requiredSections.filter(s => !sectionsCovered.has(s));

  return { sectionsCovered, uncoveredSections, roundsUsed: round, totalChunks: foundChunkIds.size };
}
```

### 3.3 Stop conditions (mandatory)

- `round >= MAX_ROUNDS` (start at 3; tune from real logs — see §10)
- `pending.length === 0` (coverage check found no gaps)
- No new chunk ids in the last round — stop even mid-coverage, and let §4.5's abstention contract handle the gap honestly rather than looping forever chasing a section the corpus doesn't have

### 3.4 Coverage check, cheap version first

Before spending an LLM call, try the heuristic: each playbook (§2) declares required `section` names. If a section is empty after round 1, its original sub-query becomes the round-2 query, broadened by dropping the most specific keyword token. Only fall back to the LLM gap-checker (§3.6) if the heuristic itself starts returning empty results — keep the free path as the default, not the fallback.

### 3.5 Exact planner prompt

```
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
```

### 3.6 Exact gap-checker prompt (LLM fallback only — see §3.4)

```
Tu vérifies la couverture d'un plan de recherche médicale.

Sections requises : {required_sections}
Sections déjà couvertes (≥1 extrait trouvé) : {covered_sections}
Requêtes déjà essayées, ne les répète jamais : {used_queries}

Pour chaque section NON couverte, propose une nouvelle sous-requête : plus large ou
reformulée différemment de toute requête déjà essayée pour cette section.

Réponds UNIQUEMENT en JSON :
{"gap_queries": [{"section": "...", "query": "...", "target_silo": "..."}]}
Si tout est couvert : {"gap_queries": []}
```

### 3.7 Worked trace — your own failing example, through the new pipeline

`"Parle-moi des bactéries"`

| Step | What happens |
|---|---|
| Classify | `primary_class: definition_item_edn` |
| Plan (round 1) | 4 sub-queries: `définition bactérie structure paroi` (déf.), `classification Gram positif négatif` (classification), `virulence mécanismes pathogénicité` (physiopathologie), `bactéries pathogènes exemples cliniques` (exemples) |
| FTS5 round 1 | déf. → 3 chunks · classification → 4 chunks · physiopathologie → **0 chunks** · exemples → 5 chunks |
| Coverage check | physiopathologie uncovered → gap query generated: broadened to `virulence bactérienne` |
| FTS5 round 2 | physiopathologie → 2 chunks found |
| Coverage check | all sections covered, 0 new chunks would come from a 3rd round on the same terms → **stop** (2 rounds used, not 3) |
| Context assembled | 4 sections, 14 chunks total, 2 rounds |
| Generate | `narrative` spans carry the general microbiology framing (cell wall structure, Gram staining logic — connective explanation); `clinical_assertion` spans carry the specific claims (named pathogen examples, classification cutoffs) each with `exact_source_quote` + `subject_entity_id` |
| Gate | narrative spans pass free (checked only for embedded numbers/claims); clinical_assertion spans checked for substring + entity match |
| Verify (§4.4) | independent model samples the clinical_assertion spans, confirms entailment against full source context, not just substring presence |
| Respond | full définition → classification → physiopathologie → exemples → Points clés EDN, with a visible **4 sources, 2 rounds** coverage indicator (§12) |

This is the direct, concrete answer to "he just says one sentence and shuts up" — the old pipeline never had a physiopathologie chunk in hand at all, so there was nothing to write beyond the two well-covered sections even if the gate had allowed it.

---

## 4. Tiered Attribution Gate, Independent Verifier & Abstention

Fix for Cause A. Core idea: not every sentence is a clinical claim, and only clinical claims need word-for-word gating — and even those need more than substring matching.

### 4.1 Revised output schema

```ts
type ResponseSpan =
  | { type: "narrative"; text: string }
    // mechanism, structure, connective explanation. General medical knowledge allowed.
    // NOT allowed to contain a number, a named dose, a named guideline/score result,
    // or a contraindication — enforce with a number/claim-detector pre-check, not
    // just prompting.
  | {
      type: "clinical_assertion";
      text: string;
      exact_source_quote: string;
      source_urn: string;
      subject_entity_id: string;   // CIS code for a drug claim, item_ECN for a guideline
      confidence_score: number;    // self-assessed, >= 0.85
    }
  | {
      type: "abstention";          // NEW — see §4.5
      section: string;
      reason: string;
    };
```

### 4.2 Entity consistency & recency (unchanged from first draft, kept)

Word-for-word substring matching only proves the quote exists *somewhere* in retrieved context — not that it's attached to the right subject. A real quote about drug A's dosing can be spliced under a claim about drug B and still pass a pure substring check.

- **Entity consistency:** `subject_entity_id` must match the `source_identifier` of the document `exact_source_quote` was pulled from. Mismatch = automatic fail, regardless of substring match.
- **Recency flag:** if a newer document exists in the same silo for the same entity (superseded HAS guideline, updated BDPM entry), set `stale_source: true`. Once §8 ships, this becomes closer to unreachable — superseded rows won't be retrievable at all — but keep it as defense-in-depth for gaps in supersession tracking.

### 4.3 Independent verifier — a second call, not the generator

Your own uploaded research makes the argument for this directly: CliniFact found generative LLMs are markedly weaker claim verifiers than discriminative models — BioBERT scored 80.2% accuracy on the same task where Llama3-70B scored 53.6% — and NLI4CT found even strong entailment baselines over clinical trial reports only reach ~0.627 F1. The mechanism, not just the number, matters here: a model grading its own answer shares whatever blind spot produced the error in the first place. A second, separately-invoked call doesn't have that correlated blind spot, and it's cheap — this doesn't require a discriminative BioBERT-style model, just a distinct call with a distinct, adversarial framing (see prompt below), which is the same principle behind the "Chain-of-Verification" pattern: draft, then verify independently, then revise — not because a bigger model necessarily catches more, but because the verification prompt is not the generation prompt and isn't primed to agree with itself.

**Verifier prompt:**

```
Tu es un vérificateur clinique indépendant. Tu N'AS PAS écrit la réponse que tu
vérifies — reste sceptique par défaut.

Pour chaque affirmation, tu reçois : le texte de l'affirmation, la citation source
exacte revendiquée, et le document source complet dont elle est tirée.

Pour CHAQUE affirmation, réponds : la citation, prise dans son contexte complet dans
le document source, implique-t-elle réellement CETTE affirmation précise — pas une
affirmation voisine, pas une affirmation sur un autre médicament, une autre pathologie,
ou un autre sous-groupe de patients ?

Sois strict : une citation vraie mais attachée au mauvais sujet doit être rejetée.

Réponds UNIQUEMENT en JSON :
{"verifications": [{"assertion_id": "...", "entailed": true|false, "reason": "..."}]}
```

Run this on every `clinical_assertion` span before the response ships. A `false` here blocks the assertion even if it already passed the substring + entity checks in §4.2 — this is what catches the case those checks structurally can't: a real quote, correctly attributed to the right document, that still doesn't actually support the specific sentence the generator wrote around it.

### 4.4 Revised pass condition

- Any `clinical_assertion` that fails substring match, entity-consistency, OR the independent verifier → response blocked (422).
- `narrative` spans are ungated (after the number/claim pre-check) and don't count toward the 70% threshold — this is what lets the model actually explain instead of writing the minimum number of gateable sentences.
- `abstention` spans (§4.5) are always allowed and never block the response — an honest "not found" is not a failure state.
- The 70% threshold now applies only to the `clinical_assertion` subset, which makes it a more meaningful bar, not a looser one — you're no longer diluting a strict metric with narrative sentences that never needed checking.

### 4.5 The abstention contract

If, after `MAX_ROUNDS`, a required section for the topic class has zero chunks (`uncoveredSections` from §3.2), the generator must emit an `abstention` span for that section — never fabricate it, never silently drop the header, never fold it into a neighboring section's prose. The frontend renders the section heading with the `reason` text in its place (e.g., *"Non trouvé dans le corpus indexé pour cette sous-section — à vérifier auprès d'une source spécialisée."*). This does three things at once: it keeps the no-hallucination guarantee airtight even under genuine corpus gaps, it tells you exactly where your corpus has holes (log these — §10), and it's more honest to the student than either silence or invented confidence.

---

## 5. Local-First Retrieval Quality

Zero new infrastructure — direct FTS5 improvements.

**5.1 Column-weighted BM25.** `bm25(documents_fts, w_title, w_text)` lets you weight columns — for pharmacology lookups, a hit in `origin_title` (drug name) should outweigh the same term appearing once in body text. Start around 5:1, tune against the golden set in §5.4. FTS5's `bm25()` is more-negative-is-more-relevant, so `ORDER BY ... ASC`. Confirm the production query path actually calls `bm25()` for scoring rather than sorting an unpopulated `score` column — wire it explicitly if it isn't already.

**5.2 Deterministic acronym/synonym dictionary.** A zero-cost safety net for when the router misses an abbreviation under latency pressure, run before or alongside LLM reformulation:

```
HTA→hypertension artérielle   BPCO→bronchopneumopathie chronique obstructive
AVC→accident vasculaire cérébral   IDM→infarctus du myocarde
IRC→insuffisance rénale chronique  IRA→insuffisance rénale aiguë
SCA→syndrome coronarien aigu   EP→embolie pulmonaire
IC→insuffisance cardiaque      DT2→diabète de type 2   DT1→diabète de type 1
VEMS→volume expiratoire maximal seconde   DFG→débit de filtration glomérulaire
ATCD→antécédents   CI→contre-indication   TP→taux de prothrombine
qSOFA→quick sequential organ failure assessment
AAG→asthme aigu grave   PFLA→pneumonie franche lobaire aiguë
```

**5.3 Phrase/NEAR precision.** For multi-word clinical phrases, use FTS5 phrase queries and `NEAR(term1 term2, N)` instead of a loose AND of tokens — "insuffisance cardiaque droite" shouldn't match a chunk where "insuffisance" and "droite" happen to appear far apart.

**5.4 Per-silo BM25 tuning.** Short, dense BDPM entries and long-form HAS prose likely want different `b` (length normalization). Build a ~30-query golden set per silo (query + the chunk id a human expert says should rank first) and grid-search `k1`/`b` against it — don't guess.

**5.5 Typo tolerance — corrected from the first draft.**

The first draft of this spec pointed at SQLite's `spellfix1` extension. That's real and well-documented — build an `fts5vocab` table from your FTS5 index, load it into a `spellfix1` virtual table, and query it for edit-distance-ranked corrections before running the real search. But it's a classic C loadable extension, and **Turso Cloud's hosted product does not support arbitrary loadable extensions** — its extension model has moved to WASM UDFs instead. If you're running local/embedded libSQL, `spellfix1` works as documented. If you're on hosted Turso Cloud (which "SQLite/Turso FTS5" suggests you are), it won't load, and recommending it without that caveat would have sent you down a dead end.

**What actually works on hosted Turso:** implement fuzzy correction in the application layer instead of the database layer. Maintain a vocabulary list (extracted periodically from your FTS5 corpus, same idea as `fts5vocab`, just materialized into a normal table or even an in-memory JS `Set` at cold start), and run a small Levenshtein/edit-distance check against it in Node/TS before the query hits FTS5:

```ts
function correctTypos(query: string, vocab: Set<string>, maxDistance = 2): string {
  return query.split(/\s+/).map(token => {
    if (vocab.has(token.toLowerCase())) return token;
    const candidate = findClosestByEditDistance(token, vocab, maxDistance);
    return candidate ?? token; // leave untouched if nothing close enough
  }).join(" ");
}
```

This is a few dozen lines, has no extension-compatibility risk, and is portable if you ever do move off Turso. Seed the vocabulary from real med-student misspellings you can anticipate: dropped accents (*"coeur"* vs *"cœur"*), doubled/dropped consonants in long Latin-root terms (*"phéochromocytome," "spondylarthrite"*), and elision (*"l'HTA"*).

---

## 6. Verified Clinical Calculation Bank

A 4th silo, structured, so calculations are retrievable and attributable exactly like everything else — never invented inline by the generator.

### 6.1 Schema

```sql
CREATE TABLE IF NOT EXISTS clinical_formulas (
    id TEXT PRIMARY KEY,
    name_fr TEXT,
    category TEXT,
    formula_text TEXT,
    variables_json TEXT,
    interpretation_text TEXT,
    caveats_text TEXT,
    source_citation TEXT,
    verified_by TEXT,
    verified_date TEXT
);
```

### 6.2 Cockcroft & Gault — clairance de la créatinine

```
Homme : ClCr (mL/min) = 1.23 × Poids(kg) × (140 − Âge) / Créatininémie(µmol/L)
Femme : ClCr (mL/min) = 1.04 × Poids(kg) × (140 − Âge) / Créatininémie(µmol/L)
```

**Caveat:** CKD-EPI has largely superseded Cockcroft-Gault for general GFR staging in current practice, but Cockcroft-Gault remains the reference formula in most drug-dosing adjustment tables (BDPM/RCP "adaptation posologique selon la fonction rénale"). Implement **both**, clearly labeled for which purpose each serves, rather than picking one.

### 6.3 CHA₂DS₂-VASc — risque thromboembolique en FA

| Facteur | Points |
|---|---|
| Insuffisance cardiaque congestive / dysfonction VG | 1 |
| Hypertension artérielle | 1 |
| Âge ≥ 75 ans | 2 |
| Diabète | 1 |
| AVC / AIT / thromboembolie antérieur | 2 |
| Maladie vasculaire (IDM, AOMI, plaque aortique) | 1 |
| Âge 65–74 ans | 1 |
| Sexe féminin | 1 |

Score max = 9. Anticoagulation classiquement recommandée à partir de ≥2 points (homme) ou ≥3 points (femme).

**Caveat — flag this one explicitly, don't silently pick a side:** the 2024 ESC guidelines introduced **CHA₂DS₂-VA**, which drops sex as a risk factor and simplifies the threshold to ≥2 regardless of sex. This is an active, recent guideline evolution, not settled the way Cockcroft-Gault is. Store both variants in the bank with their source/date, and let the response surface which one applies rather than silently picking one — exactly the kind of nuance §0.5 exists to protect against getting flattened by an LLM guess.

### 6.4 qSOFA — repérage rapide du sepsis

| Critère | Points |
|---|---|
| Fréquence respiratoire ≥ 22/min | 1 |
| Pression artérielle systolique ≤ 100 mmHg | 1 |
| Altération de la conscience (Glasgow < 15) | 1 |

Score ≥ 2/3 chez un patient suspect d'infection → associé à une mortalité hospitalière nettement plus élevée (validation prospective : 3% si qSOFA < 2 vs 24% si qSOFA ≥ 2). Source: validation prospective multicentrique (étude SCREEN), alignée avec la définition Sepsis-3.

**Caveat:** qSOFA is a bedside screening tool, not a diagnostic criterion for sepsis itself, and its performance is notably weaker in geriatric populations specifically — worth surfacing given how often EDN cases involve elderly patients.

### 6.5 Child-Pugh — sévérité de la cirrhose

| Paramètre | 1 point | 2 points | 3 points |
|---|---|---|---|
| Bilirubine (µmol/L) | < 35 | 35–50 | > 50 |
| Albumine (g/L) | > 35 | 28–35 | < 28 |
| TP (%) | > 50 | 40–50 | < 40 |
| Ascite | Absente | Minime | Modérée/réfractaire |
| Encéphalopathie | Absente | Grade I–II | Grade III–IV |

Classification : **A** = 5–6 pts (survie à 1 an ≈100%) · **B** = 7–9 pts (≈80%) · **C** = 10–15 pts (≈45%).

**Caveat — this one is worth reading, not just storing:** sources genuinely disagree on the exact TP/INR breakpoints — some cite 30% as the lower cutoff, others 40%; bilirubin cutoffs shift depending on whether the source uses µmol/L or mg/dL, and mixing those unit systems silently is exactly the kind of error this whole architecture exists to prevent. This spec used the version cross-referenced across CHUV and revmed.ch (µmol/L, matching French lab reporting). Confirm this against your institution's reference before it goes live — this is not a hypothetical risk, it's a real discrepancy I found while researching this section, which is the best possible demonstration of why §0.5 requires a human sign-off step rather than trusting any single source blind.

### 6.6 Additional calculators — name only, verify before adding

Same rule as before: source each from an authoritative reference and get human sign-off before insertion.

- MELD (priorisation transplantation hépatique)
- IMC / surface corporelle
- Posologie pédiatrique au poids (mg/kg) — per molécule, sourced from BDPM specifically, never generalized across drug classes
- Score de Glasgow (détail complet, au-delà du seuil utilisé dans qSOFA)

### 6.7 Response shape for `calcul_clinique`

Formula stated → every variable defined with its unit → patient's actual numbers substituted → computed → interpreted clinically → source cited. Skipping to a bare number is the exact terse-answer failure mode this whole revision exists to fix.

---

## 7. Response Composition Templates

Per-`topic_class` section structure, enforced via the generation prompt and a JSON shape the frontend renders with real headers:

- **Pharmacologie:** Mécanisme/Indication → Posologie (math substitution shown if relevant) → Contre-indications → Interactions → Surveillance → *Points clés EDN* → Sources
- **Sémiologie/Cas clinique:** Signes cliniques → Examens paracliniques → Diagnostics différentiels → Conduite à tenir → *Points clés EDN* → Sources
- **Urgence:** Reconnaissance → Gestes immédiats → Traitement → Orientation → *Points clés EDN* → Sources

The **"Points clés EDN"** closing block (3–5 exam-oriented bullets) is the one section that directly serves your actual user — a student revising for a specific exam — rather than just adding more text for its own sake.

---

## 8. Source Freshness & Versioning Pipeline

This turns §4.2's `stale_source` flag from a reactive patch into something the ingestion side actively prevents.

**BDPM refresh.** Nightly job diffs the latest BDPM export against the last-ingested version by `CIS` code. Any drug whose `regulatory_date` changed gets re-indexed; the prior row is kept (for audit trail) but marked `superseded: true` and excluded from active retrieval — not just flagged after the fact at generation time.

**HAS guideline supersession.** HAS publishes explicit "actualisation" dates. Maintain a `guideline_family` key (e.g., every version of "Prise en charge de l'HTA" shares one family id) so that ingesting a newer version automatically marks older family members `superseded: true`, instead of letting multiple versions silently coexist in the retrievable set where the wrong one might get picked.

**Why this matters more than it sounds:** once this ships, most of what §4.2's recency flag exists to catch becomes structurally unreachable — a superseded document simply isn't in the candidate pool FTS5 searches over. Keep the flag anyway as defense-in-depth for guideline families that haven't been explicitly linked yet, but the real fix is here, not at generation time.

---

## 9. Cost & Latency Budget

Real pricing for `gemini-3.5-flash` (confirmed current): **$0.25 / million input tokens, $1.50 / million output tokens**. This table prices the new orchestration calls this spec adds — planner, gap-checker, verifier — since that's the model you've confirmed you're already using for routing. Your existing generation call's cost depends on whichever model actually powers it, which isn't confirmed here; plug it into the same row structure once you know.

| `topic_class` | New LLM calls added | Approx tokens (in/out) | Approx added cost/query | Target p95 latency |
|---|---|---|---|---|
| `conversationnel` | 1 (planner, short-circuits) | ~150 / 50 | <$0.0001 | <400ms |
| `definition_item_edn` | 2–3 (planner, +verifier, +gap-check if needed) | ~4,500 / 900 | ~$0.0025 | 2.5–4s |
| `semiologie_cas_clinique` | 3–4 | ~6,500 / 1,200 | ~$0.0035 | 3–5s |
| `pharmacologie_therapeutique` | 3–4 | ~5,500 / 1,000 | ~$0.003 | 3–5s |
| `calcul_clinique` | 2 (planner, verifier — direct formula-bank lookup, no gap-check needed) | ~2,500 / 500 | ~$0.0015 | 1.5–2.5s |
| `urgence_conduite_a_tenir` | 3–4 | ~6,500 / 1,200 | ~$0.0035 | 3–5s |

These are illustrative estimates, not measured benchmarks — validate against real numbers once §10's logging is live, and tune `MAX_ROUNDS` down if the coverage-gap path is firing (and costing) more than the answer quality gain justifies. Worth noting: Flash-Lite has a free tier within rate limits, so at low-to-moderate traffic this entire orchestration layer may cost you nothing beyond your existing generation-call spend.

---

## 10. Observability & Logging

Without this, you're tuning `MAX_ROUNDS`, BM25 weights, and the verifier by vibes. Log one row per request, in the same Turso DB — no new infra needed:

```ts
interface QueryLog {
  request_id: string;
  timestamp: string;
  primary_class: TopicClass;
  secondary_class?: TopicClass;
  rounds_used: number;
  sub_queries_issued: number;
  distinct_sources_cited: number;
  silos_touched: string[];
  clinical_assertions_total: number;
  clinical_assertions_passed_gate: number;
  clinical_assertions_failed_substring: number;
  clinical_assertions_failed_entity: number;
  clinical_assertions_failed_verifier: number;  // caught only by §4.4, not §4.2
  abstained_sections: string[];
  latency_ms: number;
  estimated_cost_usd: number;
  gate_blocked: boolean;
}
```

Two numbers worth watching from day one:

- **`clinical_assertions_failed_verifier` as a share of total.** This is the direct measure of how much the independent verifier (§4.4) is catching that substring + entity matching alone would have missed. If it's consistently near zero after a few hundred real queries, the extra call may not be earning its cost — that's a real finding either way, not a rationalization to skip building it first.
- **`abstained_sections`, aggregated over time.** This is a live map of exactly where your corpus has holes, ranked by how often students actually hit them — a far better prioritization signal for what to ingest next than guessing.

---

## 11. Curriculum-Aware Caching

The French EDN program is a closed set of **367 official items**, organized in rangs A/B/C (rang A alone covers roughly 70% of what's actually tested). That's a real, exploitable structural fact about this specific domain, not a generic caching tip.

Many `definition_item_edn` and `anatomie_physiologie` questions will be near-duplicates across students — different phrasing of the same item. Maintain a `cached_responses` table keyed by `(topic_class, normalized_item_slug)`. When a new retrieval plan's sub-queries overlap ≥90% (by token overlap after acronym expansion, §5.2) with a previously cached plan in the same class, skip generation and re-serve the cached response, timestamped, with automatic invalidation the moment any cited source gets marked `superseded` by the §8 pipeline.

**Where this doesn't help, and don't pretend it does:** `calcul_clinique` and `semiologie_cas_clinique` are patient-specific by construction — the numbers in the question won't repeat, so there's close to nothing to cache there. Scope this to the two topic classes above where it actually pays off, rather than building a generic cache layer that mostly misses.

---

## 12. Honesty Pass on Claims & Trust UI

- Replace "garantie sans hallucinations" / the 100%-precision framing with something accurate but still a real differentiator: *"chaque affirmation chiffrée est vérifiée mot-à-mot et par un second modèle indépendant contre le texte source."* True, still strong, doesn't overclaim what verification can prove.
- Ship a per-answer **couverture** indicator instead of a hidden binary pass/fail — pulled directly from the `QueryLog` fields in §10: number of distinct sources, silos touched, search rounds run, and any abstained sections surfaced inline rather than buried. "This answer drew on 4 sources across HAS and BDPM in 2 rounds" is a more honest and more useful trust signal than a 422 the student only sees when something already failed.

---

## 13. File-Level Implementation Map

| Section | Repo target | Notes |
|---|---|---|
| §2 Taxonomy | `src/app/api/router/route.ts` | Binary → 7-way enum, + secondary_class |
| §3 Deep search loop | `src/app/api/router/route.ts`, new `lib/deepSearch.ts` | Planner + fan-out + coverage loop |
| §4 Gate + verifier + abstention | `src/app/api/generate/route.ts`, new `lib/verifier.ts` | Schema split, entity check, independent verifier call, abstention span type |
| §5 FTS5 tuning | `ingest_worker.py`, DB migration | Column weights, acronym table, NEAR queries, app-layer typo correction |
| §6 Formula bank | New `clinical_formulas` table + ingestion script | Manually curated only, never LLM-populated |
| §7 Templates | `src/app/chat/page.tsx`, generation prompt | Per-class rendering shape |
| §8 Freshness pipeline | New nightly job (`scripts/refresh_bdpm.ts`, `scripts/check_has_supersession.ts`) | Cron via Vercel Cron or equivalent |
| §9/§10 Cost + logging | New `query_logs` table, middleware in `generate/route.ts` | Same Turso DB, no new infra |
| §11 Caching | New `cached_responses` table | Scoped to definition_item_edn + anatomie_physiologie only |
| §12 Copy/UI | `src/app/page.tsx`, `src/app/paper/page.tsx`, new coverage-indicator component | |

---

## 14. Phased Rollout Plan

Ship in this order — each phase is independently useful and doesn't require the next one to already be live.

1. **Retrieval depth (§3).** Deep search loop behind a feature flag, feeding the existing v1 gate. This alone should reduce terse answers, since the generator has more real material even before the gate changes — a good checkpoint to confirm §1's diagnosis before touching anything else.
2. **Gate redesign (§4).** Narrative/clinical_assertion split + abstention contract. This is the change that most affects perceived answer depth. Ship the independent verifier (§4.3) as part of this phase or hold it for phase 4 — see the note in §10 about measuring whether it's earning its cost first.
3. **Calculation bank (§6).** Additive and isolated — new table, new topic class, low risk to bolt on independently of anything else in flight.
4. **Verifier + freshness pipeline (§4.3, §8),** if not already done in phase 2. Higher-effort infra; do this once phases 1–3 are stable and §10's logs exist to tell you whether the verifier is worth its keep.
5. **Typo tolerance, caching, template polish (§5.5, §7, §11).** Pure quality-of-life. Do last.

---

## 15. Evaluation Set

Run the same questions before/after each phase and compare: response length, distinct sources cited, gate-block rate, and a manual check against the topic class's required sections.

**Original seven, spanning every class:**

1. Qu'est-ce qu'une pneumonie franche lobaire aiguë ? *(definition_item_edn)*
2. Patient de 68 ans, fébrile, toux productive, crépitants en base droite — démarche diagnostique ? *(semiologie_cas_clinique)*
3. Traitement de première intention de l'HTA du sujet âgé ? *(pharmacologie_therapeutique)*
4. Innervation sensitive de la face ? *(anatomie_physiologie)*
5. Clairance de la créatinine d'un homme de 65 ans, 70 kg, créatininémie 110 µmol/L ? *(calcul_clinique)*
6. Conduite à tenir devant un asthme aigu grave de l'enfant ? *(urgence_conduite_a_tenir)*
7. Parle-moi des bactéries. *(your original failing case — see the full trace in §3.7)*

**New adversarial cases — designed to break the system on purpose, not to pass:**

8. **Entity-swap synthetic test (not a live query — a test harness case):** construct a context where chunks for two different drugs are both retrieved for one question. Confirm the gate rejects an assertion whose `exact_source_quote` genuinely exists in the corpus but is attached to the wrong `subject_entity_id`. This is the one case §4.2's old substring-only check would have passed and shouldn't have.
9. **Out-of-scope:** "Quelle est la capitale de la France ?" — should decline or redirect cleanly, not force a medical framing onto it.
10. **Genuine corpus gap:** pick something niche enough that the corpus likely doesn't cover it well. Confirm the response ships visible `abstention` spans (§4.5) instead of fabricating that section.
11. **Score threshold precision:** "Un patient de 78 ans avec HTA et diabète a-t-il besoin d'une anticoagulation pour sa fibrillation atriale ?" — checks whether the CHA₂DS₂-VASc caveat in §6.3 surfaces correctly (this patient scores high regardless of which variant is used, but the response should show its work, not just assert a threshold).
12. **Multi-class routing:** "Quel est le traitement de l'IRC et comment adapter la posologie ?" — exercises the `primary_class` + `secondary_class` path from §2's closing note. Confirm the response actually covers both the pharmacology and the calculation sections rather than picking one and dropping the other.

Track results in a simple table per run — this is what tells you §3/§4 actually worked, not a vibe check.

---

## Summary

More real queries before generation, so there's something to say (§3). A gate that only strictly polices the sentences that are actually dangerous to get wrong, backed by a second opinion that doesn't share the generator's blind spots (§4). A place for numbers to live that's been checked against sources, including checked against *each other* where sources disagree (§6). A pipeline that stops serving stale guidance instead of just flagging it after the fact (§8). And enough visibility into what's happening — cost, coverage, failure mode — that the next round of tuning is based on logs, not guesses (§9, §10). All of it stays on SQLite FTS5. Nothing here needs an embedding model, a vector DB, or a bigger bill than the one you're already paying.

---

## Addendum (post-launch): §4.4 was too strict in practice

In production, §4.4's rule -- any `clinical_assertion` failing substring, entity, or verifier checks blocks the whole response -- turned out to reject well-established, correctly-answered clinical questions whenever even one of several assertions in an otherwise-good answer was disputed (e.g. a nuanced answer citing both CHA2DS2-VASc and the ESC-2024 CHA2DS2-VA variant). The independent verifier's "stay skeptical by default" framing (§4.3) also produced false negatives on faithfully-paraphrased, correctly-attributed claims.

The implemented behavior now diverges from §4.4 as follows: a failing `clinical_assertion` is dropped individually (via `filterSpansForRendering`) rather than discarding the whole response. The response is only rejected when nothing usable survives at all: no verified assertion, no `abstention` span, and no plain `narrative` text. The verifier prompt in §4.3 was also softened to judge clinical substance (wrong drug/pathology/subgroup, fabricated numbers) rather than literal phrasing fidelity. See `IMPLEMENTATION_LOG.md` Phase 6 for the full change list.
