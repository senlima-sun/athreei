import { useState, useEffect, useCallback, useRef } from "react"
import { Box, Text, useApp, useInput } from "ink"
import { existsSync, readFileSync, watchFile, unwatchFile, statSync } from "fs"
import { ErrorDisplay } from "../../components/error"
import { LoadingSpinner } from "../../components/loading-spinner"
import { getGatewayLogPath } from "../../lib/gateway-process"

export interface GatewayLogsProps {
  follow?: boolean
  lines?: number
  level?: string
}

export function GatewayLogs(props: GatewayLogsProps) {
  const { exit } = useApp()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [watching, setWatching] = useState(false)
  const lastSizeRef = useRef(0)

  const filterByLevel = useCallback(
    (line: string): boolean => {
      if (!props.level) return true

      const levelOrder = ["debug", "info", "warn", "error"]
      const filterIndex = levelOrder.indexOf(props.level.toLowerCase())
      if (filterIndex === -1) return true

      const lowerLine = line.toLowerCase()
      for (let i = filterIndex; i < levelOrder.length; i++) {
        if (
          lowerLine.includes(`[${levelOrder[i]}]`) ||
          lowerLine.includes(`"level":"${levelOrder[i]}"`)
        ) {
          return true
        }
      }

      const hasAnyLevel = levelOrder.some(
        (l) =>
          lowerLine.includes(`[${l}]`) || lowerLine.includes(`"level":"${l}"`)
      )
      return !hasAnyLevel
    },
    [props.level]
  )

  const readLogs = useCallback(() => {
    const logPath = getGatewayLogPath()

    if (!existsSync(logPath)) {
      return []
    }

    try {
      const content = readFileSync(logPath, "utf-8")
      const allLines = content.split("\n").filter(Boolean)
      const filteredLines = allLines.filter(filterByLevel)
      const lineCount = props.lines ?? 50
      return filteredLines.slice(-lineCount)
    } catch {
      return []
    }
  }, [props.lines, filterByLevel])

  useEffect(() => {
    const logPath = getGatewayLogPath()

    if (!existsSync(logPath)) {
      setError(
        new Error(
          `Log file not found at ${logPath}. Gateway may not have been started yet.`
        )
      )
      setLoading(false)
      setTimeout(() => exit(), 100)
      return
    }

    const initialLogs = readLogs()
    setLogs(initialLogs)
    setLoading(false)

    if (props.follow) {
      setWatching(true)
      const stats = statSync(logPath)
      lastSizeRef.current = stats.size

      watchFile(logPath, { interval: 100 }, (curr, _prev) => {
        if (curr.size > lastSizeRef.current) {
          const newLogs = readLogs()
          setLogs(newLogs)
          lastSizeRef.current = curr.size
        }
      })

      return () => {
        unwatchFile(logPath)
      }
    } else {
      setTimeout(() => exit(), 100)
    }
  }, [props.follow, readLogs, exit])

  useInput(
    (input, key) => {
      if (key.ctrl && input === "c") {
        const logPath = getGatewayLogPath()
        unwatchFile(logPath)
        exit()
      }
    },
    { isActive: watching }
  )

  if (loading) {
    return <LoadingSpinner message="Loading logs..." />
  }

  if (error) {
    return <ErrorDisplay error={error} context="reading gateway logs" />
  }

  if (logs.length === 0) {
    return (
      <Box padding={1}>
        <Text dimColor>No logs found</Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="column" padding={1}>
      {watching && (
        <Box marginBottom={1}>
          <Text dimColor>Following logs (Ctrl+C to stop)...</Text>
        </Box>
      )}
      {logs.map((line, index) => (
        <Text key={index}>{line}</Text>
      ))}
    </Box>
  )
}
