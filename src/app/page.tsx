"use client";

import Link from "next/link";
import type { JSX } from "react";
import { SiteHeader } from "../components/SiteHeader";
import { SiteFooter } from "../components/SiteFooter";
import { Button } from "../components/Button";
import { useLang, tr, type Lang } from "../lib/i18n";

const PIPELINE_STEPS: Record<Lang, ReadonlyArray<{ num: string; title: string; desc: string }>> = {
  fr: [
    { num: "01", title: "Question", desc: "Vous posez une question clinique, comme à un confrère." },
    { num: "02", title: "Recherche", desc: "76 303 fiches HAS, ANSM et EDN interrogées localement." },
    { num: "03", title: "Rédaction", desc: "Une réponse structurée, rédigée à partir des seuls extraits retrouvés." },
    { num: "04", title: "Vérification", desc: "Chaque assertion chiffrée contrôlée mot à mot contre le texte source." },
  ],
  en: [
    { num: "01", title: "Question", desc: "You ask a clinical question, as you would a colleague." },
    { num: "02", title: "Search", desc: "76,303 HAS, ANSM and EDN reference sheets queried locally." },
    { num: "03", title: "Drafting", desc: "A structured answer, written only from the retrieved excerpts." },
    { num: "04", title: "Verification", desc: "Every numeric assertion checked word for word against the source text." },
  ],
};

const FEATURES: Record<Lang, ReadonlyArray<{ title: string; desc: string }>> = {
  fr: [
    {
      title: "Index médicaux locaux",
      desc: "Recherche plein texte instantanée dans plus de 76 000 fiches de référence. Aucune latence cloud pour la recherche documentaire.",
    },
    {
      title: "Reformulation sémantique",
      desc: "Le routeur reformule votre question en mots-clés optimisés — traduction des sigles, synonymes cliniques — pour maximiser le rappel.",
    },
    {
      title: "Double valve clinique",
      desc: "Chaque dosage, seuil ou critère diagnostique est vérifié contre le texte original. En cas de dérive factuelle, la réponse est bloquée.",
    },
  ],
  en: [
    {
      title: "Local medical indices",
      desc: "Instant full-text search across more than 76,000 reference sheets. Zero cloud latency for document retrieval.",
    },
    {
      title: "Semantic reformulation",
      desc: "The router rewrites your question into optimized keywords — expanding acronyms, adding clinical synonyms — to maximize recall.",
    },
    {
      title: "Dual clinical valve",
      desc: "Every dosage, threshold or diagnostic criterion is verified against the original text. On factual drift, the answer is blocked.",
    },
  ],
};

export default function LandingPage(): JSX.Element {
  const { lang } = useLang();
  return (
    <main className="landing-shell">
      <SiteHeader />

      <section className="hero fade-up">
        <div className="hero-inner">
          <Link href="/changelog" className="hero-eyebrow">
            {tr(lang, "Nouveau · Propulsé par Gemini 3.5 Flash", "New · Powered by Gemini 3.5 Flash")}
          </Link>
          {lang === "fr" ? (
            <h1>
              Des réponses cliniques que
              <br />
              vous pouvez <em>vérifier</em>.
            </h1>
          ) : (
            <h1>
              Clinical answers you
              <br />
              can <em>verify</em>.
            </h1>
          )}
          <p className="hero-desc">
            {tr(
              lang,
              "AncreMed interroge 76 303 fiches issues des référentiels de la Haute Autorité de Santé, de la base des médicaments ANSM et du Collège des Enseignants — et vérifie chaque assertion mot à mot contre le texte source.",
              "AncreMed queries 76,303 sheets drawn from the Haute Autorité de Santé guidelines, the ANSM drug database and the Collège des Enseignants — and verifies every assertion word for word against the source text."
            )}
          </p>
          <div className="hero-actions">
            <Button href="/chat">{tr(lang, "Ouvrir la console", "Open the console")}</Button>
            <Button href="/paper" variant="secondary">
              {tr(lang, "Lire le rapport scientifique", "Read the scientific report")}
            </Button>
          </div>
        </div>
      </section>

      <section className="pipeline">
        <div className="pipeline-inner">
          <h2>{tr(lang, "Comment une réponse est construite", "How an answer is built")}</h2>
          <ol className="pipeline-steps">
            {PIPELINE_STEPS[lang].map((s) => (
              <li key={s.num} className="pipeline-step">
                <span className="pipeline-num">{s.num}</span>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="features">
        <div className="features-inner">
          <h2>{tr(lang, "Conçu pour l’EDN et la pratique hospitalière", "Built for the EDN and hospital practice")}</h2>
          <div className="features-grid">
            {FEATURES[lang].map((f) => (
              <article key={f.title} className="feature">
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />

      <style jsx global>{`
        .landing-shell {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: transparent;
        }

        /* Hero */
        .hero {
          padding: var(--space-8) var(--space-5) var(--space-8);
        }
        .hero-inner {
          max-width: 760px;
          margin: 0 auto;
          text-align: center;
        }
        .hero-eyebrow {
          display: inline-block;
          font-size: var(--text-sm);
          color: var(--ink-secondary);
          text-decoration: none;
          margin-bottom: var(--space-5);
          padding: 5px 16px;
          border-radius: var(--radius-full);
          background: var(--glass-bg-soft);
          border: 1px solid var(--glass-border);
          box-shadow: inset 0 1px 0 0 var(--glass-highlight);
          transition:
            color var(--dur-fast) var(--ease-in-out),
            border-color var(--dur-fast) var(--ease-in-out);
        }
        .hero-eyebrow:hover {
          color: var(--ink);
          border-color: var(--border-strong);
        }
        .hero h1 {
          font-family: var(--font-serif);
          font-size: var(--text-4xl);
          font-weight: 400;
          line-height: 1.15;
          letter-spacing: -0.01em;
          color: var(--ink);
          margin: 0 0 var(--space-5);
        }
        .hero h1 em {
          font-style: italic;
          color: var(--accent);
        }
        .hero-desc {
          font-size: var(--text-lg);
          line-height: 1.65;
          color: var(--ink-secondary);
          max-width: 620px;
          margin: 0 auto var(--space-6);
        }
        .hero-actions {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-3);
        }

        /* Pipeline strip */
        .pipeline {
          border-top: 1px solid var(--glass-border);
          padding: var(--space-7) var(--space-5);
        }
        .pipeline-inner {
          max-width: 1080px;
          margin: 0 auto;
        }
        .pipeline h2,
        .features h2 {
          font-family: var(--font-serif);
          font-size: var(--text-2xl);
          font-weight: 400;
          letter-spacing: -0.01em;
          color: var(--ink);
          margin: 0 0 var(--space-6);
          text-align: center;
        }
        .pipeline-steps {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
        }
        .pipeline-step {
          padding: 0 var(--space-5);
          border-left: 1px solid var(--border);
        }
        .pipeline-step:first-child {
          border-left: 0;
        }
        .pipeline-num {
          font-family: var(--font-serif);
          font-size: var(--text-base);
          color: var(--ink-tertiary);
        }
        .pipeline-step h3 {
          font-size: var(--text-base);
          font-weight: 600;
          color: var(--ink);
          margin: var(--space-2) 0 var(--space-2);
        }
        .pipeline-step p {
          font-size: var(--text-sm);
          line-height: 1.6;
          color: var(--ink-secondary);
          margin: 0;
        }

        /* Features */
        .features {
          border-top: 1px solid var(--glass-border);
          padding: var(--space-7) var(--space-5) var(--space-8);
        }
        .features-inner {
          max-width: 1080px;
          margin: 0 auto;
        }
        .features-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--space-4);
        }
        .feature {
          padding: var(--space-6) var(--space-5);
          background: var(--glass-bg);
          -webkit-backdrop-filter: blur(var(--blur-md)) saturate(var(--glass-saturate));
          backdrop-filter: blur(var(--blur-md)) saturate(var(--glass-saturate));
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-lg);
          box-shadow: inset 0 1px 0 0 var(--glass-highlight), var(--glass-shadow);
        }
        @supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
          .feature {
            background: var(--glass-fallback);
          }
        }
        .feature h3 {
          font-size: var(--text-base);
          font-weight: 600;
          color: var(--ink);
          margin: 0 0 var(--space-3);
        }
        .feature p {
          font-size: var(--text-sm);
          line-height: 1.65;
          color: var(--ink-secondary);
          margin: 0;
        }

        @media (max-width: 900px) {
          .pipeline-steps {
            grid-template-columns: repeat(2, 1fr);
            row-gap: var(--space-6);
          }
          .pipeline-step:nth-child(3) {
            border-left: 0;
          }
          .features-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 600px) {
          .hero {
            padding: var(--space-7) var(--space-4);
          }
          .hero h1 {
            font-size: var(--text-3xl);
          }
          .hero-desc {
            font-size: var(--text-base);
          }
          .hero-actions {
            flex-direction: column;
            width: 100%;
            max-width: 300px;
            margin: 0 auto;
          }
          .hero-actions .am-btn {
            width: 100%;
          }
          .pipeline-steps {
            grid-template-columns: 1fr;
          }
          .pipeline-step {
            border-left: 0;
            padding: 0;
          }
        }
      `}</style>
    </main>
  );
}
