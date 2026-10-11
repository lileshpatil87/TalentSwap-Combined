import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { Providers } from "./providers";

import "./globals.css";

/**
 * Root layout. Owns ONLY: <html>/fonts/global providers and globals.css
 * (FE-CON §7). It contains no route-specific UI — route-group layouts
 * ((public), (auth), (dashboard), (admin)) are each built by the module
 * that owns them (FE-15/FE-16/etc.), not here.
 */

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "TalentSwap",
    template: "%s | TalentSwap",
  },
  description:
    "TalentSwap — a community-driven, points-based skill and service exchange platform.",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.variable}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
