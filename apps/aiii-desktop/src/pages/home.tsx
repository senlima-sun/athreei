import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, Sparkles, Clock, Globe } from "lucide-react"
import { useMemories } from "@/hooks"
import { PageLoading } from "@/components/loading-spinner"
import { ErrorDisplay } from "@/components/error-display"
import { EmptyState } from "@/components/empty-state"
import type { Memory } from "@/lib/types"

/**
 * Get the start of today as a Unix timestamp (seconds)
 */
function getTodayStart(): number {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.floor(now.getTime() / 1000)
}

/**
 * Group memories by hour
 */
function groupMemoriesByHour(memories: Memory[]): Map<number, Memory[]> {
  const groups = new Map<number, Memory[]>()

  for (const memory of memories) {
    const date = new Date(memory.created_at * 1000)
    const hour = date.getHours()

    if (!groups.has(hour)) {
      groups.set(hour, [])
    }
    groups.get(hour)!.push(memory)
  }

  // Sort groups by hour (descending - most recent first)
  return new Map([...groups.entries()].sort(([a], [b]) => b - a))
}

/**
 * Format hour for display
 */
function formatHour(hour: number): string {
  const ampm = hour >= 12 ? "PM" : "AM"
  const displayHour = hour % 12 || 12
  return `${displayHour}:00 ${ampm}`
}

export function HomePage(): React.ReactElement {
  const {
    data: memories = [],
    isLoading,
    error,
    refetch,
  } = useMemories(undefined, 100) // Fetch recent 100 memories

  // Filter to today's memories
  const todayStart = useMemo(() => getTodayStart(), [])
  const todayMemories = useMemo(
    () => memories.filter((m) => m.created_at >= todayStart),
    [memories, todayStart]
  )

  // Group by hour
  const groupedMemories = useMemo(
    () => groupMemoriesByHour(todayMemories),
    [todayMemories]
  )

  // Recent activity (all memories, not just today)
  const recentMemories = useMemo(() => memories.slice(0, 5), [memories])

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Button variant="default" className="gap-2">
          <Sparkles className="h-4 w-4" />
          Generate Standup
        </Button>
        <Button variant="outline" className="gap-2">
          <FileText className="h-4 w-4" />
          Save Manual Note
        </Button>
      </div>

      {/* Today's Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Today&apos;s Timeline
          </CardTitle>
          <CardDescription>
            Your activities and memories from today
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <PageLoading message="Loading memories..." />
          ) : error ? (
            <ErrorDisplay error={error} onRetry={refetch} />
          ) : todayMemories.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="No memories yet today"
              description="Start using AI tools with MCP to automatically capture your activities, or save a manual note above."
            />
          ) : (
            <div className="space-y-6">
              {[...groupedMemories.entries()].map(([hour, hourMemories]) => (
                <div key={hour}>
                  <h4 className="mb-3 text-sm font-medium text-muted-foreground">
                    {formatHour(hour)}
                  </h4>
                  <div className="space-y-3">
                    {hourMemories.map((memory) => (
                      <MemoryCard key={memory.id} memory={memory} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Your latest memories across all spaces
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <PageLoading message="Loading..." />
          ) : error ? (
            <ErrorDisplay error={error} onRetry={refetch} />
          ) : recentMemories.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No recent activity to show. Connect an AI app to get started.
            </div>
          ) : (
            <div className="space-y-3">
              {recentMemories.map((memory) => (
                <MemoryCard key={memory.id} memory={memory} compact />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

interface MemoryCardProps {
  memory: Memory
  compact?: boolean
}

function MemoryCard({
  memory,
  compact = false,
}: MemoryCardProps): React.ReactElement {
  const time = new Date(memory.created_at * 1000)
  const timeString = time.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })

  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-card/50 p-3">
      <div className="mt-0.5 rounded-md bg-muted p-2">
        <Globe className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h5 className="truncate text-sm font-medium">
            {memory.title || memory.source || "Untitled"}
          </h5>
          <Badge variant="outline" className="shrink-0 text-xs">
            {memory.source}
          </Badge>
        </div>
        {!compact && memory.summary && (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {memory.summary}
          </p>
        )}
        <div className="mt-1 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{timeString}</span>
          {memory.tags.length > 0 && (
            <div className="flex items-center gap-1">
              {memory.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {memory.tags.length > 3 && (
                <span className="text-xs text-muted-foreground">
                  +{memory.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
