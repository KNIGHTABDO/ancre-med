"use client";

import { useState } from "react";
import Link from "next/link";
import type { JSX } from "react";

export default function PrivacyPage(): JSX.Element {
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  return (
    <main className="legal-shell">
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

      <div className="legal-viewport">
        <article className="legal-card">
          <h1>Politique de Confidentialité</h1>
          <p className="last-updated">Dernière mise à jour : Juin 2026</p>
          
          <p>
            AncreMed est un outil libre d'attribution et de recherche clinique conçu pour les étudiants en médecine et les professionnels de santé. 
            Nous accordons une importance primordiale au respect de votre vie privée et à la sécurité de vos données.
          </p>

          <h2>1. Approche Local-First (Stockage local)</h2>
          <p>
            L'architecture d'AncreMed est conçue pour fonctionner de manière locale. Toutes les requêtes de recherche formulées 
            dans l'application sont exécutées directement sur votre instance locale à l'aide d'une base de données SQLite intégrée. 
            Vos historiques de discussion sont stockés exclusivement dans la mémoire locale de votre navigateur (via localStorage ou indexedDB).
          </p>

          <h2>2. Données partagées avec des tiers</h2>
          <p>
            Pour la génération de réponses détaillées, vos requêtes cliniques et les documents sources extraits sont envoyés de manière 
            sécurisée aux APIs de génération d'intelligence artificielle (Google Gemini API). Aucun identifiant personnel n'est associé à ces requêtes.
            Nous ne vendons, ne louons et ne partageons aucune donnée utilisateur à des fins commerciales.
          </p>

          <h2>3. Cookies et Suivi analytique</h2>
          <p>
            AncreMed n'utilise aucun cookie de suivi publicitaire ni aucun traceur tiers. L'application respecte pleinement les 
            recommandations de la CNIL et le Règlement Général sur la Protection des Données (RGPD).
          </p>

          <h2>4. Droits des utilisateurs</h2>
          <p>
            Puisque vos données de clavardage sont stockées exclusivement sur votre machine locale, vous pouvez à tout moment 
            supprimer l'intégralité de vos historiques de discussion en cliquant sur "Effacer tout" dans la console clinique ou 
            en vidant les données de navigation associées à ce domaine dans votre navigateur.
          </p>
        </article>
      </div>

      <style jsx global>{`
        .legal-shell {
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
        .legal-viewport {
          max-width: 760px;
          margin: 0 auto;
          padding: 60px 24px;
        }
        .legal-card {
          background: #ffffff;
          border: 1px solid rgba(134, 148, 144, 0.22);
          border-radius: 16px;
          padding: 40px;
          box-shadow: 0 12px 36px rgba(25, 42, 38, 0.02);
        }
        .legal-card h1 {
          margin: 0 0 8px;
          font-size: 28px;
          font-weight: 800;
          color: #005c53;
        }
        .last-updated {
          font-size: 13px;
          color: #8f9996;
          margin: 0 0 32px;
        }
        .legal-card h2 {
          font-size: 18px;
          font-weight: 750;
          color: #21313a;
          margin: 28px 0 12px;
        }
        .legal-card p {
          font-size: 14.5px;
          line-height: 1.6;
          color: #4a5553;
          margin-bottom: 16px;
        }

        @media (max-width: 600px) {
          .legal-viewport {
            padding: 20px 12px 60px;
          }
          .legal-card {
            padding: 20px 16px;
          }
          .legal-card h1 {
            font-size: 22px;
          }
          .header-nav-menu a:nth-child(4),
          .header-nav-menu a:nth-child(5) {
            display: none !important;
          }
        }
      `}</style>
    </main>
  );
}
