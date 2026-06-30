# AncreMed ⚓🩺

AncreMed is a high-attribution, local-first Retrieval-Augmented Generation (RAG) engine designed to answer clinical inquiries and medical studies questions in French without hallucinations.

By indexing 76,303 pre-processed medical records from the Haute Autorité de Santé (HAS) and Base de Données Publique des Médicaments (BDPM) into a full-text search database, AncreMed guarantees that every single assertion is backed word-for-word by official regulatory texts.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FKNIGHTABDO%2Fancre-med&env=GEMINI_API_KEY,TURSO_DATABASE_URL,TURSO_AUTH_TOKEN)

---

## Key Features

- **Agentic Query Router:** Uses `gemini-3.1-flash-lite` to automatically classify incoming prompts — bypassing DB search for conversational queries and reformulating clinical terms (expanding abbreviations, translating acronyms) to maximize search recall.
- **Full-Text Search (FTS5):** Instant text search query matches in under 10ms using SQLite FTS5 via libSQL/Turso.
- **Live Medical APIs:** Augments local context with real-time data from Wikipedia FR and the French National Drug Database API (api-medicaments.fr).
- **Clinical Attribution Gate:** Strict clinician-in-the-loop double valve verification. Claims are parsed and checked word-for-word against the source documents. Hallucinated responses are automatically blocked (returning `422 Unprocessable Entity`).
- **Premium Responsive Interface:** Modern, polished dashboard design with collapsible desktop sidebar, smooth CSS grids, and mobile-native bottom navigation menus.

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
                    │ (Gemini-3.1-Flash-Lite)│
                    └───────┬────────────┬───┘
                            │            │
             (Conversational│            │(Clinical Query)
                 Bypass)    ▼            ▼
                            │   ┌────────────────────────┐
                            │   │   Query Reformulator   │
                            │   └────────┬───────────────┘
                            │            │ (Expanded Terms)
                            │            ▼
                            │   ┌────────────────────────┐
                            │   │  Turso/libSQL FTS5     │
                            │   │ (76,303 Medical Chunks)│
                            │   └────────┬───────────────┘
                            │            │ + Live APIs
                            ▼            ▼
                    ┌────────────────────────┐
                    │   Clinical Generator   │
                    └───────────┬────────────┘
                                │ (JSON Claims Draft)
                                ▼
                    ┌────────────────────────┐
                    │Clinical Attribution Gate
                    │ (Word-for-word Check)  │
                    └───────────┬────────────┘
                                │
                        ┌───────┴───────┐
                        │               │
                     (Pass)          (Fail)
                        ▼               ▼
            ┌──────────────────────┐ ┌──────────────────────┐
            │   Verified Answer    │ │ Blocked Response     │
            │      (200 OK)        │ │  (422 Error Page)    │
            └──────────────────────┘ └──────────────────────┘
```

---

## Project Structure

```
ancre-med/
├── src/
│   └── app/
│       ├── api/
│       │   ├── generate/route.ts   # Clinical attribution validator & generator
│       │   └── router/route.ts     # Agentic Router & Query Reformulator
│       ├── chat/page.tsx           # Clinical medical chat console
│       ├── paper/page.tsx          # Technical research paper page
│       ├── changelog/page.tsx      # Release notes timeline
│       ├── privacy/page.tsx        # Privacy compliance page
│       ├── terms/page.tsx          # Terms of service & clinical disclaimer
│       ├── layout.tsx              # Root layout
│       └── page.tsx                # Landing page
├── ingest_worker.py                # Parser and index builder for HAS/BDPM dumps
├── search_worker.py                # Standalone FTS5 search tester
├── migrate-to-turso.mjs           # Local-to-Turso database migration script
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
```

> **Local development:** If `TURSO_DATABASE_URL` is not set, the app falls back to a local `clinical_ground_truth.db` SQLite file.

### 3. Running Locally

```bash
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** in your browser.

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

### 3. Deploy to Vercel

1. Push this repo to GitHub
2. Import the repo in [Vercel](https://vercel.com)
3. Add environment variables in Vercel's dashboard:
   - `GEMINI_API_KEY`
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
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
