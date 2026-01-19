"use client"

import { useQuery } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import { fetchApi } from "@/lib/api"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

interface AdminStats {
  totalPlugins: number
  totalMarketplaces: number
  verifiedPlugins: number
  featuredPlugins: number
  pendingApprovals: number
  totalInstalls: number
}

interface StatCardProps {
  title: string
  value: number | string
}

function StatCard({ title, value }: StatCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  )
}

export default function AdminDashboardPage() {
  const {
    data: stats,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => fetchApi<AdminStats>("/api/admin/stats"),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
          Failed to load admin stats. Please try again later.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>

      <p className="text-muted-foreground">
        Welcome to the admin panel. Select a section from the sidebar to manage.
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Total Marketplaces"
          value={(stats?.totalMarketplaces ?? 0).toLocaleString()}
        />
        <StatCard
          title="Total Plugins"
          value={(stats?.totalPlugins ?? 0).toLocaleString()}
        />
        <StatCard
          title="Verified Plugins"
          value={(stats?.verifiedPlugins ?? 0).toLocaleString()}
        />
        <StatCard
          title="Featured Plugins"
          value={(stats?.featuredPlugins ?? 0).toLocaleString()}
        />
        <StatCard
          title="Pending Approvals"
          value={(stats?.pendingApprovals ?? 0).toLocaleString()}
        />
        <StatCard
          title="Total Downloads"
          value={(stats?.totalInstalls ?? 0).toLocaleString()}
        />
      </div>
    </div>
  )
}
