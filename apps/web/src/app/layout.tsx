import type { Metadata, Viewport } from "next";
import { Fredoka, Nunito, Baloo_2 } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { SITE } from "@/shared/constants/site";
import "./globals.css";

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const baloo = Baloo_2({
  variable: "--font-baloo",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: `${SITE.name} — ${SITE.tagline}`,
  description: SITE.description,
  applicationName: SITE.name,
  keywords: [
    "playschool Kolkata",
    "daycare Kolkata",
    "preschool Beleghata",
    "playschool Dhakuria",
    "kids activity centre",
    "nursery admission Kolkata",
  ],
  openGraph: {
    type: "website",
    siteName: SITE.name,
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    locale: "en_IN",
    url: SITE.url,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#DC2638",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${fredoka.variable} ${nunito.variable} ${baloo.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Keyboard users land here first: one tab to skip the whole navbar. */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-lg focus:bg-ck-red focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-white"
        >
          Skip to content
        </a>
        <TooltipProvider delay={150}>{children}</TooltipProvider>
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
