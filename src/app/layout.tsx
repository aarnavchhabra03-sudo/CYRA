import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Sidebar from "@/components/sidebar";
import CommandPalette from "@/components/command-palette";
import { ThemeProvider } from "@/context/ThemeContext";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  fallback: ["ui-monospace", "monospace"],
});

export const metadata: Metadata = {
  title: "CYRA AI — Personalized Learning",
  description: "Tell CYRA what you want to learn and it will build the entire learning experience for you.",
  keywords: ["AI learning", "personalized education", "CYRA AI", "study assistant"],
  icons: {
    icon: "/brand/cyra-logo.png",
    shortcut: "/favicon.ico",
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head />
      <body className="h-full flex overflow-hidden" style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}>
        <ThemeProvider>
          <Sidebar />
          <CommandPalette />
          <main
            className="flex-1 h-screen overflow-y-auto transition-[margin-left] duration-200 ease-in-out md:ml-[var(--sidebar-w)] ml-0"
          >
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
