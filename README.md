# AncreMed ⚓🩺

AncreMed is a high-attribution, local-first Retrieval-Augmented Generation (RAG) engine designed to answer clinical inquiries and medical studies questions in French without hallucinations.

By indexing 76,303 pre-processed medical records from the Haute Autorité de Santé (HAS), the Base de Données Publique des Médicaments (BDPM), and official EDN teaching materials into a full-text search database, AncreMed guarantees that every clinical assertion it serves is backed word-for-word by an official regulatory text — and it fails honestly (abstention, not fabrication) when the corpus does not cover a section.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FKNIGHTABDO%2Fancre-med&env=GEMINI_API_KEY,TURSO_DATABASE_URL,TURSO_AUTH_TOKEN)

---

## Key Features

- **Agentic Query Router:** Uses `gemini-3.5-flash` to classify incoming prompts by topic — bypassing DB search for conversational queries and reformulating clinical terms (expanding abbreviations, translating acronyms) to maximize search recall.
- **Multi-Round Deep Search:** A bounded planner loop (`ANCREMED_V2_DEEP_SEARCH`) issues targeted FTS5/BM25 sub-queries per topic playbook, tracks section coverage, and stops once the required sections are covered or a round limit is hit.
- **Full-Text Search (FTS5):** Local SQLite FTS5 search via libSQL/Turso, typically returning matches in single-digit milliseconds.
- **Live Medical APIs:** Augments local context with real-time data from Wikipedia FR and the French National Drug Database API (api-medicaments.fr).
- **Verified Clinical Calculation Bank:** A curated, source-cited table (`ANCREMED_V2_FORMULA_BANK`) of clinical scores/formulas (Cockcroft-Gault, CHA₂DS₂-VASc and the ESC-2024 CHA₂DS₂-VA variant, qSOFA, Child-Pugh) that is prioritized over exam-style distractor text for calculation questions.
- **Tiered Attribution Gate with Graceful Degradation:** Responses are generated as typed spans (`narrative` / `clinical_assertion` / `abstention`). Every `clinical_assertion` must carry a source-exact quote and a matching source entity id. Assertions that fail this check, or that a second independent verifier model (`ANCREMED_V2_VERIFIER_FRESHNESS`) disputes, are dropped **individually** — the rest of the answer (verified claims, narrative explanation, honest abstentions) is still served. The whole response is only rejected (`422`) when nothing usable survives at all.
- **Source Freshness Tracking:** Supersession scripts flag outdated HAS/BDPM entries so stale guidance stops being retrievable once superseded.
- **Quality-of-Life Layer:** Typo-tolerant query correction, scoped response caching for stable question classes, and a per-answer coverage indicator in the console (`ANCREMED_V2_QUALITY_POLISH`).
- **Premium Responsive Interface:** Modern dashboard with a collapsible desktop sidebar, a mobile overlay sidebar with unambiguous open/close controls, and mobile-native bottom navigation.
- **Liquid Glass Design System:** An iOS 26–style translucent glass UI (frosted surfaces, backdrop blur, capsule controls) with a full **light + dark** theme that follows the system preference. All styling is token-driven `styled-jsx`. See **[`DESIGN.md`](./DESIGN.md)** before adding or restyling any UI.

---

## Design System

AncreMed's UI follows a documented **Liquid Glass** design system. All colors, radii, blur,
and motion are CSS variables in `src/app/globals.css`; light/dark theming is automatic via
`prefers-color-scheme`. Reusable `.glass` / `.glass-strong` / `.glass-tint` utilities and a
strict "no nested `backdrop-filter`" rule keep every surface consistent.

**If you (or an AI agent) are building or changing any UI, read [`DESIGN.md`](./DESIGN.md) first** —
it covers the token reference, the glass recipes, the two glass tiers, the nested-blur rule,
theme-aware SVG diagrams, and a pre-flight checklist.

---

## Technical Architecture

```
                    ┌────────────────────────┐
                    │     User Prompt        │
                    └───────────┬────────────┘
                                │
                                ▼
                    ┌────────────────────────┐
                    │  Agentic Query Router  │
                    │ (gemini-3.5-flash)│
                    └───────┬────────────┬───┘
                            │            │
             (Conversational│            │(Clinical Query)
                 Bypass)    ▼            ▼
                            │   ┌────────────────────────┐
                            │   │ Deep Search Planner    │
                            │   │ (multi-round, coverage │
                            │   │  tracked per section)  │
                            │   └────────┬───────────────┘
                            │            │ (Expanded terms, bounded rounds)
                            │            ▼
                            │   ┌────────────────────────┐
                            │   │  Turso/libSQL FTS5     │
                            │   │ 76,303 chunks + formula│
                            │   │ bank + freshness filter│
                            │   └────────┬───────────────┘
                            │            │ + Live APIs
                            ▼            ▼
                    ┌────────────────────────┐
                    │   Clinical Generator   │
                    │ (narrative / assertion │
                    │   / abstention spans)  │
                    └───────────┬────────────┘
                                │
                                ▼
                    ┌────────────────────────┐
                    │  Tiered Attribution    │
                    │  Gate (per-assertion)  │
                    │  + Independent Verifier│
                    └───────────┬────────────┘
                                │
                  ┌─────────────┼──────────────┐
                  ▼             ▼              ▼
        ┌──────────────┐ ┌─────────────┐ ┌─────────────────┐
        │ Verified     │ │ Honest      │ │ Failed assertion │
        │ claims kept  │ │ abstention  │ │ dropped, rest of │
        │ (200 OK)     │ │ (200 OK)    │ │ answer kept      │
        └──────────────┘ └─────────────┘ └─────────────────┘
                                │
                    (only if nothing usable survives)
                                ▼
                    ┌────────────────────────┐
                    │   Blocked Response     │
                    │    (422 Error Page)    │
                    └────────────────────────┘
```

---

## Project Structure

```
ancre-med/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── generate/route.ts   # Span generator, tiered attribution gate, independent verifier
│   │   │   └── router/route.ts     # Agentic router, deep search planner, formula-bank lookup
│   │   ├── chat/page.tsx           # Clinical medical chat console
│   │   ├── paper/page.tsx          # Technical research paper page
│   │   ├── changelog/page.tsx      # Release notes timeline
│   │   ├── privacy/page.tsx        # Privacy compliance page
│   │   ├── terms/page.tsx          # Terms of service & clinical disclaimer
│   │   ├── layout.tsx              # Root layout
│   │   └── page.tsx                # Landing page
│   ├── lib/
│   │   ├── clinicalTypes.ts        # Shared topic/playbook/retrieval types
│   │   ├── deepSearch.ts           # Multi-round retrieval planner & coverage tracking
│   │   ├── featureFlags.ts         # ANCREMED_V2_* rollout flag helpers
│   │   ├── formulaBank.ts          # Verified clinical calculation lookup
│   │   ├── freshness.ts            # Superseded-source tracking helpers
│   │   ├── queryLogs.ts            # Observability log writer (query_logs table)
│   │   ├── responseCache.ts        # Scoped response cache for stable question classes
│   │   ├── typoCorrection.ts       # Lightweight query typo tolerance
│   │   └── verifier.ts             # Independent second-model claim verifier
│   └── data/
│       └── clinical_formulas.seed.json  # Curated, source-cited formula/score bank
├── scripts/
│   ├── seed-clinical-formulas.mjs  # Seeds/updates the clinical_formulas table
│   ├── refresh-bdpm.mjs            # Marks superseded BDPM entries
│   ├── check-has-supersession.mjs  # Marks superseded HAS guideline entries
│   └── build-search-vocabulary.mjs # Builds the typo-correction vocabulary
├── ingest_worker.py                # Parser and index builder for HAS/BDPM dumps
├── search_worker.py                # Standalone FTS5 search tester
├── migrate-to-turso.mjs            # Local-to-Turso database migration script
├── paper-v2.md                     # v2 architecture specification
├── IMPLEMENTATION_LOG.md           # Phase-by-phase implementation notes
├── DESIGN.md                       # Liquid Glass design system (read before touching UI)
├── README.md
├── CONTRIBUTING.md
└── LICENSE (MIT)
```

---

## Getting Started

### Prerequisites
- **Node.js:** v20+
- **Python:** 3.10+ (only needed for rebuilding the database from scratch)
- **Gemini API Key:** An active API key from [Google AI Studio](https://aistudio.google.com/apikey)

### 1. Clone & Install

```bash
git clone https://github.com/KNIGHTABDO/ancre-med.git
cd ancre-med
npm install
```

### 2. Environment Variables

Copy the example env file and fill in your keys:

```bash
cp .env.example .env
```

```env
# Required
GEMINI_API_KEY=your-gemini-api-key

# For production / Vercel deployment (Turso cloud database)
TURSO_DATABASE_URL=libsql://your-db-name.turso.io
TURSO_AUTH_TOKEN=your-turso-auth-token

# v2 feature flags (see "Feature Flags" below). Safe to leave all as
# false for the original v1 pipeline, or all true for the full v2 stack.
ANCREMED_V2_DEEP_SEARCH=false
ANCREMED_V2_GATE_SPANS=false
ANCREMED_V2_FORMULA_BANK=false
ANCREMED_V2_VERIFIER_FRESHNESS=false
ANCREMED_V2_QUALITY_POLISH=false
```

> **Local development:** If `TURSO_DATABASE_URL` is not set, the app falls back to a local `clinical_ground_truth.db` SQLite file.

### 3. Running Locally

```bash
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## Feature Flags (v2 Rollout)

AncreMed's v2 work shipped as independently-togglable flags so each phase could be validated on its own before being combined. All default to `false` (the original v1 behavior) unless set to `true`/`1`/`yes`/`on`/`enabled`.

| Flag | Effect |
| --- | --- |
| `ANCREMED_V2_DEEP_SEARCH` | Enables the multi-round retrieval planner with per-section coverage tracking instead of a single lexical pass. |
| `ANCREMED_V2_GATE_SPANS` | Switches generation to typed `narrative` / `clinical_assertion` / `abstention` spans with per-assertion attribution gating (recommended — this is what enables graceful degradation instead of whole-response blocking). |
| `ANCREMED_V2_FORMULA_BANK` | Prioritizes the curated `clinical_formulas` table for calculation questions over generic exam text. |
| `ANCREMED_V2_VERIFIER_FRESHNESS` | Enables the second independent verifier model call, query-log observability, and superseded-source filtering. |
| `ANCREMED_V2_QUALITY_POLISH` | Enables typo correction, response caching for stable question classes, response templates, and the in-console coverage indicator. |

The `.env.example` template ships all five as `false` so a fresh clone starts from the conservative v1 baseline; the deployed production instance runs with all five enabled.

---

## Deployment (Vercel)

AncreMed is designed to deploy on **Vercel** with a **Turso** cloud database.

### 1. Set up Turso Database

1. Create a free account at [turso.tech](https://turso.tech)
2. Create a new database (e.g., `ancre-med`)
3. Get your database URL and auth token from the Turso dashboard

### 2. Migrate Local Data to Turso

If you have a local `clinical_ground_truth.db` file:

```bash
# Add Turso credentials to your .env first, then:
node migrate-to-turso.mjs
```

### 3. Seed / Refresh Auxiliary Tables (v2)

If you are running with the v2 flags enabled:

```bash
npm run seed:formulas   # populate the clinical_formulas table
npm run freshness:bdpm  # flag superseded BDPM entries
npm run freshness:has   # flag superseded HAS guideline entries
npm run vocab:build     # build the typo-correction vocabulary (optional)
```

### 4. Deploy to Vercel

1. Push this repo to GitHub
2. Import the repo in [Vercel](https://vercel.com)
3. Add environment variables in Vercel's dashboard:
   - `GEMINI_API_KEY`
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
   - Any `ANCREMED_V2_*` flags you want enabled
4. Deploy!

Or use the one-click deploy button above.

---

## Database Ingestion (Advanced)

To rebuild the database from scratch using official HAS and BDPM data sources:

```bash
python ingest_worker.py --silos ansm_bdpm_vidal has_recommandations
```

This downloads, normalizes, chunks, and indexes medical texts into a local SQLite FTS5 database. See `ingest_worker.py` for full configuration options.

---

## Contributing

Contributions from medical professionals, software engineers, and educators are highly welcome. Please read our [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and submission process.

---

## License

This project is open-source software licensed under the [MIT License](LICENSE).
