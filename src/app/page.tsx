"use client";

import { useState } from "react";
import Link from "next/link";
import type { JSX } from "react";

export default function LandingPage(): JSX.Element {
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  return (
    <main className="workspace-shell">
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

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-container">
          <span className="hero-badge">Console RAG Clinique Haute-Attribution</span>
          <h1>L'intelligence médicale clinique, <br /><span className="text-teal">garantie sans hallucinations</span></h1>
          <p className="hero-desc">
            Interrogez en temps réel 76 303 fiches issues des référentiels de la <strong>Haute Autorité de Santé (HAS)</strong>, 
            de la <strong>Base des Médicaments (ANSM)</strong> et du <strong>Collège des Enseignants (EDN)</strong>. 
            Une double valve d'attribution vérifie chaque fait mot à mot.
          </p>
          <div className="hero-actions">
            <Link href="/chat" className="btn btn-primary">
              Lancer la Console
              <svg fill="none" height="16" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" width="16">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
            <Link href="/paper" className="btn btn-secondary">
              Découvrir la Technologie
            </Link>
          </div>
        </div>
      </section>

      {/* SVG Pipeline Architecture Diagram */}
      <section className="diagram-section">
        <div className="diagram-container">
          <h2>Architecture du Moteur RAG Local</h2>
          <p className="section-desc">
            Visualisez le parcours de votre question clinique à travers nos modules d'IA et nos index sémantiques locaux.
          </p>

          <div className="svg-wrapper">
            <svg className="architecture-svg" viewBox="0 0 800 420" width="100%" height="auto">
              <defs>
                <linearGradient id="grad-teal" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#005c53" />
                  <stop offset="100%" stopColor="#043d37" />
                </linearGradient>
                <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
                  <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#192a26" floodOpacity="0.04" />
                </filter>
              </defs>

              {/* Step 1: Input */}
              <g transform="translate(40, 180)" filter="url(#shadow)">
                <rect width="130" height="60" rx="10" fill="#ffffff" stroke="rgba(134,148,144,0.3)" strokeWidth="1" />
                <text x="65" y="28" textAnchor="middle" fill="#21313a" fontSize="13" fontWeight="600">Question Médicale</text>
                <text x="65" y="44" textAnchor="middle" fill="#64716d" fontSize="10">Étudiant / Interne</text>
              </g>

              {/* Arrow 1 */}
              <path d="M170 210 L 210 210" stroke="#005c53" strokeWidth="2" strokeDasharray="4 3" />
              <polygon points="210,207 217,210 210,213" fill="#005c53" />

              {/* Step 2: Agentic Router */}
              <g transform="translate(220, 150)" filter="url(#shadow)">
                <rect width="160" height="120" rx="12" fill="#005c53" stroke="#005c53" strokeWidth="1.5" />
                <text x="80" y="32" textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="600">Routeur IA Agentic</text>
                <text x="80" y="55" textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize="11">Classification &</text>
                <text x="80" y="70" textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize="11">Reformulation</text>
                <text x="80" y="95" textAnchor="middle" fill="#2ecc71" fontSize="10" fontWeight="700">Gemini-3.1-Flash-Lite</text>
              </g>

              {/* Branch 1: Conversational Bypass (Up) */}
              <path d="M300 150 L 300 80 L 610 80" fill="none" stroke="#e67e22" strokeWidth="2" strokeDasharray="3 3" />
              <polygon points="610,77 617,80 610,83" fill="#e67e22" />
              <text x="310" y="110" fill="#e67e22" fontSize="10" fontWeight="600">Dialogue direct (Bypass)</text>

              {/* Arrow 2 */}
              <path d="M380 210 L 420 210" stroke="#005c53" strokeWidth="2" />
              <polygon points="420,207 427,210 420,213" fill="#005c53" />

              {/* Step 3: Retrieval Sources */}
              <g transform="translate(430, 150)" filter="url(#shadow)">
                <rect width="160" height="120" rx="12" fill="#ffffff" stroke="rgba(134,148,144,0.3)" strokeWidth="1" />
                <text x="80" y="28" textAnchor="middle" fill="#21313a" fontSize="13" fontWeight="700">Index de Recherche</text>
                <text x="80" y="52" textAnchor="middle" fill="#005c53" fontSize="11" fontWeight="600">SQLite FTS5 (Local)</text>
                <text x="80" y="70" textAnchor="middle" fill="#3b5bdb" fontSize="11" fontWeight="600">api-medicaments.fr</text>
                <text x="80" y="88" textAnchor="middle" fill="#0c8599" fontSize="11" fontWeight="600">Wikipedia FR API</text>
                <text x="80" y="106" textAnchor="middle" fill="#64716d" fontSize="9">76 303 fiches cliniques</text>
              </g>

              {/* Arrow 3 */}
              <path d="M590 210 L 620 210" stroke="#005c53" strokeWidth="2" />
              <polygon points="620,207 627,210 620,213" fill="#005c53" />

              {/* Step 4: Generation & Attributor */}
              <g transform="translate(630, 50)" filter="url(#shadow)">
                <rect width="140" height="310" rx="12" fill="#ffffff" stroke="rgba(134,148,144,0.3)" strokeWidth="1" />
                <text x="70" y="32" textAnchor="middle" fill="#21313a" fontSize="13" fontWeight="700">Attribution</text>
                <text x="70" y="48" textAnchor="middle" fill="#005c53" fontSize="11" fontWeight="600">Valve Clinique</text>
                
                <rect x="15" y="75" width="110" height="50" rx="6" fill="#f1fcf9" stroke="rgba(0,92,83,0.18)" />
                <text x="70" y="93" textAnchor="middle" fill="#005c53" fontSize="10" fontWeight="700">1. Génération</text>
                <text x="70" y="108" textAnchor="middle" fill="#5c6a6f" fontSize="9">Gemini Flash-Lite</text>

                <rect x="15" y="145" width="110" height="50" rx="6" fill="#fff8f8" stroke="rgba(231,76,60,0.18)" />
                <text x="70" y="163" textAnchor="middle" fill="#c0392b" fontSize="10" fontWeight="700">2. Extraction</text>
                <text x="70" y="178" textAnchor="middle" fill="#5c6a6f" fontSize="9">Allégations Cliniques</text>

                <rect x="15" y="215" width="110" height="70" rx="6" fill="#e8f8f5" stroke="rgba(46,204,113,0.18)" />
                <text x="70" y="233" textAnchor="middle" fill="#2ecc71" fontSize="10" fontWeight="700">3. Attribution</text>
                <text x="70" y="250" textAnchor="middle" fill="#21313a" fontSize="9">Contrôle mot-à-mot</text>
                <text x="70" y="265" textAnchor="middle" fill="#21313a" fontSize="9">dans l'index SQLite</text>
              </g>

              {/* Final Output label */}
              <path d="M700 360 L 700 390 L 590 390" fill="none" stroke="#2ecc71" strokeWidth="2" />
              <polygon points="590,387 583,390 590,393" fill="#2ecc71" />
              
              <g transform="translate(420, 365)">
                <rect width="150" height="50" rx="8" fill="#e8f8f5" stroke="#2ecc71" strokeWidth="1" />
                <text x="75" y="22" textAnchor="middle" fill="#27ae60" fontSize="11" fontWeight="700">Réponse validée 200</text>
                <text x="75" y="38" textAnchor="middle" fill="#64716d" fontSize="9">Avec sources citées</text>
              </g>

              <path d="M700 360 L 700 390 L 730 390 L 730 400" fill="none" stroke="#c0392b" strokeWidth="1.5" strokeDasharray="3 2" />
              <polygon points="727,400 730,405 733,400" fill="#c0392b" />
              <text x="740" y="398" fill="#c0392b" fontSize="9" fontWeight="600">Dérive factuelle</text>
              
              <g transform="translate(680, 407)">
                <rect width="105" height="15" rx="3" fill="#fff8f8" stroke="#c0392b" strokeWidth="0.5" />
                <text x="52.5" y="10" textAnchor="middle" fill="#c0392b" fontSize="8" fontWeight="600">Bloqué (Valve 422)</text>
              </g>
            </svg>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="features-section">
        <div className="features-container">
          <h2>Les Piliers d'AncreMed</h2>
          <p className="section-desc">Conçu spécifiquement pour répondre aux exigences des examens EDN et de la pratique hospitalière française.</p>

          <div className="features-grid">
            <article className="feature-card">
              <div className="feature-icon">
                <svg fill="none" height="24" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="24">
                  <ellipse cx="12" cy="5" rx="9" ry="3" />
                  <path d="M3 5v6c0 1.66 4 3 9 3s9-1.34 9-3V5M3 11v6c0 1.66 4 3 9 3s9-1.34 9-3v-6" />
                </svg>
              </div>
              <h3>Index Médicaux Locaux</h3>
              <p>
                Recherche plein texte instantanée dans plus de 76 000 fiches. Aucune latence cloud, aucune clé d'intégration réseau requise pour la recherche.
              </p>
            </article>

            <article className="feature-card">
              <div className="feature-icon">
                <svg fill="none" height="24" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="24">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </div>
              <h3>Optimisation IA Sémantique</h3>
              <p>
                Le routeur IA reformule vos questions cliniques en mots-clés optimisés en français (traduction des sigles, ajout de synonymes) pour maximiser les résultats FTS5.
              </p>
            </article>

            <article className="feature-card">
              <div className="feature-icon">
                <svg fill="none" height="24" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="24">
                  <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3>Double Valve Clinique</h3>
              <p>
                Chaque allégation de dosage ou de diagnostic générée est vérifiée par rapport au texte original. En cas de dérive factuelle, la réponse est bloquée.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* Footer Section */}
      <footer className="landing-footer">
        <div className="footer-container">
          <p className="footer-brand">AncreMed © 2026 - Outil Libre d'Attribution Clinique</p>
          <nav className="footer-links">
            <Link href="/chat">Console</Link>
            <Link href="/paper">Recherche</Link>
            <Link href="/changelog">Changelog</Link>
            <Link href="/terms">CGU</Link>
            <Link href="/privacy">Confidentialité</Link>
          </nav>
        </div>
      </footer>

      {/* Landing Page Custom Styling */}
      <style jsx global>{`
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

        /* Hero styling */
        .hero-section {
          padding: 80px 24px 60px;
          text-align: center;
          position: relative;
          z-index: 2;
        }

        .hero-container {
          max-width: 820px;
          margin: 0 auto;
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          padding: 6px 14px;
          background: rgba(0, 92, 83, 0.06);
          border: 1px solid rgba(0, 92, 83, 0.14);
          border-radius: 30px;
          color: #005c53;
          font-size: 11.5px;
          font-weight: 700;
          margin-bottom: 24px;
          letter-spacing: 0.02em;
          text-transform: uppercase;
        }

        .hero-section h1 {
          font-size: 48px;
          line-height: 1.15;
          font-weight: 800;
          color: #21313a;
          margin: 0 0 20px;
          letter-spacing: -0.02em;
        }

        .hero-section h1 .text-teal {
          color: #005c53;
        }

        .hero-desc {
          font-size: 18px;
          line-height: 1.6;
          color: #4a5553;
          margin: 0 auto 36px;
          max-width: 680px;
          font-weight: 420;
        }

        .hero-desc strong {
          color: #21313a;
          font-weight: 650;
        }

        .hero-actions {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          height: 48px;
          padding: 0 24px;
          border-radius: 10px;
          font-size: 14.5px;
          font-weight: 620;
          text-decoration: none;
          transition: all 180ms ease;
        }

        .btn-primary {
          background: #005c53;
          color: #ffffff;
          box-shadow: 0 6px 20px rgba(0, 92, 83, 0.15);
        }

        .btn-primary:hover {
          background: #064c45;
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(0, 92, 83, 0.22);
        }

        .btn-secondary {
          background: #ffffff;
          border: 1px solid rgba(134, 148, 144, 0.28);
          color: #4a5553;
        }

        .btn-secondary:hover {
          background: #fcfdfc;
          border-color: rgba(134, 148, 144, 0.45);
          color: #21313a;
        }

        /* Diagram section */
        .diagram-section {
          padding: 40px 24px 60px;
          background: rgba(255, 255, 255, 0.6);
          border-top: 1px solid rgba(134, 148, 144, 0.1);
          border-bottom: 1px solid rgba(134, 148, 144, 0.1);
          position: relative;
          z-index: 2;
        }

        .diagram-container {
          max-width: 1100px;
          margin: 0 auto;
          text-align: center;
        }

        .diagram-container h2 {
          font-size: 28px;
          font-weight: 760;
          color: #21313a;
          margin: 0 0 10px;
        }

        .section-desc {
          font-size: 15px;
          color: #64716d;
          margin: 0 auto 40px;
          max-width: 580px;
        }

        .svg-wrapper {
          background: rgba(255, 255, 255, 0.85);
          border: 1px solid rgba(134, 148, 144, 0.22);
          border-radius: 16px;
          padding: 32px 24px;
          box-shadow: 0 12px 36px rgba(25, 42, 38, 0.03);
          max-width: 860px;
          margin: 0 auto;
        }

        .architecture-svg {
          width: 100%;
          height: auto;
        }

        /* Features section */
        .features-section {
          padding: 80px 24px;
          position: relative;
          z-index: 2;
        }

        .features-container {
          max-width: 1100px;
          margin: 0 auto;
          text-align: center;
        }

        .features-container h2 {
          font-size: 28px;
          font-weight: 760;
          color: #21313a;
          margin: 0 0 10px;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 28px;
          margin-top: 50px;
          text-align: left;
        }

        .feature-card {
          background: rgba(255, 255, 255, 0.82);
          border: 1px solid rgba(134, 148, 144, 0.2);
          border-radius: 14px;
          padding: 32px;
          box-shadow: 0 8px 24px rgba(25, 42, 38, 0.02);
          transition: all 220ms ease;
        }

        .feature-card:hover {
          transform: translateY(-2px);
          border-color: rgba(0, 92, 83, 0.24);
          box-shadow: 0 12px 32px rgba(0, 92, 83, 0.05);
        }

        .feature-icon {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          background: rgba(0, 92, 83, 0.06);
          color: #005c53;
          display: grid;
          place-items: center;
          margin-bottom: 20px;
        }

        .feature-card h3 {
          margin: 0 0 12px;
          font-size: 17px;
          font-weight: 720;
          color: #21313a;
        }

        .feature-card p {
          margin: 0;
          font-size: 13.5px;
          line-height: 1.6;
          color: #64716d;
        }

        /* Footer styling */
        .landing-footer {
          border-top: 1px solid rgba(134, 148, 144, 0.16);
          background: rgba(245, 246, 245, 0.4);
          padding: 24px 24px;
          position: relative;
          z-index: 2;
        }

        .footer-container {
          max-width: 1100px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
        }

        .footer-brand {
          font-size: 12.5px;
          color: #8f9996;
          margin: 0;
        }

        .footer-links {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .footer-links a {
          font-size: 12.5px;
          font-weight: 600;
          color: #64716d;
          text-decoration: none;
          transition: color 160ms ease;
        }

        .footer-links a:hover {
          color: #005c53;
        }

        @media (max-width: 768px) {
          .hero-section h1 {
            font-size: 34px;
          }
          .hero-desc {
            font-size: 15px;
          }
          .hero-actions {
            flex-direction: column;
            width: 100%;
            max-width: 280px;
            margin: 0 auto;
          }
          .btn {
            width: 100%;
          }
          .header-nav-menu {
            gap: 14px;
          }
          .footer-container {
            flex-direction: column;
            text-align: center;
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
