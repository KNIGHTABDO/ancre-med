# AncreMed ⚓🩺

AncreMed is a high-attribution, local-first Retrieval-Augmented Generation (RAG) engine designed to answer clinical inquiries and medical studies questions in French without hallucinations. 

By running on a local-first SQLite FTS5 database containing 76,303 pre-indexed medical records from the Haute Autorité de Santé (HAS) and Base de Données Publique des Médicaments (BDPM), AncreMed guarantees that every single assertion is backed word-for-word by official regulatory texts.

---

## Key Features

- **Local-First SQLite FTS5 Engine:** Instant text search query matches in under 10ms with zero network charges or API embedding tokens.
- **Agentic Router & Reformulator:** Uses `gemini-3.1-flash-lite` to automatically classify incoming prompts, bypassing DB search for conversational queries and reformulating clinical terms (expanding abbreviations, translating acronyms) to maximize FTS5 recall.
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
                            │   │   SQLite FTS5 Index    │
                            │   │  (76,303 Medical Chunks)
                            │   └────────┬───────────────┘
                            │            │ (Source Context)
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
│   ├── app/
│   │   ├── api/
│   │   │   ├── generate/route.ts   # Clinical attribution validator & generator
│   │   │   └── router/route.ts     # Agentic Router & Query Reformulator
│   │   ├── chat/page.tsx           # Clinical medical chat console
│   │   ├── paper/page.tsx          # Technical research paper page
│   │   ├── changelog/page.tsx      # Release notes timeline
│   │   ├── privacy/page.tsx        # Privacy compliance page
│   │   ├── terms/page.tsx          # Terms of service & clinical disclaimer
│   │   └── page.tsx                # Premium landing page root
│   └── components/
├── scripts/
│   └── ingest_worker.py            # Parser and index builder for HAS/BDPM dumps
├── README.md
├── CONTRIBUTING.md
└── LICENSE
```

---

## Getting Started

### 1. Prerequisites
- **Node.js:** v18+ 
- **Python:** 3.10+ (needed only for running raw database ingestion)
- **Gemini API Key:** An active API key from Google AI Studio.

### 2. Environment Variables
Create a `.env.local` file in the root folder of the project:
```env
GEMINI_API_KEY=your-gemini-api-key-here
```

### 3. Installation
Clone the repository and install dependencies:
```bash
npm install
```

### 4. Database Setup (Optional)
The project comes with a pre-built SQLite database `clinical_ground_truth.db`. If you need to re-build or ingest fresh documents, run the parser script:
```bash
python scripts/ingest_worker.py
```

### 5. Running the Application
Start the local development server:
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## Contributing
Contributions from medical professionals, software engineers, and educators are highly welcome. Please read our [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and submission process.

---

## License
This project is open-source software licensed under the [MIT License](LICENSE).
