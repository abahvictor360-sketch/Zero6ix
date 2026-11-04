import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ThemeProvider } from "@/components/theme";
import { site } from "@/lib/site";
import { SITE_DESCRIPTION } from "@/lib/seo";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name} | ${site.tagline}`, template: `%s | ${site.name}` },
  description: SITE_DESCRIPTION,
  applicationName: site.name,
  authors: [{ name: site.company }],
  creator: site.company,
  publisher: site.company,
  category: "finance",
  alternates: { canonical: "/" },
  openGraph: { siteName: site.name, type: "website", locale: "en_NG", url: "/", title: `${site.name} | ${site.tagline}`, description: SITE_DESCRIPTION },
  twitter: { card: "summary_large_image", title: `${site.name} | ${site.tagline}`, description: SITE_DESCRIPTION },
  icons: { icon: "/icon.svg" },
  formatDetection: { telephone: true, email: true, address: true },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
    other: process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION ? { "msvalidate.01": process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION } : undefined,
  },
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
