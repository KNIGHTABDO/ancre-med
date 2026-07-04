"use client";

import type { JSX } from "react";
import { SiteHeader } from "../../components/SiteHeader";
import { SiteFooter } from "../../components/SiteFooter";
import { LegalStyles } from "../legal-styles";

export default function TermsPage(): JSX.Element {
  return (
    <main className="legal-shell">
      <SiteHeader />

      <div className="legal-viewport">
        <article className="legal-article fade-up">
          <h1>Conditions générales d’utilisation</h1>
          <p className="legal-updated">Dernière mise à jour : juin 2026</p>

          <p>
            Bienvenue sur AncreMed. En accédant ou en utilisant notre service, vous acceptez de
            vous conformer aux présentes Conditions Générales d’Utilisation (CGU).
          </p>

          <h2>1. Clause de non-responsabilité médicale</h2>
          <p className="legal-warning">
            <strong>Attention :</strong> AncreMed est un outil purement informatif et éducatif
            destiné à la formation académique des étudiants en médecine. Il ne constitue pas un
            dispositif médical et ne doit en aucun cas être utilisé pour diagnostiquer, traiter ou
            conseiller un patient réel. Les réponses fournies sont générées par intelligence
            artificielle à partir d’extraits documentaires et peuvent comporter des erreurs de
            transcription ou des interprétations erronées. La responsabilité des décisions
            cliniques incombe exclusivement aux praticiens de santé.
          </p>

          <h2>2. Utilisation du service</h2>
          <p>
            Vous vous engagez à ne pas utiliser l’application de manière abusive ou à soumettre
            des données malveillantes visant à perturber le fonctionnement du moteur sémantique.
          </p>

          <h2>3. Propriété intellectuelle &amp; licence</h2>
          <p>
            Le code source d’AncreMed est libre et distribué sous licence MIT. Les données
            cliniques indexées appartiennent à leurs autorités de réglementation respectives
            (HAS, ANSM).
          </p>

          <h2>4. Limites de garantie</h2>
          <p>
            Le service est fourni « en l’état », sans garantie de disponibilité continue ou
            d’exactitude absolue des informations fournies par les API de tiers.
          </p>
        </article>
      </div>

      <SiteFooter />
      <LegalStyles />
    </main>
  );
}
