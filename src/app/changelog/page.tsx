"use client";

import { useState } from "react";
import Link from "next/link";
import type { JSX } from "react";

export default function ChangelogPage(): JSX.Element {
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  return (
    <main className="changelog-shell">
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
          </nav>
        </div>
      </header>

      <div className="changelog-viewport">
        <div className="changelog-container">
          <h1>Journal des Modifications (Changelog)</h1>
          <p className="subtitle">Suivez l'évolution technique et clinique du moteur AncreMed.</p>

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

      <style jsx global>{`
        .changelog-shell {
          background: #fbfcfb;
          color: #21313a;
          min-height: 100vh;
          font-family: ui-sans-serif, system-ui, sans-serif;
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
        .changelog-viewport {
          max-width: 860px;
          margin: 0 auto;
          padding: 60px 24px;
        }
        .changelog-container h1 {
          font-size: 32px;
          font-weight: 800;
          color: #005c53;
          margin: 0 0 8px;
        }
        .changelog-container .subtitle {
          font-size: 16px;
          color: #64716d;
          margin: 0 0 48px;
        }
        .changelog-list {
          display: flex;
          flex-direction: column;
          gap: 40px;
        }
        .changelog-item {
          display: grid;
          grid-template-columns: 160px 1fr;
          gap: 24px;
          background: #ffffff;
          border: 1px solid rgba(134, 148, 144, 0.2);
          border-radius: 14px;
          padding: 32px;
          box-shadow: 0 4px 20px rgba(25, 42, 38, 0.01);
        }
        .changelog-meta {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .version-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: fit-content;
          height: 24px;
          padding: 0 8px;
          border-radius: 6px;
          background: rgba(0, 92, 83, 0.08);
          color: #005c53;
          font-size: 12px;
          font-weight: 750;
        }
        .version-stable {
          background: rgba(100, 113, 109, 0.1);
          color: #64716d;
        }
        .changelog-date {
          font-size: 12px;
          color: #8f9996;
        }
        .changelog-details h2 {
          margin: 0 0 12px;
          font-size: 18px;
          font-weight: 750;
          color: #21313a;
        }
        .changelog-details p {
          font-size: 14.5px;
          line-height: 1.6;
          color: #5c6a6f;
          margin: 0 0 16px;
        }
        .changelog-details ul {
          margin: 0;
          padding-left: 20px;
        }
        .changelog-details li {
          font-size: 13.5px;
          line-height: 1.65;
          margin-bottom: 10px;
          color: #4a5553;
        }
        @media (max-width: 768px) {
          .changelog-item {
            grid-template-columns: 1fr;
            gap: 16px;
            padding: 24px;
          }
        }
      `}</style>
    </main>
  );
}
