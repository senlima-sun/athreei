import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Platform | Athreei",
  description:
    "The unified MCP gateway for AI applications. Connect once, access all your tools—with full observability and privacy control. Self-host or cloud.",
}

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
