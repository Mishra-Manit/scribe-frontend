import type React from "react"
import "./globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { QueryProvider } from "@/providers/QueryProvider"
import { AuthContextProvider } from "../context/AuthContextProvider"

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
            {children}
          </AuthContextProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
