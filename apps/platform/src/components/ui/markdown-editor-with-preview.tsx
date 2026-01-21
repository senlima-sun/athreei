"use client"

import { useState } from "react"
import { Maximize2, Minimize2, Edit3, Eye, Columns } from "lucide-react"

import { cn } from "@/lib/utils"
import { MarkdownEditor } from "./markdown-editor"
import { MarkdownPreview } from "./markdown-preview"

type ViewMode = "edit" | "preview" | "split"

interface MarkdownEditorWithPreviewProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  minHeight?: string
  disabled?: boolean
  id?: string
}

export function MarkdownEditorWithPreview({
  value,
  onChange,
  placeholder = "Write markdown content...",
  className,
  minHeight = "300px",
  disabled = false,
  id,
}: MarkdownEditorWithPreviewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("edit")
  const [isFullscreen, setIsFullscreen] = useState(false)

  const viewModes: { mode: ViewMode; icon: typeof Edit3; label: string }[] = [
    { mode: "edit", icon: Edit3, label: "Edit" },
    { mode: "split", icon: Columns, label: "Split" },
    { mode: "preview", icon: Eye, label: "Preview" },
  ]

  const containerClasses = cn(
    "flex flex-col rounded-md border border-gray-300 bg-white overflow-hidden",
    isFullscreen && "fixed inset-4 z-50 shadow-2xl",
    className
  )

  return (
    <>
      {isFullscreen && (
        <div
          className="fixed inset-0 z-40 bg-black/50"
          onClick={() => setIsFullscreen(false)}
        />
      )}
      <div className={containerClasses}>
        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-2 py-1.5">
          <div className="flex items-center gap-1">
            {viewModes.map(({ mode, icon: Icon, label }) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                disabled={disabled}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium transition-colors",
                  viewMode === mode
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                  disabled && "cursor-not-allowed opacity-50"
                )}
                title={label}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            disabled={disabled}
            className={cn(
              "rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700",
              disabled && "cursor-not-allowed opacity-50"
            )}
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </button>
        </div>

        <div
          className={cn(
            "flex-1 overflow-hidden",
            viewMode === "split" && "grid grid-cols-2 divide-x divide-gray-200"
          )}
          style={{ minHeight: isFullscreen ? "calc(100% - 44px)" : minHeight }}
        >
          {(viewMode === "edit" || viewMode === "split") && (
            <div
              className={cn(
                "overflow-auto",
                viewMode === "split" && "border-r border-gray-200"
              )}
            >
              <MarkdownEditor
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                disabled={disabled}
                id={id}
                className="border-0 rounded-none min-h-full"
                minHeight="100%"
              />
            </div>
          )}

          {(viewMode === "preview" || viewMode === "split") && (
            <div className="overflow-auto p-3">
              <MarkdownPreview content={value} />
            </div>
          )}
        </div>
      </div>
    </>
  )
}
