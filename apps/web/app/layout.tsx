import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "ScoreForge - Real-Time Tournament Management",
  description:
    "The definitive platform for managing sports tournaments and tracking scores in real-time. From local leagues to major competitions.",
  keywords: ["tournament", "sports", "scoring", "brackets", "competition", "league"],
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactNode {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
