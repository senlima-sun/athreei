import type { Metadata } from "next"
import { Geist, Geist_Mono, Inter } from "next/font/google"
import { PostHogProvider } from "@/components/providers/posthog-provider"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Athreei: Unified AI Infrastructure",
  description:
    "The gateway platform and desktop app for managing AI tools, memory, and workflows. Connect once, access everything—self-host or cloud.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  )
}
