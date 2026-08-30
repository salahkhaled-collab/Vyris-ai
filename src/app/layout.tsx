import type { Metadata } from "next";
import { Fraunces, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { UserProvider } from "@/lib/user-context";
import { AuthProvider } from "@/lib/auth-provider";
import { CookieConsent } from "@/components/marketing/CookieConsent";
import { Analytics } from "@/components/marketing/Analytics";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3002";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Vyris — AI Chief of Staff for solo operators",
    template: "%s — Vyris",
  },
  description:
    "Vyris is the AI Chief of Staff for solo operators running e-commerce, agency, or content businesses — turn scattered goals and open decisions into a single strategic operating view.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: "Vyris",
    title: "Vyris — AI Chief of Staff for solo operators",
    description:
      "Turn scattered goals and open decisions into a single strategic operating view.",
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: "Vyris — AI Chief of Staff for solo operators",
    description:
      "Turn scattered goals and open decisions into a single strategic operating view.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${inter.variable} ${plexMono.variable}`}
    >
      <body className="min-h-screen">
        <AuthProvider>
          <UserProvider>{children}</UserProvider>
        </AuthProvider>
        <CookieConsent />
        <Analytics />
      </body>
    </html>
  );
}
