import type { Metadata } from "next";
import {
  IBM_Plex_Mono,
  Playfair_Display,
  Source_Serif_4,
} from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// Editorial body serif — legible at small sizes for data-dense reading.
const sourceSerif = Source_Serif_4({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

// Typewriter-grade mono for labels, figures, timestamps, file numbers.
const plexMono = IBM_Plex_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// High-contrast display serif for mastheads and headlines.
const playfair = Playfair_Display({
  variable: "--font-lora",
  subsets: ["latin"],
  weight: ["400", "500", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: {
    default: "Semestra",
    template: "%s · Semestra",
  },
  description:
    "Your university life in one calm place — nutrition, fitness, sleep, wellness, academics, and finances on top of your Obsidian vault.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${sourceSerif.variable} ${plexMono.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
