"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
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
  Store,
  ExternalLink,
  Loader2,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react"
import {
  useAdminMarketplaces,
  type AdminMarketplace,
} from "@/hooks/use-admin-marketplaces"
import { useMarketplaceAdminPermissions } from "@/hooks/use-marketplace-admin-permissions"
import type {
  MarketplaceOwnerType,
  MarketplaceSourceType,
} from "@/types/marketplace"

type TabValue = "all" | "system" | "organization" | "external"

function getOwnerTypeVariant(
  ownerType: MarketplaceOwnerType
): "default" | "secondary" | "outline" {
  switch (ownerType) {
    case "system":
      return "default"
    case "organization":
      return "secondary"
    case "user":
      return "outline"
    default:
      return "outline"
  }
}

function getSourceTypeLabel(sourceType: MarketplaceSourceType): string {
  switch (sourceType) {
    case "internal":
      return "Internal"
    case "github":
      return "GitHub"
    case "gitlab":
      return "GitLab"
    case "url":
      return "URL"
    default:
      return sourceType
  }
}

function formatRelativeDate(dateString: string | null): string {
  if (!dateString) return "Never"

  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return `${diffDays} days ago`
  const weeks = Math.floor(diffDays / 7)
  if (diffDays < 30) return `${weeks} week${weeks === 1 ? "" : "s"} ago`
  const months = Math.floor(diffDays / 30)
  if (diffDays < 365) return `${months} month${months === 1 ? "" : "s"} ago`
  const years = Math.floor(diffDays / 365)
  return `${years} year${years === 1 ? "" : "s"} ago`
}

interface MarketplaceRowProps {
  marketplace: AdminMarketplace
  canManage: boolean
  canSync: boolean
  onEdit: (marketplace: AdminMarketplace) => void
  onDelete: (marketplace: AdminMarketplace) => void
  onSync: (marketplace: AdminMarketplace) => void
}

function MarketplaceRow({
  marketplace,
  canManage,
  canSync,
  onEdit,
  onDelete,
  onSync,
}: MarketplaceRowProps) {
  const isExternal = marketplace.sourceType !== "internal"

  return (
    <tr className="border-t">
      <td className="p-3">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center">
            <Store className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <div className="font-medium flex items-center gap-2">
              {marketplace.name}
              {marketplace.isDefault && (
                <Badge variant="outline" className="text-xs">
                  Default
                </Badge>
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              {marketplace.slug}
            </div>
          </div>
        </div>
      </td>
      <td className="p-3">
        <Badge variant={getOwnerTypeVariant(marketplace.ownerType)}>
          {marketplace.ownerType}
        </Badge>
      </td>
      <td className="p-3">
        {isExternal ? (
          <div className="flex items-center gap-1.5">
            <Badge variant="outline">
              {getSourceTypeLabel(marketplace.sourceType)}
            </Badge>
            {marketplace.sourceUrl && (
              <a
                href={marketplace.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </td>
      <td className="p-3">
        <span className="tabular-nums">{marketplace.pluginCount}</span>
      </td>
      <td className="p-3">
        <Badge variant={marketplace.isPublic ? "secondary" : "outline"}>
          {marketplace.isPublic ? "Public" : "Private"}
        </Badge>
      </td>
      <td className="p-3 text-muted-foreground">
        {isExternal ? formatRelativeDate(marketplace.lastSyncedAt) : "-"}
      </td>
      <td className="p-3 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted transition-colors">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Open menu</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canManage && (
              <DropdownMenuItem onClick={() => onEdit(marketplace)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
            )}
            {canSync && isExternal && (
              <DropdownMenuItem onClick={() => onSync(marketplace)}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync
              </DropdownMenuItem>
            )}
            {canManage && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => onDelete(marketplace)}
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

export default function AdminMarketplacesPage() {
  const [activeTab, setActiveTab] = useState<TabValue>("all")
  const [search, setSearch] = useState("")

  const { canManageMarketplaces, canSyncMarketplaces } =
    useMarketplaceAdminPermissions()

  const ownerTypeFilter: MarketplaceOwnerType | undefined =
    activeTab === "all" || activeTab === "external" ? undefined : activeTab

  const sourceTypeFilter: MarketplaceSourceType | undefined =
    activeTab === "external" ? "github" : undefined

  const { data, isLoading, error, refetch } = useAdminMarketplaces({
    ownerType: ownerTypeFilter,
    sourceType: sourceTypeFilter,
    search: search || undefined,
    limit: 50,
  })

  const marketplaces = data?.data ?? []

  const filteredMarketplaces =
    activeTab === "external"
      ? marketplaces.filter((m) => m.sourceType !== "internal")
      : marketplaces

  function handleEdit(marketplace: AdminMarketplace) {
    console.warn("Edit marketplace:", marketplace.slug)
  }

  function handleDelete(marketplace: AdminMarketplace) {
    console.warn("Delete marketplace:", marketplace.slug)
  }

  function handleSync(marketplace: AdminMarketplace) {
    console.warn("Sync marketplace:", marketplace.slug)
  }

  function handleCreate() {
    console.warn("Create marketplace")
  }

  if (error) {
    return (
      <div className="p-8 text-center text-destructive">
        Failed to load marketplaces. Please try again.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Marketplaces</h1>
        {canManageMarketplaces && (
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Create Marketplace
          </Button>
        )}
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as TabValue)}
      >
        <div className="flex items-center justify-between gap-4">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
            <TabsTrigger value="organization">Organization</TabsTrigger>
            <TabsTrigger value="external">External</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <Input
              placeholder="Search marketplaces..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <TabsContent value={activeTab} className="mt-4">
          {isLoading ? (
            <Card className="p-8">
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading marketplaces...
              </div>
            </Card>
          ) : filteredMarketplaces.length === 0 ? (
            <Card className="p-8">
              <div className="text-center text-muted-foreground">
                <Store className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No marketplaces found</p>
                <p className="text-sm mt-1">
                  {search
                    ? "Try adjusting your search query"
                    : "Create a marketplace to get started"}
                </p>
              </div>
            </Card>
          ) : (
            <Card>
              <div className="overflow-hidden rounded-lg">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-medium">Marketplace</th>
                      <th className="text-left p-3 font-medium">Owner Type</th>
                      <th className="text-left p-3 font-medium">Source</th>
                      <th className="text-left p-3 font-medium">Plugins</th>
                      <th className="text-left p-3 font-medium">Visibility</th>
                      <th className="text-left p-3 font-medium">Last Synced</th>
                      <th className="text-right p-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMarketplaces.map((marketplace) => (
                      <MarketplaceRow
                        key={marketplace.id}
                        marketplace={marketplace}
                        canManage={canManageMarketplaces}
                        canSync={canSyncMarketplaces}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onSync={handleSync}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {data && data.total > filteredMarketplaces.length && (
        <div className="text-center text-sm text-muted-foreground">
          Showing {filteredMarketplaces.length} of {data.total} marketplaces
        </div>
      )}
    </div>
  )
}
