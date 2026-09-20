import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/store/AppStore";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MPLADS Sentinel — AI-assisted monitoring demo",
  description:
    "Interactive demo: anomaly detection, critical-risk gates, immutable ledger and override audit for MPLADS. Synthetic data only.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <a
          href="#main-content"
          className="absolute -top-40 left-3 z-[100] rounded-md bg-gov-gold px-3 py-2 text-xs font-bold text-white shadow transition-all focus:top-3"
          aria-label="Skip to main content"
        >
          Skip to main content
        </a>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
