import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { FileText, Sparkles, Clock } from "lucide-react"

export function HomePage(): React.ReactElement {
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
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 rounded-full bg-muted p-4">
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-medium">No memories yet today</h3>
            <p className="max-w-sm text-sm text-muted-foreground">
              Start using AI tools with MCP to automatically capture your
              activities, or save a manual note above.
            </p>
          </div>
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
          <div className="text-sm text-muted-foreground">
            No recent activity to show. Connect an AI app to get started.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
