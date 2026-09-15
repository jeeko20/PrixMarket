import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { SiteHeader } from "@/components/prixmarket/SiteHeader";
import { SiteFooter } from "@/components/prixmarket/SiteFooter";
import { Providers } from "@/components/prixmarket/Providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PrixMarket — Prix des marchés en Haïti",
  description:
    "Consultez les prix des produits vendus sur les marchés en Haïti (gros et détail), organisés par commune. Données collectées par des agents locaux.",
  keywords: [
    "Prix",
    "Marché",
    "Haïti",
    "Delmas",
    "HTG",
    "gros",
    "détail",
    "produits",
  ],
  authors: [{ name: "PrixMarket" }],
  openGraph: {
    title: "PrixMarket — Prix des marchés en Haïti",
    description:
      "Consultez les prix des produits vendus sur les marchés en Haïti (gros et détail), organisés par commune.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PrixMarket — Prix des marchés en Haïti",
    description:
      "Consultez les prix des produits vendus sur les marchés en Haïti.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <Providers>
          <div className="min-h-screen flex flex-col">
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <SiteFooter />
          </div>
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}
