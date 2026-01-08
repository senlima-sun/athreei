import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, FolderOpen, Lock, Globe } from "lucide-react"

interface Space {
  id: string
  name: string
  description: string
  memoryCount: number
  isPrivate: boolean
  lastActivity: string
}

// Placeholder data - will be replaced with actual data from backend
const PLACEHOLDER_SPACES: Space[] = [
  {
    id: "work",
    name: "Work Projects",
    description: "Professional tasks, meetings, and code reviews",
    memoryCount: 0,
    isPrivate: true,
    lastActivity: "Never",
  },
  {
    id: "personal",
    name: "Personal",
    description: "Personal notes, ideas, and learning",
    memoryCount: 0,
    isPrivate: true,
    lastActivity: "Never",
  },
]

export function SpacesPage(): React.ReactElement {
  const spaces = PLACEHOLDER_SPACES

  return (
    <div className="space-y-6">
      {/* Header with New Space button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium">Your Spaces</h2>
          <p className="text-sm text-muted-foreground">
            Organize your memories into separate contexts
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New Space
        </Button>
      </div>

      {/* Spaces Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {spaces.map((space) => (
          <SpaceCard key={space.id} space={space} />
        ))}

        {/* Add Space Card */}
        <Card className="flex cursor-pointer items-center justify-center border-dashed transition-colors hover:border-primary hover:bg-accent/50">
          <CardContent className="flex flex-col items-center py-8 text-center">
            <div className="mb-3 rounded-full bg-muted p-3">
              <Plus className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">Create New Space</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Add a new context for your memories
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

interface SpaceCardProps {
  space: Space
}

function SpaceCard({ space }: SpaceCardProps): React.ReactElement {
  return (
    <Link to={`/spaces/${space.id}`} className="no-underline">
      <Card className="h-full transition-colors hover:border-primary">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="rounded-lg bg-muted p-2">
              <FolderOpen className="h-5 w-5 text-muted-foreground" />
            </div>
            <Badge variant={space.isPrivate ? "secondary" : "outline"}>
              {space.isPrivate ? (
                <>
                  <Lock className="mr-1 h-3 w-3" /> Private
                </>
              ) : (
                <>
                  <Globe className="mr-1 h-3 w-3" /> Shared
                </>
              )}
            </Badge>
          </div>
          <CardTitle className="mt-3">{space.name}</CardTitle>
          <CardDescription>{space.description}</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{space.memoryCount} memories</span>
            <span>Last: {space.lastActivity}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
