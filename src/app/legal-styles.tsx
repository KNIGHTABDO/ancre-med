"use client";

import type { JSX } from "react";

/* Shared typography styles for terms / privacy pages. */
export function LegalStyles(): JSX.Element {
  return (
    <style jsx global>{`
      .legal-shell {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        background: transparent;
      }
      .legal-viewport {
        flex: 1;
        width: 100%;
        max-width: 680px;
        margin: 0 auto;
        padding: var(--space-7) var(--space-5) var(--space-8);
      }
      .legal-article h1 {
        font-family: var(--font-serif);
        font-size: var(--text-2xl);
        font-weight: 400;
        letter-spacing: -0.01em;
        line-height: 1.2;
        color: var(--ink);
        margin: 0 0 var(--space-2);
      }
      .legal-updated {
        font-size: var(--text-sm);
        color: var(--ink-tertiary);
        margin: 0 0 var(--space-6);
        padding-bottom: var(--space-5);
        border-bottom: 1px solid var(--border);
      }
      .legal-article h2 {
        font-family: var(--font-serif);
        font-size: var(--text-xl);
        font-weight: 500;
        color: var(--ink);
        margin: var(--space-6) 0 var(--space-3);
      }
      .legal-article p {
        font-size: var(--text-base);
        line-height: 1.7;
        color: var(--ink-secondary);
        margin: 0 0 var(--space-4);
      }
      .legal-article strong {
        color: var(--ink);
        font-weight: 600;
      }
      .legal-warning {
        background: var(--warn-bg);
        border: 1px solid var(--warn-border);
        border-radius: var(--radius-lg);
        padding: var(--space-4);
      }
      .legal-warning strong {
        color: var(--warn);
      }
      @media (max-width: 600px) {
        .legal-viewport {
          padding: var(--space-6) var(--space-4) var(--space-7);
        }
      }
    `}</style>
  );
}
