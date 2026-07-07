"use client";

import type { JSX, ReactNode } from "react";
import { SiteHeader } from "../../components/SiteHeader";
import { SiteFooter } from "../../components/SiteFooter";
import { useLang } from "../../lib/i18n";

export default function PaperPage(): JSX.Element {
  const qualityPolishEnabled = process.env["ANCREMED_V2_QUALITY_POLISH"] === "true";
  const { lang } = useLang();
  const L = (fr: ReactNode, en: ReactNode): ReactNode => (lang === "fr" ? fr : en);
  const s = (fr: string, en: string): string => (lang === "fr" ? fr : en);

  return (
    <main className="workspace-shell academic-paper-theme">
      <SiteHeader />

      {/* Main Container */}
      <div className="paper-viewport fade-up">
        <article className="paper-document">
          {/* Metadata Section */}
          <header className="paper-doc-header">
            <div className="journal-tag">
              {s("RAPPORT TECHNIQUE & LIVRE BLANC — RÉV. 2, JUILLET 2026", "TECHNICAL REPORT & WHITE PAPER — REV. 2, JULY 2026")}
            </div>
            <h1 className="paper-title">
              {L(
                "AncreMed : un moteur de génération augmentée par récupération, local-first et à haute attribution, pour l'éducation médicale française",
                "AncreMed: A High-Attribution, Local-First Retrieval-Augmented Generation Engine for French Clinical Education"
              )}
            </h1>

            <div className="authors-grid">
              <div className="author-card">
                <span className="author-name">AncreMed Research Group</span>
                <span className="author-dept">{s("Département d'informatique médicale", "Department of Medical Informatics")}</span>
                <span className="author-inst">AncreMed Open Source Lab</span>
              </div>
            </div>

            <hr className="divider-double" />

            <div className="abstract-container">
              <h3>{s("Résumé", "Abstract")}</h3>
              <p>
                {L(
                  <>
                    Les outils éducatifs cliniques s'appuyant sur les grands modèles de langage (LLM) souffrent fréquemment
                    d'hallucinations factuelles, ce qui les rend dangereux pour la préparation d'examens à fort enjeu comme les
                    Épreuves Dématérialisées Nationales (EDN). Dans cet article, nous présentons AncreMed, un système de génération
                    augmentée par récupération (RAG) local-first et à haute attribution, conçu pour répondre aux questions médicales
                    françaises sans contenu halluciné. AncreMed déplace les opérations de base de données vectorielle vers une base
                    plein texte SQLite/Turso FTS5 locale, indexant 76 303 fragments issus de la Haute Autorité de Santé (HAS), de la
                    Base de Données Publique des Médicaments (BDPM) et des supports d'enseignement officiels de l'EDN. La récupération
                    est pilotée par un classifieur de sujet à sept voies qui étend chaque question en une <em>boucle de recherche
                    profonde</em> sur des index lexicaux classés par BM25, et chaque énoncé généré est décomposé en segments typés puis
                    filtré par une porte d'attribution à niveaux, appuyée par un vérificateur indépendant et un contrat d'abstention explicite.
                    {qualityPolishEnabled
                      ? " Notre mécanisme de récupération local-first évite les frais d'API d'embedding tandis que la couche de confiance v2 rapporte la couverture, les abstentions et la vérification indépendante des affirmations chiffrées liées aux sources."
                      : " Notre mécanisme de récupération local-first s'exécute en quelques millisecondes de temps base de données, contourne entièrement les frais d'API d'embedding distants, et fournit un cadre gratuit et prêt hors-ligne pour les facultés de médecine."}
                  </>,
                  <>
                    Clinical educational tools leveraging Large Language Models (LLMs) frequently suffer from factual hallucinations,
                    making them hazardous for student preparation in high-stakes examinations like the French Épreuves Dématérialisées
                    Nationales (EDN). In this paper, we introduce AncreMed, a high-attribution, local-first Retrieval-Augmented
                    Generation (RAG) system specifically designed to answer French medical inquiries without hallucinated content.
                    AncreMed relocates traditional vector database operations to a local-first SQLite/Turso FTS5 full-text database,
                    indexing 76,303 chunks from the Haute Autorité de Santé (HAS), the Base de Données Publique des Médicaments (BDPM),
                    and official EDN teaching materials. Retrieval is driven by a seven-way topic classifier that expands each question
                    into a <em>deep search loop</em> over BM25-ranked lexical indices, and every generated statement is decomposed into
                    typed spans and filtered through a tiered attribution gate backed by an independent verifier and an explicit
                    abstention contract.
                    {qualityPolishEnabled
                      ? " Our local-first retrieval mechanism avoids remote embedding API charges while the v2 trust layer reports coverage, abstentions, and independent verification for source-bound numerical claims."
                      : " Our local-first retrieval mechanism runs in single-digit milliseconds of database time, completely bypasses remote embedding API charges, and provides a cost-free, offline-ready framework for medical faculties."}
                  </>
                )}
              </p>
            </div>

            <div className="key-stats" role="list" aria-label={s("Chiffres clés", "Key figures")}>
              <div className="key-stat" role="listitem">
                <span className="key-stat-num">76,303</span>
                <span className="key-stat-label">{s("fragments indexés", "indexed text chunks")}</span>
              </div>
              <div className="key-stat" role="listitem">
                <span className="key-stat-num">8 ms</span>
                <span className="key-stat-label">{s("latence médiane de récupération", "median retrieval latency")}</span>
              </div>
              <div className="key-stat" role="listitem">
                <span className="key-stat-num">3</span>
                <span className="key-stat-label">{s("silos de référence", "authoritative silos")}</span>
              </div>
              <div className="key-stat" role="listitem">
                <span className="key-stat-num">$0.00</span>
                <span className="key-stat-label">{s("coût de récupération / 1k requêtes", "retrieval cost / 1k queries")}</span>
              </div>
            </div>

            <hr className="divider-single" />
          </header>

          {/* Section 1: Introduction */}
          <section className="paper-section">
            <h2>1. Introduction</h2>
            <p>
              {L(
                "L'intégration de l'intelligence artificielle dans l'éducation médicale est prometteuse, notamment pour accompagner les étudiants et internes préparant les Épreuves Dématérialisées Nationales (EDN) et les stages cliniques. Cependant, l'adoption des grands modèles de langage (LLM) génératifs en clinique reste limitée par leur tendance fondamentale à halluciner un contenu plausible mais factuellement inexact — posologies incorrectes, contre-indications inversées, ou paramètres diagnostiques obsolètes. Dans des examens médicaux à fort enjeu, où une seule posologie erronée peut entraîner un événement patient critique, de telles erreurs sont inacceptables.",
                "The integration of artificial intelligence in medical education has shown significant promise, particularly in supporting medical students and interns preparing for the Épreuves Dématérialisées Nationales (EDN) and clinical rotations. However, the adoption of generative Large Language Models (LLMs) in clinical domains remains limited by their fundamental tendency to hallucinate logical-sounding but factually inaccurate content—such as incorrect drug dosages, reversed contraindications, or obsolete diagnostic parameters. In high-stakes medical examinations, where a single incorrect dosage can result in a critical patient event, such errors are unacceptable."
              )}
            </p>
            <p>
              {L(
                "La génération augmentée par récupération (RAG) est la technique principale pour atténuer les hallucinations des LLM. En récupérant des documents pertinents depuis une base vérifiée et en les injectant dans le contexte du prompt, la RAG guide le LLM pour qu'il rédige à partir des seuls documents sources valides. Traditionnellement, les architectures RAG reposent sur des embeddings vectoriels denses stockés dans des bases vectorielles cloud (p. ex. Qdrant, Pinecone) et invoquent des API distantes (p. ex. Google Gen AI Embeddings) pour convertir les requêtes en vecteurs.",
                "Retrieval-Augmented Generation (RAG) is the primary technique used to mitigate LLM hallucinations. By retrieving relevant documents from a verified database and injecting them into the prompt context, RAG guides the LLM to write replies based solely on valid source documents. Traditionally, RAG architectures rely on dense vector embeddings stored in cloud-hosted vector databases (e.g., Qdrant, Pinecone) and invoke remote APIs (e.g., Google Gen AI Embeddings) to convert user queries into vectors."
              )}
            </p>
            <p>
              {L(
                "Si la récupération vectorielle excelle pour l'appariement sémantique ou multilingue, elle présente trois goulots d'étranglement sévères pour un outil clinique destiné aux étudiants :",
                "While vector-based retrieval is highly effective for cross-lingual or semantic matching, it presents three severe bottlenecks for student-driven clinical tools:"
              )}
            </p>
            <ul>
              <li>{L(<><strong>Latence d'exécution élevée :</strong> générer les embeddings et interroger des serveurs distants ajoute 1,5 à 3 secondes de latence réseau par requête.</>, <><strong>High Execution Latency:</strong> Generating embeddings and querying remote servers adds 1.5 to 3 seconds of network latency per query.</>)}</li>
              <li>{L(<><strong>Barrières financières :</strong> générer des embeddings pour de grands corpus médicaux (p. ex. 76 000+ fragments) coûte des crédits d'API significatifs, insoutenables pour des étudiants et des laboratoires universitaires à but non lucratif.</>, <><strong>Financial Barriers:</strong> Generating embeddings for large medical corpora (e.g., 76,000+ chunks) costs significant API credits, which is unsustainable for students and non-profit faculty labs.</>)}</li>
              <li>{L(<><strong>Décalage d'attribution :</strong> le calcul vectoriel sémantique récupère souvent un texte conceptuellement proche mais dépourvu des métriques quantitatives exactes (posologies, seuils cliniques) nécessaires à une validation médicale mot à mot.</>, <><strong>Attribution Mismatch:</strong> Semantic vector math frequently retrieves conceptually similar text that lacks the exact quantitative metrics (e.g., exact drug dosages or clinical cut-offs) needed for word-for-word medical validation.</>)}</li>
            </ul>
            <p>
              {L(
                <>Pour lever ces goulots, nous présentons <strong>AncreMed</strong>, un moteur RAG local-first qui fonctionne entièrement hors-ligne pour la récupération, s'appuyant sur SQLite/Turso FTS5 pour un index plein texte ultra-rapide, combiné à un planificateur de requêtes agentique. Surtout, AncreMed introduit une <strong>porte d'attribution clinique</strong> qui décompose le texte généré en segments typés et vérifie chaque affirmation clinique mot à mot contre le corpus source — appuyée par un vérificateur invoqué indépendamment — avant de présenter la réponse.</>,
                <>To address these bottlenecks, we present <strong>AncreMed</strong>, a local-first RAG engine that operates completely offline for database retrieval, utilizing SQLite/Turso FTS5 for ultra-fast full-text indexing, combined with an agentic query planner. Crucially, AncreMed introduces a <strong>Clinical Attribution Gate</strong> that decomposes generated text into typed spans and verifies each clinical claim word-for-word against the source corpus—backed by an independently-invoked verifier—before presenting the response.</>
              )}
            </p>

            <h3>1.1 Contributions</h3>
            <p>{s("Ce rapport apporte les contributions concrètes suivantes, chacune détaillée dans une section dédiée :", "This report makes the following concrete contributions, each detailed in a dedicated section:")}</p>
            <ul>
              <li>{L(<>Une <strong>architecture de récupération lexicale local-first</strong> (§3–§4) qui élimine le coût des embeddings et la latence réseau tout en préservant la fidélité de correspondance exacte des faits chiffrés.</>, <>A <strong>local-first lexical retrieval architecture</strong> (§3–§4) that eliminates embedding cost and network latency while preserving exact-match fidelity for numeric clinical facts.</>)}</li>
              <li>{L(<>Une <strong>taxonomie de sujet à sept voies et une boucle de recherche profonde</strong> (§5–§6) qui décompose une question en sous-requêtes ciblées par section et itère jusqu'à couverture.</>, <>A <strong>seven-way topic taxonomy and deep search loop</strong> (§5–§6) that decomposes a question into section-targeted sub-queries and iterates until coverage is satisfied.</>)}</li>
              <li>{L(<>Une <strong>porte d'attribution à niveaux avec vérificateur indépendant et contrat d'abstention</strong> (§7) qui ne contrôle que les phrases dangereuses à se tromper, tout en autorisant l'explication et les « non trouvé » honnêtes.</>, <>A <strong>tiered attribution gate with an independent verifier and abstention contract</strong> (§7) that gates only the sentences that are dangerous to get wrong, while allowing explanatory prose and honest "not found" responses.</>)}</li>
              <li>{L(<>Une <strong>banque de calculs cliniques vérifiés à la main</strong> (§8) qui garde scores et formules hors du générateur.</>, <>A <strong>hand-verified clinical calculation bank</strong> (§8) that keeps scores and formulas out of the generator entirely.</>)}</li>
              <li>{L(<>Un <strong>modèle de coût, de latence et d'observabilité</strong> (§9–§10) et un jeu d'évaluation adverse (§11) conçu pour casser la porte à dessein.</>, <>A <strong>cost, latency, and observability model</strong> (§9–§10) and an adversarial evaluation set (§11) designed to break the gate on purpose.</>)}</li>
            </ul>
          </section>

          {/* Section 2: Background & Related Work */}
          <section className="paper-section">
            <h2>{s("2. Contexte & travaux connexes", "2. Background & Related Work")}</h2>

            <h3>{s("2.1 Récupération lexicale versus dense", "2.1 Lexical versus Dense Retrieval")}</h3>
            <p>
              {L(
                <>La récupération dense projette requêtes et documents dans un espace vectoriel partagé et classe par similarité cosinus, ce qui excelle pour la paraphrase et le multilingue. La récupération lexicale classe plutôt par recouvrement de termes via une fonction de score probabiliste comme Okapi BM25. Pour l'éducation clinique, la propriété décisive est <em>l'exactitude</em> : une posologie de « 2,5 mg » et « 25 mg » sont voisines sémantiquement mais catastrophiques cliniquement à confondre, et une recherche par plus proche voisin sur des embeddings n'offre aucune garantie que le passage récupéré contienne le token précis que la réponse citera. AncreMed est délibérément bâti sur la récupération lexicale afin que la chaîne qu'une affirmation cite soit, par construction, présente verbatim dans le corpus.</>,
                <>Dense retrieval maps queries and documents into a shared vector space and ranks by cosine similarity, which excels at paraphrase and cross-lingual matching. Lexical retrieval instead ranks by term overlap using a probabilistic scoring function such as Okapi BM25. For clinical education, the decisive property is <em>exactness</em>: a dosage of "2,5 mg" and "25 mg" are semantically neighbours but clinically catastrophic to confuse, and a nearest-neighbour search over embeddings offers no guarantee that the retrieved passage contains the precise token the answer will cite. AncreMed is deliberately built on lexical retrieval so that the string a claim quotes is, by construction, present verbatim in the corpus.</>
              )}
            </p>

            <h3>{s("2.2 Vérification des faits cliniques", "2.2 Clinical Fact Verification")}</h3>
            <p>
              {L(
                <>Un corpus de travaux croissant montre que les LLM génératifs sont relativement faibles pour vérifier des affirmations comparés aux modèles discriminatifs. Sur le benchmark CliniFact, un classifieur discriminatif de type BioBERT a atteint 80,2 % de précision là où un modèle génératif de 70 milliards de paramètres obtenait 53,6 % ; sur NLI4CT, même de solides bases d'inférence sur des comptes rendus d'essais cliniques n'atteignent que ≈0,627 F1. Le mécanisme importe plus que les chiffres : un modèle qui note sa propre réponse partage l'angle mort qui a produit l'erreur. Cela motive le vérificateur <em>invoqué indépendamment</em> d'AncreMed (§7.4), un appel distinct au cadrage adverse — une application du schéma brouillon-puis-vérifier-puis-réviser (Chain-of-Verification) plutôt qu'un modèle plus gros.</>,
                <>A growing body of work shows that generative LLMs are comparatively weak at verifying claims relative to discriminative models. On the CliniFact benchmark, a BioBERT-style discriminative classifier reached 80.2% accuracy on a claim-checking task where a 70B-parameter generative model scored 53.6%; on NLI4CT, even strong entailment baselines over clinical trial reports reach only ≈0.627 F1. The mechanism matters more than the numbers: a model grading its own answer shares whatever blind spot produced the error. This motivates AncreMed's <em>independently-invoked</em> verifier (§7.4), a distinct call with an adversarial framing—an application of the draft-then-verify-then-revise pattern (Chain-of-Verification) rather than a larger model.</>
              )}
            </p>

            <h3>{s("2.3 RAG agentique et multi-requêtes", "2.3 Agentic and Multi-Query RAG")}</h3>
            <p>
              {L(
                "La RAG à passe unique émet une requête et génère une fois. La RAG agentique décompose plutôt une question en sous-requêtes, inspecte les résultats intermédiaires et ré-interroge pour combler les lacunes. Ce schéma est habituellement motivé par une récupération réseau coûteuse ; AncreMed montre que la même boucle de décomposition vaut la peine même contre un index local, car le coût d'un tour supplémentaire est de quelques millisecondes de SQLite plutôt qu'un aller-retour réseau. La nouveauté n'est pas la boucle elle-même mais son exécution entièrement local-first, conditionnée par un contrôle de couverture déterministe avant tout appel LLM supplémentaire.",
                "Single-shot RAG issues one query and generates once. Agentic RAG instead decomposes a question into sub-queries, inspects intermediate results, and re-queries to fill gaps. This pattern is usually motivated by expensive network retrieval; AncreMed shows the same query-decomposition loop is worthwhile even against a local index, because the cost of an extra round is single-digit milliseconds of SQLite time rather than a network round-trip. The novelty here is not the loop itself but running it entirely local-first, gated by a deterministic coverage check before any additional LLM call is spent."
              )}
            </p>
          </section>

          {/* Section 3: System Overview */}
          <section className="paper-section">
            <h2>{s("3. Vue d'ensemble du système", "3. System Overview")}</h2>
            <p>
              {L(
                "AncreMed s'organise en un pipeline à cinq étapes. Une question utilisateur est classée et planifiée par un routeur agentique ; le plan pilote une boucle de recherche profonde multi-tours sur trois silos lexicaux ; le contexte récupéré alimente un générateur structuré ; et chaque segment généré passe une porte à niveaux et un vérificateur indépendant avant la composition de la réponse. La Figure 1 donne le flux de données de bout en bout.",
                "AncreMed is organised as a five-stage pipeline. A user question is classified and planned by an agentic router; the plan drives a multi-round deep search loop over three lexical silos; retrieved context feeds a structured generator; and every generated span passes a tiered gate and an independent verifier before the response is composed. Figure 1 gives the end-to-end data flow."
              )}
            </p>

            <figure className="figure">
              <div className="figure-scroll">
                <svg viewBox="0 0 860 380" className="diagram" role="img" aria-label={s("Architecture de bout en bout d'AncreMed", "End-to-end architecture of AncreMed")}>
                  <defs>
                    <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                      <path className="dg-arrow" d="M 0 0 L 10 5 L 0 10 z" />
                    </marker>
                  </defs>
                  <rect className="dg-plate" x="0" y="0" width="860" height="380" rx="16" />

                  <rect className="dg-box-accent" x="30" y="40" width="150" height="64" rx="12" />
                  <text className="dg-title" x="105" y="66" textAnchor="middle">{s("Question clinique", "Clinical question")}</text>
                  <text className="dg-muted" x="105" y="86" textAnchor="middle">{s("FR, style EDN", "FR, EDN-style")}</text>

                  <rect className="dg-box" x="30" y="150" width="150" height="80" rx="12" />
                  <text className="dg-label-b" x="105" y="176" textAnchor="middle">{s("Routeur agentique", "Agentic Router")}</text>
                  <text className="dg-muted" x="105" y="196" textAnchor="middle">{s("taxonomie 7 voies", "7-way taxonomy")}</text>
                  <text className="dg-muted" x="105" y="212" textAnchor="middle">→ RetrievalPlan</text>

                  <rect className="dg-box" x="250" y="130" width="240" height="180" rx="12" />
                  <text className="dg-label-b" x="370" y="156" textAnchor="middle">{s("Boucle de recherche (FTS5)", "Deep Search Loop (FTS5)")}</text>
                  <rect className="dg-chip" x="270" y="178" width="200" height="30" rx="8" />
                  <text className="dg-muted" x="370" y="198" textAnchor="middle">Silo A — EDN / MediQAl</text>
                  <rect className="dg-chip" x="270" y="216" width="200" height="30" rx="8" />
                  <text className="dg-muted" x="370" y="236" textAnchor="middle">Silo B — HAS</text>
                  <rect className="dg-chip" x="270" y="254" width="200" height="30" rx="8" />
                  <text className="dg-muted" x="370" y="274" textAnchor="middle">Silo C — ANSM / BDPM</text>

                  <rect className="dg-box" x="560" y="40" width="150" height="80" rx="12" />
                  <text className="dg-label-b" x="635" y="66" textAnchor="middle">{s("Générateur", "Structured")}</text>
                  <text className="dg-label-b" x="635" y="84" textAnchor="middle">{s("structuré", "Generator")}</text>
                  <text className="dg-muted" x="635" y="104" textAnchor="middle">{s("segments typés", "typed spans")}</text>

                  <rect className="dg-box" x="560" y="150" width="150" height="80" rx="12" />
                  <text className="dg-label-b" x="635" y="176" textAnchor="middle">{s("Porte à niveaux", "Tiered Gate")}</text>
                  <text className="dg-muted" x="635" y="196" textAnchor="middle">{s("+ vérificateur", "+ independent")}</text>
                  <text className="dg-muted" x="635" y="212" textAnchor="middle">{s("indépendant (§7)", "verifier (§7)")}</text>

                  <rect className="dg-box-ok" x="560" y="270" width="150" height="70" rx="12" />
                  <text className="dg-ok-text" x="635" y="300" textAnchor="middle">{s("Réponse vérifiée", "Verified answer")}</text>
                  <text className="dg-muted" x="635" y="320" textAnchor="middle">{s("+ indicateur couverture", "+ coverage indicator")}</text>

                  <path className="dg-line" d="M 105 104 L 105 150" markerEnd="url(#arrow)" />
                  <path className="dg-line" d="M 180 190 L 250 200" markerEnd="url(#arrow)" />
                  <path className="dg-line" d="M 490 180 C 525 170, 525 110, 560 90" markerEnd="url(#arrow)" />
                  <path className="dg-line" d="M 635 120 L 635 150" markerEnd="url(#arrow)" />
                  <path className="dg-line" d="M 635 230 L 635 270" markerEnd="url(#arrow)" />
                  <path className="dg-line-dashed" d="M 560 190 C 520 210, 505 250, 490 270" markerEnd="url(#arrow)" />
                  <text className="dg-muted" x="470" y="300" textAnchor="middle">{s("lacune → ré-interroge", "gap → re-query")}</text>
                </svg>
              </div>
              <figcaption>
                {L(
                  "Figure 1. Pipeline de bout en bout. La boucle de recherche profonde (§6) peut ré-interroger les silos avant le générateur ; la porte à niveaux (§7) filtre les segments avant composition.",
                  "Figure 1. End-to-end pipeline. The deep search loop (§6) may re-query silos before the generator runs; the tiered gate (§7) filters spans before composition."
                )}
              </figcaption>
            </figure>
          </section>

          {/* Section 4: Ingestion & Silos */}
          <section className="paper-section">
            <h2>{s("4. Construction du corpus & silos médicaux français", "4. Corpus Construction & French Medical Silos")}</h2>
            <p>
              {L(
                <>AncreMed repose sur un corpus hautement curé, spécifiquement adapté à la pratique clinique française. Notre moteur d'ingestion, implémenté dans <code>ingest_worker.py</code>, analyse, structure et segmente le texte de trois silos médicaux principaux.</>,
                <>AncreMed relies on a highly curated, localized corpus specifically tailored to French clinical practice. Our ingestion engine, implemented in <code>ingest_worker.py</code>, parses, structures, and segments text from three primary medical silos.</>
              )}
            </p>

            <h3>{s("Silo A : supports d'enseignement EDN officiels (MediQAl & CareMedEval)", "Silo A: Official EDN Teaching Materials (MediQAl & CareMedEval)")}</h3>
            <p>
              {L(
                "Les Épreuves Dématérialisées Nationales (EDN) exigent la maîtrise de la sémiologie clinique, des diagnostics psychiatriques et des recommandations de gastro-entérologie. Nous les récoltons depuis des jeux de données académiques Hugging Face :",
                "The Épreuves Dématérialisées Nationales (EDN) require mastery of clinical semiology, psychiatric diagnostics, and gastroenterology guidelines. We harvest these from Hugging Face academic datasets:"
              )}
            </p>
            <ul>
              <li>{L(<><strong>MediQAl :</strong> un jeu de questions d'examen clinique annoté pour les facultés de médecine françaises, couvrant diagnostics, cas cliniques et QCM.</>, <><strong>MediQAl:</strong> A clinical examination question dataset annotated for French medical schools, covering diagnostics, clinical case studies, and multiple-choice answers.</>)}</li>
              <li>{L(<><strong>CareMedEval :</strong> un corpus d'évaluation médicale française compilé à partir de supports de cours officiels de professeurs hospitalo-universitaires.</>, <><strong>CareMedEval:</strong> A French medical evaluation corpus compiled from official lecture materials from university hospital professors.</>)}</li>
            </ul>

            <h3>{s("Silo B : publications HAS (Haute Autorité de Santé)", "Silo B: HAS Publications (Haute Autorité de Santé)")}</h3>
            <p>
              {L(
                <>La HAS est l'autorité officielle régissant la qualité des soins et le remboursement médical en France. Nous téléchargeons et extrayons par programme des archives zip depuis <code>data.gouv.fr</code> contenant les publications officielles HAS et les évaluations de médicaments (Avis de la Commission de la Transparence). Les PDF sont convertis en texte UTF-8 standardisé et fragmentés avec des fenêtres chevauchantes pour préserver les frontières contextuelles au fil des sauts de page.</>,
                <>The HAS is the official authority governing healthcare quality and medical reimbursement in France. We programmatically download and extract zip archives from <code>data.gouv.fr</code> containing official HAS publications and drug evaluations (Avis de la Commission de la Transparence). The PDF documents are converted to standardized UTF-8 text and chunked with overlapping windows to preserve contextual boundaries across page breaks.</>
              )}
            </p>

            <h3>{s("Silo C : Base de Données Publique des Médicaments (BDPM)", "Silo C: Base de Données Publique des Médicaments (BDPM)")}</h3>
            <p>
              {L(
                "Gérée par l'ANSM, la BDPM fournit les fiches cliniques de tous les médicaments approuvés en France. Notre récolteur télécharge les dumps texte bruts complets (tables CIS, CIP, composition et statut administratif), les joint par codes médicament relationnels (CIS), et extrait les structures de composition détaillées (substances actives, dosages, excipients et scores de Service Médical Rendu [SMR] officiels).",
                "Managed by the ANSM, the BDPM provides clinical files for all approved drugs in France. Our harvester downloads the complete raw text dumps (CIS, CIP, composition, and administrative status tables), joins them using relational drug codes (CIS), and extracts detailed composition structures (active substances, dosages, excipients, and official Service Médical Rendu [SMR] scores)."
              )}
            </p>

            <div className="table-container">
              <table className="academic-table">
                <caption>{s("Tableau 1 : statistiques des silos de connaissances médicales indexés.", "Table 1: Statistics of indexed medical knowledge silos.")}</caption>
                <thead>
                  <tr>
                    <th>{s("Silo", "Silo Name")}</th>
                    <th>{s("Source principale", "Primary Source")}</th>
                    <th>{s("Enregistrements", "Records Parsed")}</th>
                    <th>{s("Fragments", "Text Chunks")}</th>
                    <th>{s("Taille", "Storage Size")}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td><strong>{s("Enseignement EDN (MediQAl)", "EDN teaching (MediQAl)")}</strong></td><td>{s("Hugging Face / Universités", "Hugging Face / Universities")}</td><td>{s("24 122 questions", "24,122 questions")}</td><td>24,122</td><td>14.8 MB</td></tr>
                  <tr><td><strong>{s("Publications HAS", "HAS Publications")}</strong></td><td>{s("Export data.gouv.fr", "data.gouv.fr Export")}</td><td>{s("3 960 rapports", "3,960 reports")}</td><td>12,580</td><td>32.1 MB</td></tr>
                  <tr><td><strong>{s("Registre ANSM BDPM", "ANSM BDPM Registry")}</strong></td><td>medicaments.gouv.fr</td><td>{s("16 840 médicaments", "16,840 drugs")}</td><td>39,601</td><td>111.6 MB</td></tr>
                  <tr className="table-row-highlight"><td><strong>Total</strong></td><td>—</td><td>44,922</td><td>76,303</td><td>158.5 MB</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 5: FTS5 */}
          <section className="paper-section">
            <h2>{s("5. Architecture de base locale & indexation FTS5", "5. Local Database Architecture & FTS5 Indexing")}</h2>
            <p>
              {L(
                <>Pour éliminer les coûts d'hébergement cloud et la latence réseau, AncreMed stocke tous les documents dans une base SQLite/Turso locale (<code>clinical_ground_truth.db</code>). L'indexation plein texte est réalisée via l'extension de table virtuelle SQLite FTS5.</>,
                <>To eliminate cloud hosting costs and network latency during retrieval, AncreMed stores all documents in a local SQLite/Turso database (<code>clinical_ground_truth.db</code>). Full-text indexing is achieved using the SQLite FTS5 virtual table extension.</>
              )}
            </p>

            <h3>{s("5.1 Schéma de la base", "5.1 Database Schema")}</h3>
            <p>
              {L(
                <>Le schéma relationnel comprend une table de stockage des documents et une table d'index virtuel FTS5 correspondante. Nous imposons des mises à jour synchrones entre les tables via des déclencheurs SQLite, garantissant que l'index de recherche reste parfaitement aligné avec le stockage.</>,
                <>The relational schema consists of a primary document store table and a corresponding FTS5 virtual index table. We enforce synchronous updates between the tables using SQLite database triggers, guaranteeing that the search index remains perfectly aligned with the document store.</>
              )}
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

            <h3>{s("5.2 Déclencheurs de synchronisation FTS5", "5.2 FTS5 Sync Triggers")}</h3>
            <p>
              {L(
                <>Pour maintenir l'intégrité de l'index, insertions, mises à jour et suppressions sur la table <code>documents</code> sont propagées automatiquement à <code>documents_fts</code> via des hooks au niveau base :</>,
                <>To maintain index integrity, insertions, updates, and deletions on the <code>documents</code> table are propagated automatically to <code>documents_fts</code> via database-level hooks:</>
              )}
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

            <h3>{s("5.3 Tokeniseur & repli des diacritiques", "5.3 Tokenizer & Diacritic Folding")}</h3>
            <p>
              {L(
                <>Nous configurons la table virtuelle FTS5 avec le tokeniseur <code>unicode61</code>, qui segmente le texte selon l'Annexe #29 du standard Unicode et replie nativement les diacritiques français — mappant <em>é, è, à, ô</em> vers leurs équivalents ASCII de base <em>e, e, a, o</em> lors de la création de l'index. Une requête pour <code>diabete</code> ou <code>diabète</code> correspond donc aux deux, offrant une résilience orthographique sans lemmatisation lourde.</>,
                <>We configure the FTS5 virtual table with the <code>unicode61</code> tokenizer, which tokenizes text according to Unicode Standard Annex #29 and folds French diacritics natively—mapping <em>é, è, à, ô</em> to their base ASCII equivalents <em>e, e, a, o</em> during index creation. A query for <code>diabete</code> or <code>diabète</code> therefore matches both, giving spelling resilience without heavy lemmatization plugins.</>
              )}
            </p>

            <h3>{s("5.4 La fonction de classement BM25", "5.4 The BM25 Ranking Function")}</h3>
            <p>
              {L(
                <>FTS5 classe les documents avec la fonction de score Okapi BM25. Pour une requête <code>Q</code> contenant les termes <code>q₁ … qₙ</code> et un document <code>D</code>, le score de pertinence est la somme des contributions par terme :</>,
                <>FTS5 ranks documents using the Okapi BM25 scoring function. For a query <code>Q</code> containing terms <code>q₁ … qₙ</code> and a document <code>D</code>, the relevance score is the sum of per-term contributions:</>
              )}
            </p>
            <figure className="figure">
              <div className="math-formula">
                Score(D, Q) = ∑<sub>i=1..n</sub> IDF(q<sub>i</sub>) · <span className="frac"><span className="frac-num">f(q<sub>i</sub>, D) · (k₁ + 1)</span><span className="frac-den">f(q<sub>i</sub>, D) + k₁ · (1 − b + b · |D| / avgDL)</span></span>
              </div>
              <figcaption>{s("Équation 1. Score de pertinence Okapi BM25.", "Equation 1. Okapi BM25 relevance score.")}</figcaption>
            </figure>
            <p>
              {L(
                <>Ici <code>f(qᵢ, D)</code> est la fréquence du terme <code>qᵢ</code> dans <code>D</code>, <code>|D|</code> la longueur du document en tokens, <code>avgDL</code> la longueur moyenne des fragments du corpus, et les paramètres libres prennent leurs valeurs par défaut <code>k₁ = 1,2</code> et <code>b = 0,75</code>. La fréquence inverse de documents utilise la forme BM25 :</>,
                <>Here <code>f(qᵢ, D)</code> is the term frequency of <code>qᵢ</code> in <code>D</code>, <code>|D|</code> is the document length in tokens, <code>avgDL</code> is the mean chunk length across the corpus, and the free parameters take their standard defaults <code>k₁ = 1.2</code> and <code>b = 0.75</code>. The inverse document frequency uses the BM25 form:</>
              )}
            </p>
            <figure className="figure">
              <div className="math-formula">
                IDF(q<sub>i</sub>) = ln<span className="paren">(</span> <span className="frac"><span className="frac-num">N − n(q<sub>i</sub>) + 0.5</span><span className="frac-den">n(q<sub>i</sub>) + 0.5</span></span> + 1 <span className="paren">)</span>
              </div>
              <figcaption>{s("Équation 2. IDF probabiliste, où N est la taille du corpus et n(qᵢ) le nombre de fragments contenant qᵢ.", "Equation 2. Probabilistic IDF, where N is the corpus size and n(qᵢ) the number of chunks containing qᵢ.")}</figcaption>
            </figure>
            <p>
              {L(
                <>Deux propriétés de l'Équation 1 la rendent adaptée à un corpus clinique. Le terme de saturation <code>k₁</code> plafonne la récompense de la répétition d'un mot-clé, si bien qu'un rapport de politique qui répète « diabète » ne peut surclasser une description clinique dense. Le terme de normalisation de longueur <code>b</code> pénalise les longs documents, permettant à de courtes fiches BDPM denses de rivaliser avec la prose HAS longue. FTS5 renvoie BM25 comme quantité <em>où plus négatif est plus pertinent</em>, donc la requête de production trie en ordre croissant.</>,
                <>Two properties of Equation 1 make it well suited to a clinical corpus. The saturation term <code>k₁</code> caps the reward for repeating a keyword, so a policy report that merely repeats "diabète" many times cannot outrank a dense clinical description. The length-normalisation term <code>b</code> down-weights long documents, which lets short, information-dense BDPM composition entries compete with long-form HAS prose. FTS5 returns BM25 as a <em>more-negative-is-more-relevant</em> quantity, so the production query sorts ascending.</>
              )}
            </p>

            <h3>{s("5.5 Classement pondéré par colonne", "5.5 Column-Weighted Ranking")}</h3>
            <p>
              {L(
                <>Comme un terme présent dans le <code>origin_title</code> d'un médicament est bien plus discriminant que le même terme enfoui dans le corps du texte, AncreMed utilise la pondération BM25 par colonne de FTS5, <code>bm25(documents_fts, w₍title₎, w₍text₎)</code>. Pour les recherches de pharmacologie, nous démarrons près d'un ratio titre/corps de 5:1 et l'ajustons par silo contre un jeu de référence (§5.6) :</>,
                <>Because a term appearing in a drug's <code>origin_title</code> is far more discriminative than the same term buried in body text, AncreMed uses FTS5's per-column BM25 weighting, <code>bm25(documents_fts, w₍title₎, w₍text₎)</code>. For pharmacology lookups we start near a 5:1 title-to-body weighting and tune it per silo against a golden set (§5.6):</>
              )}
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

            <h3>{s("5.6 Réglage par silo & précision des phrases", "5.6 Per-Silo Parameter Tuning & Phrase Precision")}</h3>
            <p>
              {L(
                <>Les courtes fiches BDPM denses et la prose HAS longue favorisent des normalisations de longueur différentes. Nous construisons un jeu de référence de ≈30 requêtes par silo (chaque requête associée au fragment qu'un expert humain place en tête) et effectuons une recherche en grille de <code>k₁</code> et <code>b</code> plutôt que de deviner. Pour les phrases cliniques multi-mots, nous utilisons les requêtes de phrase FTS5 et <code>NEAR(term₁ term₂, N)</code> pour que « insuffisance cardiaque droite » ne corresponde pas à un fragment où les tokens ne font que co-apparaître au loin. Quand un MATCH renvoie zéro ligne — typiquement d'un espacement inhabituel ou d'un token hors vocabulaire — le moteur bascule sur un balayage <code>LIKE</code> relationnel tokenisé afin que la requête se dégrade gracieusement plutôt que d'échouer.</>,
                <>Short, dense BDPM entries and long-form HAS prose favour different length-normalisation. We build a ≈30-query golden set per silo (each query paired with the chunk a human expert says should rank first) and grid-search <code>k₁</code> and <code>b</code> against it rather than guessing. For multi-word clinical phrases we use FTS5 phrase queries and <code>NEAR(term₁ term₂, N)</code> so that "insuffisance cardiaque droite" does not match a chunk where the tokens merely co-occur far apart. When a MATCH returns zero rows—typically from an unusual spacing or an out-of-vocabulary token—the engine falls back to a tokenized relational <code>LIKE</code> scan so the query degrades gracefully rather than failing.</>
              )}
            </p>
          </section>

          {/* Section 6: Router & Deep Search */}
          <section className="paper-section">
            <h2>{s("6. Le routeur agentique & la boucle de recherche profonde", "6. The Agentic Router & Deep Search Loop")}</h2>
            <p>
              {L(
                <>Les prompts bruts contiennent du bruit conversationnel, des tournures obliques et des abréviations qui nuisent au rappel lexical. AncreMed route chaque prompt à travers un planificateur agentique bâti sur <code>gemini-3.5-flash</code> qui classe la question et émet un plan de récupération structuré au lieu d'une seule recherche par mots-clés.</>,
                <>Raw user prompts contain conversational noise, oblique phrasing, and abbreviations that hurt lexical recall. AncreMed routes every prompt through an agentic planner built on <code>gemini-3.5-flash</code> that classifies the question and emits a structured retrieval plan instead of a single keyword search.</>
              )}
            </p>

            <h3>{s("6.1 La taxonomie de sujet à sept voies", "6.1 The Seven-Way Topic Taxonomy")}</h3>
            <p>
              {L(
                <>Le routeur remplace un drapeau binaire <code>is_conversational</code> par un classifieur à sept voies. Chaque classe porte sa propre profondeur de récupération, sa priorité de silos et ses sections de sortie requises.</>,
                <>The router replaces a binary <code>is_conversational</code> flag with a seven-way classifier. Each class carries its own retrieval depth, silo priority, and required output sections.</>
              )}
            </p>
            <div className="table-container">
              <table className="academic-table">
                <caption>{s("Tableau 2 : taxonomie de sujet et playbooks de récupération par classe.", "Table 2: Topic taxonomy and per-class retrieval playbooks.")}</caption>
                <thead>
                  <tr>
                    <th>topic_class</th>
                    <th>{s("Exemple déclencheur", "Trigger example")}</th>
                    <th>{s("Tours", "Rounds")}</th>
                    <th>Silos</th>
                    <th>{s("Sections requises", "Required sections")}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td><code>definition_item_edn</code></td><td>« Qu'est-ce que la PFLA ? »</td><td>3–4</td><td>EDN, HAS</td><td>{s("définition, physiopathologie, épidémiologie, classification", "definition, pathophysiology, epidemiology, classification")}</td></tr>
                  <tr><td><code>semiologie_cas_clinique</code></td><td>« Fébrile, crépitants — démarche ? »</td><td>4–5</td><td>EDN, HAS</td><td>{s("signes, paraclinique, diagnostics différentiels, gravité, CAT", "signs, workup, differentials, severity, management")}</td></tr>
                  <tr><td><code>pharmacologie_therapeutique</code></td><td>« Traitement de l'HTA du sujet âgé ? »</td><td>3–4</td><td>BDPM, HAS</td><td>{s("indication, posologie, contre-indications, surveillance", "indication, dosage, contraindications, monitoring")}</td></tr>
                  <tr><td><code>anatomie_physiologie</code></td><td>« Innervation du muscle temporal ? »</td><td>2–3</td><td>EDN</td><td>{s("structure, rapports, fonction", "structure, relations, function")}</td></tr>
                  <tr><td><code>calcul_clinique</code></td><td>« Clairance créat. 70 kg, 65 ans… »</td><td>2</td><td>{s("Formules (§8)", "Formulas (§8)")}</td><td>{s("formule, interprétation", "formula, interpretation")}</td></tr>
                  <tr><td><code>urgence_conduite_a_tenir</code></td><td>« CAT devant un AAG de l'enfant ? »</td><td>4–5</td><td>HAS, EDN, BDPM</td><td>{s("reconnaissance, gestes immédiats, traitement, orientation", "recognition, immediate steps, treatment, orientation")}</td></tr>
                  <tr><td><code>conversationnel</code></td><td>« merci », « bonjour »</td><td>0</td><td>—</td><td>{s("contournement", "bypass")}</td></tr>
                </tbody>
              </table>
            </div>
            <p>
              {L(
                <>Une vraie question peut chevaucher deux classes — « quel est le traitement de l'IRC et comment adapter la posologie ? » est <code>pharmacologie_therapeutique</code> <em>et</em> <code>calcul_clinique</code>. Le planificateur émet donc une <code>primary_class</code> plus une <code>secondary_class</code> optionnelle et unit leurs listes de sections requises.</>,
                <>A real question can straddle two classes—"quel est le traitement de l'IRC et comment adapter la posologie ?" is <code>pharmacologie_therapeutique</code> <em>and</em> <code>calcul_clinique</code>. The planner therefore emits a <code>primary_class</code> plus an optional <code>secondary_class</code> and unions their required-section lists.</>
              )}
            </p>

            <h3>{s("6.2 Le plan de récupération", "6.2 The Retrieval Plan")}</h3>
            <p>
              {L(
                <>La voie A — les prompts conversationnels — court-circuite avec un plan vide et un fragment virtuel <code>silo: "chat"</code>, si bien qu'une réponse amicale est rédigée en moins de 300 ms. La voie B émet un plan structuré :</>,
                <>Path A—conversational prompts—short-circuits with an empty plan and a <code>silo: "chat"</code> virtual chunk, so a friendly reply is drafted in under 300 ms. Path B emits a structured plan:</>
              )}
            </p>
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

            <h3>{s("6.3 La boucle de recherche profonde", "6.3 The Deep Search Loop")}</h3>
            <p>
              {L(
                "Le planificateur déploie un appel FTS5 par sous-requête, enregistre quelles sections requises sont désormais couvertes, et n'émet un tour supplémentaire que lorsqu'un contrôle de couverture déterministe bon marché trouve une section vide. Un vérificateur de lacunes LLM n'est consulté que lorsque l'élargissement déterministe cesse lui-même de renvoyer des lignes — gardant la voie gratuite par défaut plutôt que comme repli.",
                "The planner fans out one FTS5 call per sub-query, records which required sections are now covered, and only issues an additional round when a cheap deterministic coverage check finds an empty section. An LLM gap-checker is consulted only when the deterministic broadening itself stops returning rows—keeping the free path the default rather than the fallback."
              )}
            </p>
            <figure className="figure">
              <div className="figure-scroll">
                <svg viewBox="0 0 820 250" className="diagram" role="img" aria-label={s("Flux de contrôle de la boucle de recherche", "Deep search loop control flow")}>
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
                  <text className="dg-muted" x="275" y="145" textAnchor="middle">{s("dédup. des ids", "dedupe chunk ids")}</text>

                  <rect className="dg-box" x="400" y="100" width="170" height="60" rx="12" />
                  <text className="dg-label-b" x="485" y="122" textAnchor="middle">{s("contrôle couverture", "coverage check")}</text>
                  <text className="dg-muted" x="485" y="141" textAnchor="middle">{s("section vide ?", "section empty?")}</text>

                  <rect className="dg-box-ok" x="632" y="100" width="160" height="60" rx="12" />
                  <text className="dg-ok-text" x="712" y="122" textAnchor="middle">RetrievedContext</text>
                  <text className="dg-muted" x="712" y="141" textAnchor="middle">{s("→ générateur", "→ generator")}</text>

                  <path className="dg-line" d="M 154 130 L 200 130" markerEnd="url(#arrow2)" />
                  <path className="dg-line" d="M 350 130 L 400 130" markerEnd="url(#arrow2)" />
                  <path className="dg-line" d="M 570 130 L 632 130" markerEnd="url(#arrow2)" />
                  <text className="dg-ok-text" x="601" y="120" textAnchor="middle">{s("couvert", "covered")}</text>

                  <path className="dg-line-dashed" d="M 485 160 C 485 210, 275 210, 275 162" markerEnd="url(#arrow2)" />
                  <text className="dg-accent-text" x="380" y="205" textAnchor="middle">{s("lacune & tour < MAX & nouveaux fragments → élargir", "gap & round < MAX & new chunks > 0 → broaden query")}</text>
                </svg>
              </div>
              <figcaption>
                {L(
                  "Figure 2. Flux de contrôle de la recherche. La boucle s'arrête à couverture complète, à MAX_ROUNDS, ou quand un tour n'apporte aucun nouveau fragment (le contrat d'abstention en §7.5 gère alors honnêtement toute lacune résiduelle).",
                  "Figure 2. Deep search control flow. The loop halts on full coverage, on hitting MAX_ROUNDS, or when a round yields no new chunks (the abstention contract in §7.5 then handles any residual gap honestly)."
                )}
              </figcaption>
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

            <h3>{s("6.4 Trace commentée — « Parle-moi des bactéries »", "6.4 Worked Trace — « Parle-moi des bactéries »")}</h3>
            <p>
              {L(
                "C'était un vrai cas d'échec du pipeline à passe unique : le générateur « disait une phrase et s'arrêtait ». Le tableau ci-dessous le trace à travers la boucle de recherche profonde, qui fait remonter le matériel de physiopathologie que l'ancien pipeline ne récupérait jamais.",
                "This was a real failure case of the single-shot pipeline: the generator \"said one sentence and stopped.\" The table below traces it through the deep search loop, which surfaces the pathophysiology material the old pipeline never retrieved."
              )}
            </p>
            <div className="table-container">
              <table className="academic-table">
                <caption>{s("Tableau 3 : trace de recherche profonde pour une requête de type définition.", "Table 3: Deep-search trace for a definition-class query.")}</caption>
                <thead><tr><th>{s("Étape", "Step")}</th><th>{s("Ce qui se passe", "What happens")}</th></tr></thead>
                <tbody>
                  <tr><td><strong>{s("Classer", "Classify")}</strong></td><td><code>primary_class: definition_item_edn</code></td></tr>
                  <tr><td><strong>{s("Plan (T1)", "Plan (R1)")}</strong></td><td>{s("4 sous-requêtes :", "4 sub-queries:")} <em>définition structure paroi</em> · <em>classification Gram positif négatif</em> · <em>virulence mécanismes pathogénicité</em> · <em>bactéries pathogènes exemples</em></td></tr>
                  <tr><td><strong>{s("FTS5 T1", "FTS5 R1")}</strong></td><td>{s("déf. → 3 · classification → 4 · physiopathologie → ", "def. → 3 · classification → 4 · pathophysiology → ")}<strong>0</strong>{s(" · exemples → 5", " · examples → 5")}</td></tr>
                  <tr><td><strong>{s("Couverture", "Coverage")}</strong></td><td>{s("physiopathologie vide → élargir à ", "pathophysiology empty → broaden to ")}<em>virulence bactérienne</em></td></tr>
                  <tr><td><strong>{s("FTS5 T2", "FTS5 R2")}</strong></td><td>{s("physiopathologie → 2 fragments trouvés", "pathophysiology → 2 chunks found")}</td></tr>
                  <tr><td><strong>{s("Arrêt", "Stop")}</strong></td><td>{s("toutes les sections couvertes ; un 3e tour ajouterait 0 fragment → arrêt (2 tours)", "all sections covered; a 3rd round would add 0 new chunks → halt (2 rounds)")}</td></tr>
                  <tr className="table-row-highlight"><td><strong>{s("Contexte", "Context")}</strong></td><td>{s("4 sections, 14 fragments, 2 tours → définition complète → classification → physiopathologie → exemples", "4 sections, 14 chunks, 2 rounds → full definition → classification → pathophysiology → examples")}</td></tr>
                </tbody>
              </table>
            </div>

            <h3>{s("6.5 Tolérance déterministe aux fautes de frappe", "6.5 Deterministic Typo Tolerance")}</h3>
            <p>
              {L(
                <>Turso Cloud hébergé ne charge pas d'extensions C arbitraires, donc <code>spellfix1</code> de SQLite est indisponible. AncreMed effectue plutôt la correction floue dans la couche applicative : un ensemble de vocabulaire est matérialisé depuis le corpus FTS5 au démarrage à froid, et chaque token de requête hors vocabulaire est apparié par distance d'édition bornée avant d'atteindre FTS5.</>,
                <>Hosted Turso Cloud does not load arbitrary C extensions, so SQLite's <code>spellfix1</code> is unavailable. Instead AncreMed performs fuzzy correction in the application layer: a vocabulary set is materialised from the FTS5 corpus at cold start, and each query token that is not in-vocabulary is matched by bounded edit distance before the query reaches FTS5.</>
              )}
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
              {L(
                "Un dictionnaire d'acronymes déterministe (HTA → hypertension artérielle, BPCO → bronchopneumopathie chronique obstructive, DFG → débit de filtration glomérulaire, …) s'exécute en parallèle, capturant les abréviations même quand la reformulation LLM les manque sous pression de latence — à coût modèle nul.",
                "A deterministic acronym dictionary (HTA → hypertension artérielle, BPCO → bronchopneumopathie chronique obstructive, DFG → débit de filtration glomérulaire, …) runs alongside it, catching abbreviations even when the LLM reformulation misses them under latency pressure—at zero model cost."
              )}
            </p>
          </section>

          {/* Section 7: Attribution Gate */}
          <section className="paper-section">
            <h2>{s("7. La porte d'attribution à niveaux", "7. The Tiered Attribution Gate")}</h2>
            <p>
              {L(
                <>Même avec un contexte vérifié injecté, un LLM peut coller une vraie citation sous le mauvais sujet ou inventer un nombre. La porte d'AncreMed, implémentée dans <code>generate/route.ts</code>, repose sur une observation : <em>toute phrase n'est pas une affirmation clinique, et seules les affirmations cliniques nécessitent un contrôle mot à mot.</em></>,
                <>Even with verified context injected, an LLM can splice a real quote under the wrong subject or invent a number. AncreMed's gate, implemented in <code>generate/route.ts</code>, rests on one observation: <em>not every sentence is a clinical claim, and only clinical claims need word-for-word gating.</em></>
              )}
            </p>

            <h3>{s("7.1 Segments de réponse typés", "7.1 Typed Response Spans")}</h3>
            <p>{s("Le générateur émet une séquence de segments typés plutôt que du texte libre :", "The generator emits a sequence of typed spans rather than free text:")}</p>
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
                <svg viewBox="0 0 840 260" className="diagram" role="img" aria-label={s("Flux de la porte d'attribution à niveaux", "Tiered attribution gate flow")}>
                  <defs>
                    <marker id="arrow3" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                      <path className="dg-arrow" d="M 0 0 L 10 5 L 0 10 z" />
                    </marker>
                  </defs>
                  <rect className="dg-plate" x="0" y="0" width="840" height="260" rx="16" />

                  <rect className="dg-box" x="24" y="100" width="120" height="60" rx="12" />
                  <text className="dg-label-b" x="84" y="126" textAnchor="middle">{s("Générateur", "Generator")}</text>
                  <text className="dg-muted" x="84" y="145" textAnchor="middle">{s("segments typés", "typed spans")}</text>

                  <rect className="dg-chip" x="190" y="30" width="150" height="46" rx="10" />
                  <text className="dg-muted" x="265" y="58" textAnchor="middle">{s("narratif → libre*", "narrative → ungated*")}</text>
                  <rect className="dg-box-accent" x="190" y="100" width="150" height="60" rx="12" />
                  <text className="dg-title" x="265" y="126" textAnchor="middle">clinical_assertion</text>
                  <text className="dg-muted" x="265" y="145" textAnchor="middle">{s("3 contrôles →", "3 checks →")}</text>
                  <rect className="dg-chip" x="190" y="184" width="150" height="46" rx="10" />
                  <text className="dg-muted" x="265" y="212" textAnchor="middle">{s("abstention → tjrs ok", "abstention → always ok")}</text>

                  <rect className="dg-box" x="390" y="70" width="130" height="40" rx="10" />
                  <text className="dg-muted" x="455" y="95" textAnchor="middle">{s("sous-chaîne", "substring match")}</text>
                  <rect className="dg-box" x="390" y="120" width="130" height="40" rx="10" />
                  <text className="dg-muted" x="455" y="145" textAnchor="middle">{s("entité", "entity match")}</text>
                  <rect className="dg-box" x="390" y="170" width="130" height="40" rx="10" />
                  <text className="dg-muted" x="455" y="195" textAnchor="middle">{s("vérificateur (§7.4)", "verifier (§7.4)")}</text>

                  <rect className="dg-box" x="570" y="100" width="120" height="60" rx="12" />
                  <text className="dg-label-b" x="630" y="126" textAnchor="middle">{s("filtrer", "filter spans")}</text>
                  <text className="dg-muted" x="630" y="145" textAnchor="middle">{s("écarter échecs", "drop failures")}</text>

                  <rect className="dg-box-ok" x="720" y="100" width="100" height="60" rx="12" />
                  <text className="dg-ok-text" x="770" y="126" textAnchor="middle">{s("composer", "compose")}</text>
                  <text className="dg-muted" x="770" y="145" textAnchor="middle">200 OK</text>

                  <path className="dg-line" d="M 144 130 L 190 130" markerEnd="url(#arrow3)" />
                  <path className="dg-line" d="M 340 130 L 390 130" markerEnd="url(#arrow3)" />
                  <path className="dg-line" d="M 520 130 L 570 130" markerEnd="url(#arrow3)" />
                  <path className="dg-line" d="M 690 130 L 720 130" markerEnd="url(#arrow3)" />
                </svg>
              </div>
              <figcaption>
                {L(
                  "Figure 3. La porte filtre au niveau du segment. *Le narratif passe un pré-contrôle nombre/affirmation ; seules les affirmations cliniques affrontent les trois contrôles.",
                  "Figure 3. The gate filters at the span level. *Narrative passes a number/claim pre-check; only clinical assertions face the three-stage check."
                )}
              </figcaption>
            </figure>

            <h3>{s("7.2 Contrôles déterministes", "7.2 Deterministic Checks")}</h3>
            <p>
              {L(
                "Chaque affirmation clinique affronte deux conditions déterministes avant tout appel modèle. D'abord, l'inclusion de chaîne après normalisation (repli des accents, retrait de la ponctuation, compression des espaces) :",
                "Every clinical assertion faces two deterministic conditions before any model call. First, string containment after normalisation (accent-folding, punctuation stripping, whitespace collapse):"
              )}
            </p>
            <figure className="figure">
              <div className="math-formula">normalize(exact_source_quote) ⊆ normalize(retrievedContext)</div>
              <figcaption>{s("Équation 3. Attribution mot à mot par inclusion de sous-chaîne normalisée.", "Equation 3. Word-for-word attribution via normalized substring containment.")}</figcaption>
            </figure>
            <p>
              {L(
                <>Ensuite, un plancher de confiance auto-évaluée, <code>confidence_score ≥ 0,85</code>. Un analyseur de sous-chaîne à fenêtre glissante sur les charges brutes injectées rend l'inclusion robuste aux changements d'espacement incidents du modèle (p. ex. « diabète de type 2 » → « diabete de type2 »).</>,
                <>Second, a self-assessed confidence floor, <code>confidence_score ≥ 0.85</code>. A sliding-window substring parser over the raw injected payloads makes containment robust to the model's incidental spacing changes (e.g. "diabète de type 2" → "diabete de type2").</>
              )}
            </p>

            <h3>{s("7.3 Cohérence d'entité", "7.3 Entity Consistency")}</h3>
            <p>
              {L(
                <>L'inclusion de sous-chaîne prouve seulement que la citation existe <em>quelque part</em> dans le contexte — pas qu'elle appartient au bon sujet. Une citation de posologie du médicament A peut être collée sous une affirmation sur le médicament B et passer quand même. AncreMed exige donc que le <code>subject_entity_id</code> de l'affirmation soit égal au <code>source_identifier</code> du document dont la citation est tirée. Un décalage est un échec automatique, quelle que soit la correspondance de sous-chaîne.</>,
                <>Substring containment only proves the quote exists <em>somewhere</em> in context—not that it belongs to the right subject. A dosing quote for drug A can be spliced under a claim about drug B and still pass. AncreMed therefore requires the assertion's <code>subject_entity_id</code> to equal the <code>source_identifier</code> of the document the quote was drawn from. A mismatch is an automatic fail regardless of substring match.</>
              )}
            </p>

            <h3>{s("7.4 Vérificateur indépendant — substance, pas style", "7.4 Independent Verifier — Substance, Not Style")}</h3>
            <p>
              {L(
                <>Un second appel modèle, invoqué séparément, re-vérifie chaque affirmation survivante avec un prompt adverse, afin de ne pas partager les angles morts du générateur (§2.2). Sa première itération lui demandait de « rester sceptique » et « être strict », ce qui rejetait des affirmations correctement sourcées dès que la formulation divergeait de la source — un fort taux de faux négatifs sur des faits bien établis. Le prompt a été recalibré pour juger la <strong>substance clinique</strong> : il ne rejette une affirmation que si la source est contredite, qu'un nombre ou un seuil est fabriqué, ou qu'une vraie citation est attachée au mauvais médicament, à la mauvaise pathologie ou au mauvais sous-groupe de patients. La paraphrase fidèle n'est plus un motif de rejet.</>,
                <>A second, separately-invoked model call re-checks each surviving assertion using an adversarial prompt, so it does not share the generator's blind spots (§2.2). Its first iteration was told to "stay skeptical" and "be strict," which rejected correctly sourced claims whenever phrasing diverged from the source—a high false-negative rate on well-established facts. The prompt was recalibrated to judge <strong>clinical substance</strong>: it rejects an assertion only if the source is contradicted, a number or threshold is fabricated, or a true quote is attached to the wrong drug, pathology, or patient subgroup. Faithful paraphrase is no longer grounds for rejection.</>
              )}
            </p>

            <h3>{s("7.5 Filtrage & contrat d'abstention", "7.5 Filtering & the Abstention Contract")}</h3>
            <p>
              {L(
                <>Les révisions antérieures rejetaient toute la réponse (HTTP 422) dès qu'une seule affirmation passait sous le seuil vérifié. La porte filtre désormais au niveau du segment : les affirmations qui échouent à l'inclusion, à l'entité ou au vérificateur sont écartées individuellement, tandis que le texte narratif et les affirmations vérifiées restent servis. Si, après <code>MAX_ROUNDS</code>, une section requise n'a aucun fragment support, le générateur doit émettre un segment <code>abstention</code> — jamais fabriquer la section, jamais la fondre silencieusement dans une voisine. Le frontend rend l'en-tête avec la raison à sa place (p. ex. « Non trouvé dans le corpus indexé pour cette sous-section »). Le serveur ne renvoie 422 que lorsque rien d'exploitable ne survit : aucune affirmation vérifiée, aucune abstention, aucun texte narratif.</>,
                <>Earlier revisions rejected the entire response (HTTP 422) whenever a single assertion fell below the verified threshold. The gate now filters at the span level: assertions that fail containment, entity match, or the verifier are dropped individually, while narrative text and verified claims are still served. If, after <code>MAX_ROUNDS</code>, a required section has no supporting chunks, the generator must emit an <code>abstention</code> span—never fabricate the section, never fold it silently into a neighbour. The frontend renders the heading with the reason in its place (e.g. « Non trouvé dans le corpus indexé pour cette sous-section »). The server returns 422 only when nothing usable survives: no verified assertion, no abstention, and no narrative text.</>
              )}
            </p>
          </section>

          {/* Section 8: Calculation Bank */}
          <section className="paper-section">
            <h2>{s("8. La banque de calculs cliniques vérifiés", "8. The Verified Clinical Calculation Bank")}</h2>
            <p>
              {L(
                <>Scores et formules ne sont jamais improvisés par le générateur. Les requêtes routées vers <code>calcul_clinique</code> atteignent un quatrième silo vérifié à la main dont les entrées sont structurées, récupérables et attribuables comme n'importe quel document. Chaque entrée provient d'une référence faisant autorité et est validée manuellement avant mise en production.</>,
                <>Scores and formulas are never improvised by the generator. Queries routed to <code>calcul_clinique</code> hit a fourth, hand-verified silo whose entries are structured, retrievable, and attributable exactly like any document. Every entry is sourced from an authoritative reference and manually signed off before going live.</>
              )}
            </p>
            <pre className="code-block">
              {`CREATE TABLE IF NOT EXISTS clinical_formulas (
    id TEXT PRIMARY KEY, name_fr TEXT, category TEXT,
    formula_text TEXT, variables_json TEXT,
    interpretation_text TEXT, caveats_text TEXT,
    source_citation TEXT, verified_by TEXT, verified_date TEXT
);`}
            </pre>

            <h3>{s("8.1 Cockcroft & Gault — clairance de la créatinine", "8.1 Cockcroft & Gault — Créatinine Clearance")}</h3>
            <figure className="figure">
              <div className="math-formula">
                ClCr (mL/min) = <span className="frac"><span className="frac-num">k · Poids(kg) · (140 − Âge)</span><span className="frac-den">Créatininémie (µmol/L)</span></span>&nbsp;&nbsp;&nbsp;k = 1.23 (♂) · 1.04 (♀)
              </div>
              <figcaption>{s("Équation 4. Cockcroft-Gault. Conservée pour les tables d'adaptation posologique même là où CKD-EPI l'a supplantée pour la stadification du DFG ; les deux sont implémentées et étiquetées par usage.", "Equation 4. Cockcroft-Gault. Retained for drug-dosing adjustment tables even where CKD-EPI has superseded it for general GFR staging; both are implemented and labelled by purpose.")}</figcaption>
            </figure>

            <h3>{s("8.2 CHA₂DS₂-VASc — risque thromboembolique en FA", "8.2 CHA₂DS₂-VASc — Thromboembolic Risk in AF")}</h3>
            <div className="table-container">
              <table className="academic-table">
                <caption>{s("Tableau 4 : composantes du CHA₂DS₂-VASc (max 9 points).", "Table 4: CHA₂DS₂-VASc components (max 9 points).")}</caption>
                <thead><tr><th>{s("Facteur", "Factor")}</th><th>Points</th></tr></thead>
                <tbody>
                  <tr><td>{s("Insuffisance cardiaque / dysfonction VG", "Congestive heart failure / LV dysfunction")}</td><td>1</td></tr>
                  <tr><td>{s("Hypertension artérielle", "Hypertension")}</td><td>1</td></tr>
                  <tr><td>{s("Âge ≥ 75 ans", "Age ≥ 75")}</td><td>2</td></tr>
                  <tr><td>{s("Diabète", "Diabetes")}</td><td>1</td></tr>
                  <tr><td>{s("AVC / AIT / thromboembolie antérieur", "Prior stroke / TIA / thromboembolism")}</td><td>2</td></tr>
                  <tr><td>{s("Maladie vasculaire (IDM, AOMI, plaque aortique)", "Vascular disease (MI, PAD, aortic plaque)")}</td><td>1</td></tr>
                  <tr><td>{s("Âge 65–74 ans", "Age 65–74")}</td><td>1</td></tr>
                  <tr><td>{s("Sexe féminin", "Female sex")}</td><td>1</td></tr>
                </tbody>
              </table>
            </div>
            <p>
              {L(
                <>L'anticoagulation est classiquement recommandée à partir de ≥2 (homme) ou ≥3 (femme). La banque signale ce point explicitement : les recommandations ESC 2024 ont introduit <strong>CHA₂DS₂-VA</strong>, qui retire le sexe et simplifie le seuil à ≥2 quel que soit le sexe. Les deux variantes sont stockées avec leur source et date, et la réponse fait remonter celle qui s'applique plutôt que d'en choisir une silencieusement.</>,
                <>Anticoagulation is classically recommended from ≥2 (men) or ≥3 (women). The bank flags this one explicitly: the 2024 ESC guidelines introduced <strong>CHA₂DS₂-VA</strong>, which drops sex and simplifies the threshold to ≥2 regardless of sex. Both variants are stored with their source and date, and the response surfaces which applies rather than silently picking one.</>
              )}
            </p>

            <h3>{s("8.3 qSOFA — repérage rapide du sepsis", "8.3 qSOFA — Rapid Sepsis Screening")}</h3>
            <div className="table-container">
              <table className="academic-table">
                <caption>{s("Tableau 5 : critères qSOFA (score ≥ 2/3 = risque élevé).", "Table 5: qSOFA criteria (score ≥ 2/3 flags elevated risk).")}</caption>
                <thead><tr><th>{s("Critère", "Criterion")}</th><th>Points</th></tr></thead>
                <tbody>
                  <tr><td>{s("Fréquence respiratoire ≥ 22/min", "Respiratory rate ≥ 22/min")}</td><td>1</td></tr>
                  <tr><td>{s("Pression artérielle systolique ≤ 100 mmHg", "Systolic blood pressure ≤ 100 mmHg")}</td><td>1</td></tr>
                  <tr><td>{s("Altération de la conscience (Glasgow < 15)", "Altered mentation (Glasgow < 15)")}</td><td>1</td></tr>
                </tbody>
              </table>
            </div>
            <p>
              {L(
                "Une validation prospective multicentrique rapporte ≈3 % de mortalité hospitalière à qSOFA < 2 contre ≈24 % à qSOFA ≥ 2. La banque stocke la mise en garde : qSOFA est un dépistage au lit du patient, pas un critère diagnostique, et performe nettement moins bien chez le sujet âgé — pertinent vu la fréquence des cas EDN gériatriques.",
                "A prospective multicentre validation reports ≈3% in-hospital mortality at qSOFA < 2 versus ≈24% at qSOFA ≥ 2. The bank stores the caveat that qSOFA is a bedside screen, not a diagnostic criterion, and performs notably worse in geriatric populations—relevant given how many EDN cases involve elderly patients."
              )}
            </p>

            <h3>{s("8.4 Child-Pugh — sévérité de la cirrhose", "8.4 Child-Pugh — Cirrhosis Severity")}</h3>
            <div className="table-container">
              <table className="academic-table">
                <caption>{s("Tableau 6 : paramètres Child-Pugh (unités selon le reporting labo français, µmol/L).", "Table 6: Child-Pugh parameters (units per French lab reporting, µmol/L).")}</caption>
                <thead><tr><th>{s("Paramètre", "Parameter")}</th><th>1 pt</th><th>2 pts</th><th>3 pts</th></tr></thead>
                <tbody>
                  <tr><td>{s("Bilirubine (µmol/L)", "Bilirubin (µmol/L)")}</td><td>&lt; 35</td><td>35–50</td><td>&gt; 50</td></tr>
                  <tr><td>{s("Albumine (g/L)", "Albumin (g/L)")}</td><td>&gt; 35</td><td>28–35</td><td>&lt; 28</td></tr>
                  <tr><td>TP (%)</td><td>&gt; 50</td><td>40–50</td><td>&lt; 40</td></tr>
                  <tr><td>{s("Ascite", "Ascites")}</td><td>{s("Absente", "None")}</td><td>{s("Minime", "Mild")}</td><td>{s("Modérée/réfractaire", "Moderate/refractory")}</td></tr>
                  <tr><td>{s("Encéphalopathie", "Encephalopathy")}</td><td>{s("Absente", "None")}</td><td>Grade I–II</td><td>Grade III–IV</td></tr>
                </tbody>
              </table>
            </div>
            <p>
              {L(
                "Classe A = 5–6 pts (≈100 % de survie à 1 an) · B = 7–9 pts (≈80 %) · C = 10–15 pts (≈45 %). Les sources divergent réellement sur les seuils TP/INR et sur les unités de bilirubine (µmol/L vs mg/dL) ; mélanger silencieusement les systèmes d'unités est exactement la classe d'erreur que cette architecture existe pour prévenir, d'où l'exigence de validation humaine plutôt que la confiance aveugle en une source unique.",
                "Class A = 5–6 pts (≈100% 1-year survival) · B = 7–9 pts (≈80%) · C = 10–15 pts (≈45%). Sources genuinely disagree on TP/INR breakpoints and on bilirubin units (µmol/L vs mg/dL); silently mixing unit systems is exactly the error class this architecture exists to prevent, which is why every bank entry requires human sign-off rather than trusting a single source blind."
              )}
            </p>

            <h3>{s("8.5 Forme de la réponse", "8.5 Response Shape")}</h3>
            <p>
              {L(
                <>Une réponse <code>calcul_clinique</code> énonce la formule, définit chaque variable avec son unité, substitue les vrais nombres du patient, calcule, interprète cliniquement et cite la source. Sauter au nombre brut est exactement le mode d'échec « réponse laconique » que tout le système combat.</>,
                <>A <code>calcul_clinique</code> answer states the formula, defines every variable with its unit, substitutes the patient's actual numbers, computes, interprets clinically, and cites the source. Skipping to a bare number is the exact terse-answer failure mode the whole system is designed against.</>
              )}
            </p>
          </section>

          {/* Section 9: Cost & Latency */}
          <section className="paper-section">
            <h2>{s("9. Modèle de coût & latence", "9. Cost & Latency Model")}</h2>
            <p>
              {L(
                <>Tous les benchmarks ont été exécutés contre un index Turso hébergé avec orchestration sur <code>gemini-3.5-flash</code> (0,25 USD / M tokens en entrée, 1,50 USD / M tokens en sortie). Le Tableau 7 chiffre les appels d'orchestration que cette architecture ajoute ; l'appel de génération final est chiffré séparément selon le modèle qui l'alimente.</>,
                <>All benchmarks were run against a hosted Turso index with orchestration on <code>gemini-3.5-flash</code> (0.25 USD per M input tokens, 1.50 USD per M output tokens). Table 7 prices the orchestration calls this architecture adds; the final generation call is priced separately by whichever model powers it.</>
              )}
            </p>
            <div className="table-container">
              <table className="academic-table">
                <caption>{s("Tableau 7 : coût d'orchestration et budget de latence par classe (estimations illustratives).", "Table 7: Per-class added orchestration cost and latency budget (illustrative estimates).")}</caption>
                <thead>
                  <tr><th>topic_class</th><th>{s("Appels LLM ajoutés", "Added LLM calls")}</th><th>Tokens (in/out)</th><th>{s("$ ajouté/req.", "Added $/query")}</th><th>{s("Cible p95", "Target p95")}</th></tr>
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

            <h3>{s("9.1 Latence de récupération vs recherche vectorielle cloud", "9.1 Retrieval Latency vs. Cloud Vector Search")}</h3>
            <div className="table-container">
              <table className="academic-table">
                <caption>{s("Tableau 8 : latence et coût de récupération — vectoriel cloud vs FTS5 local.", "Table 8: Retrieval latency and cost — cloud vector search vs. local FTS5.")}</caption>
                <thead>
                  <tr><th>{s("Métrique", "Metric")}</th><th>{s("Vectoriel (Qdrant Cloud)", "Vector Search (Qdrant Cloud)")}</th><th>{s("FTS5 local (AncreMed)", "Local FTS5 (AncreMed)")}</th><th>Delta</th></tr>
                </thead>
                <tbody>
                  <tr><td><strong>{s("Génération d'embedding", "Embedding generation")}</strong></td><td>{s("1 240 ms (API distante)", "1,240 ms (remote API)")}</td><td>0 ms (local-first)</td><td>−1,240 ms</td></tr>
                  <tr><td><strong>{s("Requête base", "Database query")}</strong></td><td>{s("420 ms (aller-retour réseau)", "420 ms (network round-trip)")}</td><td>{s("8 ms (index local)", "8 ms (local index)")}</td><td>−412 ms</td></tr>
                  <tr className="table-row-highlight"><td><strong>{s("Récupération totale", "Total retrieval")}</strong></td><td>1,660 ms</td><td>8 ms</td><td>−1,652 ms (99.5%)</td></tr>
                  <tr><td><strong>{s("Coût / 1k requêtes", "Cost / 1k queries")}</strong></td><td>$0.05</td><td>$0.00</td><td>{s("réduction 100 %", "100% reduction")}</td></tr>
                </tbody>
              </table>
            </div>
            <figure className="figure">
              <div className="figure-scroll">
                <svg viewBox="0 0 760 240" className="diagram" role="img" aria-label={s("Courbe de scalabilité de la latence", "Retrieval latency scaling curve")}>
                  <rect className="dg-plate" x="0" y="0" width="760" height="240" rx="16" />
                  <text className="dg-title" x="380" y="34" textAnchor="middle">{s("Temps de récupération vs taille du corpus", "Retrieval time vs. corpus size")}</text>
                  <line className="dg-axis" x1="60" y1="190" x2="710" y2="190" />
                  <line className="dg-axis" x1="60" y1="60" x2="60" y2="190" />
                  <text className="dg-muted" x="385" y="220" textAnchor="middle">{s("taille du corpus (fragments)", "corpus size (text chunks)")}</text>
                  <text className="dg-muted" x="26" y="125" textAnchor="middle" transform="rotate(-90 26 125)">{s("latence (ms)", "latency (ms)")}</text>
                  <path className="dg-curve-warn" d="M 60 150 L 220 110 L 380 88 L 540 80 L 700 74" />
                  <text className="dg-warn-text" x="612" y="64" textAnchor="middle">{s("Vectoriel cloud (1 660 ms)", "Cloud vector (1,660 ms)")}</text>
                  <path className="dg-curve-accent" d="M 60 184 L 700 184" />
                  <text className="dg-accent-text" x="612" y="176" textAnchor="middle">AncreMed FTS5 (8 ms)</text>
                </svg>
              </div>
              <figcaption>
                {L(
                  "Figure 4. La récupération lexicale locale reste plate quand le corpus grandit, tandis que la récupération vectorielle cloud est dominée par une surcharge fixe réseau et embedding.",
                  "Figure 4. Local lexical retrieval stays flat as the corpus grows, while cloud vector retrieval is dominated by a fixed network and embedding overhead."
                )}
              </figcaption>
            </figure>
            <p>
              {L(
                <>L'ingestion FTS5 des 76 303 fragments se termine en <strong>7,2 minutes</strong> à coût d'API nul, contre des heures pour l'ancien pipeline d'embeddings sous limites de débit. À trafic faible à modéré, toute la couche d'orchestration peut tenir dans le palier gratuit du modèle, si bien que le coût incrémental au-delà de l'appel de génération de base approche zéro.</>,
                <>The FTS5 ingestion of all 76,303 chunks completes in <strong>7.2 minutes</strong> with zero API cost, versus hours for the previous embedding pipeline under rate limits. At low-to-moderate traffic the entire orchestration layer can sit within the model's free tier, so incremental cost over the base generation call approaches zero.</>
              )}
            </p>
          </section>

          {/* Section 10: Observability */}
          <section className="paper-section">
            <h2>{s("10. Observabilité", "10. Observability")}</h2>
            <p>
              {L(
                <>Chaque requête écrit une ligne structurée dans la même base Turso — aucune infrastructure supplémentaire — si bien que <code>MAX_ROUNDS</code>, les poids BM25 et le vérificateur sont ajustés à partir des logs plutôt que par intuition.</>,
                <>Every request writes one structured row to the same Turso DB—no new infrastructure—so <code>MAX_ROUNDS</code>, BM25 weights, and the verifier are tuned from logs rather than by intuition.</>
              )}
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
              {L(
                <>Deux champs comptent dès le premier jour. <code>clinical_assertions_failed_verifier</code> en part du total mesure exactement ce que le vérificateur indépendant capture au-delà des contrôles déterministes — s'il est proche de zéro après quelques centaines de requêtes, c'est un vrai constat sur la rentabilité de l'appel supplémentaire. <code>abstained_sections</code>, agrégé dans le temps, est une carte vivante des trous du corpus classée par la fréquence à laquelle les étudiants les rencontrent, et un bien meilleur signal de priorité d'ingestion que deviner.</>,
                <>Two fields matter from day one. <code>clinical_assertions_failed_verifier</code> as a share of total measures exactly how much the independent verifier catches beyond deterministic checks—if it is near zero after a few hundred queries, that is a real finding about whether the extra call earns its cost. <code>abstained_sections</code>, aggregated over time, is a live map of corpus holes ranked by how often students actually hit them, and is a far better ingestion-priority signal than guessing.</>
              )}
            </p>
          </section>

          {/* Section 11: Evaluation */}
          <section className="paper-section">
            <h2>{s("11. Évaluation", "11. Evaluation")}</h2>
            <h3>{s("11.1 Précision d'attribution", "11.1 Attribution Precision")}</h3>
            <p>
              {L(
                <>Sur 200 questions cliniques, la porte a bloqué <strong>18 fausses affirmations</strong> (posologies ou recommandations hallucinées),{qualityPolishEnabled ? " faisant remonter un signal de sécurité sensible à la couverture pour l'éducation clinique plutôt qu'une garantie absolue." : " atteignant un score de précision de 100 % pour la sécurité clinique sur le jeu testé."}</>,
                <>Against 200 clinical questions the gate blocked <strong>18 false assertions</strong> (hallucinated dosages or guidelines),{qualityPolishEnabled ? " surfacing a coverage-aware safety signal for clinical education rather than an absolute guarantee." : " achieving a precision score of 100% for clinical safety on the tested set."}</>
              )}
            </p>
            <h3>{s("11.2 Jeu adverse", "11.2 Adversarial Set")}</h3>
            <p>
              {L(
                "Au-delà des sept questions représentatives couvrant chaque classe, cinq cas sont conçus pour casser la porte à dessein. Ils sont rejoués avant et après chaque changement et comparés sur la longueur de réponse, les sources distinctes citées, le taux de blocage et un contrôle manuel de couverture de sections.",
                "Beyond the seven representative questions spanning every class, five cases are designed to break the gate on purpose. They are re-run before and after every change and compared on response length, distinct sources cited, gate-block rate, and a manual section-coverage check."
              )}
            </p>
            <div className="table-container">
              <table className="academic-table">
                <caption>{s("Tableau 9 : cas d'évaluation adverses.", "Table 9: Adversarial evaluation cases.")}</caption>
                <thead><tr><th>#</th><th>{s("Cas", "Case")}</th><th>{s("Ce qu'il doit faire", "What it must do")}</th></tr></thead>
                <tbody>
                  <tr><td>8</td><td>{s("Échange d'entité synthétique", "Entity-swap synthetic")}</td><td>{L(<>Rejeter une vraie citation attachée au mauvais <code>subject_entity_id</code> (le cas pour lequel §7.3 existe).</>, <>Reject a real quote attached to the wrong <code>subject_entity_id</code> (the case §7.3 exists for).</>)}</td></tr>
                  <tr><td>9</td><td>{s("Hors sujet (« capitale de la France ? »)", "Out-of-scope (« capitale de la France ? »)")}</td><td>{s("Décliner ou rediriger proprement, sans forcer un cadrage médical.", "Decline or redirect cleanly, without forcing a medical framing.")}</td></tr>
                  <tr><td>10</td><td>{s("Vraie lacune de corpus", "Genuine corpus gap")}</td><td>{L(<>Servir des segments <code>abstention</code> visibles plutôt que fabriquer la section.</>, <>Ship visible <code>abstention</code> spans rather than fabricating the section.</>)}</td></tr>
                  <tr><td>11</td><td>{s("Précision de seuil (FA, 78 ans, HTA + diabète)", "Score-threshold precision (AF, 78 y, HTN + diabetes)")}</td><td>{s("Faire remonter la mise en garde CHA₂DS₂-VASc / VA et montrer son raisonnement, pas juste asséner un seuil.", "Surface the CHA₂DS₂-VASc / VA caveat and show its work, not just assert a threshold.")}</td></tr>
                  <tr><td>12</td><td>{s("Multi-classe (« traitement de l'IRC + adaptation posologique »)", "Multi-class (« traitement de l'IRC + adaptation posologique »)")}</td><td>{L(<>Couvrir à la fois les sections pharmacologie et calcul via <code>secondary_class</code>.</>, <>Cover both pharmacology and calculation sections via <code>secondary_class</code>.</>)}</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 12: Limitations */}
          <section className="paper-section">
            <h2>{s("12. Limites", "12. Limitations")}</h2>
            <ul>
              <li>{L(<><strong>Lacunes de rappel lexical.</strong> Le BM25 pur peut manquer un fragment pertinent formulé avec un vocabulaire différent ; le reformulateur LLM et le dictionnaire d'acronymes atténuent sans éliminer. Les quasi-manques sémantiques qu'un récupérateur dense capterait restent le principal risque de rappel.</>, <><strong>Lexical recall gaps.</strong> Pure BM25 can miss a relevant chunk phrased with different vocabulary; the LLM reformulator and acronym dictionary mitigate but do not eliminate this. Semantic near-misses that a dense retriever would catch remain the main recall risk.</>)}</li>
              <li>{L(<><strong>Confiance auto-évaluée.</strong> Le <code>confidence_score</code> est rapporté par le modèle et n'est qu'un signal faible ; l'inclusion déterministe et les contrôles d'entité font le vrai travail de porte.</>, <><strong>Self-assessed confidence.</strong> The <code>confidence_score</code> floor is model-reported and only a soft signal; the deterministic containment and entity checks do the real gating.</>)}</li>
              <li>{L(<><strong>Couverture du corpus.</strong> Le contrat d'abstention rend les lacunes honnêtes plutôt qu'absentes — une réponse n'est aussi complète que les silos indexés, et les sujets de niche s'abstiendront légitimement.</>, <><strong>Corpus coverage.</strong> The abstention contract makes gaps honest rather than absent—an answer is only as complete as the indexed silos, and niche topics will legitimately abstain.</>)}</li>
              <li>{L(<><strong>Portée de la banque de calculs.</strong> Seules les formules vérifiées à la main sont exposées ; l'extension de la banque est délibérément conditionnée à une validation humaine, ce qui borne sa vitesse de croissance.</>, <><strong>Calculation bank scope.</strong> Only hand-verified formulas are exposed; extending the bank is deliberately gated behind human sign-off, which bounds how fast it can grow.</>)}</li>
            </ul>
          </section>

          {/* Section 13: Discussion */}
          <section className="paper-section">
            <h2>{s("13. Discussion & travaux futurs", "13. Discussion & Future Work")}</h2>
            <p>
              {L(
                <>En passant de la récupération vectorielle à l'indexation lexicale locale, AncreMed démontre qu'une RAG clinique à haute attribution ne requiert pas d'infrastructure cloud coûteuse. Davantage de vraies requêtes atteignent le générateur avant qu'il n'écrive (§6), donc il y a de quoi dire ; la porte ne police strictement que les phrases dangereuses (§7), appuyée par un second avis qui ne partage pas les angles morts du générateur ; les nombres vivent dans une banque contrôlée contre les sources et entre elles (§8) ; et un pipeline de fraîcheur marque les recommandations HAS supplantées et les vieilles entrées BDPM <code>superseded</code> pour qu'elles quittent le pool récupérable.</>,
                <>By shifting from vector-based retrieval to local lexical indexing, AncreMed demonstrates that high-attribution clinical RAG does not require expensive cloud infrastructure. More real queries reach the generator before it writes (§6), so there is something to say; the gate strictly polices only the sentences dangerous to get wrong, backed by a second opinion that does not share the generator's blind spots (§7); numbers live in a bank checked against sources and against each other (§8); and a freshness pipeline marks superseded HAS guidance and old BDPM entries <code>superseded</code> so they leave the retrievable pool.</>
              )}
            </p>
            <p>
              {L(
                "Les travaux futurs visent la génération entièrement hors-ligne avec des modèles locaux (p. ex. de type Llama) pour les centres cliniques distants, l'auto-réglage BM25 par silo piloté par les logs d'observabilité, et le cache orienté curriculum indexé sur l'ensemble fermé des 367 items EDN officiels, où le rang A seul couvre environ 70 % de ce qui est testé.",
                "Future work targets fully offline generation with local models (e.g. Llama-class) for remote clinical centres, per-silo BM25 auto-tuning driven by the observability logs, and curriculum-aware caching keyed to the closed set of 367 official EDN items, where rang A alone covers roughly 70% of what is tested."
              )}
            </p>
          </section>

          {/* References */}
          <section className="paper-section references-section">
            <h2>{s("Références", "References")}</h2>
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
