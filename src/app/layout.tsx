import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "AncreMed",
  description: "Interface médicale fondée sur des sources de référence françaises.",
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps): JSX.Element {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
