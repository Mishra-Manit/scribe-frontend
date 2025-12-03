import type React from "react"
import "./globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { QueryProvider } from "@/providers/QueryProvider"
import { AuthContextProvider } from "../context/AuthContextProvider"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { Toaster } from "sonner"
import { RequestIdCapture } from "@/components/RequestIdCapture"

const inter = Inter({ subsets: ["latin", "cyrillic"] })

export const metadata: Metadata = {
  title: "Scribe",
  description: "The fastest and most effective way to start, test and validate your business idea with AI",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <QueryProvider>
          <AuthContextProvider>
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </AuthContextProvider>
        </QueryProvider>
        <Toaster
          position="top-right"
          richColors
          closeButton
          duration={5000}
        />
        <RequestIdCapture />
      </body>
    </html>
  )
}
