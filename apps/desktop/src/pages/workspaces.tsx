import { useState } from "react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Plus,
  Briefcase,
  Trash2,
  X,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Clock,
  Pause,
  Archive,
  Ban,
} from "lucide-react"
import {
  useWorkspaces,
  useCreateWorkspace,
  useDeleteWorkspace,
} from "@/hooks"
import { useSpaces } from "@/hooks"
import { PageLoading } from "@/components/common/loading-spinner"
import { ErrorDisplay } from "@/components/common/error-display"
import { EmptyState } from "@/components/common/empty-state"
import type { Workspace, WorkspaceStatus, CreateWorkspaceInput } from "@/lib/types"

const STATUS_CONFIG: Record<
  WorkspaceStatus,
  { color: string; icon: React.ElementType; label: string }
> = {
  pending: { color: "bg-gray-500", icon: Clock, label: "Pending" },
  in_progress: { color: "bg-blue-500", icon: Clock, label: "In Progress" },
  blocked: { color: "bg-red-500", icon: AlertCircle, label: "Blocked" },
  paused: { color: "bg-yellow-500", icon: Pause, label: "Paused" },
  completed: { color: "bg-green-500", icon: CheckCircle2, label: "Completed" },
  abandoned: { color: "bg-gray-400", icon: Ban, label: "Abandoned" },
  archived: { color: "bg-gray-300", icon: Archive, label: "Archived" },
}

export function WorkspacesPage(): React.ReactElement {
  const [isCreating, setIsCreating] = useState(false)
  const [statusFilter, setStatusFilter] = useState<WorkspaceStatus[]>([])

  const {
    data: workspaces = [],
    isLoading,
    error,
    refetch,
  } = useWorkspaces({
    statuses: statusFilter.length > 0 ? statusFilter : undefined,
  })

  const toggleStatus = (status: WorkspaceStatus): void => {
    setStatusFilter((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    )
  }

  const clearFilters = (): void => {
    setStatusFilter([])
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium">Workspaces</h2>
          <p className="text-xs text-muted-foreground">
            Track AI task progress and handoffs
          </p>
        </div>
        {!isCreating && (
          <Button
            size="sm"
            variant="secondary"
            className="h-7 gap-1.5 text-xs"
            onClick={() => setIsCreating(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            New
          </Button>
        )}
      </div>

      {/* Status Filters */}
      <StatusFilter
        selectedStatuses={statusFilter}
        onToggle={toggleStatus}
        onClear={clearFilters}
      />

      {/* Inline Create Form */}
      {isCreating && (
        <CreateWorkspaceInline onClose={() => setIsCreating(false)} />
      )}

      {/* Content */}
      {isLoading ? (
        <PageLoading message="Loading workspaces..." />
      ) : error ? (
        <ErrorDisplay error={error} onRetry={refetch} />
      ) : workspaces.length === 0 && !isCreating ? (
        <div className="rounded-md bg-card p-4">
          <EmptyState
            icon={Briefcase}
            title="No workspaces yet"
            description={
              statusFilter.length > 0
                ? "No workspaces match the selected filters."
                : "Create a workspace to track AI task progress."
            }
            action={
              statusFilter.length > 0 ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={clearFilters}
                >
                  Clear Filters
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="h-7 gap-1.5 text-xs"
                  onClick={() => setIsCreating(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Create Workspace
                </Button>
              )
            }
          />
        </div>
      ) : (
        <div className="space-y-1">
          {workspaces.map((workspace) => (
            <WorkspaceRow key={workspace.id} workspace={workspace} />
          ))}
        </div>
      )}
    </div>
  )
}

interface StatusFilterProps {
  selectedStatuses: WorkspaceStatus[]
  onToggle: (status: WorkspaceStatus) => void
  onClear: () => void
}

function StatusFilter({
  selectedStatuses,
  onToggle,
  onClear,
}: StatusFilterProps): React.ReactElement {
  const allStatuses: WorkspaceStatus[] = [
    "pending",
    "in_progress",
    "blocked",
    "paused",
    "completed",
    "abandoned",
    "archived",
  ]

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {allStatuses.map((status) => {
        const config = STATUS_CONFIG[status]
        const isSelected = selectedStatuses.includes(status)
        return (
          <button
            key={status}
            onClick={() => onToggle(status)}
            className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] transition-colors ${
              isSelected
                ? "bg-primary text-primary-foreground"
                : "bg-card hover:bg-accent"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${config.color}`}
            />
            {config.label}
          </button>
        )
      })}
      {selectedStatuses.length > 0 && (
        <button
          onClick={onClear}
          className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] text-muted-foreground hover:text-foreground"
        >
          <X className="h-2.5 w-2.5" />
          Clear
        </button>
      )}
    </div>
  )
}

interface WorkspaceRowProps {
  workspace: Workspace
}

function WorkspaceRow({ workspace }: WorkspaceRowProps): React.ReactElement {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const deleteWorkspace = useDeleteWorkspace()
  const config = STATUS_CONFIG[workspace.status]

  const handleDelete = async (e: React.MouseEvent): Promise<void> => {
    e.preventDefault()
    e.stopPropagation()
    if (confirmDelete) {
      await deleteWorkspace.mutateAsync(workspace.id)
    } else {
      setConfirmDelete(true)
    }
  }

  return (
    <Link
      to={`/workspaces/${workspace.id}`}
      className="group flex items-center gap-2.5 rounded-md bg-card px-3 py-2 no-underline transition-colors hover:bg-accent"
      onMouseLeave={() => setConfirmDelete(false)}
    >
      <span
        className={`h-2 w-2 shrink-0 rounded-full ${config.color}`}
        title={config.label}
      />
      <div className="min-w-0 flex-1">
        <span className="block truncate text-xs font-medium">
          {workspace.name}
        </span>
        <span className="block truncate text-[10px] text-muted-foreground">
          {workspace.goal}
        </span>
      </div>
      <Badge
        variant="outline"
        className="shrink-0 text-[9px] font-normal"
      >
        {config.label}
      </Badge>
      <button
        onClick={handleDelete}
        className={`shrink-0 rounded p-1 opacity-0 transition-all group-hover:opacity-100 ${
          confirmDelete
            ? "bg-destructive text-destructive-foreground opacity-100"
            : "hover:bg-destructive/10 hover:text-destructive"
        }`}
        title={confirmDelete ? "Click again to confirm" : "Delete workspace"}
      >
        <Trash2 className="h-3 w-3" />
      </button>
      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100" />
    </Link>
  )
}

interface CreateWorkspaceInlineProps {
  onClose: () => void
}

function CreateWorkspaceInline({
  onClose,
}: CreateWorkspaceInlineProps): React.ReactElement {
  const [name, setName] = useState("")
  const [goal, setGoal] = useState("")
  const [spaceId, setSpaceId] = useState<string | undefined>()
  const createWorkspace = useCreateWorkspace()
  const { data: spaces = [] } = useSpaces()

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!name.trim() || !goal.trim()) return

    const input: CreateWorkspaceInput = {
      name: name.trim(),
      goal: goal.trim(),
      space_id: spaceId,
    }

    await createWorkspace
      .mutateAsync(input)
      .then(() => onClose())
      .catch(() => {})
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-2.5 rounded-md bg-card p-3"
    >
      <div className="flex items-center gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Workspace name..."
          className="h-7 flex-1 text-xs"
          autoFocus
        />
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 hover:bg-accent"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <textarea
        value={goal}
        onChange={(e) => setGoal(e.target.value)}
        placeholder="What's the goal of this workspace?"
        className="h-16 w-full resize-none rounded-md border bg-transparent px-3 py-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      />
      <div className="flex items-center justify-between gap-2">
        <select
          value={spaceId ?? ""}
          onChange={(e) => setSpaceId(e.target.value || undefined)}
          className="h-7 rounded-md border bg-transparent px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">No space</option>
          {spaces.map((space) => (
            <option key={space.id} value={space.id}>
              {space.icon} {space.name}
            </option>
          ))}
        </select>
        <Button
          type="submit"
          size="sm"
          className="h-7 text-xs"
          disabled={!name.trim() || !goal.trim()}
          loading={createWorkspace.isPending}
        >
          Create
        </Button>
      </div>
      {createWorkspace.error && <ErrorDisplay error={createWorkspace.error} />}
    </form>
  )
}
