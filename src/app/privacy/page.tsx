"use client";

import type { JSX } from "react";
import { SiteHeader } from "../../components/SiteHeader";
import { SiteFooter } from "../../components/SiteFooter";
import { LegalStyles } from "../legal-styles";
import { useLang } from "../../lib/i18n";

export default function PrivacyPage(): JSX.Element {
  const { lang } = useLang();
  const s = (fr: string, en: string): string => (lang === "fr" ? fr : en);

  return (
    <main className="legal-shell">
      <SiteHeader />

      <div className="legal-viewport">
        <article className="legal-article fade-up">
          <h1>{s("Politique de confidentialité", "Privacy Policy")}</h1>
          <p className="legal-updated">{s("Dernière mise à jour : juin 2026", "Last updated: June 2026")}</p>

          <p>
            {s(
              "AncreMed est un outil libre d’attribution et de recherche clinique conçu pour les étudiants en médecine et les professionnels de santé. Nous accordons une importance primordiale au respect de votre vie privée et à la sécurité de vos données.",
              "AncreMed is a free clinical attribution and research tool designed for medical students and healthcare professionals. We place the utmost importance on respecting your privacy and the security of your data."
            )}
          </p>

          <h2>{s("1. Approche local-first (stockage local)", "1. Local-first approach (local storage)")}</h2>
          <p>
            {s(
              "L’architecture d’AncreMed est conçue pour fonctionner de manière locale. Toutes les requêtes de recherche formulées dans l’application sont exécutées directement sur votre instance locale à l’aide d’une base de données SQLite intégrée. Vos historiques de discussion sont stockés exclusivement dans la mémoire locale de votre navigateur (via localStorage ou indexedDB).",
              "AncreMed's architecture is designed to run locally. All search queries made in the application are executed directly on your local instance using an embedded SQLite database. Your chat histories are stored exclusively in your browser's local memory (via localStorage or indexedDB)."
            )}
          </p>

          <h2>{s("2. Données partagées avec des tiers", "2. Data shared with third parties")}</h2>
          <p>
            {s(
              "Pour la génération de réponses détaillées, vos requêtes cliniques et les documents sources extraits sont envoyés de manière sécurisée aux API de génération d’intelligence artificielle (Google Gemini API). Aucun identifiant personnel n’est associé à ces requêtes. Nous ne vendons, ne louons et ne partageons aucune donnée utilisateur à des fins commerciales.",
              "To generate detailed answers, your clinical queries and the extracted source documents are sent securely to the artificial-intelligence generation APIs (Google Gemini API). No personal identifier is associated with these requests. We do not sell, rent, or share any user data for commercial purposes."
            )}
          </p>

          <h2>{s("3. Cookies et suivi analytique", "3. Cookies and analytics tracking")}</h2>
          <p>
            {s(
              "AncreMed n’utilise aucun cookie de suivi publicitaire ni aucun traceur tiers. L’application respecte pleinement les recommandations de la CNIL et le Règlement Général sur la Protection des Données (RGPD).",
              "AncreMed uses no advertising tracking cookies and no third-party trackers. The application fully complies with CNIL recommendations and the General Data Protection Regulation (GDPR)."
            )}
          </p>

          <h2>{s("4. Droits des utilisateurs", "4. User rights")}</h2>
          <p>
            {s(
              "Puisque vos données de discussion sont stockées exclusivement sur votre machine locale, vous pouvez à tout moment supprimer l’intégralité de vos historiques en les effaçant depuis la console clinique ou en vidant les données de navigation associées à ce domaine dans votre navigateur.",
              "Since your chat data is stored exclusively on your local machine, you can delete all of your histories at any time by clearing them from the clinical console or by wiping the browsing data associated with this domain in your browser."
            )}
          </p>
        </article>
      </div>

      <SiteFooter />
      <LegalStyles />
    </main>
  );
}
