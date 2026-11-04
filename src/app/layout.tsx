import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ThemeProvider } from "@/components/theme";
import { site } from "@/lib/site";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name} | ${site.tagline}`, template: `%s · ${site.name}` },
  description:
    "Web Purchase pays for online services and buys items from foreign websites for Nigerians and Africans at home and abroad: subscriptions, exam fees, visa fees, gadgets and more. Pay in Naira or your local African currency. Legal requests only.",
  openGraph: { siteName: site.name, type: "website", locale: "en_NG" },
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0f3f2d" },
    { media: "(prefers-color-scheme: dark)", color: "#06140f" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={jakarta.variable}>
      <body className="min-h-dvh font-sans">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
