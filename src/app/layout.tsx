import type { Metadata } from "next";
import { Playfair_Display, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { MOTTO } from "@/lib/types";

const display = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const ui = Source_Sans_3({
  variable: "--font-ui",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://journal-fernent.vercel.app",
  ),
  title: {
    default: "Journal Ferñent",
    template: "%s · Ferñent",
  },
  description: MOTTO,
  keywords: [
    "Ferñent",
    "Sénégal",
    "Afrique",
    "panafricanisme",
    "syndicats",
    "dette",
    "internationalisme",
  ],
  openGraph: {
    type: "website",
    locale: "fr_SN",
    siteName: "Journal Ferñent",
    title: "Journal Ferñent",
    description: MOTTO,
  },
  twitter: {
    card: "summary",
    title: "Journal Ferñent",
    description: MOTTO,
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${display.variable} ${ui.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-paper text-ink font-sans antialiased">
        <LanguageProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </LanguageProvider>
      </body>
    </html>
  );
}
