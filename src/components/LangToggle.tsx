"use client";

import type { JSX } from "react";
import { useLang, type Lang } from "../lib/i18n";

const OPTIONS: readonly Lang[] = ["fr", "en"];

export function LangToggle({ className = "" }: { className?: string }): JSX.Element {
  const { lang, setLang } = useLang();

  return (
    <div className={`lang-toggle ${className}`.trim()} role="group" aria-label="Language">
      {OPTIONS.map((option) => (
        <button
          key={option}
          type="button"
          className={`lang-toggle-opt ${lang === option ? "active" : ""}`.trim()}
          aria-pressed={lang === option}
          onClick={() => setLang(option)}
        >
          {option.toUpperCase()}
        </button>
      ))}

      <style jsx global>{`
        .lang-toggle {
          display: inline-flex;
          align-items: center;
          gap: 2px;
          padding: 3px;
          border-radius: var(--radius-full);
          background: var(--glass-bg-soft);
          border: 1px solid var(--glass-border);
          box-shadow: inset 0 1px 0 0 var(--glass-highlight);
        }
        .lang-toggle-opt {
          border: 0;
          background: transparent;
          color: var(--ink-tertiary);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.04em;
          padding: 3px 9px;
          border-radius: var(--radius-full);
          transition:
            background var(--dur-fast) var(--ease-in-out),
            color var(--dur-fast) var(--ease-in-out),
            transform var(--dur-fast) var(--ease-spring);
        }
        .lang-toggle-opt:hover {
          color: var(--ink);
        }
        .lang-toggle-opt:active {
          transform: scale(0.95);
        }
        .lang-toggle-opt.active {
          background: var(--accent-soft);
          color: var(--accent);
        }
      `}</style>
    </div>
  );
}
