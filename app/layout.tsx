import type React from "react"
import "./globals.css"
import type { Metadata } from "next"
import Script from "next/script"
import { Geist, Geist_Mono } from "next/font/google"
import { QueryProvider } from "@/providers/QueryProvider"
import { ThemeProvider } from "@/providers/ThemeProvider"
import { AuthContextProvider } from "../context/AuthContextProvider"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { Toaster } from "sonner"
import { RequestIdCapture } from "@/components/RequestIdCapture"
import { LegacyCleanup } from "@/components/LegacyCleanup"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

const themeInitScript = `
(() => {
  try {
    const stored = localStorage.getItem("scribe-theme-storage");
    if (!stored) return;
    const parsed = JSON.parse(stored);
    const theme = parsed?.state?.theme;
    if (!theme) return;
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
      return;
    }
    if (theme === "system") {
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        root.classList.add("dark");
      }
    }
  } catch {}
})();
`;

export const metadata: Metadata = {
  title: "Scribe",
  description: "The fastest and most effective way to cold email professors for research opportunities.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
        <ThemeProvider>
          <QueryProvider>
            <AuthContextProvider>
              <ErrorBoundary>
                {children}
              </ErrorBoundary>
            </AuthContextProvider>
          </QueryProvider>
        </ThemeProvider>
        <Toaster
          position="top-right"
          richColors
          closeButton
          duration={5000}
        />
        <RequestIdCapture />
        <LegacyCleanup />
      </body>
    </html>
  )
}
