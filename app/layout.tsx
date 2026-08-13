import type { Metadata } from "next";
import { DM_Sans, Manrope } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const sans = DM_Sans({ variable: "--font-sans", subsets: ["latin"] });
const display = Manrope({ variable: "--font-display", subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;
  return {
    metadataBase: new URL(baseUrl),
    title: "Supply Chain Profitability Control Tower | Donovan Kore",
    description: "Executive analytics portfolio project by Donovan Kore.",
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: {
      title: "Supply Chain Profitability Control Tower",
      description: "From 35,958 order lines to a $109K recovery opportunity.",
      type: "website",
      images: [{ url: `${baseUrl}/og.png`, width: 1200, height: 630, alt: "Supply Chain Profitability Control Tower" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Supply Chain Profitability Control Tower",
      description: "From 35,958 order lines to a $109K recovery opportunity.",
      images: [`${baseUrl}/og.png`],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${sans.variable} ${display.variable}`}>{children}</body></html>;
}
