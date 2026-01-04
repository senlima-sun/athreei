import type { Metadata } from "next"
import "./globals.css"

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
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
