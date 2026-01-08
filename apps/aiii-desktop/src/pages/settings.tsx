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
  Lock,
  CheckCircle,
  Play,
  Square,
  AlertCircle,
} from "lucide-react"
import {
  useVaultLock,
  useMemoryCount,
  useMcpStatus,
  useMcpStart,
  useMcpStop,
} from "@/hooks"
import { ErrorDisplay } from "@/components/error-display"

export function SettingsPage(): React.ReactElement {
  const vaultLock = useVaultLock()
  const { data: memoryCount = 0 } = useMemoryCount()

  // MCP server state
  const { data: mcpStatus, isLoading: mcpLoading } = useMcpStatus()
  const mcpStart = useMcpStart()
  const mcpStop = useMcpStop()

  const handleLockVault = async (): Promise<void> => {
    await vaultLock.mutateAsync()
  }

  const handleMcpToggle = async (): Promise<void> => {
    if (mcpStatus?.running) {
      await mcpStop.mutateAsync()
    } else {
      await mcpStart.mutateAsync()
    }
  }

  const mcpError = mcpStart.error || mcpStop.error

  return (
    <div className="space-y-6">
      {/* Vault / Encryption */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-muted p-2">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Vault</CardTitle>
                <CardDescription>Your encrypted memory storage</CardDescription>
              </div>
            </div>
            <Badge variant="success" className="gap-1">
              <CheckCircle className="h-3 w-3" />
              Unlocked
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
            <div>
              <p className="text-sm font-medium">Lock Vault</p>
              <p className="text-xs text-muted-foreground">
                Lock the vault to protect your memories. You&apos;ll need your
                passphrase to unlock.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleLockVault}
              loading={vaultLock.isPending}
            >
              <Lock className="h-4 w-4" />
              Lock Now
            </Button>
          </div>

          {vaultLock.error && <ErrorDisplay error={vaultLock.error} />}

          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
            <div>
              <p className="text-sm font-medium">Encryption</p>
              <p className="text-xs text-muted-foreground">
                Your memories are encrypted locally with your passphrase
              </p>
            </div>
            <Badge variant="secondary">
              <Key className="mr-1 h-3 w-3" />
              AES-256-GCM
            </Badge>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
            <div>
              <p className="text-sm font-medium">Change Passphrase</p>
              <p className="text-xs text-muted-foreground">
                Update your vault passphrase
              </p>
            </div>
            <Button variant="outline" size="sm" disabled>
              Coming Soon
            </Button>
          </div>
        </CardContent>
      </Card>

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
            {mcpLoading ? (
              <Badge variant="secondary">Loading...</Badge>
            ) : mcpStatus?.running ? (
              <Badge variant="success" className="gap-1">
                <CheckCircle className="h-3 w-3" />
                Running
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <AlertCircle className="h-3 w-3" />
                Stopped
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
            <div>
              <p className="text-sm font-medium">Server Control</p>
              <p className="text-xs text-muted-foreground">
                {mcpStatus?.running
                  ? `Running with ${mcpStatus.transport} transport`
                  : "Start the server to allow AI apps to connect"}
              </p>
            </div>
            <Button
              variant={mcpStatus?.running ? "destructive" : "default"}
              size="sm"
              className="gap-2"
              onClick={handleMcpToggle}
              loading={mcpStart.isPending || mcpStop.isPending}
            >
              {mcpStatus?.running ? (
                <>
                  <Square className="h-4 w-4" />
                  Stop
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Start
                </>
              )}
            </Button>
          </div>

          {mcpError && <ErrorDisplay error={mcpError} />}

          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
            <div>
              <p className="text-sm font-medium">Transport</p>
              <p className="text-xs text-muted-foreground">
                {mcpStatus?.transport === "stdio"
                  ? "stdio - for Claude Desktop"
                  : "HTTP/SSE - for web clients"}
              </p>
            </div>
            <Badge variant="outline">{mcpStatus?.transport ?? "stdio"}</Badge>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
            <div>
              <p className="text-sm font-medium">Setup Guide</p>
              <p className="text-xs text-muted-foreground">
                Learn how to connect Claude Desktop
              </p>
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <ExternalLink className="h-4 w-4" />
              View Guide
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
            <Button variant="outline" size="sm" disabled>
              Coming Soon
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
              {memoryCount} memories
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader>
          <CardTitle>About</CardTitle>
          <CardDescription>
            aiii Desktop - Personal Memory Engine
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Version</span>
            <span>0.1.0</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Build</span>
            <span>Development</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
