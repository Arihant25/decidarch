import type { Metadata } from "next";
import { Bricolage_Grotesque, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const displayFont = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
});

const techFont = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-tech",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"
  ),
  title: {
    default: "DecidArch — Software Architecture Decision Game",
    template: "%s — DecidArch",
  },
  description:
    "A multiplayer card game to teach software architecture design decision making. Work as a team of architects to design a system that satisfies your stakeholders.",
  keywords: [
    "software architecture",
    "card game",
    "design decisions",
    "quality attributes",
    "multiplayer",
    "educational",
  ],
  openGraph: {
    type: "website",
    siteName: "DecidArch",
    title: "DecidArch — Software Architecture Decision Game",
    description:
      "A multiplayer card game to teach software architecture design decision making. Work as a team of architects to design a system that satisfies your stakeholders.",
  },
  twitter: {
    card: "summary_large_image",
    title: "DecidArch — Software Architecture Decision Game",
    description:
      "A multiplayer card game to teach software architecture design decision making.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${displayFont.variable} ${techFont.variable}`}>
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}
