import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Server,
  Play,
  Square,
  CheckCircle,
  AlertCircle,
  ExternalLink,
} from "lucide-react"
import { useMcpStatus, useMcpStart, useMcpStop } from "@/hooks"
import { ErrorDisplay } from "@/components/common/error-display"
import { Section } from "./section"
import { SettingRow } from "./setting-row"

export function McpSection(): React.ReactElement {
  const { data: mcpStatus, isLoading: mcpLoading } = useMcpStatus()
  const mcpStart = useMcpStart()
  const mcpStop = useMcpStop()

  const handleMcpToggle = async (): Promise<void> => {
    if (mcpStatus?.running) {
      await mcpStop.mutateAsync()
    } else {
      await mcpStart.mutateAsync()
    }
  }

  const mcpError = mcpStart.error || mcpStop.error

  return (
    <Section
      icon={Server}
      title="MCP Server"
      badge={
        mcpLoading ? (
          <Badge variant="outline">...</Badge>
        ) : mcpStatus?.running ? (
          <Badge variant="success" className="gap-0.5">
            <CheckCircle className="h-2.5 w-2.5" />
            Running
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-0.5">
            <AlertCircle className="h-2.5 w-2.5" />
            Stopped
          </Badge>
        )
      }
    >
      <SettingRow
        label="Server Control"
        description={
          mcpStatus?.running
            ? `${mcpStatus.transport} transport`
            : "Start to connect AI apps"
        }
        action={
          <Button
            variant={mcpStatus?.running ? "destructive" : "default"}
            size="sm"
            className="h-6 gap-1 text-xs"
            onClick={handleMcpToggle}
            loading={mcpStart.isPending || mcpStop.isPending}
          >
            {mcpStatus?.running ? (
              <>
                <Square className="h-2.5 w-2.5" />
                Stop
              </>
            ) : (
              <>
                <Play className="h-2.5 w-2.5" />
                Start
              </>
            )}
          </Button>
        }
      />
      {mcpError && <ErrorDisplay error={mcpError} />}

      {mcpStatus?.running && mcpStatus?.port && (
        <div className="flex items-center justify-between rounded bg-green-500/10 px-2 py-1.5">
          <code className="text-[10px] text-green-600 dark:text-green-400">
            http://127.0.0.1:{mcpStatus.port}/mcp
          </code>
          <button
            onClick={() => {
              navigator.clipboard.writeText(
                `http://127.0.0.1:${mcpStatus.port}/mcp`
              )
            }}
            className="text-[10px] text-muted-foreground hover:text-foreground"
          >
            Copy
          </button>
        </div>
      )}

      <SettingRow
        label="Setup Guide"
        description="Connect Claude Desktop"
        action={
          <button className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground">
            <ExternalLink className="h-3 w-3" />
          </button>
        }
      />
    </Section>
  )
}
