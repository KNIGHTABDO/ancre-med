import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Inter, Newsreader } from "next/font/google";
import StyledJsxRegistry from "./registry";
import { LanguageProvider } from "../lib/i18n";
import { resolveSiteUrl } from "../lib/siteUrl";
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

const siteName = "AncreMed";
const titleDefault = "AncreMed — Intelligence Clinique Vérifiée";
const description =
  "Console médicale RAG haute-attribution. Interrogez 76 303 fiches HAS, ANSM et EDN avec vérification mot-à-mot des assertions cliniques.";
const ogDescription =
  "Des réponses médicales fondées sur des sources de référence françaises, avec double vérification des assertions.";

const siteUrl = resolveSiteUrl();

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f5f0" },
    { media: "(prefers-color-scheme: dark)", color: "#131210" },
  ],
  colorScheme: "light dark",
};

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: {
    default: titleDefault,
    template: `%s · ${siteName}`,
  },
  description,
  applicationName: siteName,
  keywords: [
    "médecine",
    "IA clinique",
    "RAG",
    "HAS",
    "ANSM",
    "BDPM",
    "EDN",
    "attribution",
    "AncreMed",
    "intelligence clinique",
    "vérification",
  ],
  authors: [{ name: "AncreMed" }],
  creator: "AncreMed",
  publisher: "AncreMed",
  category: "medical",
  generator: "Next.js",
  referrer: "origin-when-cross-origin",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/favicon.ico"],
    other: [
      {
        rel: "mask-icon",
        url: "/favicon.svg",
        color: "#0e8074",
      },
    ],
  },
  manifest: "/site.webmanifest",
  appleWebApp: {
    capable: true,
    title: siteName,
    statusBarStyle: "default",
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: "/",
    siteName,
    title: titleDefault,
    description: ogDescription,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "AncreMed — Intelligence Clinique Vérifiée",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: titleDefault,
    description: ogDescription,
    images: [
      {
        url: "/twitter-image.png",
        width: 1200,
        height: 630,
        alt: "AncreMed — Intelligence Clinique Vérifiée",
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  alternates: {
    canonical: "/",
  },
  other: {
    "msapplication-TileColor": "#0e8074",
    "msapplication-config": "/browserconfig.xml",
  },
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps): JSX.Element {
  return (
    <html lang="fr" className={`${inter.variable} ${newsreader.variable}`}>
      <body>
        <StyledJsxRegistry>
          <LanguageProvider>{children}</LanguageProvider>
        </StyledJsxRegistry>
      </body>
    </html>
  );
}
