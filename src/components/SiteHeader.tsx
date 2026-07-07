"use client";

import { useState } from "react";
import Link from "next/link";
import type { JSX } from "react";
import { Logo } from "./Logo";
import { LangToggle } from "./LangToggle";
import { useLang, tr } from "../lib/i18n";

export function SiteHeader(): JSX.Element {
  const [open, setOpen] = useState<boolean>(false);
  const { lang } = useLang();
  const close = (): void => setOpen(false);

  const navLinks: ReadonlyArray<{ href: string; label: string }> = [
    { href: "/paper", label: tr(lang, "Rapport scientifique", "Scientific report") },
    { href: "/changelog", label: "Changelog" },
  ];

  return (
    <header className={`site-header ${open ? "is-open" : ""}`}>
      <div className="site-header-inner">
        <Logo />

        <nav className="site-nav">
          {navLinks.map((l) => (
            <Link key={l.href} href={l.href} className="site-nav-link" onClick={close}>
              {l.label}
            </Link>
          ))}
          <LangToggle className="site-nav-lang" />
          <Link href="/chat" className="site-nav-cta" onClick={close}>
            {tr(lang, "Ouvrir la console", "Open the console")}
          </Link>
        </nav>

        <button
          className="site-nav-toggle"
          onClick={() => setOpen(!open)}
          aria-label="Menu"
          aria-expanded={open}
        >
          {open ? (
            <svg fill="none" height="20" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24" width="20">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          ) : (
            <svg fill="none" height="20" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24" width="20">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          )}
        </button>
      </div>

      <style jsx global>{`
        .site-header {
          position: sticky;
          top: 0;
          z-index: 100;
          background: transparent;
          padding: 10px var(--space-4) 0;
        }
        .site-header-inner {
          position: relative;
          max-width: 1080px;
          margin: 0 auto;
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 var(--space-5);
          border-radius: var(--radius-full);
          background: var(--glass-bg-strong);
          -webkit-backdrop-filter: blur(var(--blur-lg)) saturate(var(--glass-saturate));
          backdrop-filter: blur(var(--blur-lg)) saturate(var(--glass-saturate));
          border: 1px solid var(--glass-border);
          box-shadow: inset 0 1px 0 0 var(--glass-highlight), var(--glass-shadow);
        }
        @supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
          .site-header-inner {
            background: var(--glass-fallback);
          }
        }
        .site-nav {
          display: flex;
          align-items: center;
          gap: var(--space-5);
        }
        .site-nav-link {
          font-size: var(--text-sm);
          font-weight: 500;
          color: var(--ink-secondary);
          text-decoration: none;
          transition: color var(--dur-fast) var(--ease-in-out);
        }
        .site-nav-link:hover {
          color: var(--ink);
        }
        .site-nav-cta {
          font-size: var(--text-sm);
          font-weight: 500;
          color: var(--accent-ink);
          background: linear-gradient(
            180deg,
            color-mix(in srgb, var(--accent) 85%, white) 0%,
            var(--accent) 100%
          );
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.35),
            0 4px 14px color-mix(in srgb, var(--accent) 35%, transparent);
          padding: 8px 16px;
          border-radius: var(--radius-full);
          text-decoration: none;
          transition:
            background var(--dur-fast) var(--ease-in-out),
            transform var(--dur-fast) var(--ease-spring);
        }
        .site-nav-cta:hover {
          background: linear-gradient(
            180deg,
            color-mix(in srgb, var(--accent-hover) 85%, white) 0%,
            var(--accent-hover) 100%
          );
          transform: translateY(-1px);
        }
        .site-nav-toggle {
          display: none;
          background: transparent;
          border: 0;
          color: var(--ink);
          padding: 6px;
          border-radius: var(--radius-full);
        }
        .site-nav-toggle:hover {
          background: var(--bg-hover);
        }

        @media (max-width: 768px) {
          .site-nav-toggle {
            display: flex;
          }
          .site-nav {
            display: none;
            position: absolute;
            top: calc(100% + 8px);
            left: var(--space-4);
            right: var(--space-4);
            flex-direction: column;
            align-items: stretch;
            gap: 0;
            border-radius: var(--radius-xl);
            /* No backdrop-filter here: this panel is a descendant of the blurred
               header capsule, so its own blur would sample nothing. Near-opaque
               glass instead. */
            background: var(--glass-fallback);
            border: 1px solid var(--glass-border);
            box-shadow: inset 0 1px 0 0 var(--glass-highlight), var(--glass-shadow);
            padding: var(--space-3) var(--space-5) var(--space-4);
          }
          .site-header.is-open .site-nav {
            display: flex;
          }
          .site-nav-link {
            padding: var(--space-3) 0;
            font-size: var(--text-base);
            border-bottom: 1px solid var(--border);
          }
          .site-nav-cta {
            margin-top: var(--space-3);
            text-align: center;
            padding: 11px 14px;
          }
          .site-nav-lang {
            align-self: center;
            margin-top: var(--space-3);
          }
        }
      `}</style>
    </header>
  );
}
