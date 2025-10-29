import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from '@/contexts/AuthContext';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Rhivo - Book Appointments Instantly",
    template: "%s | Rhivo"
  },
  description: "See what's available. Pick a time. You're done. Book appointments in seconds with Rhivo. Streamline your booking process for businesses and customers.",
  applicationName: "Rhivo",
  keywords: ["booking", "appointments", "schedule", "reservation", "business", "calendar", "online booking", "appointment scheduling", "time management", "business scheduling"],
  authors: [{ name: "Rhivo" }],
  creator: "Rhivo",
  publisher: "Rhivo",
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "Rhivo - Book Appointments Instantly",
    description: "See what's available. Pick a time. You're done. Book appointments in seconds with Rhivo.",
    type: "website",
    locale: "en_US",
    siteName: "Rhivo",
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Rhivo - Book appointments instantly',
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rhivo - Book Appointments Instantly",
    description: "See what's available. Pick a time. You're done.",
    images: ['/og-image.png'],
    creator: "@rhivo",
    site: "@rhivo",
  },
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      {
        rel: 'android-chrome-192x192',
        url: '/android-chrome-192x192.png',
      },
      {
        rel: 'android-chrome-512x512',
        url: '/android-chrome-512x512.png',
      },
    ],
  },
  manifest: '/site.webmanifest',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    // Add your verification codes when available
    // google: 'your-google-verification-code',
    // yandex: 'your-yandex-verification-code',
    // bing: 'your-bing-verification-code',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
