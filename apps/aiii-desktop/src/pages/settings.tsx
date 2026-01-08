import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Server,
  Shield,
  Cloud,
  RefreshCw,
  Key,
  HardDrive,
  ExternalLink,
} from "lucide-react"

export function SettingsPage(): React.ReactElement {
  return (
    <div className="space-y-6">
      {/* MCP Server */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-muted p-2">
                <Server className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>MCP Server</CardTitle>
                <CardDescription>
                  Local MCP server for AI app connections
                </CardDescription>
              </div>
            </div>
            <Badge variant="success">Running</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
            <div>
              <p className="text-sm font-medium">Server Status</p>
              <p className="text-xs text-muted-foreground">
                Listening on stdio for Claude Desktop
              </p>
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Restart
            </Button>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
            <div>
              <p className="text-sm font-medium">Connected Apps</p>
              <p className="text-xs text-muted-foreground">
                0 AI apps currently connected
              </p>
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <ExternalLink className="h-4 w-4" />
              Setup Guide
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Encryption */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-muted p-2">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Encryption</CardTitle>
              <CardDescription>
                End-to-end encryption for your memories
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
            <div>
              <p className="text-sm font-medium">Encryption Key</p>
              <p className="text-xs text-muted-foreground">
                Your memories are encrypted locally before sync
              </p>
            </div>
            <Badge variant="secondary">
              <Key className="mr-1 h-3 w-3" />
              AES-256-GCM
            </Badge>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
            <div>
              <p className="text-sm font-medium">Key Backup</p>
              <p className="text-xs text-muted-foreground">
                Export your encryption key for recovery
              </p>
            </div>
            <Button variant="outline" size="sm">
              Export Key
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sync */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-muted p-2">
              <Cloud className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Sync</CardTitle>
              <CardDescription>
                Sync your memories across devices
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
            <div>
              <p className="text-sm font-medium">Cloud Sync</p>
              <p className="text-xs text-muted-foreground">
                Sync encrypted memories to athreei cloud
              </p>
            </div>
            <Button variant="outline" size="sm">
              Enable
            </Button>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
            <div>
              <p className="text-sm font-medium">Local Storage</p>
              <p className="text-xs text-muted-foreground">
                SQLite database on your machine
              </p>
            </div>
            <Badge variant="outline">
              <HardDrive className="mr-1 h-3 w-3" />
              0 MB used
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Account */}
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>
            Manage your athreei account settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
            <div>
              <p className="text-sm font-medium">Sign In</p>
              <p className="text-xs text-muted-foreground">
                Sign in to enable cloud features
              </p>
            </div>
            <Button size="sm">Sign In</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
