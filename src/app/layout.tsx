import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Radha Soami Satsang Beas",
  description: "Satsang Schedule Management System — Radha Soami Satsang Beas",
  keywords: ["RSSB", "Satsang", "Schedule", "Pathi", "Management"],
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    title: "Radha Soami Satsang Beas",
    description: "Satsang Schedule Management System",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Radha Soami Satsang Beas",
    description: "Satsang Schedule Management System",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
