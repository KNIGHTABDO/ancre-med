"use client";

import Link from "next/link";
import type { JSX } from "react";
import { useLang, tr } from "../lib/i18n";

export function SiteFooter(): JSX.Element {
  const { lang } = useLang();
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <p className="site-footer-brand">
          {tr(
            lang,
            "AncreMed © 2026 — Outil libre d’attribution clinique",
            "AncreMed © 2026 — Free clinical attribution tool"
          )}
        </p>
        <nav className="site-footer-links">
          <Link href="/chat">Console</Link>
          <Link href="/paper">{tr(lang, "Recherche", "Research")}</Link>
          <Link href="/changelog">Changelog</Link>
          <Link href="/terms">{tr(lang, "CGU", "Terms")}</Link>
          <Link href="/privacy">{tr(lang, "Confidentialité", "Privacy")}</Link>
        </nav>
      </div>
      <style jsx global>{`
        .site-footer {
          border-top: 1px solid var(--glass-border);
          background: transparent;
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
