import { redirect } from "next/navigation"
import { getServerSession } from "@/lib/auth-server"
import { AdminSidebar } from "@/components/admin/sidebar"

interface SessionUser {
  id: string
  name: string
  email: string
  role?: string
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession()

  if (!session?.user) {
    redirect("/auth/login")
  }

  const user = session.user as SessionUser
  const role = user.role || "user"
  if (role === "user") {
    redirect("/dashboard")
  }

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <main className="flex-1 p-8">{children}</main>
    </div>
  )
}
