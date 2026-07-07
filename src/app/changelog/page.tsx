"use client";

import type { JSX } from "react";
import { SiteHeader } from "../../components/SiteHeader";
import { SiteFooter } from "../../components/SiteFooter";
import { useLang } from "../../lib/i18n";

export default function ChangelogPage(): JSX.Element {
  const { lang } = useLang();
  return (
    <main className="changelog-shell">
      <SiteHeader />

      <div className="changelog-viewport fade-up">
        <div className="changelog-container">
          <h1>Changelog</h1>
          <p className="subtitle">
            {lang === "fr"
              ? "L’évolution technique et clinique du moteur AncreMed."
              : "The technical and clinical evolution of the AncreMed engine."}
          </p>

          {lang === "fr" ? (
          <div className="changelog-list">
            {/* Version 3.0.0 */}
            <section className="changelog-item">
              <div className="changelog-meta">
                <span className="version-badge">v3.0.0</span>
                <time className="changelog-date">Juil. 6, 2026</time>
              </div>
              <div className="changelog-details">
                <h2>Liquid Glass : refonte visuelle complète, mode sombre et rapport scientifique v2</h2>
                <p>
                  Refonte intégrale de l'interface selon le langage visuel « Liquid Glass » d'iOS 26 :
                  surfaces translucides dépolies, flou d'arrière-plan, reflets spéculaires, boutons en capsule
                  et coins largement arrondis, sur l'ensemble des pages et composants. AncreMed gagne également
                  un mode sombre complet et un rapport scientifique entièrement réécrit.
                </p>
                <ul>
                  <li>
                    <strong>Système de tokens verre &amp; thème double :</strong> nouvelle architecture de tokens dans
                    <code> globals.css</code> (variables <code>--glass-*</code>, rayons plus généreux, dégradé ambiant
                    fixe derrière tout le contenu) et un thème <strong>clair + sombre automatique</strong> via
                    <code> prefers-color-scheme</code>, avec un point d'accroche <code>data-theme</code> pour un futur
                    sélecteur manuel. L'accent teal a été affiné pour rester lumineux à travers le verre dans les deux thèmes.
                  </li>
                  <li>
                    <strong>Recettes de verre réutilisables :</strong> utilitaires <code>.glass</code>,
                    <code> .glass-strong</code> et <code>.glass-tint</code> (deux niveaux : verre réel avec
                    <code> backdrop-filter</code> pour les chrome/cartes, teinte givrée sans flou pour les surfaces
                    défilantes), avec repli <code>@supports</code> pour les navigateurs sans <code>backdrop-filter</code>.
                  </li>
                  <li>
                    <strong>Console, en-têtes, sources et modales en verre :</strong> en-tête flottant en capsule, barre
                    latérale, composeur, cartes de sources, modales et navigation mobile passent tous au verre translucide ;
                    les couleurs de silos et de confiance transitent désormais par les tokens de thème.
                  </li>
                  <li>
                    <strong>Rapport scientifique v2 (<code>/paper</code>) :</strong> document nettement plus détaillé —
                    formalisme BM25 (pondération par colonne, IDF), boucle de recherche profonde avec trace exécutée,
                    porte d'attribution à niveaux, banque de calculs cliniques (Cockcroft-Gault, CHA₂DS₂-VASc, qSOFA,
                    Child-Pugh), budget coût/latence et jeu d'évaluation adverse. Nouveaux diagrammes SVG entièrement
                    adaptés au thème (fini les couleurs figées) et <strong>mise en page mobile corrigée</strong>
                    (texte aligné à gauche, figures et tableaux défilables, aucun débordement horizontal).
                  </li>
                  <li>
                    <strong>Documentation design :</strong> ajout de <code>DESIGN.md</code> décrivant les tokens, les
                    recettes de verre, la règle de non-imbrication du flou et le mode sombre, afin que les contributeurs
                    et agents futurs sachent exactement comment étendre le système Liquid Glass.
                  </li>
                </ul>
              </div>
            </section>

            {/* Version 2.2.0 */}
            <section className="changelog-item">
              <div className="changelog-meta">
                <span className="version-badge">v2.2.0</span>
                <time className="changelog-date">Juil. 3, 2026</time>
              </div>
              <div className="changelog-details">
                <h2>Interface v2 & Résolution FOUC : Refonte UI/UX Premium et Intégration SSR</h2>
                <p>
                  Cette mise à jour apporte une refonte visuelle majeure et résout les problèmes de
                  rendu initial pour aligner l'expérience utilisateur sur les standards de production
                  des leaders de l'industrie (OpenAI, Anthropic).
                </p>
                <ul>
                  <li>
                    <strong>Intégration SSR des styles (Zéro FOUC) :</strong> Résolution du problème de
                    <em> Flash of Unstyled Content</em> (FOUC) sur l'ensemble des pages. Nous avons intégré
                    un registre <code>StyledJsxRegistry</code> pour collecter et injecter les styles CSS lors du
                    Server-Side Rendering (SSR) dans le layout global de Next.js, garantissant une première
                    peinture parfaitement stylée sur chaque rechargement.
                  </li>
                  <li>
                    <strong>Console de saisie intelligente :</strong> Remplacement du champ de saisie simple par un
                    composant <code>&lt;textarea&gt;</code> auto-extensible qui s'adapte dynamiquement à la longueur du texte
                    jusqu'à 160px de haut. Gestion optimisée des touches <code>Enter</code> (envoi) et <code>Shift+Enter</code> (saut de ligne),
                    et centrage vertical automatique sur une seule ligne.
                  </li>
                  <li>
                    <strong>Barre latérale compacte et esthétique :</strong> Réorganisation de l'en-tête de la barre latérale.
                    Le bouton "Nouvelle discussion" et le bouton de repliage sont désormais disposés côte à côte sur une seule ligne,
                    libérant un espace vertical précieux pour l'historique et affinant l'équilibre esthétique du panneau.
                  </li>
                  <li>
                    <strong>Écran de chargement sémantique et checkpoints :</strong> Implémentation d'un indicateur de progression
                    étape par étape lors de la génération (recherche d'index, analyse de sources, rédaction clinique, vérification d'assertions)
                    couplé à des squelettes de texte pulsants pour une rétroaction visuelle fluide.
                  </li>
                  <li>
                    <strong>Améliorations de confort et sécurité :</strong> Ajout d'une boîte de dialogue de confirmation avant la suppression
                    de discussions, bouton de retour automatique en bas de page, possibilité de copier les réponses cliniques en un clic, et
                    remplacement des identifiants bruts de base de données par des badges de source colorés (HAS, ANSM / VIDAL, EDN).
                  </li>
                </ul>
              </div>
            </section>

            {/* Version 2.1.0 */}
            <section className="changelog-item">
              <div className="changelog-meta">
                <span className="version-badge">v2.1.0</span>
                <time className="changelog-date">Juil. 2, 2026</time>
              </div>
              <div className="changelog-details">
                <h2>Valve clinique v2 : dégradation gracieuse au lieu du blocage total</h2>
                <p>
                  La valve de revue clinique bloquait la réponse entière dès qu'une seule affirmation
                  était contestée, même quand la question était factuellement simple et bien établie
                  (ex. score CHA2DS2-VASc). Elle bloque désormais uniquement quand la réponse ne contient
                  vraiment rien d'exploitable pour l'étudiant.
                </p>
                <ul>
                  <li>
                    <strong>Rejet ciblé, pas collectif :</strong> chaque affirmation clinique est encore
                    vérifiée mot à mot (citation exacte) et par entité source, mais seule l'affirmation
                    fautive est retirée de la réponse. Le reste du texte, correctement sourcé, est
                    conservé et affiché à l'étudiant au lieu d'être supprimé avec elle.
                  </li>
                  <li>
                    <strong>Vérificateur indépendant recalibré :</strong> le second modèle de vérification
                    (Gemini Flash-Lite, appel séparé) restait volontairement "sceptique par défaut" et
                    invalidait des citations correctement attribuées à cause d'une simple reformulation.
                    Sa consigne se concentre maintenant sur le fond clinique (bon médicament, bonne
                    pathologie, bon sous-groupe, bon chiffre) plutôt que sur la fidélité littérale du
                    style, tout en continuant à rejeter tout mélange de sujet ou chiffre inventé.
                  </li>
                  <li>
                    <strong>Suppression du filtre de mots-clés sur les paragraphes narratifs :</strong> les
                    passages explicatifs n'étaient plus autorisés à contenir le moindre chiffre ou mot
                    comme "score"/"seuil", ce qui bloquait des réponses pourtant correctes. La consigne au
                    modèle de séparer narration et affirmation chiffrée est renforcée dans le prompt, sans
                    filtre déterministe par expression régulière.
                  </li>
                  <li>
                    <strong>Blocage réservé aux échecs réels :</strong> la réponse n'est désormais rejetée
                    (422) que si, après filtrage, il ne reste ni affirmation vérifiée, ni abstention
                    honnête, ni texte narratif exploitable — un vrai échec de génération, pas une simple
                    divergence d'un vérificateur.
                  </li>
                </ul>
              </div>
            </section>

            {/* Version 2.0.0 */}
            <section className="changelog-item">
              <div className="changelog-meta">
                <span className="version-badge">v2.0.0</span>
                <time className="changelog-date">Juil. 1, 2026</time>
              </div>
              <div className="changelog-details">
                <h2>AncreMed v2 : recherche approfondie, spans attribués et banque de calculs</h2>
                <p>
                  Refonte majeure du moteur de récupération et de génération, déployée en cinq phases
                  (voir <code>IMPLEMENTATION_LOG.md</code>).
                </p>
                <ul>
                  <li>
                    <strong>Recherche approfondie multi-tours :</strong> un planificateur classe la question
                    par sujet, relance des recherches FTS5/BM25 ciblées par section manquante, et s'arrête
                    dès la couverture atteinte ou un nombre de tours borné.
                  </li>
                  <li>
                    <strong>Réponses en "spans" attribués :</strong> chaque réponse est désormais composée de
                    segments narratifs, d'affirmations cliniques sourcées (citation exacte + identifiant
                    d'entité) et d'abstentions explicites pour les sections non couvertes par le corpus.
                  </li>
                  <li>
                    <strong>Banque de calculs cliniques vérifiés :</strong> Cockcroft-Gault, CHA2DS2-VASc et
                    sa variante ESC 2024 (CHA2DS2-VA), qSOFA et Child-Pugh sont servis depuis une table
                    dédiée et priorisés pour les questions de calcul clinique.
                  </li>
                  <li>
                    <strong>Vérificateur indépendant et fraîcheur des sources :</strong> un second appel
                    modèle contrôle chaque affirmation contre son document source, et les recommandations
                    HAS/BDPM obsolètes sont marquées <code>superseded</code> pour ne plus être citées.
                  </li>
                  <li>
                    <strong>Tolérance aux fautes de frappe, cache et indicateur de couverture :</strong>{" "}
                    correction légère des requêtes mal orthographiées, mise en cache des réponses pour les
                    classes de questions stables, et affichage du niveau de couverture de chaque réponse.
                  </li>
                </ul>
              </div>
            </section>

            {/* Version 0.2.0 */}
            <section className="changelog-item">
              <div className="changelog-meta">
                <span className="version-badge">v0.2.0</span>
                <time className="changelog-date">Juin 30, 2026</time>
              </div>
              <div className="changelog-details">
                <h2>Agentic Routing, Reformulation & Refonte UI</h2>
                <p>
                  Cette mise à jour majeure introduit l'architecture de routage intelligent et améliore l'ergonomie de navigation pour les mobiles et écrans larges.
                </p>
                <ul>
                  <li>
                    <strong>Routeur Intelligent Agentic (API Router) :</strong> Classification automatique des messages en amont. Les requêtes de dialogue ou de politesse ("bonjour", "merci") contournent l'index de recherche pour répondre en moins de 300ms.
                  </li>
                  <li>
                    <strong>Reformulation Sémantique :</strong> Traduction automatique des sigles (ex: "BPCO", "AAG") et expansion en mots-clés français pour accroître le taux de rappel de recherche SQLite.
                  </li>
                  <li>
                    <strong>Barre latérale repliable (Desktop) :</strong> Ajout de boutons de réduction/développement de la barre avec des icônes SVG minimalistes.
                  </li>
                  <li>
                    <strong>Navigation Mobile Premium :</strong> Menu fixe en bas de page pour accéder directement aux discussions, démarrer un nouveau chat ou ouvrir le récapitulatif des silos cliniques.
                  </li>
                  <li>
                    <strong>Correction du Scroller :</strong> Intégration d'un espaceur dynamique de 110px pour empêcher le chevauchement du dernier message avec le bloc de saisie fixe.
                  </li>
                </ul>
              </div>
            </section>

            {/* Version 0.1.0 */}
            <section className="changelog-item">
              <div className="changelog-meta">
                <span className="version-badge version-stable">v0.1.0</span>
                <time className="changelog-date">Juin 15, 2026</time>
              </div>
              <div className="changelog-details">
                <h2>Lancement Initial d'AncreMed</h2>
                <p>
                  Première version fonctionnelle du moteur RAG local-first.
                </p>
                <ul>
                  <li>
                    <strong>Ingestion des silos :</strong> Indexation locale de 76 303 fragments de documents HAS et BDPM.
                  </li>
                  <li>
                    <strong>Recherche FTS5 :</strong> Migration vers un moteur SQLite FTS5 ultra-rapide (recherche locale en 8ms).
                  </li>
                  <li>
                    <strong>Attribution Gate :</strong> Première version de la valve clinique pour bloquer les dérives factuelles en vérifiant la présence de citations exactes.
                  </li>
                </ul>
              </div>
            </section>
          </div>
          ) : (
          <div className="changelog-list">
            {/* Version 3.0.0 */}
            <section className="changelog-item">
              <div className="changelog-meta">
                <span className="version-badge">v3.0.0</span>
                <time className="changelog-date">Jul. 6, 2026</time>
              </div>
              <div className="changelog-details">
                <h2>Liquid Glass: full visual redesign, dark mode and scientific report v2</h2>
                <p>
                  A complete UI overhaul following Apple&apos;s iOS 26 &quot;Liquid Glass&quot; visual language:
                  translucent frosted surfaces, backdrop blur, specular highlights, capsule buttons and generously
                  rounded corners, across every page and component. AncreMed also gains a full dark mode and a
                  fully rewritten scientific report.
                </p>
                <ul>
                  <li>
                    <strong>Glass token system &amp; dual theme:</strong> a new token architecture in
                    <code> globals.css</code> (<code>--glass-*</code> variables, more generous radii, a fixed ambient
                    gradient behind all content) and an <strong>automatic light + dark</strong> theme via
                    <code> prefers-color-scheme</code>, with a <code>data-theme</code> hook for a future manual toggle.
                    The teal accent was tuned to stay luminous through the glass in both themes.
                  </li>
                  <li>
                    <strong>Reusable glass recipes:</strong> <code>.glass</code>, <code>.glass-strong</code> and
                    <code> .glass-tint</code> utilities (two tiers: real glass with <code>backdrop-filter</code> for
                    chrome/cards, frosted tint without blur for scrolling surfaces), with an <code>@supports</code>
                    fallback for browsers without <code>backdrop-filter</code>.
                  </li>
                  <li>
                    <strong>Glass console, headers, sources and modals:</strong> a floating capsule header, sidebar,
                    composer, source cards, modals and mobile navigation all move to translucent glass; silo and
                    confidence colors now flow through theme tokens.
                  </li>
                  <li>
                    <strong>Scientific report v2 (<code>/paper</code>):</strong> a much more detailed document —
                    BM25 formalism (column weighting, IDF), a deep search loop with a worked trace, a tiered
                    attribution gate, a clinical calculation bank (Cockcroft-Gault, CHA₂DS₂-VASc, qSOFA,
                    Child-Pugh), a cost/latency budget and an adversarial evaluation set. New SVG diagrams fully
                    theme-aware (no more hardcoded colors) and a <strong>fixed mobile layout</strong>
                    (left-aligned text, scrollable figures and tables, no horizontal overflow).
                  </li>
                  <li>
                    <strong>Design documentation:</strong> added <code>DESIGN.md</code> describing the tokens, the
                    glass recipes, the no-nested-blur rule and dark mode, so future contributors and agents know
                    exactly how to extend the Liquid Glass system.
                  </li>
                </ul>
              </div>
            </section>

            {/* Version 2.2.0 */}
            <section className="changelog-item">
              <div className="changelog-meta">
                <span className="version-badge">v2.2.0</span>
                <time className="changelog-date">Jul. 3, 2026</time>
              </div>
              <div className="changelog-details">
                <h2>Interface v2 &amp; FOUC fix: premium UI/UX overhaul and SSR integration</h2>
                <p>
                  This update brings a major visual overhaul and fixes initial-render issues to align the user
                  experience with the production standards of industry leaders (OpenAI, Anthropic).
                </p>
                <ul>
                  <li>
                    <strong>SSR style integration (zero FOUC):</strong> fixed the <em>Flash of Unstyled Content</em>
                    (FOUC) across all pages. We integrated a <code>StyledJsxRegistry</code> to collect and inject CSS
                    during Server-Side Rendering (SSR) in the global Next.js layout, guaranteeing a perfectly styled
                    first paint on every reload.
                  </li>
                  <li>
                    <strong>Smart input console:</strong> replaced the simple input field with an auto-expanding
                    <code> &lt;textarea&gt;</code> that adapts to text length up to 160px tall. Optimized handling of
                    <code> Enter</code> (send) and <code>Shift+Enter</code> (new line), with automatic vertical
                    centering on a single line.
                  </li>
                  <li>
                    <strong>Compact, refined sidebar:</strong> reorganized the sidebar header. The &quot;New chat&quot;
                    button and the collapse button now sit side by side on a single line, freeing valuable vertical
                    space for history and refining the panel&apos;s visual balance.
                  </li>
                  <li>
                    <strong>Semantic loading screen and checkpoints:</strong> a step-by-step progress indicator during
                    generation (index search, source analysis, clinical drafting, assertion verification) paired with
                    pulsing text skeletons for smooth visual feedback.
                  </li>
                  <li>
                    <strong>Comfort and safety improvements:</strong> a confirmation dialog before deleting chats, an
                    automatic scroll-to-bottom button, one-click copying of clinical answers, and replacement of raw
                    database identifiers with colored source badges (HAS, ANSM / VIDAL, EDN).
                  </li>
                </ul>
              </div>
            </section>

            {/* Version 2.1.0 */}
            <section className="changelog-item">
              <div className="changelog-meta">
                <span className="version-badge">v2.1.0</span>
                <time className="changelog-date">Jul. 2, 2026</time>
              </div>
              <div className="changelog-details">
                <h2>Clinical valve v2: graceful degradation instead of total blocking</h2>
                <p>
                  The clinical-review valve used to block the entire response as soon as a single assertion was
                  disputed, even when the question was factually simple and well established (e.g. the CHA2DS2-VASc
                  score). It now blocks only when the response contains nothing usable for the student.
                </p>
                <ul>
                  <li>
                    <strong>Targeted, not collective, rejection:</strong> every clinical assertion is still verified
                    word for word (exact quote) and by source entity, but only the faulty assertion is removed from
                    the response. The rest of the text, correctly sourced, is kept and shown to the student instead of
                    being discarded with it.
                  </li>
                  <li>
                    <strong>Recalibrated independent verifier:</strong> the second verification model (Gemini
                    Flash-Lite, a separate call) stayed deliberately &quot;skeptical by default&quot; and invalidated
                    correctly attributed quotes over a mere rewording. Its instruction now focuses on clinical
                    substance (right drug, right pathology, right subgroup, right number) rather than literal stylistic
                    fidelity, while still rejecting any subject mix-up or fabricated number.
                  </li>
                  <li>
                    <strong>Removed the keyword filter on narrative paragraphs:</strong> explanatory passages were no
                    longer allowed to contain any number or word like &quot;score&quot;/&quot;threshold&quot;, which
                    blocked otherwise-correct answers. The instruction to separate narrative from numeric assertion is
                    now reinforced in the prompt, without a deterministic regex filter.
                  </li>
                  <li>
                    <strong>Blocking reserved for real failures:</strong> the response is now rejected (422) only if,
                    after filtering, nothing remains — no verified assertion, no honest abstention, and no usable
                    narrative text — a genuine generation failure, not a mere verifier disagreement.
                  </li>
                </ul>
              </div>
            </section>

            {/* Version 2.0.0 */}
            <section className="changelog-item">
              <div className="changelog-meta">
                <span className="version-badge">v2.0.0</span>
                <time className="changelog-date">Jul. 1, 2026</time>
              </div>
              <div className="changelog-details">
                <h2>AncreMed v2: deep search, attributed spans and calculation bank</h2>
                <p>
                  A major overhaul of the retrieval and generation engine, rolled out in five phases (see
                  <code> IMPLEMENTATION_LOG.md</code>).
                </p>
                <ul>
                  <li>
                    <strong>Multi-round deep search:</strong> a planner classifies the question by topic, re-runs
                    targeted FTS5/BM25 searches per missing section, and stops as soon as coverage is reached or a
                    bounded round count is hit.
                  </li>
                  <li>
                    <strong>Attributed &quot;span&quot; responses:</strong> each response is now composed of narrative
                    segments, sourced clinical assertions (exact quote + entity id) and explicit abstentions for
                    sections not covered by the corpus.
                  </li>
                  <li>
                    <strong>Verified clinical calculation bank:</strong> Cockcroft-Gault, CHA2DS2-VASc and its 2024
                    ESC variant (CHA2DS2-VA), qSOFA and Child-Pugh are served from a dedicated table and prioritized
                    for clinical calculation questions.
                  </li>
                  <li>
                    <strong>Independent verifier and source freshness:</strong> a second model call checks each
                    assertion against its source document, and outdated HAS/BDPM guidance is marked
                    <code> superseded</code> so it is no longer cited.
                  </li>
                  <li>
                    <strong>Typo tolerance, cache and coverage indicator:</strong>{" "}
                    lightweight correction of misspelled queries, response caching for stable question classes, and a
                    per-answer coverage indicator.
                  </li>
                </ul>
              </div>
            </section>

            {/* Version 0.2.0 */}
            <section className="changelog-item">
              <div className="changelog-meta">
                <span className="version-badge">v0.2.0</span>
                <time className="changelog-date">Jun. 30, 2026</time>
              </div>
              <div className="changelog-details">
                <h2>Agentic routing, reformulation &amp; UI overhaul</h2>
                <p>
                  This major update introduces the intelligent routing architecture and improves navigation ergonomics
                  for mobile and wide screens.
                </p>
                <ul>
                  <li>
                    <strong>Agentic intelligent router (API Router):</strong> automatic upstream classification of
                    messages. Conversational or courtesy queries (&quot;hello&quot;, &quot;thanks&quot;) bypass the
                    search index to reply in under 300 ms.
                  </li>
                  <li>
                    <strong>Semantic reformulation:</strong> automatic expansion of acronyms (e.g. &quot;COPD&quot;,
                    &quot;AAG&quot;) and expansion into French keywords to increase the SQLite search recall rate.
                  </li>
                  <li>
                    <strong>Collapsible sidebar (desktop):</strong> added collapse/expand buttons with minimalist SVG
                    icons.
                  </li>
                  <li>
                    <strong>Premium mobile navigation:</strong> a fixed bottom menu to jump directly to chats, start a
                    new chat, or open the clinical silos summary.
                  </li>
                  <li>
                    <strong>Scroller fix:</strong> integrated a dynamic 110px spacer to prevent the last message from
                    overlapping the fixed input box.
                  </li>
                </ul>
              </div>
            </section>

            {/* Version 0.1.0 */}
            <section className="changelog-item">
              <div className="changelog-meta">
                <span className="version-badge version-stable">v0.1.0</span>
                <time className="changelog-date">Jun. 15, 2026</time>
              </div>
              <div className="changelog-details">
                <h2>Initial launch of AncreMed</h2>
                <p>First functional version of the local-first RAG engine.</p>
                <ul>
                  <li>
                    <strong>Silo ingestion:</strong> local indexing of 76,303 fragments from HAS and BDPM documents.
                  </li>
                  <li>
                    <strong>FTS5 search:</strong> migration to an ultra-fast SQLite FTS5 engine (8 ms local search).
                  </li>
                  <li>
                    <strong>Attribution Gate:</strong> the first version of the clinical valve, blocking factual drift
                    by verifying the presence of exact quotes.
                  </li>
                </ul>
              </div>
            </section>
          </div>
          )}
        </div>
      </div>

      <SiteFooter />

      <style jsx global>{`
        .changelog-shell {
          background: transparent;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }
        .changelog-viewport {
          flex: 1;
          width: 100%;
          max-width: 820px;
          margin: 0 auto;
          padding: var(--space-7) var(--space-5) var(--space-8);
        }
        .changelog-container h1 {
          font-family: var(--font-serif);
          font-size: var(--text-2xl);
          font-weight: 400;
          letter-spacing: -0.01em;
          color: var(--ink);
          margin: 0 0 var(--space-2);
        }
        .changelog-container .subtitle {
          font-size: var(--text-base);
          color: var(--ink-tertiary);
          margin: 0 0 var(--space-6);
          padding-bottom: var(--space-5);
          border-bottom: 1px solid var(--border);
        }
        .changelog-list {
          display: flex;
          flex-direction: column;
        }
        .changelog-item {
          display: grid;
          grid-template-columns: 140px 1fr;
          gap: var(--space-5);
          padding: var(--space-6) 0;
          border-bottom: 1px solid var(--border);
        }
        .changelog-item:last-child {
          border-bottom: 0;
        }
        .changelog-meta {
          display: flex;
          flex-direction: column;
          gap: var(--space-1);
        }
        .version-badge {
          align-self: flex-start;
          font-family: var(--font-serif);
          font-size: var(--text-base);
          color: var(--accent);
          background: var(--accent-soft);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-full);
          box-shadow: inset 0 1px 0 0 var(--glass-highlight);
          padding: 2px 14px;
        }
        .version-stable {
          color: var(--ink-secondary);
          background: var(--glass-bg-soft);
        }
        .changelog-date {
          font-size: var(--text-xs);
          color: var(--ink-tertiary);
        }
        .changelog-details h2 {
          margin: 0 0 var(--space-3);
          font-size: var(--text-lg);
          font-weight: 600;
          line-height: 1.4;
          color: var(--ink);
        }
        .changelog-details p {
          font-size: var(--text-base);
          line-height: 1.65;
          color: var(--ink-secondary);
          margin: 0 0 var(--space-4);
        }
        .changelog-details ul {
          margin: 0;
          padding-left: 18px;
        }
        .changelog-details li {
          font-size: var(--text-sm);
          line-height: 1.65;
          margin-bottom: var(--space-2);
          color: var(--ink-secondary);
        }
        .changelog-details strong {
          color: var(--ink);
          font-weight: 600;
        }
        .changelog-details code {
          background: var(--tag-neutral-bg);
          border-radius: 6px;
          padding: 1px 5px;
          font-size: 0.9em;
        }
        @media (max-width: 768px) {
          .changelog-item {
            grid-template-columns: 1fr;
            gap: var(--space-3);
          }
          .changelog-meta {
            flex-direction: row;
            align-items: baseline;
            gap: var(--space-3);
          }
        }
      `}</style>
    </main>
  );
}
