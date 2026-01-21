"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Plus,
  RefreshCw,
  Puzzle,
  CheckCircle,
  Star,
  MoreHorizontal,
  Loader2,
  Eye,
  Trash2,
} from "lucide-react"
import { useMarketplaceAdminPermissions } from "@/hooks/use-marketplace-admin-permissions"
import {
  useAdminPlugins,
  type AdminPlugin,
} from "@/hooks/use-admin-plugins"

interface PluginRowProps {
  plugin: AdminPlugin
  canManage: boolean
  onView: (plugin: AdminPlugin) => void
  onVerify: (plugin: AdminPlugin) => void
  onFeature: (plugin: AdminPlugin) => void
  onDelete: (plugin: AdminPlugin) => void
}

function PluginRow({
  plugin,
  canManage,
  onView,
  onVerify,
  onFeature,
  onDelete,
}: PluginRowProps) {
  return (
    <tr className="border-t">
      <td className="p-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
            {plugin.iconUrl ? (
              <img
                src={plugin.iconUrl}
                alt={plugin.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <Puzzle className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          <div>
            <div className="font-medium">{plugin.name}</div>
            <div className="text-sm text-muted-foreground">{plugin.slug}</div>
          </div>
        </div>
      </td>
      <td className="p-3">
        <Badge variant="secondary">{plugin.marketplace.name}</Badge>
      </td>
      <td className="p-3">
        <div className="flex items-center gap-2">
          {plugin.isVerified && (
            <div className="flex items-center gap-1 text-blue-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-xs">Verified</span>
            </div>
          )}
          {plugin.isFeatured && (
            <div className="flex items-center gap-1 text-amber-600">
              <Star className="h-4 w-4 fill-current" />
              <span className="text-xs">Featured</span>
            </div>
          )}
          {!plugin.isVerified && !plugin.isFeatured && (
            <span className="text-muted-foreground text-sm">-</span>
          )}
        </div>
      </td>
      <td className="p-3">
        <span className="tabular-nums">
          {Number(plugin.downloadCount).toLocaleString()}
        </span>
      </td>
      <td className="p-3 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted transition-colors">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Open menu</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onView(plugin)}>
              <Eye className="h-4 w-4 mr-2" />
              View
            </DropdownMenuItem>
            {canManage && (
              <>
                <DropdownMenuItem onClick={() => onVerify(plugin)}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {plugin.isVerified ? "Unverify" : "Verify"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onFeature(plugin)}>
                  <Star className="h-4 w-4 mr-2" />
                  {plugin.isFeatured ? "Unfeature" : "Feature"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => onDelete(plugin)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  )
}

type StatusFilter = "all" | "verified" | "featured" | "pending"

export default function AdminPluginsPage() {
  const [search, setSearch] = useState("")
  const [marketplaceFilter, setMarketplaceFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")

  const { canManagePlugins, canSyncMarketplaces } =
    useMarketplaceAdminPermissions()

  const isVerified =
    statusFilter === "verified"
      ? true
      : statusFilter === "pending"
        ? false
        : undefined
  const isFeatured = statusFilter === "featured" ? true : undefined

  const { data, isLoading, refetch } = useAdminPlugins({
    search: search || undefined,
    marketplaceSlug:
      marketplaceFilter !== "all" ? marketplaceFilter : undefined,
    isVerified,
    isFeatured,
    limit: 100,
  })

  const plugins = data?.data ?? []

  const filteredPlugins = plugins

  function handleView(plugin: AdminPlugin) {
    console.warn("View plugin:", plugin.slug)
  }

  function handleVerify(plugin: AdminPlugin) {
    console.warn("Toggle verify:", plugin.slug, "->", !plugin.isVerified)
  }

  function handleFeature(plugin: AdminPlugin) {
    console.warn("Toggle feature:", plugin.slug, "->", !plugin.isFeatured)
  }

  function handleDelete(plugin: AdminPlugin) {
    console.warn("Delete plugin:", plugin.slug)
  }

  function handleSyncAll() {
    console.warn("Sync all marketplaces")
  }

  function handleAddPlugin() {
    console.warn("Add plugin")
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Plugins</h1>
        <div className="flex items-center gap-2">
          {canSyncMarketplaces && (
            <Button variant="outline" onClick={handleSyncAll}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Sync All
            </Button>
          )}
          {canManagePlugins && (
            <Button onClick={handleAddPlugin}>
              <Plus className="h-4 w-4 mr-2" />
              Add Plugin
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Input
          placeholder="Search plugins..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Select
          value={marketplaceFilter}
          onValueChange={(v) => {
            if (v) setMarketplaceFilter(v)
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Marketplaces</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            if (v) setStatusFilter(v as StatusFilter)
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
            <SelectItem value="featured">Featured</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Card className="p-8">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading plugins...
          </div>
        </Card>
      ) : filteredPlugins.length === 0 ? (
        <Card className="p-8">
          <div className="text-center text-muted-foreground">
            <Puzzle className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No plugins found</p>
            <p className="text-sm mt-1">
              {search || statusFilter !== "all"
                ? "Try adjusting your filters"
                : "Plugins will appear here once added to marketplaces"}
            </p>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="overflow-hidden rounded-lg">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-medium">Plugin</th>
                  <th className="text-left p-3 font-medium">Marketplace</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Downloads</th>
                  <th className="text-right p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPlugins.map((plugin) => (
                  <PluginRow
                    key={plugin.id}
                    plugin={plugin}
                    canManage={canManagePlugins}
                    onView={handleView}
                    onVerify={handleVerify}
                    onFeature={handleFeature}
                    onDelete={handleDelete}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
