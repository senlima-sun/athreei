import { useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"

interface KeyboardShortcut {
  key: string
  ctrl?: boolean
  meta?: boolean
  shift?: boolean
  action: () => void
  description: string
}

/**
 * Hook for handling keyboard shortcuts throughout the dashboard
 */
export function useKeyboardShortcuts() {
  const navigate = useNavigate()

  const shortcuts: KeyboardShortcut[] = [
    {
      key: "d",
      ctrl: true,
      action: () => navigate("/"),
      description: "Go to Dashboard",
    },
    {
      key: "t",
      ctrl: true,
      action: () => navigate("/traces"),
      description: "Go to Traces",
    },
    {
      key: "l",
      ctrl: true,
      action: () => navigate("/logs"),
      description: "Go to Audit Logs",
    },
    {
      key: "p",
      ctrl: true,
      shift: true,
      action: () => navigate("/permissions"),
      description: "Go to Permissions",
    },
    {
      key: "s",
      ctrl: true,
      shift: true,
      action: () => navigate("/sessions"),
      description: "Go to Sessions",
    },
    {
      key: ",",
      ctrl: true,
      action: () => navigate("/settings"),
      description: "Go to Settings",
    },
  ]

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return
      }

      for (const shortcut of shortcuts) {
        const ctrlOrMeta = shortcut.ctrl ? event.ctrlKey || event.metaKey : true
        const shift = shortcut.shift ? event.shiftKey : !event.shiftKey
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase()

        if (keyMatch && ctrlOrMeta && shift) {
          // Prevent default browser behavior for this shortcut
          event.preventDefault()
          shortcut.action()
          return
        }
      }
    },
    [navigate]
  )

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  return { shortcuts }
}

/**
 * Format a keyboard shortcut for display
 */
export function formatShortcut(shortcut: {
  key: string
  ctrl?: boolean
  meta?: boolean
  shift?: boolean
}): string {
  const isMac =
    typeof navigator !== "undefined" &&
    navigator.platform.toUpperCase().indexOf("MAC") >= 0
  const parts: string[] = []

  if (shortcut.ctrl) {
    parts.push(isMac ? "Cmd" : "Ctrl")
  }
  if (shortcut.shift) {
    parts.push("Shift")
  }
  parts.push(shortcut.key.toUpperCase())

  return parts.join(" + ")
}
