import { useState } from "react"
import { useParams, Link, useNavigate } from "react-router-dom"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  ArrowLeft,
  CheckCircle2,
  Star,
  Trash2,
  GripVertical,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  History,
} from "lucide-react"
import {
  useWorkspace,
  useUpdateWorkspace,
  useDeleteWorkspace,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useReorderTasks,
  useHandoffs,
  useCreateHandoff,
} from "@/hooks"
import { PageLoading } from "@/components/common/loading-spinner"
import { PageError, ErrorDisplay } from "@/components/common/error-display"
import type {
  Task,
  TaskStatus,
  WorkspaceStatus,
  WorkspaceWithTasks,
  UpdateTaskInput,
  Handoff,
} from "@/lib/types"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

const WORKSPACE_STATUS_CONFIG: Record<
  WorkspaceStatus,
  { color: string; bgColor: string; label: string }
> = {
  pending: { color: "text-gray-600", bgColor: "bg-gray-100", label: "Pending" },
  in_progress: { color: "text-blue-600", bgColor: "bg-blue-100", label: "In Progress" },
  blocked: { color: "text-red-600", bgColor: "bg-red-100", label: "Blocked" },
  paused: { color: "text-yellow-600", bgColor: "bg-yellow-100", label: "Paused" },
  completed: { color: "text-green-600", bgColor: "bg-green-100", label: "Completed" },
  abandoned: { color: "text-gray-500", bgColor: "bg-gray-100", label: "Abandoned" },
  archived: { color: "text-gray-400", bgColor: "bg-gray-50", label: "Archived" },
}

const TASK_STATUS_CONFIG: Record<
  TaskStatus,
  { color: string; bgColor: string; label: string }
> = {
  pending: { color: "text-gray-600", bgColor: "bg-gray-100", label: "Pending" },
  in_progress: { color: "text-blue-600", bgColor: "bg-blue-100", label: "In Progress" },
  completed: { color: "text-green-600", bgColor: "bg-green-100", label: "Completed" },
  blocked: { color: "text-red-600", bgColor: "bg-red-100", label: "Blocked" },
  deferred: { color: "text-orange-600", bgColor: "bg-orange-100", label: "Deferred" },
}

export function WorkspaceDetailPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const {
    data: workspace,
    isLoading,
    error,
  } = useWorkspace(id ?? "")

  if (isLoading) {
    return <PageLoading message="Loading workspace..." />
  }

  if (error) {
    return <PageError error={error} onRetry={() => navigate("/workspaces")} />
  }

  if (!workspace) {
    return (
      <div className="space-y-6">
        <Link
          to="/workspaces"
          className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Workspaces
        </Link>
        <PageError
          error={new Error("Workspace not found")}
          onRetry={() => navigate("/workspaces")}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Link
        to="/workspaces"
        className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Workspaces
      </Link>

      <WorkspaceHeader workspace={workspace} />
      <WorkspaceInfo workspace={workspace} />
      <TaskSection workspace={workspace} />
      <HandoffSection workspaceId={workspace.id} />
    </div>
  )
}

interface WorkspaceHeaderProps {
  workspace: WorkspaceWithTasks
}

function WorkspaceHeader({ workspace }: WorkspaceHeaderProps): React.ReactElement {
  const navigate = useNavigate()
  const [editingName, setEditingName] = useState(false)
  const [name, setName] = useState(workspace.name)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const updateWorkspace = useUpdateWorkspace()
  const deleteWorkspace = useDeleteWorkspace()
  const statusConfig = WORKSPACE_STATUS_CONFIG[workspace.status]

  const handleNameSave = async (): Promise<void> => {
    if (name.trim() && name.trim() !== workspace.name) {
      await updateWorkspace.mutateAsync({
        id: workspace.id,
        input: { name: name.trim() },
      })
    }
    setEditingName(false)
  }

  const handleStatusChange = async (
    e: React.ChangeEvent<HTMLSelectElement>
  ): Promise<void> => {
    const newStatus = e.target.value as WorkspaceStatus
    await updateWorkspace.mutateAsync({
      id: workspace.id,
      input: { status: newStatus },
    })
  }

  const handleDelete = async (): Promise<void> => {
    if (confirmDelete) {
      await deleteWorkspace.mutateAsync(workspace.id)
      navigate("/workspaces")
    } else {
      setConfirmDelete(true)
    }
  }

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        {editingName ? (
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleNameSave}
            onKeyDown={(e) => e.key === "Enter" && handleNameSave()}
            className="text-xl font-semibold"
            autoFocus
          />
        ) : (
          <h2
            className="cursor-pointer text-2xl font-semibold hover:text-primary"
            onClick={() => setEditingName(true)}
          >
            {workspace.name}
          </h2>
        )}
      </div>
      <div className="flex items-center gap-2">
        <select
          value={workspace.status}
          onChange={handleStatusChange}
          className={`rounded-md border px-2 py-1 text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}
        >
          {Object.entries(WORKSPACE_STATUS_CONFIG).map(([status, config]) => (
            <option key={status} value={status}>
              {config.label}
            </option>
          ))}
        </select>
        <Button
          size="sm"
          variant={confirmDelete ? "destructive" : "ghost"}
          className="h-8"
          onClick={handleDelete}
          onMouseLeave={() => setConfirmDelete(false)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

interface WorkspaceInfoProps {
  workspace: WorkspaceWithTasks
}

function WorkspaceInfo({ workspace }: WorkspaceInfoProps): React.ReactElement {
  const [editingField, setEditingField] = useState<string | null>(null)
  const [goal, setGoal] = useState(workspace.goal)
  const [successCriteria, setSuccessCriteria] = useState(
    workspace.success_criteria ?? ""
  )
  const [context, setContext] = useState(workspace.context ?? "")
  const [blocker, setBlocker] = useState(workspace.blocker ?? "")
  const updateWorkspace = useUpdateWorkspace()

  const handleSave = async (
    field: "goal" | "success_criteria" | "context" | "blocker",
    value: string
  ): Promise<void> => {
    const trimmed = value.trim()
    const current =
      field === "goal"
        ? workspace.goal
        : field === "success_criteria"
          ? workspace.success_criteria ?? ""
          : field === "context"
            ? workspace.context ?? ""
            : workspace.blocker ?? ""

    if (trimmed !== current) {
      await updateWorkspace.mutateAsync({
        id: workspace.id,
        input: { [field]: trimmed || null },
      })
    }
    setEditingField(null)
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Goal
          </label>
          {editingField === "goal" ? (
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              onBlur={() => handleSave("goal", goal)}
              className="mt-1 w-full resize-none rounded-md border bg-transparent p-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              rows={3}
              autoFocus
            />
          ) : (
            <p
              className="mt-1 cursor-pointer text-sm hover:text-primary"
              onClick={() => setEditingField("goal")}
            >
              {workspace.goal}
            </p>
          )}
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Success Criteria
          </label>
          {editingField === "success_criteria" ? (
            <textarea
              value={successCriteria}
              onChange={(e) => setSuccessCriteria(e.target.value)}
              onBlur={() => handleSave("success_criteria", successCriteria)}
              className="mt-1 w-full resize-none rounded-md border bg-transparent p-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              rows={2}
              autoFocus
            />
          ) : (
            <p
              className="mt-1 cursor-pointer text-sm text-muted-foreground hover:text-primary"
              onClick={() => setEditingField("success_criteria")}
            >
              {workspace.success_criteria || "Click to add success criteria..."}
            </p>
          )}
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Context
          </label>
          {editingField === "context" ? (
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              onBlur={() => handleSave("context", context)}
              className="mt-1 w-full resize-none rounded-md border bg-transparent p-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              rows={4}
              autoFocus
            />
          ) : (
            <p
              className="mt-1 cursor-pointer whitespace-pre-wrap text-sm text-muted-foreground hover:text-primary"
              onClick={() => setEditingField("context")}
            >
              {workspace.context || "Click to add context..."}
            </p>
          )}
        </div>

        {workspace.status === "blocked" && (
          <div>
            <label className="text-xs font-medium text-red-500">
              Blocker
            </label>
            {editingField === "blocker" ? (
              <textarea
                value={blocker}
                onChange={(e) => setBlocker(e.target.value)}
                onBlur={() => handleSave("blocker", blocker)}
                className="mt-1 w-full resize-none rounded-md border border-red-200 bg-red-50 p-2 text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                rows={2}
                autoFocus
              />
            ) : (
              <p
                className="mt-1 cursor-pointer text-sm text-red-600 hover:text-red-700"
                onClick={() => setEditingField("blocker")}
              >
                {workspace.blocker || "Click to describe what's blocking..."}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface TaskSectionProps {
  workspace: WorkspaceWithTasks
}

function TaskSection({ workspace }: TaskSectionProps): React.ReactElement {
  const [isCreating, setIsCreating] = useState(false)
  const reorderTasks = useReorderTasks()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const sortedTasks = [...workspace.tasks].sort((a, b) => a.position - b.position)

  const handleDragEnd = async (event: DragEndEvent): Promise<void> => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = sortedTasks.findIndex((t) => t.id === active.id)
      const newIndex = sortedTasks.findIndex((t) => t.id === over.id)
      const newOrder = arrayMove(sortedTasks, oldIndex, newIndex)

      await reorderTasks.mutateAsync({
        workspaceId: workspace.id,
        taskIds: newOrder.map((t) => t.id),
      })
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Tasks</CardTitle>
          {!isCreating && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1 text-xs"
              onClick={() => setIsCreating(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </Button>
          )}
        </div>
        <CardDescription>
          {sortedTasks.length} task{sortedTasks.length !== 1 ? "s" : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {isCreating && (
          <CreateTaskInline
            workspaceId={workspace.id}
            onClose={() => setIsCreating(false)}
          />
        )}

        {sortedTasks.length === 0 && !isCreating ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No tasks yet. Add one to get started.
          </p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sortedTasks.map((t) => t.id)}
              strategy={verticalListSortingStrategy}
            >
              {sortedTasks.map((task) => (
                <SortableTaskItem
                  key={task.id}
                  task={task}
                  workspaceId={workspace.id}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </CardContent>
    </Card>
  )
}

interface SortableTaskItemProps {
  task: Task
  workspaceId: string
}

function SortableTaskItem({
  task,
  workspaceId,
}: SortableTaskItemProps): React.ReactElement {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <TaskItem
        task={task}
        workspaceId={workspaceId}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  )
}

interface TaskItemProps {
  task: Task
  workspaceId: string
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>
}

function TaskItem({
  task,
  workspaceId,
  dragHandleProps,
}: TaskItemProps): React.ReactElement {
  const [expanded, setExpanded] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description ?? "")
  const [blocker, setBlocker] = useState(task.blocker ?? "")
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const statusConfig = TASK_STATUS_CONFIG[task.status]

  const handleUpdate = async (input: UpdateTaskInput): Promise<void> => {
    await updateTask.mutateAsync({ id: task.id, workspaceId, input })
  }

  const handleTitleSave = async (): Promise<void> => {
    if (title.trim() && title.trim() !== task.title) {
      await handleUpdate({ title: title.trim() })
    }
    setEditingTitle(false)
  }

  const handleToggleComplete = async (): Promise<void> => {
    const newStatus: TaskStatus =
      task.status === "completed" ? "pending" : "completed"
    await handleUpdate({ status: newStatus })
  }

  const handleToggleNextAction = async (): Promise<void> => {
    await handleUpdate({ is_next_action: !task.is_next_action })
  }

  const handleStatusChange = async (
    e: React.ChangeEvent<HTMLSelectElement>
  ): Promise<void> => {
    await handleUpdate({ status: e.target.value as TaskStatus })
  }

  const handleDelete = async (): Promise<void> => {
    await deleteTask.mutateAsync({ id: task.id, workspaceId })
  }

  return (
    <div className="group rounded-md border bg-card p-2">
      <div className="flex items-center gap-2">
        <button
          {...dragHandleProps}
          className="cursor-grab text-muted-foreground hover:text-foreground"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <button
          onClick={handleToggleComplete}
          className={`h-4 w-4 shrink-0 rounded border-2 transition-colors ${
            task.status === "completed"
              ? "border-green-500 bg-green-500"
              : "border-muted-foreground hover:border-primary"
          }`}
        >
          {task.status === "completed" && (
            <CheckCircle2 className="h-3 w-3 text-white" />
          )}
        </button>

        {editingTitle ? (
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={(e) => e.key === "Enter" && handleTitleSave()}
            className="h-6 flex-1 text-xs"
            autoFocus
          />
        ) : (
          <span
            className={`flex-1 cursor-pointer truncate text-xs ${
              task.status === "completed"
                ? "text-muted-foreground line-through"
                : ""
            }`}
            onClick={() => setEditingTitle(true)}
          >
            {task.title}
          </span>
        )}

        <button
          onClick={handleToggleNextAction}
          className={`shrink-0 ${
            task.is_next_action
              ? "text-yellow-500"
              : "text-muted-foreground opacity-0 group-hover:opacity-100"
          }`}
          title={task.is_next_action ? "Remove from next actions" : "Mark as next action"}
        >
          <Star
            className="h-3.5 w-3.5"
            fill={task.is_next_action ? "currentColor" : "none"}
          />
        </button>

        <select
          value={task.status}
          onChange={handleStatusChange}
          className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${statusConfig.bgColor} ${statusConfig.color}`}
        >
          {Object.entries(TASK_STATUS_CONFIG).map(([status, config]) => (
            <option key={status} value={status}>
              {config.label}
            </option>
          ))}
        </select>

        <button
          onClick={() => setExpanded(!expanded)}
          className="shrink-0 text-muted-foreground hover:text-foreground"
        >
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </button>

        <button
          onClick={handleDelete}
          className="shrink-0 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {expanded && (
        <div className="mt-2 space-y-2 border-t pt-2">
          <div>
            <label className="text-[10px] font-medium text-muted-foreground">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => {
                if (description !== (task.description ?? "")) {
                  handleUpdate({ description: description || undefined })
                }
              }}
              className="mt-1 w-full resize-none rounded border bg-transparent p-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              rows={2}
              placeholder="Add description..."
            />
          </div>

          {task.status === "blocked" && (
            <div>
              <label className="text-[10px] font-medium text-red-500">
                Blocker
              </label>
              <textarea
                value={blocker}
                onChange={(e) => setBlocker(e.target.value)}
                onBlur={() => {
                  if (blocker !== (task.blocker ?? "")) {
                    handleUpdate({ blocker: blocker || undefined })
                  }
                }}
                className="mt-1 w-full resize-none rounded border border-red-200 bg-red-50 p-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-red-500"
                rows={2}
                placeholder="What's blocking this task?"
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface CreateTaskInlineProps {
  workspaceId: string
  onClose: () => void
}

function CreateTaskInline({
  workspaceId,
  onClose,
}: CreateTaskInlineProps): React.ReactElement {
  const [title, setTitle] = useState("")
  const [isNextAction, setIsNextAction] = useState(false)
  const createTask = useCreateTask()

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!title.trim()) return

    await createTask
      .mutateAsync({
        workspace_id: workspaceId,
        title: title.trim(),
        is_next_action: isNextAction,
      })
      .then(() => {
        setTitle("")
        setIsNextAction(false)
      })
      .catch(() => {})
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 rounded-md border bg-muted/50 p-2"
    >
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="New task..."
        className="h-7 flex-1 text-xs"
        autoFocus
      />
      <button
        type="button"
        onClick={() => setIsNextAction(!isNextAction)}
        className={isNextAction ? "text-yellow-500" : "text-muted-foreground"}
        title="Mark as next action"
      >
        <Star
          className="h-4 w-4"
          fill={isNextAction ? "currentColor" : "none"}
        />
      </button>
      <Button
        type="submit"
        size="sm"
        className="h-7 text-xs"
        disabled={!title.trim()}
        loading={createTask.isPending}
      >
        Add
      </Button>
      <button
        type="button"
        onClick={onClose}
        className="rounded p-1 hover:bg-accent"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </form>
  )
}

interface HandoffSectionProps {
  workspaceId: string
}

function HandoffSection({ workspaceId }: HandoffSectionProps): React.ReactElement {
  const [isCreating, setIsCreating] = useState(false)
  const [limit, setLimit] = useState(5)
  const { data: handoffs = [], isLoading } = useHandoffs(workspaceId, limit)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4" />
            <CardTitle className="text-base">Session History</CardTitle>
          </div>
          {!isCreating && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1 text-xs"
              onClick={() => setIsCreating(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Handoff
            </Button>
          )}
        </div>
        <CardDescription>
          {handoffs.length} handoff{handoffs.length !== 1 ? "s" : ""} recorded
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isCreating && (
          <CreateHandoffForm
            workspaceId={workspaceId}
            onClose={() => setIsCreating(false)}
          />
        )}

        {isLoading ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Loading handoffs...
          </p>
        ) : handoffs.length === 0 && !isCreating ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No handoffs yet. Create one to record your session state.
          </p>
        ) : (
          <>
            {handoffs.map((handoff) => (
              <HandoffCard key={handoff.id} handoff={handoff} />
            ))}
            {handoffs.length >= limit && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={() => setLimit((prev) => prev + 10)}
              >
                Load more
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

interface HandoffCardProps {
  handoff: Handoff
}

function HandoffCard({ handoff }: HandoffCardProps): React.ReactElement {
  const [expanded, setExpanded] = useState(false)

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp * 1000)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffHours < 1) return "Just now"
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="rounded-md border bg-card p-3">
      <div
        className="flex cursor-pointer items-center justify-between"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="min-w-0 flex-1">
          <p className="text-[10px] text-muted-foreground">
            {formatTimestamp(handoff.created_at)}
          </p>
          <p className="truncate text-xs font-medium">
            {handoff.progress_summary}
          </p>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </div>

      {expanded && (
        <div className="mt-3 space-y-3 border-t pt-3">
          <div>
            <label className="text-[10px] font-medium text-muted-foreground">
              Current State
            </label>
            <p className="mt-0.5 whitespace-pre-wrap text-xs">
              {handoff.current_state}
            </p>
          </div>

          {handoff.next_steps && (
            <div>
              <label className="text-[10px] font-medium text-muted-foreground">
                Next Steps
              </label>
              <p className="mt-0.5 whitespace-pre-wrap text-xs">
                {handoff.next_steps}
              </p>
            </div>
          )}

          {handoff.blockers && (
            <div>
              <label className="text-[10px] font-medium text-red-500">
                Blockers
              </label>
              <p className="mt-0.5 whitespace-pre-wrap text-xs text-red-600">
                {handoff.blockers}
              </p>
            </div>
          )}

          {handoff.what_worked && (
            <div>
              <label className="text-[10px] font-medium text-green-600">
                What Worked
              </label>
              <p className="mt-0.5 whitespace-pre-wrap text-xs">
                {handoff.what_worked}
              </p>
            </div>
          )}

          {handoff.what_failed && (
            <div>
              <label className="text-[10px] font-medium text-orange-600">
                What Failed
              </label>
              <p className="mt-0.5 whitespace-pre-wrap text-xs">
                {handoff.what_failed}
              </p>
            </div>
          )}

          {handoff.key_decisions && (
            <div>
              <label className="text-[10px] font-medium text-muted-foreground">
                Key Decisions
              </label>
              <p className="mt-0.5 whitespace-pre-wrap text-xs">
                {handoff.key_decisions}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface CreateHandoffFormProps {
  workspaceId: string
  onClose: () => void
}

function CreateHandoffForm({
  workspaceId,
  onClose,
}: CreateHandoffFormProps): React.ReactElement {
  const [progressSummary, setProgressSummary] = useState("")
  const [currentState, setCurrentState] = useState("")
  const [showAdditional, setShowAdditional] = useState(false)
  const [nextSteps, setNextSteps] = useState("")
  const [blockers, setBlockers] = useState("")
  const [whatWorked, setWhatWorked] = useState("")
  const [whatFailed, setWhatFailed] = useState("")
  const [keyDecisions, setKeyDecisions] = useState("")
  const createHandoff = useCreateHandoff()

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!progressSummary.trim() || !currentState.trim()) return

    await createHandoff
      .mutateAsync({
        workspace_id: workspaceId,
        progress_summary: progressSummary.trim(),
        current_state: currentState.trim(),
        next_steps: nextSteps.trim() || undefined,
        blockers: blockers.trim() || undefined,
        what_worked: whatWorked.trim() || undefined,
        what_failed: whatFailed.trim() || undefined,
        key_decisions: keyDecisions.trim() || undefined,
      })
      .then(() => onClose())
      .catch(() => {})
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-md border bg-muted/50 p-3"
    >
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium">New Handoff</h4>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 hover:bg-accent"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div>
        <label className="text-[10px] font-medium text-muted-foreground">
          Progress Summary *
        </label>
        <textarea
          value={progressSummary}
          onChange={(e) => setProgressSummary(e.target.value)}
          className="mt-1 w-full resize-none rounded border bg-transparent p-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          rows={2}
          placeholder="What was accomplished in this session?"
          required
        />
      </div>

      <div>
        <label className="text-[10px] font-medium text-muted-foreground">
          Current State *
        </label>
        <textarea
          value={currentState}
          onChange={(e) => setCurrentState(e.target.value)}
          className="mt-1 w-full resize-none rounded border bg-transparent p-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          rows={2}
          placeholder="What is the current state of the work?"
          required
        />
      </div>

      <button
        type="button"
        onClick={() => setShowAdditional(!showAdditional)}
        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
      >
        {showAdditional ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
        Additional Details
      </button>

      {showAdditional && (
        <div className="space-y-3 border-t pt-3">
          <div>
            <label className="text-[10px] font-medium text-muted-foreground">
              Next Steps
            </label>
            <textarea
              value={nextSteps}
              onChange={(e) => setNextSteps(e.target.value)}
              className="mt-1 w-full resize-none rounded border bg-transparent p-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              rows={2}
              placeholder="What should be done next?"
            />
          </div>

          <div>
            <label className="text-[10px] font-medium text-muted-foreground">
              Blockers
            </label>
            <textarea
              value={blockers}
              onChange={(e) => setBlockers(e.target.value)}
              className="mt-1 w-full resize-none rounded border bg-transparent p-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              rows={2}
              placeholder="Any blockers or issues?"
            />
          </div>

          <div>
            <label className="text-[10px] font-medium text-muted-foreground">
              What Worked
            </label>
            <textarea
              value={whatWorked}
              onChange={(e) => setWhatWorked(e.target.value)}
              className="mt-1 w-full resize-none rounded border bg-transparent p-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              rows={2}
              placeholder="What approaches were successful?"
            />
          </div>

          <div>
            <label className="text-[10px] font-medium text-muted-foreground">
              What Failed
            </label>
            <textarea
              value={whatFailed}
              onChange={(e) => setWhatFailed(e.target.value)}
              className="mt-1 w-full resize-none rounded border bg-transparent p-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              rows={2}
              placeholder="What didn't work?"
            />
          </div>

          <div>
            <label className="text-[10px] font-medium text-muted-foreground">
              Key Decisions
            </label>
            <textarea
              value={keyDecisions}
              onChange={(e) => setKeyDecisions(e.target.value)}
              className="mt-1 w-full resize-none rounded border bg-transparent p-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              rows={2}
              placeholder="Important decisions made"
            />
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          className="h-7 text-xs"
          disabled={!progressSummary.trim() || !currentState.trim()}
          loading={createHandoff.isPending}
        >
          Create Handoff
        </Button>
      </div>

      {createHandoff.error && <ErrorDisplay error={createHandoff.error} />}
    </form>
  )
}
