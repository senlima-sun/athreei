"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import {
  useUpdateMarketplace,
  type AdminMarketplace,
} from "@/hooks/use-admin-marketplaces"
import type {
  MarketplaceOwnerType,
  MarketplaceSourceType,
} from "@/types/marketplace"

interface EditMarketplaceDialogProps {
  marketplace: AdminMarketplace | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function EditMarketplaceDialog({
  marketplace,
  open,
  onOpenChange,
  onSuccess,
}: EditMarketplaceDialogProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [ownerType, setOwnerType] = useState<MarketplaceOwnerType>("system")
  const [sourceType, setSourceType] =
    useState<MarketplaceSourceType>("internal")
  const [sourceUrl, setSourceUrl] = useState("")
  const [isPublic, setIsPublic] = useState(false)
  const [isDefault, setIsDefault] = useState(false)
  const [autoUpdate, setAutoUpdate] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const updateMutation = useUpdateMarketplace()

  useEffect(() => {
    if (marketplace && open) {
      setName(marketplace.name)
      setDescription(marketplace.description || "")
      setOwnerType(marketplace.ownerType)
      setSourceType(marketplace.sourceType)
      setSourceUrl(marketplace.sourceUrl || "")
      setIsPublic(marketplace.isPublic)
      setIsDefault(marketplace.isDefault)
      setAutoUpdate(marketplace.autoUpdate)
      setError(null)
    }
  }, [marketplace, open])

  function handleOpenChange(newOpen: boolean) {
    if (!newOpen) {
      setError(null)
    }
    onOpenChange(newOpen)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!marketplace) return

    setError(null)

    if (!name.trim()) {
      setError("Name is required")
      return
    }

    try {
      await updateMutation.mutateAsync({
        slug: marketplace.slug,
        updates: {
          name: name.trim(),
          description: description.trim() || undefined,
          ownerType,
          sourceType,
          sourceUrl: sourceUrl.trim() || undefined,
          isPublic,
          isDefault,
          autoUpdate,
        },
      })
      handleOpenChange(false)
      onSuccess?.()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update marketplace"
      setError(message)
    }
  }

  if (!marketplace) return null

  const isExternalSource = sourceType !== "internal"

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-lg p-6"
        onInteractOutside={(e) => {
          const target = e.target as HTMLElement
          if (target.closest("[data-slot='select-content']")) {
            e.preventDefault()
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Edit Marketplace</DialogTitle>
          <DialogDescription>
            Update the marketplace settings for{" "}
            <span className="font-medium">{marketplace.slug}</span>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-slug">Slug</Label>
              <Input
                id="edit-slug"
                value={marketplace.slug}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Slug cannot be changed
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Marketplace Name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Owner Type</Label>
                <Select
                  value={ownerType}
                  onValueChange={(v) => setOwnerType(v as MarketplaceOwnerType)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system">System</SelectItem>
                    <SelectItem value="organization">Organization</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Source Type</Label>
                <Select
                  value={sourceType}
                  onValueChange={(v) =>
                    setSourceType(v as MarketplaceSourceType)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal">Internal</SelectItem>
                    <SelectItem value="github">GitHub</SelectItem>
                    <SelectItem value="gitlab">GitLab</SelectItem>
                    <SelectItem value="url">URL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isExternalSource && (
              <div className="space-y-2">
                <Label htmlFor="edit-sourceUrl">Source URL</Label>
                <Input
                  id="edit-sourceUrl"
                  type="url"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="https://github.com/org/repo"
                />
              </div>
            )}

            <div className="flex flex-wrap gap-x-6 gap-y-3 pt-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="rounded border-gray-300"
                />
                Public
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="rounded border-gray-300"
                />
                Default
              </label>
              {isExternalSource && (
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoUpdate}
                    onChange={(e) => setAutoUpdate(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  Auto Update
                </label>
              )}
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
