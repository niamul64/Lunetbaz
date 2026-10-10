import type { Metadata, Viewport } from "next";
import { Geist_Mono, Hind_Siliguri, Inter } from "next/font/google";
import { Providers } from "@/components/providers";
import { env } from "@/config/env";
import { siteConfig } from "@/config/site";
import "./globals.css";

const inter = Inter({ variable: "--font-sans-latin", subsets: ["latin"], display: "swap" });
const hind = Hind_Siliguri({ variable: "--font-sans-bangla", subsets: ["bengali"], weight: ["400", "500", "600", "700"], display: "swap" });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(env.siteUrl),
  title: { default: `${siteConfig.name} – ${siteConfig.tagline}`, template: `%s | ${siteConfig.name}` },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  openGraph: { type: "website", siteName: siteConfig.name, locale: "en_BD" },
};

export const viewport: Viewport = {
  themeColor: "#4338ca",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${hind.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
