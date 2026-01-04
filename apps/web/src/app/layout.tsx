import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: {
    default: "athreei - Connect AI to Your Browser",
    template: "%s | athreei",
  },
  description:
    "Privacy-focused platform connecting AI apps to browsers via the Model Context Protocol. Your data stays local, always.",
  keywords: ["AI", "browser automation", "MCP", "Claude", "ChatGPT", "privacy"],
  authors: [{ name: "athreei" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://athreei.com",
    siteName: "athreei",
    title: "athreei - Connect AI to Your Browser",
    description:
      "Privacy-focused platform connecting AI apps to browsers via the Model Context Protocol.",
  },
  twitter: {
    card: "summary_large_image",
    title: "athreei - Connect AI to Your Browser",
    description:
      "Privacy-focused platform connecting AI apps to browsers via the Model Context Protocol.",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  )
}
