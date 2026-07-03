import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import StyledJsxRegistry from "./registry";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "AncreMed — Intelligence Clinique Vérifiée",
  description:
    "Console médicale RAG haute-attribution. Interrogez 76 303 fiches HAS, ANSM et EDN avec vérification mot-à-mot des assertions cliniques.",
  keywords: "médecine, IA clinique, RAG, HAS, ANSM, EDN, attribution, AncreMed",
  authors: [{ name: "AncreMed" }],
  openGraph: {
    title: "AncreMed — Intelligence Clinique Vérifiée",
    description:
      "Des réponses médicales fondées sur des sources de référence françaises, avec double vérification des assertions.",
    type: "website",
    locale: "fr_FR",
  },
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps): JSX.Element {
  return (
    <html lang="fr">
      <head>
        <style>{`
          *, *::before, *::after { box-sizing: border-box; }

          html {
            scroll-behavior: smooth;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }

          body {
            margin: 0;
            color: #21313a;
            background: #fafafa;
          }

          ::selection {
            background: rgba(0, 92, 83, 0.15);
            color: #004d45;
          }

          ::-webkit-scrollbar {
            width: 6px;
            height: 6px;
          }
          ::-webkit-scrollbar-track {
            background: transparent;
          }
          ::-webkit-scrollbar-thumb {
            background: rgba(0, 92, 83, 0.18);
            border-radius: 999px;
          }
          ::-webkit-scrollbar-thumb:hover {
            background: rgba(0, 92, 83, 0.32);
          }

          button, input, textarea {
            font: inherit;
          }
          button { cursor: pointer; }
          button:disabled, input:disabled, textarea:disabled {
            cursor: not-allowed;
          }
        `}</style>
      </head>
      <body className={inter.className}>
        <StyledJsxRegistry>{children}</StyledJsxRegistry>
      </body>
    </html>
  );
}
