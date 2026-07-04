"use client";

import { useState } from "react";
import Link from "next/link";
import type { JSX } from "react";
import { Logo } from "./Logo";

const NAV_LINKS: ReadonlyArray<{ href: string; label: string }> = [
  { href: "/paper", label: "Rapport scientifique" },
  { href: "/changelog", label: "Changelog" },
];

export function SiteHeader(): JSX.Element {
  const [open, setOpen] = useState<boolean>(false);
  const close = (): void => setOpen(false);

  return (
    <header className={`site-header ${open ? "is-open" : ""}`}>
      <div className="site-header-inner">
        <Logo />

        <nav className="site-nav">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="site-nav-link" onClick={close}>
              {l.label}
            </Link>
          ))}
          <Link href="/chat" className="site-nav-cta" onClick={close}>
            Ouvrir la console
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
          background: var(--bg);
          border-bottom: 1px solid var(--border);
        }
        .site-header-inner {
          max-width: 1080px;
          margin: 0 auto;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 var(--space-5);
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
          background: var(--accent);
          padding: 7px 14px;
          border-radius: var(--radius-md);
          text-decoration: none;
          transition: background var(--dur-fast) var(--ease-in-out);
        }
        .site-nav-cta:hover {
          background: var(--accent-hover);
        }
        .site-nav-toggle {
          display: none;
          background: transparent;
          border: 0;
          color: var(--ink);
          padding: 6px;
          border-radius: var(--radius-sm);
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
            top: 60px;
            left: 0;
            right: 0;
            flex-direction: column;
            align-items: stretch;
            gap: 0;
            background: var(--bg);
            border-bottom: 1px solid var(--border);
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
        }
      `}</style>
    </header>
  );
}
