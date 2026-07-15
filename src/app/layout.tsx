import type { Metadata, Viewport } from "next";
import { Figtree, Fraunces } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/AppProviders";

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Casan Rent — Multi-Operator Mobility",
  description:
    "Rent bicycles, e-bikes, and e-mopeds from multiple operators across Bali.",
  applicationName: "Casan Rent",
  appleWebApp: {
    capable: true,
    title: "Casan Rent",
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0d6b5c",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${figtree.variable} ${fraunces.variable}`}>
      <body className="grain antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
