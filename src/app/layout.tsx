import type { Metadata } from "next";
import { Manrope, Sora } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/providers/app-providers";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Solvix POS | Coffee Shop Point of Sale",
    template: "%s | Solvix POS",
  },
  description:
    "Solvix POS is a modern coffee shop POS with cashier checkout, KDS realtime operations, analytics, and staff management.",
  keywords: ["coffee shop pos", "kds", "point of sale", "solvix", "moka style pos", "kasir cafe"],
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${manrope.variable} ${sora.variable} antialiased`}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
