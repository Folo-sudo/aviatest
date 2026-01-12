import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";
import StructuredData from "@/components/seo/StructuredData";
import {
  generateWebsiteStructuredData,
  generateOrganizationStructuredData,
} from "@/lib/seo/structured-data";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://aviatest.fr";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "AviaTest - Tests Psychotechniques Pilote Gratuits",
    template: "%s | AviaTest",
  },
  description:
    "Entrainement gratuit aux tests psychotechniques pour les selections pilote ENAC EPL, Cadets Air France. Exercices realistes: orientation spatiale, attention, memoire, logique.",
  keywords: [
    "tests psychotechniques pilote",
    "ENAC EPL",
    "Cadets Air France",
    "preparation selection pilote",
    "tests cognitifs aviation",
    "PSY0",
    "PSY1",
    "test psychotechnique gratuit",
    "selection pilote de ligne",
  ],
  authors: [{ name: "AviaTest" }],
  creator: "AviaTest",
  publisher: "AviaTest",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: BASE_URL,
    siteName: "AviaTest",
    title: "AviaTest - Tests Psychotechniques Pilote Gratuits",
    description:
      "Preparation gratuite aux selections pilote de ligne. Tests PSY0, PSY1 Cadets Air France et ENAC EPL.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "AviaTest - Tests Psychotechniques Pilote",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AviaTest - Tests Psychotechniques Pilote",
    description: "Preparation gratuite aux selections pilote de ligne",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: BASE_URL,
  },
  category: "education",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const websiteData = generateWebsiteStructuredData();
  const organizationData = generateOrganizationStructuredData();

  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <StructuredData data={[websiteData, organizationData]} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${playfairDisplay.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
