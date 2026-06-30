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
            <Link href="/terms" className="nav-menu-link" onClick={() => setMobileMenuOpen(false)}>
              CGU
            </Link>
            <Link href="/privacy" className="nav-menu-link" onClick={() => setMobileMenuOpen(false)}>
              Confidentialité
            </Link>
          </nav>
        </div>
      </header>

      <div className="changelog-viewport">
        <div className="changelog-container">
          <h1>Journal des Modifications (Changelog)</h1>
          <p className="subtitle">Suivez l'évolution technique et clinique du moteur AncreMed.</p>

          <div className="changelog-list">
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
          max-width: 1100px;
          margin: 0 auto;
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
