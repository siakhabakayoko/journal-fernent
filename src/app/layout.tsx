import type { Metadata } from "next";
import { Source_Sans_3, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { MOTTO } from "@/lib/types";

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
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
    <html lang="fr" className={`${sourceSans.variable} ${sourceSerif.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-white text-black font-sans antialiased">
        <LanguageProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </LanguageProvider>
      </body>
    </html>
  );
}
