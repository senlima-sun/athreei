/**
 * ConnectionMethodSelector component
 *
 * Allows users to choose between local gateway and cloud gateway options.
 * Displays pros/cons for each option with download links and SSE URL copy.
 */

import { useState, useCallback, KeyboardEvent } from "react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "./ui/Card"
import { Button } from "./ui/Button"
import { Badge } from "./ui/badge"
import { cn } from "@/lib/utils"
import {
  Monitor,
  Cloud,
  Check,
  X,
  Download,
  Copy,
  ChevronDown,
} from "lucide-react"

export type ConnectionMethod = "local" | "cloud"

export type Platform = "macos-arm64" | "macos-x64" | "windows" | "linux"

export interface ConnectionMethodSelectorProps {
  /** Currently selected connection method */
  selectedMethod?: ConnectionMethod
  /** Callback when method selection changes */
  onMethodSelect?: (method: ConnectionMethod) => void
  /** SSE URL to display for cloud gateway */
  sseUrl?: string
  /** Base URL for download links */
  downloadBaseUrl?: string
  /** Custom class name */
  className?: string
}

interface ProsConsItem {
  text: string
  isPro: boolean
}

const LOCAL_ITEMS: ProsConsItem[] = [
  { text: "Data stays on your machine", isPro: true },
  { text: "Supports self-hosted MCPs", isPro: true },
  { text: "Lower latency", isPro: true },
  { text: "Requires installation", isPro: false },
]

const CLOUD_ITEMS: ProsConsItem[] = [
  { text: "No installation required", isPro: true },
  { text: "Works from any device", isPro: true },
  { text: "Always up-to-date", isPro: true },
  { text: "Data passes through cloud", isPro: false },
  { text: "Cannot use local MCPs", isPro: false },
]

const PLATFORM_LABELS: Record<Platform, string> = {
  "macos-arm64": "macOS (Apple Silicon)",
  "macos-x64": "macOS (Intel)",
  windows: "Windows",
  linux: "Linux",
}

const PLATFORM_FILENAMES: Record<Platform, string> = {
  "macos-arm64": "athreei-macos-arm64",
  "macos-x64": "athreei-macos-x64",
  windows: "athreei-windows.exe",
  linux: "athreei-linux",
}

/**
 * Detects the user's platform for default download option
 */
export function detectPlatform(): Platform {
  if (typeof navigator === "undefined") {
    return "macos-arm64"
  }

  const userAgent = navigator.userAgent.toLowerCase()
  const platform = (
    navigator.platform || (navigator as { userAgentData?: { platform?: string } }).userAgentData?.platform || ""
  ).toLowerCase()

  // Check for Windows
  if (platform.includes("win") || userAgent.includes("windows")) {
    return "windows"
  }

  // Check for Linux
  if (platform.includes("linux") || userAgent.includes("linux")) {
    return "linux"
  }

  // Check for macOS
  if (platform.includes("mac") || userAgent.includes("mac")) {
    // Try to detect Apple Silicon vs Intel
    // Apple Silicon Macs report as "MacIntel" for compatibility, but we can check
    // for other hints or default to ARM since most new Macs are Apple Silicon
    if (
      userAgent.includes("arm") ||
      // Check if running on a newer Mac (likely Apple Silicon)
      // Note: This is a heuristic and may not be 100% accurate
      (typeof navigator !== "undefined" && "maxTouchPoints" in navigator && navigator.maxTouchPoints > 0)
    ) {
      return "macos-arm64"
    }
    // Default to x64 for Intel Macs
    return "macos-x64"
  }

  // Default to macOS ARM64
  return "macos-arm64"
}

function ProsConsList({ items }: { items: ProsConsItem[] }) {
  return (
    <ul className="space-y-2 list-none p-0 m-0">
      {items.map((item, index) => (
        <li key={index} className="flex items-start gap-2 text-sm">
          {item.isPro ? (
            <Check className="h-4 w-4 text-success shrink-0 mt-0.5" />
          ) : (
            <X className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          )}
          <span className={cn(item.isPro ? "text-foreground" : "text-muted-foreground")}>
            {item.text}
          </span>
        </li>
      ))}
    </ul>
  )
}

export function ConnectionMethodSelector({
  selectedMethod,
  onMethodSelect,
  sseUrl = "https://gateway.athreei.com/sse",
  downloadBaseUrl = "https://github.com/athreei/athreei/releases/latest/download",
  className,
}: ConnectionMethodSelectorProps) {
  const [detectedPlatform] = useState<Platform>(() => detectPlatform())
  const [showPlatformDropdown, setShowPlatformDropdown] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopyUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(sseUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error("Failed to copy URL:", error)
    }
  }, [sseUrl])

  const getDownloadUrl = useCallback(
    (platform: Platform) => {
      return `${downloadBaseUrl}/${PLATFORM_FILENAMES[platform]}`
    },
    [downloadBaseUrl]
  )

  const handleDownload = useCallback(
    (platform: Platform) => {
      window.open(getDownloadUrl(platform), "_blank")
      setShowPlatformDropdown(false)
    },
    [getDownloadUrl]
  )

  const isLocalSelected = selectedMethod === "local"
  const isCloudSelected = selectedMethod === "cloud"

  const handleCardKeyDown = useCallback(
    (method: "local" | "cloud") => (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault()
        onMethodSelect?.(method)
      }
    },
    [onMethodSelect]
  )

  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Choose your connection method:</h3>
        <p className="text-sm text-muted-foreground">
          Select how you want to connect your AI apps to athreei.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Local Gateway Option */}
        <Card
          className={cn(
            "cursor-pointer transition-all",
            isLocalSelected
              ? "ring-2 ring-primary border-primary"
              : "hover:border-primary/50"
          )}
          role="button"
          tabIndex={0}
          aria-pressed={isLocalSelected}
          onClick={() => onMethodSelect?.("local")}
          onKeyDown={handleCardKeyDown("local")}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Monitor className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Local Gateway</CardTitle>
              </div>
              <Badge variant="secondary">Recommended</Badge>
            </div>
            <CardDescription className="text-xs">
              Run the gateway on your own machine
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ProsConsList items={LOCAL_ITEMS} />

            {/* Download Button with Dropdown */}
            <div className="relative pt-2">
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDownload(detectedPlatform)
                  }}
                >
                  <Download className="h-4 w-4" />
                  Download for {PLATFORM_LABELS[detectedPlatform].split(" ")[0]}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowPlatformDropdown(!showPlatformDropdown)
                  }}
                  aria-label="Select platform"
                  aria-expanded={showPlatformDropdown}
                  aria-haspopup="listbox"
                >
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform",
                      showPlatformDropdown && "rotate-180"
                    )}
                  />
                </Button>
              </div>

              {/* Platform Dropdown */}
              {showPlatformDropdown && (
                <div
                  className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded-md shadow-lg z-10"
                  role="listbox"
                  aria-label="Platform options"
                  onClick={(e) => e.stopPropagation()}
                >
                  {(Object.keys(PLATFORM_LABELS) as Platform[]).map((platform) => (
                    <button
                      key={platform}
                      role="option"
                      aria-selected={platform === detectedPlatform}
                      className={cn(
                        "w-full px-4 py-2 text-left text-sm hover:bg-accent transition-colors",
                        "first:rounded-t-md last:rounded-b-md",
                        platform === detectedPlatform && "bg-accent"
                      )}
                      onClick={() => handleDownload(platform)}
                    >
                      {PLATFORM_LABELS[platform]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Cloud Gateway Option */}
        <Card
          className={cn(
            "cursor-pointer transition-all",
            isCloudSelected
              ? "ring-2 ring-primary border-primary"
              : "hover:border-primary/50"
          )}
          role="button"
          tabIndex={0}
          aria-pressed={isCloudSelected}
          onClick={() => onMethodSelect?.("cloud")}
          onKeyDown={handleCardKeyDown("cloud")}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Cloud className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Cloud Gateway</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Use our hosted cloud gateway service
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ProsConsList items={CLOUD_ITEMS} />

            {/* SSE URL Copy */}
            <div className="pt-2 space-y-2">
              <Button
                variant="secondary"
                className="w-full"
                onClick={(e) => {
                  e.stopPropagation()
                  handleCopyUrl()
                }}
              >
                <Copy className="h-4 w-4" />
                {copied ? "Copied!" : "Get SSE URL"}
              </Button>
              <p className="text-xs text-muted-foreground text-center break-all">
                {sseUrl}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
