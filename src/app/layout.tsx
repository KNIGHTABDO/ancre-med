import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Inter, Newsreader } from "next/font/google";
import StyledJsxRegistry from "./registry";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--next-font-sans",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--next-font-serif",
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f5f0" },
    { media: "(prefers-color-scheme: dark)", color: "#131210" },
  ],
};

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
    <html lang="fr" className={`${inter.variable} ${newsreader.variable}`}>
      <body>
        <StyledJsxRegistry>{children}</StyledJsxRegistry>
      </body>
    </html>
  );
}
