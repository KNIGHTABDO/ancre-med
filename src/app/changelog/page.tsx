"use client";

import type { JSX } from "react";
import { SiteHeader } from "../../components/SiteHeader";
import { SiteFooter } from "../../components/SiteFooter";

export default function ChangelogPage(): JSX.Element {
  return (
    <main className="changelog-shell">
      <SiteHeader />

      <div className="changelog-viewport fade-up">
        <div className="changelog-container">
          <h1>Changelog</h1>
          <p className="subtitle">L’évolution technique et clinique du moteur AncreMed.</p>

          <div className="changelog-list">
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
