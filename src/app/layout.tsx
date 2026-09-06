import type { Metadata, Viewport } from "next";
import { Playfair_Display, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ChatWidget } from "@/components/ChatWidget";
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

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#E10600" },
    { media: "(prefers-color-scheme: dark)", color: "#E10600" },
  ],
  colorScheme: "light",
};

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
  applicationName: "Ferñent",
  appleWebApp: {
    capable: true,
    title: "Ferñent",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/manifest.webmanifest",
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
  other: {
    "mobile-web-app-capable": "yes",
  },
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
          <ChatWidget />
        </LanguageProvider>
      </body>
    </html>
  );
}
