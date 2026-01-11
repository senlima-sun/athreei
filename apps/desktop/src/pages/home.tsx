import { useMemo } from "react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  FileText,
  Sparkles,
  Clock,
  Globe,
  Database,
  Calendar,
  CalendarDays,
  Folder,
} from "lucide-react"
import { useMemories, useStats } from "@/hooks"
import { PageLoading } from "@/components/common/loading-spinner"
import { ErrorDisplay } from "@/components/common/error-display"
import { EmptyState } from "@/components/common/empty-state"
import { StatsCard } from "@/components/stats-card"
import { ActivityChart } from "@/components/activity-chart"
import type { Memory } from "@/lib/types"

function getTodayStart(): number {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.floor(now.getTime() / 1000)
}

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

  return new Map([...groups.entries()].sort(([a], [b]) => b - a))
}

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
  } = useMemories(undefined, 100)

  const { stats, weeklyData, isLoading: isLoadingStats } = useStats()

  const todayStart = useMemo(() => getTodayStart(), [])
  const todayMemories = useMemo(
    () => memories.filter((m) => m.created_at >= todayStart),
    [memories, todayStart]
  )

  const groupedMemories = useMemo(
    () => groupMemoriesByHour(todayMemories),
    [todayMemories]
  )

  const recentMemories = useMemo(() => memories.slice(0, 5), [memories])

  return (
    <div className="space-y-4">
      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" className="h-7 gap-1.5 text-xs">
          <Sparkles className="h-3.5 w-3.5" />
          Generate Standup
        </Button>
        <Button variant="secondary" size="sm" className="h-7 gap-1.5 text-xs">
          <FileText className="h-3.5 w-3.5" />
          Save Note
        </Button>
      </div>

      {/* Activity Stats */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          icon={Database}
          value={isLoadingStats ? "-" : stats.totalMemories}
          label="Total"
        />
        <StatsCard
          icon={Calendar}
          value={isLoadingStats ? "-" : stats.memoriesToday}
          label="Today"
        />
        <StatsCard
          icon={CalendarDays}
          value={isLoadingStats ? "-" : stats.memoriesThisWeek}
          label="Week"
        />
        <StatsCard
          icon={Folder}
          value={isLoadingStats ? "-" : (stats.mostActiveSpace?.name ?? "—")}
          label="Active"
        />
      </div>

      {/* Weekly Activity Chart */}
      <div className="rounded-md bg-card p-3">
        <ActivityChart data={weeklyData} />
      </div>

      {/* Today's Timeline */}
      <section className="rounded-md bg-card p-3">
        <div className="mb-2 flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <h3 className="text-xs font-medium">Today&apos;s Timeline</h3>
        </div>
        {isLoading ? (
          <PageLoading message="Loading memories..." />
        ) : error ? (
          <ErrorDisplay error={error} onRetry={refetch} />
        ) : todayMemories.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="No memories yet today"
            description="Start using AI tools with MCP to capture activities."
          />
        ) : (
          <div className="space-y-3">
            {[...groupedMemories.entries()].map(([hour, hourMemories]) => (
              <div key={hour}>
                <h4 className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {formatHour(hour)}
                </h4>
                <div className="space-y-1">
                  {hourMemories.map((memory) => (
                    <MemoryItem key={memory.id} memory={memory} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent Activity */}
      <section className="rounded-md bg-card p-3">
        <h3 className="mb-2 text-xs font-medium">Recent Activity</h3>
        {isLoading ? (
          <PageLoading message="Loading..." />
        ) : error ? (
          <ErrorDisplay error={error} onRetry={refetch} />
        ) : recentMemories.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No recent activity. Connect an AI app to get started.
          </p>
        ) : (
          <div className="space-y-1">
            {recentMemories.map((memory) => (
              <MemoryItem key={memory.id} memory={memory} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

interface MemoryItemProps {
  memory: Memory
}

function MemoryItem({ memory }: MemoryItemProps): React.ReactElement {
  const time = new Date(memory.created_at * 1000)
  const timeString = time.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })

  return (
    <Link
      to={`/memories/${memory.id}`}
      className="group flex items-center gap-2 rounded px-2 py-1.5 no-underline transition-colors hover:bg-accent"
    >
      <Globe className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate text-xs text-foreground">
        {memory.title || memory.source || "Untitled"}
      </span>
      {memory.tags.length > 0 && (
        <div className="hidden items-center gap-1 sm:flex">
          {memory.tags.slice(0, 2).map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="h-4 px-1 text-[10px]"
            >
              {tag}
            </Badge>
          ))}
        </div>
      )}
      <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
        {timeString}
      </span>
    </Link>
  )
}
