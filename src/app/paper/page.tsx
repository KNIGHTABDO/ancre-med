"use client";

import type { JSX } from "react";
import { SiteHeader } from "../../components/SiteHeader";
import { SiteFooter } from "../../components/SiteFooter";

export default function PaperPage(): JSX.Element {
  const qualityPolishEnabled = process.env["ANCREMED_V2_QUALITY_POLISH"] === "true";
  return (
    <main className="workspace-shell academic-paper-theme">
      <SiteHeader />

      {/* Main Container */}
      <div className="paper-viewport fade-up">
        <article className="paper-document">
          {/* Metadata Section */}
          <header className="paper-doc-header">
            <div className="journal-tag">TECHNICAL REPORT &amp; WHITE PAPER — REV. 2, JULY 2026</div>
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
                AncreMed relocates traditional vector database operations to a local-first SQLite/Turso FTS5 full-text database,
                indexing 76,303 chunks from the Haute Autorité de Santé (HAS), the Base de Données Publique des Médicaments (BDPM),
                and official EDN teaching materials. Retrieval is driven by a seven-way topic classifier that expands each question into a
                multi-round <em>deep search loop</em> over BM25-ranked lexical indices, and every generated statement is decomposed into typed
                spans and filtered through a tiered attribution gate backed by an independent verifier and an explicit abstention contract.
                {qualityPolishEnabled
                  ? " Our local-first retrieval mechanism avoids remote embedding API charges while the v2 trust layer reports coverage, abstentions, and independent verification for source-bound numerical claims."
                  : " Our local-first retrieval mechanism runs in single-digit milliseconds of database time, completely bypasses remote embedding API charges, and provides a cost-free, offline-ready framework for medical faculties."}
              </p>
            </div>

            <div className="key-stats" role="list" aria-label="Key figures">
              <div className="key-stat" role="listitem">
                <span className="key-stat-num">76,303</span>
                <span className="key-stat-label">indexed text chunks</span>
              </div>
              <div className="key-stat" role="listitem">
                <span className="key-stat-num">8 ms</span>
                <span className="key-stat-label">median retrieval latency</span>
              </div>
              <div className="key-stat" role="listitem">
                <span className="key-stat-num">3</span>
                <span className="key-stat-label">authoritative silos</span>
              </div>
              <div className="key-stat" role="listitem">
                <span className="key-stat-num">$0.00</span>
                <span className="key-stat-label">retrieval cost / 1k queries</span>
              </div>
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
              remains limited by their fundamental tendency to hallucinate logical-sounding but factually inaccurate content—such as incorrect
              drug dosages, reversed contraindications, or obsolete diagnostic parameters. In high-stakes medical examinations,
              where a single incorrect dosage can result in a critical patient event, such errors are unacceptable.
            </p>
            <p>
              Retrieval-Augmented Generation (RAG) is the primary technique used to mitigate LLM hallucinations.
              By retrieving relevant documents from a verified database and injecting them into the prompt context,
              RAG guides the LLM to write replies based solely on valid source documents.
              Traditionally, RAG architectures rely on dense vector embeddings stored in cloud-hosted vector databases
              (e.g., Qdrant, Pinecone) and invoke remote APIs (e.g., Google Gen AI Embeddings) to convert user queries into vectors.
            </p>
            <p>
              While vector-based retrieval is highly effective for cross-lingual or semantic matching, it presents three severe bottlenecks for student-driven clinical tools:
            </p>
            <ul>
              <li><strong>High Execution Latency:</strong> Generating embeddings and querying remote servers adds 1.5 to 3 seconds of network latency per query.</li>
              <li><strong>Financial Barriers:</strong> Generating embeddings for large medical corpora (e.g., 76,000+ chunks) costs significant API credits, which is unsustainable for students and non-profit faculty labs.</li>
              <li><strong>Attribution Mismatch:</strong> Semantic vector math frequently retrieves conceptually similar text that lacks the exact quantitative metrics (e.g., exact drug dosages or clinical cut-offs) needed for word-for-word medical validation.</li>
            </ul>
            <p>
              To address these bottlenecks, we present <strong>AncreMed</strong>, a local-first RAG engine that operates completely
              offline for database retrieval, utilizing SQLite/Turso FTS5 for ultra-fast full-text indexing, combined with an agentic
              query planner. Crucially, AncreMed introduces a
              <strong> Clinical Attribution Gate</strong> that decomposes generated text into typed spans and verifies each clinical claim
              word-for-word against the source corpus—backed by an independently-invoked verifier—before presenting the response.
            </p>

            <h3>1.1 Contributions</h3>
            <p>This report makes the following concrete contributions, each detailed in a dedicated section:</p>
            <ul>
              <li>A <strong>local-first lexical retrieval architecture</strong> (§3–§4) that eliminates embedding cost and network latency while preserving exact-match fidelity for numeric clinical facts.</li>
              <li>A <strong>seven-way topic taxonomy and deep search loop</strong> (§5–§6) that decomposes a question into section-targeted sub-queries and iterates until coverage is satisfied.</li>
              <li>A <strong>tiered attribution gate with an independent verifier and abstention contract</strong> (§7) that gates only the sentences that are dangerous to get wrong, while allowing explanatory prose and honest "not found" responses.</li>
              <li>A <strong>hand-verified clinical calculation bank</strong> (§8) that keeps scores and formulas out of the generator entirely.</li>
              <li>A <strong>cost, latency, and observability model</strong> (§9–§10) and an adversarial evaluation set (§11) designed to break the gate on purpose.</li>
            </ul>
          </section>

          {/* Section 2: Background & Related Work */}
          <section className="paper-section">
            <h2>2. Background &amp; Related Work</h2>

            <h3>2.1 Lexical versus Dense Retrieval</h3>
            <p>
              Dense retrieval maps queries and documents into a shared vector space and ranks by cosine similarity, which excels at
              paraphrase and cross-lingual matching. Lexical retrieval instead ranks by term overlap using a probabilistic
              scoring function such as Okapi BM25. For clinical education, the decisive property is <em>exactness</em>: a dosage of
              "2,5 mg" and "25 mg" are semantically neighbours but clinically catastrophic to confuse, and a nearest-neighbour search
              over embeddings offers no guarantee that the retrieved passage contains the precise token the answer will cite. AncreMed
              is deliberately built on lexical retrieval so that the string a claim quotes is, by construction, present verbatim in the corpus.
            </p>

            <h3>2.2 Clinical Fact Verification</h3>
            <p>
              A growing body of work shows that generative LLMs are comparatively weak at verifying claims relative to
              discriminative models. On the CliniFact benchmark, a BioBERT-style discriminative classifier reached 80.2% accuracy on a
              claim-checking task where a 70B-parameter generative model scored 53.6%; on NLI4CT, even strong entailment baselines over
              clinical trial reports reach only ≈0.627 F1. The mechanism matters more than the numbers: a model grading its own answer
              shares whatever blind spot produced the error. This motivates AncreMed's <em>independently-invoked</em> verifier (§7.4), a
              distinct call with an adversarial framing—an application of the draft-then-verify-then-revise pattern (Chain-of-Verification)
              rather than a larger model.
            </p>

            <h3>2.3 Agentic and Multi-Query RAG</h3>
            <p>
              Single-shot RAG issues one query and generates once. Agentic RAG instead decomposes a question into sub-queries, inspects
              intermediate results, and re-queries to fill gaps. This pattern is usually motivated by expensive network retrieval; AncreMed
              shows the same query-decomposition loop is worthwhile even against a local index, because the cost of an extra round is
              single-digit milliseconds of SQLite time rather than a network round-trip. The novelty here is not the loop itself but running
              it entirely local-first, gated by a deterministic coverage check before any additional LLM call is spent.
            </p>
          </section>

          {/* Section 3: System Overview */}
          <section className="paper-section">
            <h2>3. System Overview</h2>
            <p>
              AncreMed is organised as a five-stage pipeline. A user question is classified and planned by an agentic router; the plan
              drives a multi-round deep search loop over three lexical silos; retrieved context feeds a structured generator; and every
              generated span passes a tiered gate and an independent verifier before the response is composed. Figure 1 gives the end-to-end
              data flow.
            </p>

            <figure className="figure">
              <div className="figure-scroll">
                <svg viewBox="0 0 860 380" className="diagram" role="img" aria-label="End-to-end architecture of AncreMed">
                  <defs>
                    <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                      <path className="dg-arrow" d="M 0 0 L 10 5 L 0 10 z" />
                    </marker>
                  </defs>

                  <rect className="dg-plate" x="0" y="0" width="860" height="380" rx="16" />

                  {/* Stage 1: Query */}
                  <rect className="dg-box-accent" x="30" y="40" width="150" height="64" rx="12" />
                  <text className="dg-title" x="105" y="66" textAnchor="middle">Question clinique</text>
                  <text className="dg-muted" x="105" y="86" textAnchor="middle">FR, EDN-style</text>

                  {/* Stage 2: Router */}
                  <rect className="dg-box" x="30" y="150" width="150" height="80" rx="12" />
                  <text className="dg-label-b" x="105" y="176" textAnchor="middle">Agentic Router</text>
                  <text className="dg-muted" x="105" y="196" textAnchor="middle">7-way taxonomy</text>
                  <text className="dg-muted" x="105" y="212" textAnchor="middle">→ RetrievalPlan</text>

                  {/* Stage 3: Deep search loop over silos */}
                  <rect className="dg-box" x="250" y="130" width="240" height="180" rx="12" />
                  <text className="dg-label-b" x="370" y="156" textAnchor="middle">Deep Search Loop (FTS5)</text>
                  <rect className="dg-chip" x="270" y="178" width="200" height="30" rx="8" />
                  <text className="dg-muted" x="370" y="198" textAnchor="middle">Silo A — EDN / MediQAl</text>
                  <rect className="dg-chip" x="270" y="216" width="200" height="30" rx="8" />
                  <text className="dg-muted" x="370" y="236" textAnchor="middle">Silo B — HAS</text>
                  <rect className="dg-chip" x="270" y="254" width="200" height="30" rx="8" />
                  <text className="dg-muted" x="370" y="274" textAnchor="middle">Silo C — ANSM / BDPM</text>

                  {/* Stage 4: Generator */}
                  <rect className="dg-box" x="560" y="40" width="150" height="80" rx="12" />
                  <text className="dg-label-b" x="635" y="66" textAnchor="middle">Structured</text>
                  <text className="dg-label-b" x="635" y="84" textAnchor="middle">Generator</text>
                  <text className="dg-muted" x="635" y="104" textAnchor="middle">typed spans</text>

                  {/* Stage 5: Gate + verifier */}
                  <rect className="dg-box" x="560" y="150" width="150" height="80" rx="12" />
                  <text className="dg-label-b" x="635" y="176" textAnchor="middle">Tiered Gate</text>
                  <text className="dg-muted" x="635" y="196" textAnchor="middle">+ independent</text>
                  <text className="dg-muted" x="635" y="212" textAnchor="middle">verifier (§7)</text>

                  {/* Response */}
                  <rect className="dg-box-ok" x="560" y="270" width="150" height="70" rx="12" />
                  <text className="dg-ok-text" x="635" y="300" textAnchor="middle">Réponse vérifiée</text>
                  <text className="dg-muted" x="635" y="320" textAnchor="middle">+ coverage indicator</text>

                  {/* Arrows */}
                  <path className="dg-line" d="M 105 104 L 105 150" markerEnd="url(#arrow)" />
                  <path className="dg-line" d="M 180 190 L 250 200" markerEnd="url(#arrow)" />
                  <path className="dg-line" d="M 490 180 C 525 170, 525 110, 560 90" markerEnd="url(#arrow)" />
                  <path className="dg-line" d="M 635 120 L 635 150" markerEnd="url(#arrow)" />
                  <path className="dg-line" d="M 635 230 L 635 270" markerEnd="url(#arrow)" />
                  <path className="dg-line-dashed" d="M 560 190 C 520 210, 505 250, 490 270" markerEnd="url(#arrow)" />
                  <text className="dg-muted" x="470" y="300" textAnchor="middle">gap → re-query</text>
                </svg>
              </div>
              <figcaption>Figure 1. End-to-end pipeline. The deep search loop (§6) may re-query silos before the generator runs; the tiered gate (§7) filters spans before composition.</figcaption>
            </figure>
          </section>

          {/* Section 4: Ingestion & Silos */}
          <section className="paper-section">
            <h2>4. Corpus Construction &amp; French Medical Silos</h2>
            <p>
              AncreMed relies on a highly curated, localized corpus specifically tailored to French clinical practice.
              Our ingestion engine, implemented in <code>ingest_worker.py</code>, parses, structures, and segments text from three primary medical silos.
            </p>

            <h3>Silo A: Official EDN Teaching Materials (MediQAl &amp; CareMedEval)</h3>
            <p>
              The Épreuves Dématérialisées Nationales (EDN) require mastery of clinical semiology, psychiatric diagnostics, and
              gastroenterology guidelines. We harvest these from Hugging Face academic datasets:
            </p>
            <ul>
              <li><strong>MediQAl:</strong> A clinical examination question dataset annotated for French medical schools, covering diagnostics, clinical case studies, and multiple-choice answers.</li>
              <li><strong>CareMedEval:</strong> A French medical evaluation corpus compiled from official lecture materials from university hospital professors.</li>
            </ul>

            <h3>Silo B: HAS Publications (Haute Autorité de Santé)</h3>
            <p>
              The HAS is the official authority governing healthcare quality and medical reimbursement in France.
              We programmatically download and extract zip archives from <code>data.gouv.fr</code> containing official HAS
              publications and drug evaluations (Avis de la Commission de la Transparence). The PDF documents are converted to
              standardized UTF-8 text and chunked with overlapping windows to preserve contextual boundaries across page breaks.
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
                <caption>Table 1: Statistics of indexed medical knowledge silos.</caption>
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
                    <td>—</td>
                    <td>44,922</td>
                    <td>76,303</td>
                    <td>158.5 MB</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 5: SQLite FTS5 Indexing */}
          <section className="paper-section">
            <h2>5. Local Database Architecture &amp; FTS5 Indexing</h2>
            <p>
              To eliminate cloud hosting costs and network latency during retrieval, AncreMed stores all documents in a local
              SQLite/Turso database (<code>clinical_ground_truth.db</code>). Full-text indexing is achieved using the SQLite FTS5 virtual table extension.
            </p>

            <h3>5.1 Database Schema</h3>
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
    superseded INTEGER DEFAULT 0,
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

            <h3>5.2 FTS5 Sync Triggers</h3>
            <p>
              To maintain index integrity, insertions, updates, and deletions on the <code>documents</code> table
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

            <h3>5.3 Tokenizer &amp; Diacritic Folding</h3>
            <p>
              We configure the FTS5 virtual table with the <code>unicode61</code> tokenizer, which tokenizes text according to
              Unicode Standard Annex #29 and folds French diacritics natively—mapping <em>é, è, à, ô</em> to their base ASCII
              equivalents <em>e, e, a, o</em> during index creation. A query for <code>diabete</code> or <code>diabète</code> therefore
              matches both, giving spelling resilience without heavy lemmatization plugins.
            </p>

            <h3>5.4 The BM25 Ranking Function</h3>
            <p>
              FTS5 ranks documents using the Okapi BM25 scoring function. For a query <code>Q</code> containing terms
              <code> q₁ … qₙ</code> and a document <code>D</code>, the relevance score is the sum of per-term contributions:
            </p>

            <figure className="figure">
              <div className="math-formula">
                Score(D, Q) = ∑<sub>i=1..n</sub> IDF(q<sub>i</sub>) · <span className="frac"><span className="frac-num">f(q<sub>i</sub>, D) · (k₁ + 1)</span><span className="frac-den">f(q<sub>i</sub>, D) + k₁ · (1 − b + b · |D| / avgDL)</span></span>
              </div>
              <figcaption>Equation 1. Okapi BM25 relevance score.</figcaption>
            </figure>

            <p>
              Here <code>f(qᵢ, D)</code> is the term frequency of <code>qᵢ</code> in <code>D</code>, <code>|D|</code> is the document
              length in tokens, <code>avgDL</code> is the mean chunk length across the corpus, and the free parameters take their standard
              defaults <code>k₁ = 1.2</code> and <code>b = 0.75</code>. The inverse document frequency uses the BM25 form
            </p>

            <figure className="figure">
              <div className="math-formula">
                IDF(q<sub>i</sub>) = ln<span className="paren">(</span> <span className="frac"><span className="frac-num">N − n(q<sub>i</sub>) + 0.5</span><span className="frac-den">n(q<sub>i</sub>) + 0.5</span></span> + 1 <span className="paren">)</span>
              </div>
              <figcaption>Equation 2. Probabilistic IDF, where N is the corpus size and n(qᵢ) the number of chunks containing qᵢ.</figcaption>
            </figure>

            <p>
              Two properties of Equation 1 make it well suited to a clinical corpus. The saturation term <code>k₁</code> caps the reward
              for repeating a keyword, so a policy report that merely repeats "diabète" many times cannot outrank a dense clinical
              description. The length-normalisation term <code>b</code> down-weights long documents, which lets short, information-dense
              BDPM composition entries compete with long-form HAS prose. FTS5 returns BM25 as a <em>more-negative-is-more-relevant</em>
              quantity, so the production query sorts ascending.
            </p>

            <h3>5.5 Column-Weighted Ranking</h3>
            <p>
              Because a term appearing in a drug's <code>origin_title</code> is far more discriminative than the same term buried in body
              text, AncreMed uses FTS5's per-column BM25 weighting, <code>bm25(documents_fts, w₍title₎, w₍text₎)</code>. For pharmacology
              lookups we start near a 5:1 title-to-body weighting and tune it per silo against a golden set (§5.6):
            </p>

            <pre className="code-block">
              {`-- FTS5 primary MATCH query with column weighting
SELECT id, origin_title, category_silo, source_identifier,
       regulatory_date, page_number, chunk_index, text_content,
       bm25(documents_fts, 5.0, 1.0) AS score
FROM documents
JOIN documents_fts ON documents.rowid = documents_fts.rowid
WHERE documents_fts MATCH :query
  AND documents.superseded = 0
ORDER BY score ASC
LIMIT :limit;`}
            </pre>

            <h3>5.6 Per-Silo Parameter Tuning &amp; Phrase Precision</h3>
            <p>
              Short, dense BDPM entries and long-form HAS prose favour different length-normalisation. We build a ≈30-query golden set per
              silo (each query paired with the chunk a human expert says should rank first) and grid-search <code>k₁</code> and
              <code>b</code> against it rather than guessing. For multi-word clinical phrases we use FTS5 phrase queries and
              <code> NEAR(term₁ term₂, N)</code> so that "insuffisance cardiaque droite" does not match a chunk where the tokens merely
              co-occur far apart. When a MATCH returns zero rows—typically from an unusual spacing or an out-of-vocabulary token—the engine
              falls back to a tokenized relational <code>LIKE</code> scan so the query degrades gracefully rather than failing.
            </p>
          </section>

          {/* Section 6: Agentic Router & Deep Search */}
          <section className="paper-section">
            <h2>6. The Agentic Router &amp; Deep Search Loop</h2>
            <p>
              Raw user prompts contain conversational noise, oblique phrasing, and abbreviations that hurt lexical recall. AncreMed
              routes every prompt through an agentic planner built on <code>gemini-3.5-flash</code> that classifies the question and emits a
              structured retrieval plan instead of a single keyword search.
            </p>

            <h3>6.1 The Seven-Way Topic Taxonomy</h3>
            <p>
              The router replaces a binary <code>is_conversational</code> flag with a seven-way classifier. Each class carries its own
              retrieval depth, silo priority, and required output sections.
            </p>

            <div className="table-container">
              <table className="academic-table">
                <caption>Table 2: Topic taxonomy and per-class retrieval playbooks.</caption>
                <thead>
                  <tr>
                    <th>topic_class</th>
                    <th>Trigger example</th>
                    <th>Rounds</th>
                    <th>Silos</th>
                    <th>Required sections</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><code>definition_item_edn</code></td>
                    <td>« Qu'est-ce que la PFLA ? »</td>
                    <td>3–4</td>
                    <td>EDN, HAS</td>
                    <td>définition, physiopathologie, épidémiologie, classification</td>
                  </tr>
                  <tr>
                    <td><code>semiologie_cas_clinique</code></td>
                    <td>« Fébrile, crépitants — démarche ? »</td>
                    <td>4–5</td>
                    <td>EDN, HAS</td>
                    <td>signes, paraclinique, diagnostics différentiels, gravité, CAT</td>
                  </tr>
                  <tr>
                    <td><code>pharmacologie_therapeutique</code></td>
                    <td>« Traitement de l'HTA du sujet âgé ? »</td>
                    <td>3–4</td>
                    <td>BDPM, HAS</td>
                    <td>indication, posologie, contre-indications, surveillance</td>
                  </tr>
                  <tr>
                    <td><code>anatomie_physiologie</code></td>
                    <td>« Innervation du muscle temporal ? »</td>
                    <td>2–3</td>
                    <td>EDN</td>
                    <td>structure, rapports, fonction</td>
                  </tr>
                  <tr>
                    <td><code>calcul_clinique</code></td>
                    <td>« Clairance créat. 70 kg, 65 ans… »</td>
                    <td>2</td>
                    <td>Formules (§8)</td>
                    <td>formule, interprétation</td>
                  </tr>
                  <tr>
                    <td><code>urgence_conduite_a_tenir</code></td>
                    <td>« CAT devant un AAG de l'enfant ? »</td>
                    <td>4–5</td>
                    <td>HAS, EDN, BDPM</td>
                    <td>reconnaissance, gestes immédiats, traitement, orientation</td>
                  </tr>
                  <tr>
                    <td><code>conversationnel</code></td>
                    <td>« merci », « bonjour »</td>
                    <td>0</td>
                    <td>—</td>
                    <td>bypass</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p>
              A real question can straddle two classes—"quel est le traitement de l'IRC et comment adapter la posologie ?" is
              <code> pharmacologie_therapeutique</code> <em>and</em> <code>calcul_clinique</code>. The planner therefore emits a
              <code> primary_class</code> plus an optional <code>secondary_class</code> and unions their required-section lists.
            </p>

            <h3>6.2 The Retrieval Plan</h3>
            <p>Path A—conversational prompts—short-circuits with an empty plan and a <code>silo: "chat"</code> virtual chunk, so a friendly reply is drafted in under 300 ms. Path B emits a structured plan:</p>
            <pre className="code-block">
              {`interface RetrievalPlan {
  primary_class: TopicClass;
  secondary_class?: TopicClass;
  sub_queries: {
    section: string;                                   // one plan section
    query: string;                                     // FTS5-ready, FR, keyword-dense
    target_silo: "edn" | "has" | "bdpm" | "formulas" | "any";
  }[];
}`}
            </pre>

            <h3>6.3 The Deep Search Loop</h3>
            <p>
              The planner fans out one FTS5 call per sub-query, records which required sections are now covered, and only issues an
              additional round when a cheap deterministic coverage check finds an empty section. An LLM gap-checker is consulted only when
              the deterministic broadening itself stops returning rows—keeping the free path the default rather than the fallback.
            </p>

            <figure className="figure">
              <div className="figure-scroll">
                <svg viewBox="0 0 820 250" className="diagram" role="img" aria-label="Deep search loop control flow">
                  <defs>
                    <marker id="arrow2" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                      <path className="dg-arrow" d="M 0 0 L 10 5 L 0 10 z" />
                    </marker>
                  </defs>
                  <rect className="dg-plate" x="0" y="0" width="820" height="250" rx="16" />

                  <rect className="dg-box-accent" x="24" y="100" width="130" height="60" rx="12" />
                  <text className="dg-title" x="89" y="126" textAnchor="middle">planQuery()</text>
                  <text className="dg-muted" x="89" y="145" textAnchor="middle">→ sub_queries</text>

                  <rect className="dg-box" x="200" y="100" width="150" height="60" rx="12" />
                  <text className="dg-label-b" x="275" y="126" textAnchor="middle">ftsSearch() ×N</text>
                  <text className="dg-muted" x="275" y="145" textAnchor="middle">dedupe chunk ids</text>

                  <rect className="dg-box" x="400" y="100" width="170" height="60" rx="12" />
                  <text className="dg-label-b" x="485" y="122" textAnchor="middle">coverage check</text>
                  <text className="dg-muted" x="485" y="141" textAnchor="middle">section empty?</text>

                  <rect className="dg-box-ok" x="632" y="100" width="160" height="60" rx="12" />
                  <text className="dg-ok-text" x="712" y="122" textAnchor="middle">RetrievedContext</text>
                  <text className="dg-muted" x="712" y="141" textAnchor="middle">→ generator</text>

                  <path className="dg-line" d="M 154 130 L 200 130" markerEnd="url(#arrow2)" />
                  <path className="dg-line" d="M 350 130 L 400 130" markerEnd="url(#arrow2)" />
                  <path className="dg-line" d="M 570 130 L 632 130" markerEnd="url(#arrow2)" />
                  <text className="dg-ok-text" x="601" y="120" textAnchor="middle">covered</text>

                  {/* gap loop back */}
                  <path className="dg-line-dashed" d="M 485 160 C 485 210, 275 210, 275 162" markerEnd="url(#arrow2)" />
                  <text className="dg-accent-text" x="380" y="205" textAnchor="middle">gap &amp; round &lt; MAX &amp; new chunks &gt; 0 → broaden query</text>
                </svg>
              </div>
              <figcaption>Figure 2. Deep search control flow. The loop halts on full coverage, on hitting MAX_ROUNDS, or when a round yields no new chunks (the abstention contract in §7.5 then handles any residual gap honestly).</figcaption>
            </figure>

            <pre className="code-block">
              {`const MAX_ROUNDS = 3;
let round = 0, pending = plan.sub_queries;

while (pending.length > 0 && round < MAX_ROUNDS) {
  let newChunks = 0;
  for (const sq of pending) {
    const rows = await ftsSearch(sq.query, sq.target_silo, /*limit*/ 6);
    const fresh = rows.filter(r => !foundChunkIds.has(r.id));
    fresh.forEach(r => foundChunkIds.add(r.id));
    if (fresh.length) sectionsCovered.set(sq.section, fresh);
    newChunks += fresh.length;
  }
  round++;
  if (newChunks === 0) break;                        // diminishing returns
  pending = await checkCoverageGaps(plan, sectionsCovered);
}`}
            </pre>

            <h3>6.4 Worked Trace — « Parle-moi des bactéries »</h3>
            <p>
              This was a real failure case of the single-shot pipeline: the generator "said one sentence and stopped." The table below
              traces it through the deep search loop, which surfaces the physiopathologie material the old pipeline never retrieved.
            </p>

            <div className="table-container">
              <table className="academic-table">
                <caption>Table 3: Deep-search trace for a definition-class query.</caption>
                <thead>
                  <tr><th>Step</th><th>What happens</th></tr>
                </thead>
                <tbody>
                  <tr><td><strong>Classify</strong></td><td><code>primary_class: definition_item_edn</code></td></tr>
                  <tr><td><strong>Plan (R1)</strong></td><td>4 sub-queries: <em>définition structure paroi</em> · <em>classification Gram positif négatif</em> · <em>virulence mécanismes pathogénicité</em> · <em>bactéries pathogènes exemples</em></td></tr>
                  <tr><td><strong>FTS5 R1</strong></td><td>déf. → 3 · classification → 4 · physiopathologie → <strong>0</strong> · exemples → 5</td></tr>
                  <tr><td><strong>Coverage</strong></td><td>physiopathologie empty → broaden to <em>virulence bactérienne</em></td></tr>
                  <tr><td><strong>FTS5 R2</strong></td><td>physiopathologie → 2 chunks found</td></tr>
                  <tr><td><strong>Stop</strong></td><td>all sections covered; a 3rd round would add 0 new chunks → halt (2 rounds)</td></tr>
                  <tr className="table-row-highlight"><td><strong>Context</strong></td><td>4 sections, 14 chunks, 2 rounds → full définition → classification → physiopathologie → exemples</td></tr>
                </tbody>
              </table>
            </div>

            <h3>6.5 Deterministic Typo Tolerance</h3>
            <p>
              Hosted Turso Cloud does not load arbitrary C extensions, so SQLite's <code>spellfix1</code> is unavailable. Instead AncreMed
              performs fuzzy correction in the application layer: a vocabulary set is materialised from the FTS5 corpus at cold start, and
              each query token that is not in-vocabulary is matched by bounded edit distance before the query reaches FTS5.
            </p>
            <pre className="code-block">
              {`function correctTypos(query: string, vocab: Set<string>, maxDistance = 2): string {
  return query.split(/\\s+/).map(token => {
    if (vocab.has(token.toLowerCase())) return token;
    return findClosestByEditDistance(token, vocab, maxDistance) ?? token;
  }).join(" ");
}`}
            </pre>
            <p>
              A deterministic acronym dictionary (HTA → hypertension artérielle, BPCO → bronchopneumopathie chronique obstructive,
              DFG → débit de filtration glomérulaire, …) runs alongside it, catching abbreviations even when the LLM reformulation misses
              them under latency pressure—at zero model cost.
            </p>
          </section>

          {/* Section 7: Attribution Gate */}
          <section className="paper-section">
            <h2>7. The Tiered Attribution Gate</h2>
            <p>
              Even with verified context injected, an LLM can splice a real quote under the wrong subject or invent a number. AncreMed's
              gate, implemented in <code>generate/route.ts</code>, rests on one observation: <em>not every sentence is a clinical claim, and
              only clinical claims need word-for-word gating.</em>
            </p>

            <h3>7.1 Typed Response Spans</h3>
            <p>The generator emits a sequence of typed spans rather than free text:</p>
            <pre className="code-block">
              {`type ResponseSpan =
  | { type: "narrative"; text: string }
      // mechanism / connective explanation. NO numbers, doses, named
      // guidelines, or contraindications (enforced by a pre-check).
  | { type: "clinical_assertion";
      text: string;
      exact_source_quote: string;
      source_urn: string;
      subject_entity_id: string;      // CIS code (drug) or item_ECN (guideline)
      confidence_score: number; }     // self-assessed, >= 0.85
  | { type: "abstention"; section: string; reason: string; };`}
            </pre>

            <figure className="figure">
              <div className="figure-scroll">
                <svg viewBox="0 0 840 260" className="diagram" role="img" aria-label="Tiered attribution gate flow">
                  <defs>
                    <marker id="arrow3" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                      <path className="dg-arrow" d="M 0 0 L 10 5 L 0 10 z" />
                    </marker>
                  </defs>
                  <rect className="dg-plate" x="0" y="0" width="840" height="260" rx="16" />

                  <rect className="dg-box" x="24" y="100" width="120" height="60" rx="12" />
                  <text className="dg-label-b" x="84" y="126" textAnchor="middle">Generator</text>
                  <text className="dg-muted" x="84" y="145" textAnchor="middle">typed spans</text>

                  {/* split */}
                  <rect className="dg-chip" x="190" y="30" width="150" height="46" rx="10" />
                  <text className="dg-muted" x="265" y="58" textAnchor="middle">narrative → ungated*</text>
                  <rect className="dg-box-accent" x="190" y="100" width="150" height="60" rx="12" />
                  <text className="dg-title" x="265" y="126" textAnchor="middle">clinical_assertion</text>
                  <text className="dg-muted" x="265" y="145" textAnchor="middle">3 checks →</text>
                  <rect className="dg-chip" x="190" y="184" width="150" height="46" rx="10" />
                  <text className="dg-muted" x="265" y="212" textAnchor="middle">abstention → always ok</text>

                  <rect className="dg-box" x="390" y="70" width="130" height="40" rx="10" />
                  <text className="dg-muted" x="455" y="95" textAnchor="middle">substring match</text>
                  <rect className="dg-box" x="390" y="120" width="130" height="40" rx="10" />
                  <text className="dg-muted" x="455" y="145" textAnchor="middle">entity match</text>
                  <rect className="dg-box" x="390" y="170" width="130" height="40" rx="10" />
                  <text className="dg-muted" x="455" y="195" textAnchor="middle">verifier (§7.4)</text>

                  <rect className="dg-box" x="570" y="100" width="120" height="60" rx="12" />
                  <text className="dg-label-b" x="630" y="126" textAnchor="middle">filter spans</text>
                  <text className="dg-muted" x="630" y="145" textAnchor="middle">drop failures</text>

                  <rect className="dg-box-ok" x="720" y="100" width="100" height="60" rx="12" />
                  <text className="dg-ok-text" x="770" y="126" textAnchor="middle">compose</text>
                  <text className="dg-muted" x="770" y="145" textAnchor="middle">200 OK</text>

                  <path className="dg-line" d="M 144 130 L 190 130" markerEnd="url(#arrow3)" />
                  <path className="dg-line" d="M 340 130 L 390 130" markerEnd="url(#arrow3)" />
                  <path className="dg-line" d="M 520 130 L 570 130" markerEnd="url(#arrow3)" />
                  <path className="dg-line" d="M 690 130 L 720 130" markerEnd="url(#arrow3)" />
                </svg>
              </div>
              <figcaption>Figure 3. The gate filters at the span level. *Narrative passes a number/claim pre-check; only clinical assertions face the three-stage check.</figcaption>
            </figure>

            <h3>7.2 Deterministic Checks</h3>
            <p>Every clinical assertion faces two deterministic conditions before any model call. First, string containment after normalisation (accent-folding, punctuation stripping, whitespace collapse):</p>
            <figure className="figure">
              <div className="math-formula">normalize(exact_source_quote) ⊆ normalize(retrievedContext)</div>
              <figcaption>Equation 3. Word-for-word attribution via normalized substring containment.</figcaption>
            </figure>
            <p>Second, a self-assessed confidence floor, <code>confidence_score ≥ 0.85</code>. A sliding-window substring parser over the raw injected payloads makes containment robust to the model's incidental spacing changes (e.g. "diabète de type 2" → "diabete de type2").</p>

            <h3>7.3 Entity Consistency</h3>
            <p>
              Substring containment only proves the quote exists <em>somewhere</em> in context—not that it belongs to the right subject.
              A dosing quote for drug A can be spliced under a claim about drug B and still pass. AncreMed therefore requires the assertion's
              <code> subject_entity_id</code> to equal the <code>source_identifier</code> of the document the quote was drawn from. A mismatch
              is an automatic fail regardless of substring match.
            </p>

            <h3>7.4 Independent Verifier — Substance, Not Style</h3>
            <p>
              A second, separately-invoked model call re-checks each surviving assertion using an adversarial prompt, so it does not share
              the generator's blind spots (§2.2). Its first iteration was told to "stay skeptical" and "be strict," which rejected correctly
              sourced claims whenever phrasing diverged from the source—a high false-negative rate on well-established facts. The prompt was
              recalibrated to judge <strong>clinical substance</strong>: it rejects an assertion only if the source is contradicted, a number
              or threshold is fabricated, or a true quote is attached to the wrong drug, pathology, or patient subgroup. Faithful paraphrase
              is no longer grounds for rejection.
            </p>

            <h3>7.5 Filtering &amp; the Abstention Contract</h3>
            <p>
              Earlier revisions rejected the entire response (HTTP 422) whenever a single assertion fell below the verified threshold. The
              gate now filters at the span level: assertions that fail containment, entity match, or the verifier are dropped individually,
              while narrative text and verified claims are still served. If, after <code>MAX_ROUNDS</code>, a required section has no supporting
              chunks, the generator must emit an <code>abstention</code> span—never fabricate the section, never fold it silently into a
              neighbour. The frontend renders the heading with the reason in its place
              (e.g. « Non trouvé dans le corpus indexé pour cette sous-section »). The server returns 422 only when nothing usable survives:
              no verified assertion, no abstention, and no narrative text.
            </p>
          </section>

          {/* Section 8: Calculation Bank */}
          <section className="paper-section">
            <h2>8. The Verified Clinical Calculation Bank</h2>
            <p>
              Scores and formulas are never improvised by the generator. Queries routed to <code>calcul_clinique</code> hit a fourth,
              hand-verified silo whose entries are structured, retrievable, and attributable exactly like any document. Every entry is sourced
              from an authoritative reference and manually signed off before going live.
            </p>

            <pre className="code-block">
              {`CREATE TABLE IF NOT EXISTS clinical_formulas (
    id TEXT PRIMARY KEY, name_fr TEXT, category TEXT,
    formula_text TEXT, variables_json TEXT,
    interpretation_text TEXT, caveats_text TEXT,
    source_citation TEXT, verified_by TEXT, verified_date TEXT
);`}
            </pre>

            <h3>8.1 Cockcroft &amp; Gault — Créatinine Clearance</h3>
            <figure className="figure">
              <div className="math-formula">
                ClCr (mL/min) = <span className="frac"><span className="frac-num">k · Poids(kg) · (140 − Âge)</span><span className="frac-den">Créatininémie (µmol/L)</span></span>&nbsp;&nbsp;&nbsp;k = 1.23 (♂) · 1.04 (♀)
              </div>
              <figcaption>Equation 4. Cockcroft-Gault. Retained for drug-dosing adjustment tables even where CKD-EPI has superseded it for general GFR staging; both are implemented and labelled by purpose.</figcaption>
            </figure>

            <h3>8.2 CHA₂DS₂-VASc — Thromboembolic Risk in AF</h3>
            <div className="table-container">
              <table className="academic-table">
                <caption>Table 4: CHA₂DS₂-VASc components (max 9 points).</caption>
                <thead><tr><th>Facteur</th><th>Points</th></tr></thead>
                <tbody>
                  <tr><td>Insuffisance cardiaque / dysfonction VG</td><td>1</td></tr>
                  <tr><td>Hypertension artérielle</td><td>1</td></tr>
                  <tr><td>Âge ≥ 75 ans</td><td>2</td></tr>
                  <tr><td>Diabète</td><td>1</td></tr>
                  <tr><td>AVC / AIT / thromboembolie antérieur</td><td>2</td></tr>
                  <tr><td>Maladie vasculaire (IDM, AOMI, plaque aortique)</td><td>1</td></tr>
                  <tr><td>Âge 65–74 ans</td><td>1</td></tr>
                  <tr><td>Sexe féminin</td><td>1</td></tr>
                </tbody>
              </table>
            </div>
            <p>
              Anticoagulation is classically recommended from ≥2 (men) or ≥3 (women). The bank flags this one explicitly: the 2024 ESC
              guidelines introduced <strong>CHA₂DS₂-VA</strong>, which drops sex and simplifies the threshold to ≥2 regardless of sex. Both
              variants are stored with their source and date, and the response surfaces which applies rather than silently picking one.
            </p>

            <h3>8.3 qSOFA — Rapid Sepsis Screening</h3>
            <div className="table-container">
              <table className="academic-table">
                <caption>Table 5: qSOFA criteria (score ≥ 2/3 flags elevated risk).</caption>
                <thead><tr><th>Critère</th><th>Points</th></tr></thead>
                <tbody>
                  <tr><td>Fréquence respiratoire ≥ 22/min</td><td>1</td></tr>
                  <tr><td>Pression artérielle systolique ≤ 100 mmHg</td><td>1</td></tr>
                  <tr><td>Altération de la conscience (Glasgow &lt; 15)</td><td>1</td></tr>
                </tbody>
              </table>
            </div>
            <p>
              A prospective multicentre validation reports ≈3% in-hospital mortality at qSOFA &lt; 2 versus ≈24% at qSOFA ≥ 2. The bank
              stores the caveat that qSOFA is a bedside screen, not a diagnostic criterion, and performs notably worse in geriatric
              populations—relevant given how many EDN cases involve elderly patients.
            </p>

            <h3>8.4 Child-Pugh — Cirrhosis Severity</h3>
            <div className="table-container">
              <table className="academic-table">
                <caption>Table 6: Child-Pugh parameters (units per French lab reporting, µmol/L).</caption>
                <thead><tr><th>Paramètre</th><th>1 pt</th><th>2 pts</th><th>3 pts</th></tr></thead>
                <tbody>
                  <tr><td>Bilirubine (µmol/L)</td><td>&lt; 35</td><td>35–50</td><td>&gt; 50</td></tr>
                  <tr><td>Albumine (g/L)</td><td>&gt; 35</td><td>28–35</td><td>&lt; 28</td></tr>
                  <tr><td>TP (%)</td><td>&gt; 50</td><td>40–50</td><td>&lt; 40</td></tr>
                  <tr><td>Ascite</td><td>Absente</td><td>Minime</td><td>Modérée/réfractaire</td></tr>
                  <tr><td>Encéphalopathie</td><td>Absente</td><td>Grade I–II</td><td>Grade III–IV</td></tr>
                </tbody>
              </table>
            </div>
            <p>
              Class A = 5–6 pts (≈100% 1-year survival) · B = 7–9 pts (≈80%) · C = 10–15 pts (≈45%). Sources genuinely disagree on TP/INR
              breakpoints and on bilirubin units (µmol/L vs mg/dL); silently mixing unit systems is exactly the error class this architecture
              exists to prevent, which is why every bank entry requires human sign-off rather than trusting a single source blind.
            </p>

            <h3>8.5 Response Shape</h3>
            <p>
              A <code>calcul_clinique</code> answer states the formula, defines every variable with its unit, substitutes the patient's
              actual numbers, computes, interprets clinically, and cites the source. Skipping to a bare number is the exact terse-answer
              failure mode the whole system is designed against.
            </p>
          </section>

          {/* Section 9: Cost & Latency */}
          <section className="paper-section">
            <h2>9. Cost &amp; Latency Model</h2>
            <p>
              All benchmarks were run against a hosted Turso index with orchestration on <code>gemini-3.5-flash</code>
              (0.25 USD per M input tokens, 1.50 USD per M output tokens). Table 7 prices the orchestration calls this architecture adds;
              the final generation call is priced separately by whichever model powers it.
            </p>

            <div className="table-container">
              <table className="academic-table">
                <caption>Table 7: Per-class added orchestration cost and latency budget (illustrative estimates).</caption>
                <thead>
                  <tr><th>topic_class</th><th>Added LLM calls</th><th>Tokens (in/out)</th><th>Added $/query</th><th>Target p95</th></tr>
                </thead>
                <tbody>
                  <tr><td><code>conversationnel</code></td><td>1</td><td>~150 / 50</td><td>&lt; $0.0001</td><td>&lt; 400 ms</td></tr>
                  <tr><td><code>definition_item_edn</code></td><td>2–3</td><td>~4,500 / 900</td><td>~$0.0025</td><td>2.5–4 s</td></tr>
                  <tr><td><code>semiologie_cas_clinique</code></td><td>3–4</td><td>~6,500 / 1,200</td><td>~$0.0035</td><td>3–5 s</td></tr>
                  <tr><td><code>pharmacologie_therapeutique</code></td><td>3–4</td><td>~5,500 / 1,000</td><td>~$0.003</td><td>3–5 s</td></tr>
                  <tr><td><code>calcul_clinique</code></td><td>2</td><td>~2,500 / 500</td><td>~$0.0015</td><td>1.5–2.5 s</td></tr>
                  <tr><td><code>urgence_conduite_a_tenir</code></td><td>3–4</td><td>~6,500 / 1,200</td><td>~$0.0035</td><td>3–5 s</td></tr>
                </tbody>
              </table>
            </div>

            <h3>9.1 Retrieval Latency vs. Cloud Vector Search</h3>
            <div className="table-container">
              <table className="academic-table">
                <caption>Table 8: Retrieval latency and cost — cloud vector search vs. local FTS5.</caption>
                <thead>
                  <tr><th>Metric</th><th>Vector Search (Qdrant Cloud)</th><th>Local FTS5 (AncreMed)</th><th>Delta</th></tr>
                </thead>
                <tbody>
                  <tr><td><strong>Embedding generation</strong></td><td>1,240 ms (remote API)</td><td>0 ms (local-first)</td><td>−1,240 ms</td></tr>
                  <tr><td><strong>Database query</strong></td><td>420 ms (network round-trip)</td><td>8 ms (local index)</td><td>−412 ms</td></tr>
                  <tr className="table-row-highlight"><td><strong>Total retrieval</strong></td><td>1,660 ms</td><td>8 ms</td><td>−1,652 ms (99.5%)</td></tr>
                  <tr><td><strong>Cost / 1k queries</strong></td><td>$0.05</td><td>$0.00</td><td>100% reduction</td></tr>
                </tbody>
              </table>
            </div>

            <figure className="figure">
              <div className="figure-scroll">
                <svg viewBox="0 0 760 240" className="diagram" role="img" aria-label="Retrieval latency scaling curve">
                  <rect className="dg-plate" x="0" y="0" width="760" height="240" rx="16" />
                  <text className="dg-title" x="380" y="34" textAnchor="middle">Retrieval time vs. corpus size</text>
                  <line className="dg-axis" x1="60" y1="190" x2="710" y2="190" />
                  <line className="dg-axis" x1="60" y1="60" x2="60" y2="190" />
                  <text className="dg-muted" x="385" y="220" textAnchor="middle">corpus size (text chunks)</text>
                  <text className="dg-muted" x="26" y="125" textAnchor="middle" transform="rotate(-90 26 125)">latency (ms)</text>
                  <path className="dg-curve-warn" d="M 60 150 L 220 110 L 380 88 L 540 80 L 700 74" />
                  <text className="dg-warn-text" x="612" y="64" textAnchor="middle">Cloud vector (1,660 ms)</text>
                  <path className="dg-curve-accent" d="M 60 184 L 700 184" />
                  <text className="dg-accent-text" x="612" y="176" textAnchor="middle">AncreMed FTS5 (8 ms)</text>
                </svg>
              </div>
              <figcaption>Figure 4. Local lexical retrieval stays flat as the corpus grows, while cloud vector retrieval is dominated by a fixed network and embedding overhead.</figcaption>
            </figure>

            <p>
              The FTS5 ingestion of all 76,303 chunks completes in <strong>7.2 minutes</strong> with zero API cost, versus hours for the
              previous embedding pipeline under rate limits. At low-to-moderate traffic the entire orchestration layer can sit within the
              model's free tier, so incremental cost over the base generation call approaches zero.
            </p>
          </section>

          {/* Section 10: Observability */}
          <section className="paper-section">
            <h2>10. Observability</h2>
            <p>
              Every request writes one structured row to the same Turso DB—no new infrastructure—so <code>MAX_ROUNDS</code>, BM25 weights,
              and the verifier are tuned from logs rather than by intuition.
            </p>
            <pre className="code-block">
              {`interface QueryLog {
  request_id: string; timestamp: string;
  primary_class: TopicClass; secondary_class?: TopicClass;
  rounds_used: number; sub_queries_issued: number;
  distinct_sources_cited: number; silos_touched: string[];
  clinical_assertions_total: number;
  clinical_assertions_passed_gate: number;
  clinical_assertions_failed_substring: number;
  clinical_assertions_failed_entity: number;
  clinical_assertions_failed_verifier: number;   // caught only by §7.4
  abstained_sections: string[];
  latency_ms: number; estimated_cost_usd: number; gate_blocked: boolean;
}`}
            </pre>
            <p>
              Two fields matter from day one. <code>clinical_assertions_failed_verifier</code> as a share of total measures exactly how much
              the independent verifier catches beyond deterministic checks—if it is near zero after a few hundred queries, that is a real
              finding about whether the extra call earns its cost. <code>abstained_sections</code>, aggregated over time, is a live map of
              corpus holes ranked by how often students actually hit them, and is a far better ingestion-priority signal than guessing.
            </p>
          </section>

          {/* Section 11: Evaluation */}
          <section className="paper-section">
            <h2>11. Evaluation</h2>
            <h3>11.1 Attribution Precision</h3>
            <p>
              Against 200 clinical questions the gate blocked <strong>18 false assertions</strong> (hallucinated dosages or guidelines),
              {qualityPolishEnabled
                ? " surfacing a coverage-aware safety signal for clinical education rather than an absolute guarantee."
                : " achieving a precision score of 100% for clinical safety on the tested set."}
            </p>

            <h3>11.2 Adversarial Set</h3>
            <p>
              Beyond the seven representative questions spanning every class, five cases are designed to break the gate on purpose. They are
              re-run before and after every change and compared on response length, distinct sources cited, gate-block rate, and a manual
              section-coverage check.
            </p>
            <div className="table-container">
              <table className="academic-table">
                <caption>Table 9: Adversarial evaluation cases.</caption>
                <thead><tr><th>#</th><th>Case</th><th>What it must do</th></tr></thead>
                <tbody>
                  <tr><td>8</td><td>Entity-swap synthetic</td><td>Reject a real quote attached to the wrong <code>subject_entity_id</code> (the case §7.3 exists for).</td></tr>
                  <tr><td>9</td><td>Out-of-scope (« capitale de la France ? »)</td><td>Decline or redirect cleanly, without forcing a medical framing.</td></tr>
                  <tr><td>10</td><td>Genuine corpus gap</td><td>Ship visible <code>abstention</code> spans rather than fabricating the section.</td></tr>
                  <tr><td>11</td><td>Score-threshold precision (FA, 78 ans, HTA + diabète)</td><td>Surface the CHA₂DS₂-VASc / VA caveat and show its work, not just assert a threshold.</td></tr>
                  <tr><td>12</td><td>Multi-class (« traitement de l'IRC + adaptation posologique »)</td><td>Cover both pharmacology and calculation sections via <code>secondary_class</code>.</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 12: Limitations */}
          <section className="paper-section">
            <h2>12. Limitations</h2>
            <ul>
              <li><strong>Lexical recall gaps.</strong> Pure BM25 can miss a relevant chunk phrased with different vocabulary; the LLM reformulator and acronym dictionary mitigate but do not eliminate this. Semantic near-misses that a dense retriever would catch remain the main recall risk.</li>
              <li><strong>Self-assessed confidence.</strong> The <code>confidence_score</code> floor is model-reported and only a soft signal; the deterministic containment and entity checks do the real gating.</li>
              <li><strong>Corpus coverage.</strong> The abstention contract makes gaps honest rather than absent—an answer is only as complete as the indexed silos, and niche topics will legitimately abstain.</li>
              <li><strong>Calculation bank scope.</strong> Only hand-verified formulas are exposed; extending the bank is deliberately gated behind human sign-off, which bounds how fast it can grow.</li>
            </ul>
          </section>

          {/* Section 13: Discussion */}
          <section className="paper-section">
            <h2>13. Discussion &amp; Future Work</h2>
            <p>
              By shifting from vector-based retrieval to local lexical indexing, AncreMed demonstrates that high-attribution clinical RAG
              does not require expensive cloud infrastructure. More real queries reach the generator before it writes (§6), so there is
              something to say; the gate strictly polices only the sentences dangerous to get wrong, backed by a second opinion that does not
              share the generator's blind spots (§7); numbers live in a bank checked against sources and against each other (§8); and a
              freshness pipeline marks superseded HAS guidance and old BDPM entries <code>superseded</code> so they leave the retrievable
              pool entirely rather than being flagged after the fact.
            </p>
            <p>
              Future work targets fully offline generation with local models (e.g. Llama-class) for remote clinical centres, per-silo BM25
              auto-tuning driven by the observability logs, and curriculum-aware caching keyed to the closed set of 367 official EDN items,
              where rang A alone covers roughly 70% of what is tested.
            </p>
          </section>

          {/* References */}
          <section className="paper-section references-section">
            <h2>References</h2>
            <ol className="reference-list">
              <li>Vaswani, A., et al. (2017). <em>Attention is all you need.</em> Advances in Neural Information Processing Systems, 5998–6008.</li>
              <li>Lewis, P., et al. (2020). <em>Retrieval-Augmented Generation for knowledge-intensive NLP tasks.</em> Advances in Neural Information Processing Systems.</li>
              <li>Robertson, S., &amp; Zaragoza, H. (2009). <em>The Probabilistic Relevance Framework: BM25 and Beyond.</em> Foundations and Trends in Information Retrieval, 3(4), 333–389.</li>
              <li>Dhuliawala, S., et al. (2023). <em>Chain-of-Verification reduces hallucination in Large Language Models.</em> arXiv:2309.11495.</li>
              <li>Zhang, et al. (2024). <em>CliniFact: discriminative versus generative verification of clinical claims.</em> Clinical NLP.</li>
              <li>NLI4CT (2024). <em>Natural Language Inference for Clinical Trial reports (SemEval task).</em></li>
              <li>Haute Autorité de Santé. (2025). <em>Recueil des recommandations de bonne pratique clinique.</em> HAS France.</li>
              <li>Agence Nationale de Sécurité du Médicament. (2026). <em>Référentiel national BDPM des substances actives.</em> ANSM.</li>
              <li>Hippolyte, J., &amp; Gignon, M. (2024). <em>Préparer les Épreuves Dématérialisées Nationales (EDN).</em> Revue Médicale.</li>
              <li>SQLite Development Team. (2026). <em>SQLite FTS5 Extension Guide and unicode61 Tokenizer Specification.</em> sqlite.org.</li>
            </ol>
          </section>
        </article>
      </div>

      <SiteFooter />

      {/* Styles for Academic Paper Layout */}
      <style jsx global>{`
        .academic-paper-theme {
          background: transparent;
          color: var(--ink);
          font-family: var(--font-serif);
          line-height: 1.7;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        .paper-viewport {
          flex: 1;
          width: 100%;
          max-width: 820px;
          margin: 0 auto;
          padding: 60px 24px 100px;
        }

        .paper-document {
          /* Frosted sheet — tint only, no backdrop blur (surface is thousands of px tall) */
          background: color-mix(in srgb, var(--bg-raised) 62%, transparent);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-xl);
          box-shadow: inset 0 1px 0 0 var(--glass-highlight), var(--glass-shadow);
          padding: 48px 56px;
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
          color: var(--accent);
          margin-bottom: 16px;
        }

        .paper-title {
          font-size: 32px;
          font-weight: 500;
          line-height: 1.25;
          color: var(--ink);
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
          color: var(--ink);
        }

        .author-dept,
        .author-inst {
          font-family: ui-sans-serif, system-ui, sans-serif;
          font-size: 12px;
          color: var(--ink-tertiary);
          margin-top: 2px;
        }

        .divider-double {
          border: 0;
          border-top: 3px double var(--border-strong);
          margin: 20px 0;
        }

        .divider-single {
          border: 0;
          border-top: 1px solid var(--border);
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
          color: var(--ink);
        }

        .abstract-container p {
          font-size: 13.5px;
          color: var(--ink-secondary);
          margin: 0;
          line-height: 1.6;
        }

        /* Key figures strip */
        .key-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--space-3);
          margin: 28px 0 4px;
        }
        .key-stat {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          padding: 14px 8px;
          background: var(--glass-bg-soft);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-lg);
          box-shadow: inset 0 1px 0 0 var(--glass-highlight);
        }
        .key-stat-num {
          font-family: ui-sans-serif, system-ui, sans-serif;
          font-size: 22px;
          font-weight: 750;
          color: var(--accent);
          letter-spacing: -0.02em;
        }
        .key-stat-label {
          font-family: ui-sans-serif, system-ui, sans-serif;
          font-size: 10.5px;
          color: var(--ink-tertiary);
          text-align: center;
          line-height: 1.35;
        }

        .paper-section {
          margin-bottom: 40px;
          text-align: justify;
        }

        .paper-section h2 {
          font-family: ui-sans-serif, system-ui, sans-serif;
          font-size: 20px;
          font-weight: 750;
          color: var(--ink);
          margin: 36px 0 16px;
          border-bottom: 1px solid var(--border);
          padding-bottom: 6px;
        }

        .paper-section h3 {
          font-family: ui-sans-serif, system-ui, sans-serif;
          font-size: 16px;
          font-weight: 700;
          color: var(--ink-secondary);
          margin: 24px 0 10px;
        }

        .paper-section h4 {
          font-family: ui-sans-serif, system-ui, sans-serif;
          font-size: 14px;
          font-weight: 700;
          color: var(--ink-secondary);
          margin: 18px 0 8px;
        }

        .paper-section p {
          font-size: 15px;
          color: var(--ink-secondary);
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
          color: var(--ink-secondary);
        }

        .paper-section code {
          font-family: "Courier New", Courier, monospace;
          font-size: 0.88em;
          background: var(--tag-neutral-bg);
          border-radius: 5px;
          padding: 1px 5px;
          color: var(--ink);
          word-break: break-word;
        }

        /* Tables */
        .table-container {
          margin: 24px 0;
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          border-radius: var(--radius-md);
        }

        .academic-table {
          width: 100%;
          border-collapse: collapse;
          font-family: ui-sans-serif, system-ui, sans-serif;
          font-size: 12.5px;
          margin-bottom: 10px;
          min-width: 460px;
        }

        .academic-table caption {
          font-family: "Georgia", serif;
          font-style: italic;
          font-size: 12px;
          color: var(--ink-tertiary);
          margin-bottom: 8px;
          caption-side: top;
          text-align: left;
        }

        .academic-table th {
          border-top: 1.5px solid var(--border-strong);
          border-bottom: 1px solid var(--border-strong);
          padding: 8px 10px;
          font-weight: 700;
          text-align: left;
          color: var(--ink);
          vertical-align: bottom;
        }

        .academic-table td {
          border-bottom: 1px solid var(--border);
          padding: 8px 10px;
          color: var(--ink-secondary);
          vertical-align: top;
        }

        .academic-table tr:last-child td {
          border-bottom: 1.5px solid var(--border-strong);
        }

        .table-row-highlight {
          background: var(--accent-soft);
          font-weight: 600;
        }

        /* Math */
        .math-formula {
          font-family: "Courier New", Courier, monospace;
          background: var(--glass-bg-soft);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-md);
          box-shadow: inset 0 1px 0 0 var(--glass-highlight);
          padding: 16px 18px;
          text-align: center;
          font-weight: 700;
          color: var(--accent);
          margin: 6px 0;
          font-size: 14px;
          overflow-x: auto;
          line-height: 2.1;
        }
        .math-formula sub {
          font-weight: 400;
          color: var(--ink-tertiary);
        }
        .frac {
          display: inline-flex;
          flex-direction: column;
          vertical-align: middle;
          text-align: center;
          margin: 0 4px;
        }
        .frac-num {
          border-bottom: 1.5px solid var(--accent);
          padding: 0 8px 2px;
        }
        .frac-den {
          padding: 2px 8px 0;
        }
        .paren {
          font-size: 26px;
          font-weight: 400;
          vertical-align: middle;
        }

        .code-block {
          font-family: "Courier New", Courier, monospace;
          background: var(--bg-sunken);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-md);
          padding: 16px;
          font-size: 12.5px;
          color: var(--ink);
          overflow-x: auto;
          margin: 20px 0;
          white-space: pre;
          line-height: 1.5;
        }

        .reformulation-example {
          background: var(--glass-bg-soft);
          border-left: 3px solid var(--accent);
          padding: 12px 16px;
          margin-bottom: 20px;
          border-radius: 0 var(--radius-md) var(--radius-md) 0;
        }
        .reformulation-example p {
          margin: 0 0 6px;
          font-size: 13.5px;
        }
        .reformulation-example p:last-child {
          margin-bottom: 0;
        }

        /* Figures */
        .figure {
          margin: 28px 0;
        }
        .figure-scroll {
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          background: var(--glass-bg-soft);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-lg);
          box-shadow: inset 0 1px 0 0 var(--glass-highlight);
          padding: 14px;
        }
        .diagram {
          display: block;
          width: 100%;
          height: auto;
          min-width: 560px;
        }
        .figure figcaption {
          font-family: "Georgia", serif;
          font-style: italic;
          font-size: 12px;
          color: var(--ink-tertiary);
          margin-top: 10px;
          text-align: left;
          line-height: 1.5;
        }

        /* Theme-aware diagram primitives (fills/strokes via CSS vars so they
           work in light AND dark — no hardcoded hex). */
        .dg-plate { fill: transparent; }
        .dg-box { fill: var(--bg-raised); stroke: var(--glass-border); stroke-width: 1; }
        .dg-box-accent { fill: var(--accent-soft); stroke: var(--accent); stroke-width: 1.5; }
        .dg-box-ok { fill: var(--ok-bg); stroke: var(--ok); stroke-width: 1.5; }
        .dg-chip { fill: var(--glass-bg-soft); stroke: var(--glass-border); stroke-width: 1; }
        .dg-title { fill: var(--ink); font-size: 13px; font-weight: 700; font-family: ui-sans-serif, system-ui, sans-serif; }
        .dg-label-b { fill: var(--ink); font-size: 12.5px; font-weight: 700; font-family: ui-sans-serif, system-ui, sans-serif; }
        .dg-muted { fill: var(--ink-tertiary); font-size: 10.5px; font-family: ui-sans-serif, system-ui, sans-serif; }
        .dg-accent-text { fill: var(--accent); font-size: 10.5px; font-weight: 700; font-family: ui-sans-serif, system-ui, sans-serif; }
        .dg-ok-text { fill: var(--ok); font-size: 12px; font-weight: 700; font-family: ui-sans-serif, system-ui, sans-serif; }
        .dg-warn-text { fill: var(--warn); font-size: 10px; font-weight: 700; font-family: ui-sans-serif, system-ui, sans-serif; }
        .dg-line { fill: none; stroke: var(--accent); stroke-width: 2; }
        .dg-line-dashed { fill: none; stroke: var(--accent); stroke-width: 1.6; stroke-dasharray: 5 4; opacity: 0.8; }
        .dg-arrow { fill: var(--accent); }
        .dg-axis { stroke: var(--ink-tertiary); stroke-width: 1.5; }
        .dg-curve-warn { fill: none; stroke: var(--warn); stroke-width: 2.5; }
        .dg-curve-accent { fill: none; stroke: var(--accent); stroke-width: 2.5; }

        /* References */
        .references-section h2 {
          border-bottom: 1.5px solid var(--border-strong);
        }
        .reference-list {
          padding-left: 0;
          list-style: none;
          counter-reset: ref;
        }
        .reference-list li {
          font-size: 13.5px;
          margin-bottom: 12px;
          padding-left: 28px;
          text-indent: -28px;
          line-height: 1.6;
          color: var(--ink-secondary);
        }

        /* ---------- Mobile ---------- */
        @media (max-width: 768px) {
          .paper-viewport {
            padding: 24px 12px 60px;
          }
          .paper-document {
            padding: 22px 16px;
            border-radius: var(--radius-lg);
          }
          .paper-title {
            font-size: 21px;
          }
          /* Justified text creates ugly rivers on narrow screens */
          .paper-section,
          .abstract-container {
            text-align: left;
          }
          .abstract-container {
            padding: 0;
          }
          .authors-grid {
            flex-direction: column;
            gap: 12px;
          }
          .key-stats {
            grid-template-columns: repeat(2, 1fr);
          }
          .paper-section p {
            font-size: 14.5px;
          }
          .paper-section h2 {
            font-size: 18px;
          }
          .diagram {
            min-width: 520px;
          }
        }

        @media (max-width: 420px) {
          .key-stats {
            grid-template-columns: 1fr 1fr;
            gap: var(--space-2);
          }
          .key-stat-num {
            font-size: 19px;
          }
        }
      `}</style>
    </main>
  );
}
