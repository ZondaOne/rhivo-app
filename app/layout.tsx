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
  title: "Rhivo - Book appointments instantly",
  description: "See what's available. Pick a time. You're done. Book appointments in seconds with Rhivo.",
  applicationName: "Rhivo",
  keywords: ["booking", "appointments", "schedule", "reservation", "business", "calendar"],
  authors: [{ name: "Rhivo" }],
  creator: "Rhivo",
  publisher: "Rhivo",
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'),
  openGraph: {
    title: "Rhivo - Book appointments instantly",
    description: "See what's available. Pick a time. You're done. Book appointments in seconds with Rhivo.",
    type: "website",
    locale: "en_US",
    siteName: "Rhivo",
  },
  twitter: {
    card: "summary_large_image",
    title: "Rhivo - Book appointments instantly",
    description: "See what's available. Pick a time. You're done.",
  },
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-48x48.png', sizes: '48x48', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { url: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
  manifest: '/site.webmanifest',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
