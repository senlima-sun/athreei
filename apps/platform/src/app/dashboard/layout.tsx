import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { getServerSession } from "@/lib/auth-server"

export const metadata: Metadata = {
  title: {
    template: "%s | athreei",
    default: "Dashboard | athreei",
  },
}

export default async function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, session } = await getServerSession()

  if (!user || !session) {
    redirect("/login")
  }

  return <DashboardLayout>{children}</DashboardLayout>
}
