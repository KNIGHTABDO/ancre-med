"use client";

import type { JSX } from "react";
import { SiteHeader } from "../../components/SiteHeader";
import { SiteFooter } from "../../components/SiteFooter";
import { LegalStyles } from "../legal-styles";

export default function PrivacyPage(): JSX.Element {
  return (
    <main className="legal-shell">
      <SiteHeader />

      <div className="legal-viewport">
        <article className="legal-article fade-up">
          <h1>Politique de confidentialité</h1>
          <p className="legal-updated">Dernière mise à jour : juin 2026</p>

          <p>
            AncreMed est un outil libre d’attribution et de recherche clinique conçu pour les
            étudiants en médecine et les professionnels de santé. Nous accordons une importance
            primordiale au respect de votre vie privée et à la sécurité de vos données.
          </p>

          <h2>1. Approche local-first (stockage local)</h2>
          <p>
            L’architecture d’AncreMed est conçue pour fonctionner de manière locale. Toutes les
            requêtes de recherche formulées dans l’application sont exécutées directement sur
            votre instance locale à l’aide d’une base de données SQLite intégrée. Vos historiques
            de discussion sont stockés exclusivement dans la mémoire locale de votre navigateur
            (via localStorage ou indexedDB).
          </p>

          <h2>2. Données partagées avec des tiers</h2>
          <p>
            Pour la génération de réponses détaillées, vos requêtes cliniques et les documents
            sources extraits sont envoyés de manière sécurisée aux API de génération
            d’intelligence artificielle (Google Gemini API). Aucun identifiant personnel n’est
            associé à ces requêtes. Nous ne vendons, ne louons et ne partageons aucune donnée
            utilisateur à des fins commerciales.
          </p>

          <h2>3. Cookies et suivi analytique</h2>
          <p>
            AncreMed n’utilise aucun cookie de suivi publicitaire ni aucun traceur tiers.
            L’application respecte pleinement les recommandations de la CNIL et le Règlement
            Général sur la Protection des Données (RGPD).
          </p>

          <h2>4. Droits des utilisateurs</h2>
          <p>
            Puisque vos données de discussion sont stockées exclusivement sur votre machine
            locale, vous pouvez à tout moment supprimer l’intégralité de vos historiques en les
            effaçant depuis la console clinique ou en vidant les données de navigation associées
            à ce domaine dans votre navigateur.
          </p>
        </article>
      </div>

      <SiteFooter />
      <LegalStyles />
    </main>
  );
}
