import { useParams, Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  ArrowLeft,
  Filter,
  Calendar,
  Tag,
  Search,
  FileText,
} from "lucide-react"

export function SpaceDetailPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>()

  // Placeholder - will be replaced with actual data fetching
  const space = {
    id: id ?? "unknown",
    name: id === "work" ? "Work Projects" : "Personal",
    description:
      id === "work"
        ? "Professional tasks, meetings, and code reviews"
        : "Personal notes, ideas, and learning",
  }

  return (
    <div className="space-y-6">
      {/* Back link and title */}
      <div className="flex items-center gap-4">
        <Link
          to="/spaces"
          className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Spaces
        </Link>
      </div>

      <div>
        <h2 className="text-2xl font-semibold">{space.name}</h2>
        <p className="mt-1 text-muted-foreground">{space.description}</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search memories..."
                className="pl-9"
              />
            </div>

            {/* Filter buttons */}
            <Button variant="outline" size="sm" className="gap-2">
              <Calendar className="h-4 w-4" />
              Date Range
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Tag className="h-4 w-4" />
              Tags
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              Source
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Memories List */}
      <Card>
        <CardHeader>
          <CardTitle>Memories</CardTitle>
          <CardDescription>
            All captured memories in this space
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 rounded-full bg-muted p-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-medium">No memories yet</h3>
            <p className="max-w-sm text-sm text-muted-foreground">
              Memories will appear here when you use AI tools connected through
              MCP, or when you save manual notes.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Active filters display */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Active filters:</span>
        <Badge variant="outline">None</Badge>
      </div>
    </div>
  )
}
