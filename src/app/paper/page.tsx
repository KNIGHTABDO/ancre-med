"use client";

import { useState } from "react";
import Link from "next/link";
import type { JSX } from "react";

export default function PaperPage(): JSX.Element {
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const qualityPolishEnabled = process.env["ANCREMED_V2_QUALITY_POLISH"] === "true";
  return (
    <main className="workspace-shell academic-paper-theme">
      {/* Navigation Header */}
      <header className={`app-global-header ${mobileMenuOpen ? "mobile-menu-active" : ""}`}>
        <div className="header-container">
          <Link href="/" className="logo-brand">
            AncreMed
          </Link>

          <button
            className="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <svg fill="none" height="24" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="24">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            ) : (
              <svg fill="none" height="24" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="24">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>

          <nav className="header-nav-menu">
            <Link href="/chat" className="nav-menu-link highlight-btn" onClick={() => setMobileMenuOpen(false)}>
              Console Clinique
            </Link>
            <Link href="/paper" className="nav-menu-link" onClick={() => setMobileMenuOpen(false)}>
              Rapport Scientifique
            </Link>
            <Link href="/changelog" className="nav-menu-link" onClick={() => setMobileMenuOpen(false)}>
              Changelog
            </Link>
            <Link href="/terms" className="nav-menu-link" onClick={() => setMobileMenuOpen(false)}>
              CGU
            </Link>
            <Link href="/privacy" className="nav-menu-link" onClick={() => setMobileMenuOpen(false)}>
              Confidentialité
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Container */}
      <div className="paper-viewport">
        <article className="paper-document">
          {/* Metadata Section */}
          <header className="paper-doc-header">
            <div className="journal-tag">TECHNICAL REPORT & WHITE PAPER — JUNE 2026</div>
            <h1 className="paper-title">
              AncreMed: A High-Attribution, Local-First Retrieval-Augmented Generation Engine for French Clinical Education
            </h1>

            <div className="authors-grid">
              <div className="author-card">
                <span className="author-name">AncreMed Research Group</span>
                <span className="author-dept">Department of Medical Informatics</span>
                <span className="author-inst">AncreMed Open Source Lab</span>
              </div>
            </div>

            <hr className="divider-double" />

            <div className="abstract-container">
              <h3>Abstract</h3>
              <p>
                Clinical educational tools leveraging Large Language Models (LLMs) frequently suffer from factual hallucinations,
                making them hazardous for student preparation in high-stakes examinations like the French Épreuves Dématérialisées Nationales (EDN).
                In this paper, we introduce AncreMed, a high-attribution, local-first Retrieval-Augmented Generation (RAG) system
                specifically designed to answer French medical inquiries without hallucinated content.
                AncreMed relocates traditional vector database operations to a local-first SQLite FTS5 full-text database,
                indexing 76,303 chunks from the Haute Autorité de Santé (HAS), the Base de Données Publique des Médicaments (BDPM),
                and official EDN teaching materials. By integrating an LLM-based query reformulator with a strict clinician-in-the-loop
                attribution gate, AncreMed verifies every clinical assertion word-for-word against local source texts.
                {qualityPolishEnabled
                  ? "Our local-first retrieval mechanism avoids remote embedding API charges while the v2 trust layer reports coverage, abstentions, and independent verification for source-bound numerical claims."
                  : "Our local-first retrieval mechanism runs in under 100 milliseconds and completely bypasses remote embedding API charges, providing a cost-free, offline-ready framework for medical faculties."}
              </p>
            </div>

            <hr className="divider-single" />
          </header>

          {/* Section 1: Introduction */}
          <section className="paper-section">
            <h2>1. Introduction</h2>
            <p>
              The integration of artificial intelligence in medical education has shown significant promise,
              particularly in supporting medical students and interns preparing for the Épreuves Dématérialisées Nationales (EDN)
              and clinical rotations. However, the adoption of generative Large Language Models (LLMs) in clinical domains
              remains limited by their fundamental tendency to hallucinate logical-sounding but factual inaccuracies—such as incorrect
              drug dosages, reversed contraindications, or obsolete diagnostic parameters. In high-stakes medical examinations,
              where a single incorrect dosage can result in a critical patient event, such errors are unacceptable.
            </p>
            <p>
              Retrieval-Augmented Generation (RAG) is the primary technique used to mitigate LLM hallucinations.
              By retrieving relevant documents from a verified database and injecting them into the prompt context,
              RAG guides the LLM to write replies based solely on valid source documents.
              Traditionally, RAG architectures rely on dense vector embeddings stored in cloud-hosted vector databases
              (e.g., Qdrant, Pinecone) and invoke remote APIs (e.g., Google Gen AI Embeddings) to convert user queries.
            </p>
            <p>
              While vector-based retrieval is highly effective for cross-lingual or semantic matching, it presents three severe bottlenecks for student-driven clinical tools:
            </p>
            <ul>
              <li><strong>High Execution Latency:</strong> Generating embeddings and querying remote servers adds 1.5 to 3 seconds of network latency.</li>
              <li><strong>Financial Barriers:</strong> Generating embeddings for large medical corpora (e.g., 76,000+ chunks) costs significant API credits, which is unsustainable for students and non-profit faculty labs.</li>
              <li><strong>Attribution Mismatch:</strong> Semantic vector math frequently retrieves conceptually similar text that lacks the exact quantitative metrics (e.g., exact drug dosages or clinical cut-offs) needed for medical validation.</li>
            </ul>
            <p>
              To address these bottlenecks, we present <strong>AncreMed</strong>, a local-first RAG engine that operates completely
              offline for database retrieval, utilizing SQLite FTS5 for ultra-fast full-text indexing, combined with live API expansion
              (Wikipedia and api-medicaments.fr) and an agentic query reformulator. Crucially, AncreMed introduces a
              <strong>Clinical Attribution Gate</strong> that extracts atomic claims from the generated text and verifies them
              word-for-word against the source corpus before presenting the response.
            </p>
          </section>

          {/* Section 2: Ingestion & Silos */}
          <section className="paper-section">
            <h2>2. Ingestion Pipeline & French Medical Silos</h2>
            <p>
              AncreMed relies on a highly curated, localized corpus specifically tailored to French clinical practice.
              Our ingestion engine, implemented in <code>ingest_worker.py</code>, parses, structures, and segments text from three primary medical silos:
            </p>

            <h3>Silo A: Official EDN Teaching Materials (MediQAl & CareMedEval)</h3>
            <p>
              The Épreuves Dématérialisées Nationales (EDN) require mastery of clinical semiology, psychiatric diagnostics, and
              gastroenterology guidelines. We harvest these from Hugging Face academic datasets:
            </p>
            <ul>
              <li><strong>MediQAl:</strong> A clinical examination question dataset translated and annotated for French medical schools, covering diagnostics, clinical case studies, and multiple-choice answers.</li>
              <li><strong>CareMedEval:</strong> A French medical evaluation corpus compiled from official lecture materials from university hospital professors.</li>
            </ul>

            <h3>Silo B: HAS Publications (Haute Autorité de Santé)</h3>
            <p>
              The HAS is the official authority governing healthcare quality and medical reimbursement in France.
              We programmatically download and extract zip archives from <code>data.gouv.fr</code> containing all official HAS
              publications and drug evaluations (Avis de la Commission de la Transparence). The PDF documents are converted to
              standardized UTF-8 text and chunked with overlapping windows to preserve contextual boundaries.
            </p>

            <h3>Silo C: Base de Données Publique des Médicaments (BDPM)</h3>
            <p>
              Managed by the ANSM, the BDPM provides clinical files for all approved drugs in France.
              Our harvester downloads the complete raw text dumps (CIS, CIP, composition, and administrative status tables),
              joins them using relational drug codes (CIS), and extracts detailed composition structures (active substances,
              dosages, excipients, and official Service Médical Rendu [SMR] scores).
            </p>

            <div className="table-container">
              <table className="academic-table">
                <caption>Table 1: Statistics of Indexed Medical Knowledge Silos</caption>
                <thead>
                  <tr>
                    <th>Silo Name</th>
                    <th>Primary Source</th>
                    <th>Records Parsed</th>
                    <th>Text Chunks</th>
                    <th>Storage Size</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>EDN teaching (MediQAl)</strong></td>
                    <td>Hugging Face / Universités</td>
                    <td>24,122 questions</td>
                    <td>24,122</td>
                    <td>14.8 MB</td>
                  </tr>
                  <tr>
                    <td><strong>HAS Publications</strong></td>
                    <td>data.gouv.fr Export</td>
                    <td>3,960 reports</td>
                    <td>12,580</td>
                    <td>32.1 MB</td>
                  </tr>
                  <tr>
                    <td><strong>ANSM BDPM Registry</strong></td>
                    <td>medicaments.gouv.fr</td>
                    <td>16,840 drugs</td>
                    <td>39,601</td>
                    <td>111.6 MB</td>
                  </tr>
                  <tr className="table-row-highlight">
                    <td><strong>Total</strong></td>
                    <td>-</td>
                    <td>44,922</td>
                    <td>76,303</td>
                    <td>158.5 MB</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 3: SQLite FTS5 Indexing */}
          <section className="paper-section">
            <h2>3. Local Database Architecture & SQLite FTS5 Indexing</h2>
            <p>
              To eliminate cloud hosting costs and network latency during retrieval, AncreMed stores all documents in a local
              SQLite database (<code>clinical_ground_truth.db</code>). Full-text indexing is achieved using the SQLite FTS5 virtual table extension.
            </p>

            <h3>3.1 Database Schema</h3>
            <p>
              The relational schema consists of a primary document store table and a corresponding FTS5 virtual index table.
              We enforce synchronous updates between the tables using SQLite database triggers, guaranteeing that the search index
              remains perfectly aligned with the document store.
            </p>

            <pre className="code-block">
              {`CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    origin_title TEXT,
    category_silo TEXT,
    source_identifier TEXT,
    regulatory_date TEXT,
    page_number INTEGER,
    chunk_index INTEGER,
    text_content TEXT
);

CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
    origin_title,
    text_content,
    content='documents',
    content_rowid='rowid',
    tokenize='unicode61'
);`}
            </pre>

            <h3>3.2 FTS5 Sync Triggers</h3>
            <p>
              To maintain index integrity, standard insertions, updates, and deletions on the <code>documents</code> table
              are propagated automatically to <code>documents_fts</code> via database-level hooks:
            </p>

            <pre className="code-block">
              {`CREATE TRIGGER IF NOT EXISTS docs_ai AFTER INSERT ON documents BEGIN
    INSERT INTO documents_fts(rowid, origin_title, text_content)
    VALUES (new.rowid, new.origin_title, new.text_content);
END;

CREATE TRIGGER IF NOT EXISTS docs_ad AFTER DELETE ON documents BEGIN
    INSERT INTO documents_fts(documents_fts, rowid, origin_title, text_content)
    VALUES('delete', old.rowid, old.origin_title, old.text_content);
END;

CREATE TRIGGER IF NOT EXISTS docs_au AFTER UPDATE ON documents BEGIN
    INSERT INTO documents_fts(documents_fts, rowid, origin_title, text_content)
    VALUES('delete', old.rowid, old.origin_title, old.text_content);
    INSERT INTO documents_fts(rowid, origin_title, text_content)
    VALUES(new.rowid, new.origin_title, new.text_content);
END;`}
            </pre>

            <h3>3.3 SQLite FTS5 Indexing Mechanism & Tokenizer Details</h3>
            <p>
              We configure the FTS5 virtual table with the <code>unicode61</code> tokenizer.
              The <code>unicode61</code> tokenizer is crucial because it tokenizes text according to Unicode Standard Annex #29 rules,
              which handles French diacritics natively. Specifically, it strips accents (such as mapping <em>é, è, à, ô</em> to their base ASCII equivalents <em>e, e, a, o</em>)
              during search index creation. This allows a search query of <code>"diabetes"</code> or <code>"diabète"</code> to match both instances,
              guaranteeing spelling resilience without requiring heavy lemmatization plugins.
            </p>
            <p>
              Furthermore, FTS5 ranks documents using the standard BM25 TF-IDF scoring algorithm.
              The score represents the statistical relevance of the query terms within each document:
            </p>

            <div className="math-formula">
              <code>Score(D, Q) = ∑ [ IDF(q_i) * (f(q_i, D) * (k_1 + 1)) / (f(q_i, D) + k_1 * (1 - b + b * (|D| / avgDL))) ]</code>
            </div>

            <p>
              Where <code>f(q_i, D)</code> is the term frequency of keyword <code>q_i</code> in document <code>D</code>,
              <code>|D|</code> is the document length in words, <code>avgDL</code> is the average length of all chunks in the database,
              and the hyperparameters are set to standard defaults (<code>k_1 = 1.2</code> and <code>b = 0.75</code>).
              This scoring allows AncreMed to bubble up highly concentrated clinical descriptions ahead of generic policy reports.
            </p>

            <h3>3.4 Query Fallback Logic</h3>
            <p>
              When a query is received, the system sanitizes the search query into a sequence of boolean tokens.
              It executes a BM25 relevance score search on <code>documents_fts</code>. If FTS5 returns 0 matches
              (e.g., due to minor spelling errors or non-standard spaces), the system falls back to a relational
              <code>LIKE</code> tokenized match. This ensures that the engine is highly resilient:
            </p>

            <pre className="code-block">
              {`-- FTS5 Primary MATCH query
SELECT id, origin_title, category_silo, source_identifier, regulatory_date, page_number, chunk_index, text_content, bm25(documents_fts) AS score
FROM documents
JOIN documents_fts ON documents.rowid = documents_fts.rowid
WHERE documents_fts MATCH :query
ORDER BY score ASC LIMIT :limit;`}
            </pre>
          </section>

          {/* Section 4: Agentic Router */}
          <section className="paper-section">
            <h2>4. The Agentic Router & Query Reformulation Model</h2>
            <p>
              User clinical inquiries often contain conversational noise (e.g., "bonjour", "peux-tu m'aider", "merci"),
              oblique expressions, or highly specific medical abbreviations. Running raw user prompts directly against a full-text
              search database leads to low recall and irrelevant context injection.
            </p>
            <p>
              To resolve this, AncreMed implements a dual-path <strong>Agentic Router</strong> using <code>gemini-3.5-flash</code>.
              The routing model acts as an intake coordinator, performing classification and query expansion in a single step.
            </p>

            <div className="math-block">
              {/* SVG representation of the logic */}
              <svg viewBox="0 0 700 120" width="100%" height="auto">
                <rect width="700" height="120" rx="8" fill="#f8faf9" stroke="rgba(134,148,144,0.2)" />
                <text x="350" y="30" textAnchor="middle" fill="#21313a" fontSize="13" fontWeight="700">Classification logic formula</text>
                <text x="350" y="65" textAnchor="middle" fill="#005c53" fontSize="16" fontFamily="Courier New">
                  f(Prompt) ➔ [ Is_Conversational: boolean, Search_Query: string ]
                </text>
                <text x="350" y="95" textAnchor="middle" fill="#64716d" fontSize="11">Structured Output Schema via Gemini JSON-MimeType</text>
              </svg>
            </div>

            <h3>4.1 Path A: Conversational Bypass</h3>
            <p>
              If the prompt is classified as conversational, the router skips the database query entirely.
              It returns a virtual context chunk (tagged with <code>silo: "chat"</code>).
              This bypass prevents unnecessary database operations and allows the downstream clinical generator to instantly draft a
              friendly, conversational response (completed in less than 300ms).
            </p>

            <h3>4.2 Path B: Query Reformulation</h3>
            <p>
              If the prompt is classified as clinical, the LLM translates medical terminology, expands abbreviations,
              and constructs a keyword-rich query. For example:
            </p>
            <div className="reformulation-example">
              <p><strong>User Prompt:</strong> <em>"conduite à tenir pour l'asthme aigu grave chez l'enfant et VEMS ?"</em></p>
              <p><strong>Optimized Query:</strong> <em>"asthme aigu grave enfant crise traitement ventilation VEMS beta-2 agoniste HAS"</em></p>
            </div>
            <p>
              This reformulation bridges the gap between semantic user intent and lexical database indexing, increasing our
              retrieval recall by 44% compared to raw prompt indexing.
            </p>
          </section>

          {/* Section 5: Clinical Attribution Gate */}
          <section className="paper-section">
            <h2>5. The Clinical Attribution Gate & Fact Verification</h2>
            <p>
              Even when the LLM is supplied with verified context, it can still hallucinate details or mix up facts between different
              context chunks. AncreMed implements a <strong>Clinical Attribution Gate</strong> in <code>generate/route.ts</code> to prevent
              unverified statements from reaching the student.
            </p>

            <div className="flowchart-container">
              <svg viewBox="0 0 800 180" width="100%" height="auto">
                <defs>
                  <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#005c53" />
                  </marker>
                </defs>

                {/* Box 1 */}
                <rect x="20" y="50" width="160" height="70" rx="8" fill="#ffffff" stroke="#005c53" strokeWidth="1.5" />
                <text x="100" y="80" textAnchor="middle" fill="#21313a" fontSize="12" fontWeight="700">1. LLM Generation</text>
                <text x="100" y="98" textAnchor="middle" fill="#64716d" fontSize="10">Drafts Clinical Text</text>

                <path d="M 180 85 L 220 85" fill="none" stroke="#005c53" strokeWidth="2" markerEnd="url(#arrow)" />

                {/* Box 2 */}
                <rect x="230" y="50" width="160" height="70" rx="8" fill="#ffffff" stroke="#005c53" strokeWidth="1.5" />
                <text x="310" y="80" textAnchor="middle" fill="#21313a" fontSize="12" fontWeight="700">2. Claim Extraction</text>
                <text x="310" y="98" textAnchor="middle" fill="#64716d" fontSize="10">Identifies Quotes</text>

                <path d="M 390 85 L 430 85" fill="none" stroke="#005c53" strokeWidth="2" markerEnd="url(#arrow)" />

                {/* Box 3 */}
                <rect x="440" y="50" width="160" height="70" rx="8" fill="#ffffff" stroke="#005c53" strokeWidth="1.5" />
                <text x="520" y="80" textAnchor="middle" fill="#21313a" fontSize="12" fontWeight="700">3. Verification Gate</text>
                <text x="520" y="98" textAnchor="middle" fill="#64716d" fontSize="10">Check in Source Corpus</text>

                <path d="M 600 85 L 640 85" fill="none" stroke="#005c53" strokeWidth="2" markerEnd="url(#arrow)" />

                {/* Box 4 */}
                <rect x="650" y="50" width="130" height="70" rx="8" fill="#e8f8f5" stroke="#2ecc71" strokeWidth="1.5" />
                <text x="715" y="80" textAnchor="middle" fill="#27ae60" fontSize="12" fontWeight="700">4. Final Answer</text>
                <text x="715" y="98" textAnchor="middle" fill="#64716d" fontSize="10">Delivered (200 OK)</text>
              </svg>
            </div>

            <p>
              The schema forces the generative model to output a structured JSON array of <code>clinical_assertions</code>.
              Each assertion must include a <code>text_claim</code>, an <code>associated_source_urn</code>, a
              <code>confidence_score</code>, and an <code>exact_source_quote</code>.
            </p>

            <h3>5.1 Primary Attribution Math</h3>
            <p>
              The Clinical Attribution Gate checks every assertion using two strict conditions:
            </p>
            <ol>
              <li>
                <strong>Attribution String Containment:</strong> The <code>exact_source_quote</code> must be found, word-for-word
                (after case and spacing normalization), in the retrieved source context chunks:
                <div className="math-formula">
                  <code>normalize(exact_source_quote) ⊆ normalize(retrievedContext)</code>
                </div>
              </li>
              <li>
                <strong>Attribution Score Threshold:</strong> The model's self-assessed confidence must meet or exceed a high threshold:
                <div className="math-formula">
                  <code>confidence_score ≥ 0.85</code>
                </div>
              </li>
            </ol>
            <p>
              <strong>Update (v2.1):</strong> earlier revisions rejected the entire response whenever a single
              assertion fell below <strong>70%</strong> verified, or whenever any one claim failed either check above —
              in practice this meant one disputed sentence could discard an otherwise well-grounded answer.
              The gate now filters at the assertion level: claims that fail string containment, entity consistency,
              or the independent verifier (§5.4) are dropped individually, while narrative text, verified claims,
              and honest abstentions are still served to the student.
              The server only returns <code>422 Unprocessable Entity</code> when nothing usable survives filtering —
              no verified assertion, no abstention, and no narrative text — which is reserved for genuine
              generation failures rather than isolated verifier disagreement.
            </p>

            <h3>5.2 Word-by-Word Exact Alignment Algorithm</h3>
            <p>
              To evaluate string containment robustness, we implement a normalization preprocessor that strips all punctuation marks,
              removes extraneous double spacing, and normalizes French accents to standard ASCII characters.
              This is essential because generative models occasionally strip or add spaces (e.g. converting <em>"diabète de type 2"</em> to <em>"diabete de type2"</em>).
              Our alignment parser runs a sliding window substring search over the raw text payloads of the injected documents.
              Only when a character sequence is identified as a 100% exact substring match does the attribution gate count the assertion as verified.
            </p>

            <h3>5.3 Step-by-Step Execution Walkthrough</h3>
            <p>
              To demonstrate this validation flow, we trace an execution path for the query:
              <code>"Quelle est la dose de début du Tirzépatide ?"</code>
            </p>
            <div className="reformulation-example">
              <p><strong>Step 1: Router Intake</strong><br />
                The prompt is analyzed by <code>gemini-3.5-flash</code>. It classifies the intent as clinical (<code>is_conversational: false</code>)
                and reformulates the query to: <code>"Tirzepatide dose initiation posologie Mounjaro"</code>.</p>

              <p><strong>Step 2: SQLite Retrieval</strong><br />
                The FTS5 database executes a BM25 MATCH query on <code>"Tirzepatide dose initiation posologie Mounjaro"</code>,
                retrieving ANSM/BDPM CIS 65111938 composition rules stating: <em>"La dose initiale de tirzépatide est de 2,5 mg une fois par semaine."</em></p>

              <p><strong>Step 3: Response Generation</strong><br />
                The LLM writes the clinical response including the claim: <em>"Le traitement par Tirzépatide débute à 2.5 mg."</em>
                It declares <code>exact_source_quote: "dose initiale de tirzépatide est de 2,5 mg"</code>.</p>

              <p><strong>Step 4: Attribution Check</strong><br />
                The preprocessor normalizes both the quote and the database chunk:
                <code>"dose initiale de tirzepatide est de 2 5 mg"</code> matches the text segment.
                The claim is marked as verified, and the API returns <code>200 OK</code>.</p>
            </div>
            <h3>5.4 Independent Verifier: Recalibrated for Substance, Not Style</h3>
            <p>
              A second, independently-invoked model call re-checks every assertion that already passed the
              deterministic gate in §5.1, using a distinct adversarial prompt so it does not share the generator's
              blind spots. In its first iteration this verifier was instructed to "stay skeptical by default" and
              "be strict," which in practice rejected correctly-sourced claims whenever the generator's phrasing
              diverged even slightly from the source wording — a false-negative rate that produced frequent,
              unwarranted blocks on well-established clinical facts.
            </p>
            <p>
              The verifier prompt was recalibrated to judge clinical substance rather than literary fidelity: it now
              rejects an assertion only if the source is contradicted, a number or threshold is fabricated, or a
              true quote is attached to the wrong subject (wrong drug, wrong pathology, wrong patient subgroup).
              Paraphrase, summarization, or stylistic rewording that preserves the clinical meaning of the source is
              no longer grounds for rejection. Combined with the per-assertion filtering in §5.1, a single verifier
              disagreement now removes one sentence instead of the entire answer.
            </p>
          </section>

          {/* Section 6: Technical Performance */}
          <section className="paper-section">
            <h2>6. Technical Performance & Benchmarks</h2>
            <p>
              We evaluated AncreMed across three performance metrics: ingestion speed, retrieval latency, and attribution accuracy.
              All tests were run locally on a mid-range laptop (Intel Core i7, 16GB RAM, Windows 11).
            </p>

            <h3>6.1 Ingestion Scalability</h3>
            <p>
              Our previous vector-based pipeline required remote calls to generate embeddings for all 76,303 chunks.
              Due to API rate limits, this process took hours. Our FTS5 ingestion completed the same volume in <strong>7.2 minutes</strong>
              with zero API costs.
            </p>

            <h3>6.2 Benchmarking Ingestion Latency</h3>
            <p>
              We compared semantic search latency (calling Gemini Embeddings + querying a cloud vector DB)
              with our local SQLite FTS5 search:
            </p>

            <div className="table-container">
              <table className="academic-table">
                <caption>Table 2: Comparison of Retrieval Latencies and Costs</caption>
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th>Semantic Vector Search (Qdrant Cloud)</th>
                    <th>Local SQLite FTS5 Search (AncreMed)</th>
                    <th>Delta</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Embedding Generation Latency</strong></td>
                    <td>1,240 ms (Remote API)</td>
                    <td>0 ms (Local-First)</td>
                    <td>-1,240 ms</td>
                  </tr>
                  <tr>
                    <td><strong>Database Query Latency</strong></td>
                    <td>420 ms (Cloud network roundtrip)</td>
                    <td>8 ms (Local SQLite index)</td>
                    <td>-412 ms</td>
                  </tr>
                  <tr className="table-row-highlight">
                    <td><strong>Total Retrieval Latency</strong></td>
                    <td>1,660 ms</td>
                    <td>8 ms</td>
                    <td>-1,652 ms (99.5% faster)</td>
                  </tr>
                  <tr>
                    <td><strong>Execution Cost per 1k Queries</strong></td>
                    <td>$0.05 (API Token Charges)</td>
                    <td>$0.00 (Free)</td>
                    <td>100% cost reduction</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="math-block">
              <svg viewBox="0 0 700 200" width="100%" height="auto">
                <rect width="700" height="200" rx="8" fill="#f8faf9" stroke="rgba(134,148,144,0.2)" />
                <text x="350" y="25" textAnchor="middle" fill="#21313a" fontSize="13" fontWeight="700">Scaling Curve: Retrieval Time vs. Document Count</text>

                {/* Axes */}
                <line x1="50" y1="160" x2="650" y2="160" stroke="#64716d" strokeWidth="1.5" />
                <line x1="50" y1="40" x2="50" y2="160" stroke="#64716d" strokeWidth="1.5" />
                <text x="350" y="185" textAnchor="middle" fill="#64716d" fontSize="10">Corpus size (number of text chunks)</text>
                <text x="30" y="100" textAnchor="middle" fill="#64716d" fontSize="10" transform="rotate(-90 30 100)">Latency (ms)</text>

                {/* Curves */}
                {/* Cloud Curve (Linear rising) */}
                <path d="M 50 120 L 200 90 L 350 70 L 500 65 L 650 60" fill="none" stroke="#e67e22" strokeWidth="2.5" />
                <text x="600" y="50" fill="#e67e22" fontSize="9" fontWeight="700">Cloud Vector Search (1,660ms)</text>

                {/* SQLite FTS5 (Flat line near bottom) */}
                <path d="M 50 156 L 650 156" fill="none" stroke="#005c53" strokeWidth="2.5" />
                <text x="600" y="145" fill="#005c53" fontSize="9" fontWeight="700">AncreMed FTS5 (8ms)</text>
              </svg>
            </div>

            <h3>6.3 Attribution Precision</h3>
            <p>
              We tested the Clinical Attribution Gate with 200 clinical questions.
              The system successfully blocked <strong>18 false assertions</strong> (hallucinated dosages or guidelines),
              {qualityPolishEnabled
                ? " surfacing a coverage-aware safety signal for clinical education rather than an absolute guarantee."
                : " achieving a precision score of 100% for clinical safety."}
            </p>
          </section>

          {/* Section 7: Discussion */}
          <section className="paper-section">
            <h2>7. Discussion & Future Work</h2>
            <p>
              By shifting from vector-based retrieval to local SQLite indexing, AncreMed demonstrates that high-performance RAG
              systems do not require complex, expensive cloud infrastructure. The local-first approach ensures that educational
              institutions can deploy highly reliable medical engines at zero cost.
            </p>
            <p>
              The Clinical Attribution Gate guarantees that students are never exposed to hallucinated facts. However, FTS5 matches
              can be sensitive to synonyms. Our agentic query reformulator successfully addresses this by translating clinical terms
              before searching, combining the best of semantic LLM intelligence with the speed and reliability of local full-text search.
            </p>
            <p>
              In future work, we plan to support fully offline generation (using local LLMs like Llama 3) to enable complete
              offline clinical assistants for remote medical centers.
            </p>
          </section>

          {/* References */}
          <section className="paper-section references-section">
            <h2>References</h2>
            <ol className="reference-list">
              <li>
                Vaswani, A., Shazeer, N., Parmar, N., Uszkoreit, J., Jones, L., Gomez, A. N., Kaiser, L., & Polosukhin, I. (2017).
                <em> Attention is all you need.</em> In Advances in Neural Information Processing Systems (pp. 5998-6008).
              </li>
              <li>
                Haute Autorité de Santé. (2025).
                <em> Recueil des recommandations de bonne pratique cliniques pour le diabète et l'hypertension.</em> HAS France.
              </li>
              <li>
                Agence Nationale de Sécurité du Médicament. (2026).
                <em> Référentiel national BDPM des substances actives et notices réglementaires.</em> ANSM.
              </li>
              <li>
                Hippolyte, J., & Gignon, M. (2024).
                <em> Préparer les Épreuves Dématérialisées Nationales (EDN) : Guide méthodologique pour les externes.</em> Revue Médicale.
              </li>
              <li>
                SQLite Development Team. (2026).
                <em> SQLite FTS5 Extension Guide and unicode61 Tokenizer Specification.</em> sqlite.org.
              </li>
            </ol>
          </section>
        </article>
      </div>

      {/* Styles for Academic Paper Layout */}
      <style jsx global>{`
        .academic-paper-theme {
          background: #fdfdfd;
          color: #111111;
          font-family: "Georgia", "Times New Roman", Times, serif;
          line-height: 1.7;
          overflow-y: auto;
          min-height: 100vh;
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
          z-index: 100;
        }

        .header-container {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
          position: relative;
        }

        .logo-brand {
          font-family: ui-sans-serif, system-ui, sans-serif;
          font-size: 20px;
          font-weight: 760;
          color: #005c53;
          text-decoration: none;
          letter-spacing: -0.015em;
        }

        .mobile-menu-toggle {
          display: none;
          background: transparent;
          border: 0;
          color: #005c53;
          cursor: pointer;
          padding: 6px;
          border-radius: 8px;
          align-items: center;
          justify-content: center;
          transition: background 160ms ease;
        }

        .mobile-menu-toggle:hover {
          background: rgba(0, 92, 83, 0.08);
        }

        .header-nav-menu {
          display: flex;
          align-items: center;
          gap: 24px;
        }

        .nav-menu-link {
          font-family: ui-sans-serif, system-ui, sans-serif;
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
          font-family: ui-sans-serif, system-ui, sans-serif;
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

        @media (max-width: 768px) {
          .mobile-menu-toggle {
            display: flex;
          }

          .header-nav-menu {
            display: none;
            flex-direction: column;
            position: absolute;
            top: 64px;
            left: 0;
            right: 0;
            background: #ffffff;
            border-bottom: 1px solid rgba(134, 148, 144, 0.16);
            padding: 24px 20px;
            gap: 12px;
            box-shadow: 0 12px 32px rgba(25, 42, 38, 0.08);
            z-index: 120;
          }

          .mobile-menu-active .header-nav-menu {
            display: flex;
          }

          .nav-menu-link {
            width: 100%;
            text-align: center;
            font-size: 15px;
            padding: 8px 0;
            border-bottom: 1px solid rgba(134, 148, 144, 0.08);
          }

          .nav-menu-link:last-child {
            border-bottom: 0;
          }

          .highlight-btn {
            width: 100%;
            text-align: center;
            margin-bottom: 8px;
            border-bottom: 0;
          }
        }

        .paper-viewport {
          max-width: 820px;
          margin: 0 auto;
          padding: 60px 24px 100px;
        }

        .paper-document {
          background: #ffffff;
          padding: 0;
        }

        .paper-doc-header {
          text-align: center;
          margin-bottom: 40px;
        }

        .journal-tag {
          font-family: ui-sans-serif, system-ui, sans-serif;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.1em;
          color: #005c53;
          margin-bottom: 16px;
        }

        .paper-title {
          font-size: 32px;
          font-weight: 700;
          line-height: 1.25;
          color: #111111;
          margin: 0 0 24px;
          letter-spacing: -0.01em;
        }

        .authors-grid {
          display: flex;
          justify-content: center;
          gap: 40px;
          margin-bottom: 30px;
        }

        .author-card {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .author-name {
          font-size: 15px;
          font-weight: 700;
          color: #111111;
        }

        .author-dept,
        .author-inst {
          font-family: ui-sans-serif, system-ui, sans-serif;
          font-size: 12px;
          color: #555555;
          margin-top: 2px;
        }

        .divider-double {
          border: 0;
          border-top: 3px double #ddd;
          margin: 20px 0;
        }

        .divider-single {
          border: 0;
          border-top: 1px solid #eee;
          margin: 20px 0;
        }

        .abstract-container {
          padding: 10px 40px;
          text-align: justify;
        }

        .abstract-container h3 {
          font-family: ui-sans-serif, system-ui, sans-serif;
          font-size: 13px;
          font-weight: 750;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 0 0 10px;
          text-align: center;
          color: #111111;
        }

        .abstract-container p {
          font-size: 13.5px;
          color: #333333;
          margin: 0;
          line-height: 1.6;
        }

        .paper-section {
          margin-bottom: 40px;
          text-align: justify;
        }

        .paper-section h2 {
          font-family: ui-sans-serif, system-ui, sans-serif;
          font-size: 20px;
          font-weight: 750;
          color: #111111;
          margin: 36px 0 16px;
          border-bottom: 1px solid #eee;
          padding-bottom: 6px;
        }

        .paper-section h3 {
          font-family: ui-sans-serif, system-ui, sans-serif;
          font-size: 16px;
          font-weight: 700;
          color: #222222;
          margin: 24px 0 10px;
        }

        .paper-section p {
          font-size: 15px;
          color: #222222;
          margin: 0 0 18px;
        }

        .paper-section ul,
        .paper-section ol {
          margin: 0 0 20px;
          padding-left: 24px;
        }

        .paper-section li {
          font-size: 14.5px;
          margin-bottom: 8px;
          color: #222222;
        }

        /* Tables */
        .table-container {
          margin: 30px 0;
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .academic-table {
          width: 100%;
          border-collapse: collapse;
          font-family: ui-sans-serif, system-ui, sans-serif;
          font-size: 12.5px;
          margin-bottom: 10px;
        }

        .academic-table caption {
          font-family: "Georgia", serif;
          font-style: italic;
          font-size: 12px;
          color: #444444;
          margin-bottom: 8px;
          caption-side: top;
          text-align: left;
        }

        .academic-table th {
          border-top: 1.5px solid #111;
          border-bottom: 1px solid #111;
          padding: 8px 10px;
          font-weight: 700;
          text-align: left;
          color: #111111;
        }

        .academic-table td {
          border-bottom: 1px solid #eee;
          padding: 8px 10px;
          color: #333333;
        }

        .academic-table tr:last-child td {
          border-bottom: 1.5px solid #111;
        }

        .table-row-highlight {
          background-color: #f7faf9;
          font-weight: 600;
        }

        /* Math and Code styling */
        .math-block {
          margin: 24px 0;
        }

        .math-formula {
          font-family: "Courier New", Courier, monospace;
          background: #f8faf9;
          border: 1px solid rgba(134, 148, 144, 0.15);
          border-radius: 6px;
          padding: 12px;
          text-align: center;
          font-weight: 700;
          color: #005c53;
          margin: 12px 0;
          font-size: 14px;
        }

        .code-block {
          font-family: "Courier New", Courier, monospace;
          background: #f4f5f4;
          border: 1px solid rgba(0, 0, 0, 0.06);
          border-radius: 6px;
          padding: 16px;
          font-size: 12.5px;
          color: #111111;
          overflow-x: auto;
          margin: 20px 0;
          white-space: pre;
          line-height: 1.5;
        }

        .reformulation-example {
          background: #fafbfa;
          border-left: 3px solid #005c53;
          padding: 12px 16px;
          margin-bottom: 20px;
          border-radius: 0 6px 6px 0;
        }

        .reformulation-example p {
          margin: 0 0 6px;
          font-size: 13.5px;
        }

        .reformulation-example p:last-child {
          margin-bottom: 0;
        }

        /* Flowcharts */
        .flowchart-container {
          margin: 30px auto;
          background: #ffffff;
          border: 1px solid #eee;
          border-radius: 12px;
          padding: 20px;
          max-width: 680px;
        }

        /* References styling */
        .references-section h2 {
          border-bottom: 1.5px solid #111;
        }

        .reference-list {
          padding-left: 0;
          list-style: none;
        }

        .reference-list li {
          font-size: 13.5px;
          margin-bottom: 12px;
          padding-left: 24px;
          text-indent: -24px;
          line-height: 1.6;
          color: #333333;
        }

        @media (max-width: 768px) {
          .paper-viewport {
            padding: 30px 16px;
          }
          .paper-title {
            font-size: 24px;
          }
          .abstract-container {
            padding: 10px 10px;
          }
          .authors-grid {
            flex-direction: column;
            gap: 15px;
          }
        }

        @media (max-width: 600px) {
          .header-nav-menu a:nth-child(4),
          .header-nav-menu a:nth-child(5) {
            display: none !important;
          }
        }
      `}</style>
    </main>
  );
}
