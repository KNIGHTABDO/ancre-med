import Link from "next/link";
import type { JSX } from "react";

export function SiteFooter(): JSX.Element {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <p className="site-footer-brand">AncreMed © 2026 — Outil libre d’attribution clinique</p>
        <nav className="site-footer-links">
          <Link href="/chat">Console</Link>
          <Link href="/paper">Recherche</Link>
          <Link href="/changelog">Changelog</Link>
          <Link href="/terms">CGU</Link>
          <Link href="/privacy">Confidentialité</Link>
        </nav>
      </div>
      <style jsx global>{`
        .site-footer {
          border-top: 1px solid var(--border);
          background: var(--bg);
          padding: var(--space-5);
        }
        .site-footer-inner {
          max-width: 1080px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: var(--space-4);
        }
        .site-footer-brand {
          font-size: var(--text-xs);
          color: var(--ink-tertiary);
          margin: 0;
        }
        .site-footer-links {
          display: flex;
          align-items: center;
          gap: var(--space-4);
        }
        .site-footer-links a {
          font-size: var(--text-xs);
          color: var(--ink-secondary);
          text-decoration: none;
          transition: color var(--dur-fast) var(--ease-in-out);
        }
        .site-footer-links a:hover {
          color: var(--ink);
        }
        @media (max-width: 600px) {
          .site-footer-inner {
            flex-direction: column;
            text-align: center;
          }
        }
      `}</style>
    </footer>
  );
}
