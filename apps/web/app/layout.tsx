import type { Metadata } from "next";
import localFont from "next/font/local";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const clashDisplay = localFont({
  src: [
    { path: "../public/fonts/ClashDisplay-Regular.woff2", weight: "400" },
    { path: "../public/fonts/ClashDisplay-Medium.woff2", weight: "500" },
    { path: "../public/fonts/ClashDisplay-Semibold.woff2", weight: "600" },
    { path: "../public/fonts/ClashDisplay-Bold.woff2", weight: "700" },
  ],
  variable: "--font-display",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "ScoreForge - Real-Time Tournament Management",
    template: "%s | ScoreForge",
  },
  description:
    "The definitive platform for managing sports tournaments and tracking scores in real-time. From local leagues to major competitions.",
  keywords: ["tournament", "sports", "scoring", "brackets", "competition", "league"],
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    type: "website",
    siteName: "ScoreForge",
    title: "ScoreForge - Real-Time Tournament Management",
    description:
      "The definitive platform for managing sports tournaments and tracking scores in real-time. From local leagues to major competitions.",
    images: ["/logo.png"],
  },
  twitter: {
    card: "summary",
    title: "ScoreForge - Real-Time Tournament Management",
    description:
      "The definitive platform for managing sports tournaments and tracking scores in real-time. From local leagues to major competitions.",
    images: ["/logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactNode {
  return (
    <html lang="en" suppressHydrationWarning className={`${clashDisplay.variable} ${dmSans.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
