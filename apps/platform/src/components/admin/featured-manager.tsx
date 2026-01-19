"use client"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { GripVertical, Puzzle, X, Loader2 } from "lucide-react"

export interface FeaturedPlugin {
  id: string
  name: string
  iconUrl: string | null
}

export interface FeaturedPluginsManagerProps {
  plugins: FeaturedPlugin[]
  onReorder: (plugins: FeaturedPlugin[]) => void
  onRemove: (pluginId: string) => void
  isLoading?: boolean
}

export function FeaturedPluginsManager({
  plugins,
  onReorder: _onReorder,
  onRemove,
  isLoading,
}: FeaturedPluginsManagerProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Featured Plugins</CardTitle>
          <CardDescription>
            Drag to reorder. First 6 appear on marketplace homepage.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Loading featured plugins...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (plugins.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Featured Plugins</CardTitle>
          <CardDescription>
            Drag to reorder. First 6 appear on marketplace homepage.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <Puzzle className="h-10 w-10 mb-3 opacity-50" />
            <p className="font-medium">No featured plugins</p>
            <p className="text-sm mt-1">
              Feature plugins from the plugin management page.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Featured Plugins</CardTitle>
        <CardDescription>
          Drag to reorder. First 6 appear on marketplace homepage.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {plugins.map((plugin, index) => (
            <div
              key={plugin.id}
              className="flex items-center gap-3 p-3 border rounded-lg bg-background hover:bg-muted/50 transition-colors"
            >
              <div className="cursor-grab text-muted-foreground hover:text-foreground">
                <GripVertical className="h-4 w-4" />
              </div>
              <span className="font-mono text-sm text-muted-foreground w-6 text-center">
                {index + 1}
              </span>
              <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                {plugin.iconUrl ? (
                  <img
                    src={plugin.iconUrl}
                    alt={plugin.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Puzzle className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <span className="flex-1 truncate font-medium">{plugin.name}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemove(plugin.id)}
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Remove from featured</span>
              </Button>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          Drag and drop support will be available in a future update.
        </p>
      </CardContent>
    </Card>
  )
}
