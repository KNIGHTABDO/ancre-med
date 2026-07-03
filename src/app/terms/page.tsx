"use client";

import { useState } from "react";
import Link from "next/link";
import type { JSX } from "react";

export default function TermsPage(): JSX.Element {
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
          </nav>
        </div>
      </header>

      <div className="legal-viewport">
        <article className="legal-card">
          <h1>Conditions Générales d'Utilisation</h1>
          <p className="last-updated">Dernière mise à jour : Juin 2026</p>
          
          <p>
            Bienvenue sur AncreMed. En accédant ou en utilisant notre service, vous acceptez de vous conformer aux présentes Conditions Générales d'Utilisation (CGU).
          </p>

          <h2>1. Clause de non-responsabilité médicale (Important)</h2>
          <p className="warning-text">
            <strong>ATTENTION :</strong> AncreMed est un outil purement informatif et éducatif destiné à la formation académique des étudiants en médecine. 
            Il ne constitue pas un dispositif médical et ne doit en aucun cas être utilisé pour diagnostiquer, traiter ou conseiller un patient réel. 
            Les réponses fournies sont générées par intelligence artificielle à partir d'extraits documentaires et peuvent comporter des erreurs de transcription 
            ou des interprétations erronées. La responsabilité des décisions cliniques incombe exclusivement aux praticiens de santé.
          </p>

          <h2>2. Utilisation du service</h2>
          <p>
            Vous vous engagez à ne pas utiliser l'application de manière abusive ou à soumettre des données malveillantes visant à perturber le fonctionnement du moteur sémantique.
          </p>

          <h2>3. Propriété intellectuelle & Licence</h2>
          <p>
            Le code source d'AncreMed est libre et distribué sous licence MIT. Les données cliniques indexées appartiennent à leurs autorités de réglementation respectives (HAS, ANSM).
          </p>

          <h2>4. Limites de Garantie</h2>
          <p>
            Le service est fourni "en l'état", sans garantie de disponibilité continue ou d'exactitude absolue des informations fournies par les API de tiers.
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
        .warning-text {
          background: #fff8f8;
          border-left: 4px solid #c0392b;
          padding: 14px 18px;
          border-radius: 0 8px 8px 0;
          color: #c0392b !important;
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
