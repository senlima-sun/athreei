import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Toaster } from "sonner"
import "./globals.css"
import { Providers } from "@/components/providers"
import { ImpersonationBanner } from "@/components/admin/impersonation-banner"

const sans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const mono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "athreei Platform",
  description:
    "Privacy-focused platform connecting AI apps to browsers via MCP",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body
        className={`${sans.variable} ${mono.variable} font-sans antialiased`}
      >
        <Providers>
          <ImpersonationBanner />
          {children}
          <Toaster position="bottom-right" richColors closeButton />
        </Providers>
      </body>
    </html>
  )
}
