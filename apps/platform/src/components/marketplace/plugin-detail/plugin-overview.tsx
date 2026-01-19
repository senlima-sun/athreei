"use client"

import { ExternalLink, Tag } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { Plugin } from "@/types/marketplace"

interface PluginOverviewProps {
  plugin: Plugin
  readme?: string
}

function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url, window.location.origin)
    return ["http:", "https:", "mailto:"].includes(parsed.protocol)
  } catch {
    return false
  }
}

export function PluginOverview({ plugin, readme }: PluginOverviewProps) {
  const hasValidHomepage = plugin.homepage && isSafeUrl(plugin.homepage)
  const hasValidRepository = plugin.repository && isSafeUrl(plugin.repository)
  const hasLinks = hasValidHomepage || hasValidRepository
  const hasTags = plugin.tags && plugin.tags.length > 0

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Description</h2>
        {readme ? (
          <div className="mt-4 space-y-4">
            <ReadmeContent content={readme} />
          </div>
        ) : plugin.description ? (
          <p className="mt-4 text-gray-600">{plugin.description}</p>
        ) : (
          <p className="mt-4 text-gray-500 italic">No description available.</p>
        )}
      </div>

      {hasTags && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900">Tags</h2>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {plugin.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {hasLinks && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900">Links</h2>
          </div>
          <div className="mt-4 space-y-3">
            {plugin.homepage && isSafeUrl(plugin.homepage) && (
              <a
                href={plugin.homepage}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline"
              >
                <ExternalLink className="h-4 w-4" />
                Homepage
              </a>
            )}
            {plugin.repository && isSafeUrl(plugin.repository) && (
              <a
                href={plugin.repository}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline"
              >
                <ExternalLink className="h-4 w-4" />
                Repository
              </a>
            )}
          </div>
        </div>
      )}

      {plugin.category && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">Category</h2>
          <div className="mt-4">
            <Badge variant="outline" className="text-gray-700">
              {plugin.category}
            </Badge>
          </div>
        </div>
      )}
    </div>
  )
}

interface ParsedLine {
  type: "h1" | "h2" | "h3" | "list-item" | "code-fence" | "code-line" | "empty" | "paragraph"
  content: string
  index: number
}

function ReadmeContent({ content }: { content: string }) {
  const lines = content.split("\n")

  const parsedLines: ParsedLine[] = []
  let inCodeBlock = false

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index] ?? ""
    const trimmedLine = line.trim()

    if (trimmedLine.startsWith("```")) {
      parsedLines.push({ type: "code-fence", content: "", index })
      inCodeBlock = !inCodeBlock
      continue
    }

    if (inCodeBlock) {
      parsedLines.push({ type: "code-line", content: line, index })
      continue
    }

    if (trimmedLine.startsWith("### ")) {
      parsedLines.push({ type: "h3", content: trimmedLine.slice(4), index })
    } else if (trimmedLine.startsWith("## ")) {
      parsedLines.push({ type: "h2", content: trimmedLine.slice(3), index })
    } else if (trimmedLine.startsWith("# ")) {
      parsedLines.push({ type: "h1", content: trimmedLine.slice(2), index })
    } else if (trimmedLine.startsWith("- ") || trimmedLine.startsWith("* ")) {
      parsedLines.push({ type: "list-item", content: trimmedLine.slice(2), index })
    } else if (trimmedLine === "") {
      parsedLines.push({ type: "empty", content: "", index })
    } else {
      parsedLines.push({ type: "paragraph", content: trimmedLine, index })
    }
  }

  const elements: React.ReactNode[] = []
  const processedIndices = new Set<number>()

  for (let i = 0; i < parsedLines.length; i++) {
    if (processedIndices.has(i)) continue

    const line = parsedLines[i]
    if (!line) continue

    if (line.type === "code-fence") {
      processedIndices.add(i)
      const codeLines: string[] = []

      for (let j = i + 1; j < parsedLines.length; j++) {
        const nextLine = parsedLines[j]
        if (!nextLine) break
        if (nextLine.type === "code-fence") {
          processedIndices.add(j)
          break
        }
        if (nextLine.type === "code-line") {
          codeLines.push(nextLine.content)
          processedIndices.add(j)
        }
      }

      if (codeLines.length > 0) {
        elements.push(
          <pre
            key={`code-${line.index}`}
            className="overflow-x-auto rounded-lg bg-gray-100 p-3"
          >
            <code className="text-sm text-gray-800">{codeLines.join("\n")}</code>
          </pre>
        )
      }
      continue
    }

    if (line.type === "list-item") {
      const listItems: ParsedLine[] = [line]
      processedIndices.add(i)

      for (let j = i + 1; j < parsedLines.length; j++) {
        const nextLine = parsedLines[j]
        if (nextLine?.type === "list-item") {
          listItems.push(nextLine)
          processedIndices.add(j)
        } else {
          break
        }
      }

      elements.push(
        <ul key={`list-${line.index}`} className="ml-4 list-disc space-y-1">
          {listItems.map((item) => (
            <li key={item.index} className="text-gray-600">
              <FormattedText text={item.content} />
            </li>
          ))}
        </ul>
      )
      continue
    }

    processedIndices.add(i)

    if (line.type === "h1") {
      elements.push(
        <h1 key={line.index} className="mt-6 text-xl font-bold text-gray-900">
          {line.content}
        </h1>
      )
    } else if (line.type === "h2") {
      elements.push(
        <h2 key={line.index} className="mt-5 text-lg font-semibold text-gray-900">
          {line.content}
        </h2>
      )
    } else if (line.type === "h3") {
      elements.push(
        <h3 key={line.index} className="mt-4 text-base font-semibold text-gray-900">
          {line.content}
        </h3>
      )
    } else if (line.type === "empty") {
      elements.push(<div key={line.index} className="h-2" />)
    } else if (line.type === "paragraph") {
      elements.push(
        <p key={line.index} className="text-gray-600">
          <FormattedText text={line.content} />
        </p>
      )
    }
  }

  return <div className="prose prose-sm prose-gray max-w-none">{elements}</div>
}

function FormattedText({ text }: { text: string }) {
  const parts: React.ReactNode[] = []
  let remaining = text
  let keyIndex = 0

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*([^*]+)\*\*/)
    const codeMatch = remaining.match(/`([^`]+)`/)
    const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/)

    const matches = [
      boldMatch
        ? { type: "bold", match: boldMatch, index: boldMatch.index ?? 0 }
        : null,
      codeMatch
        ? { type: "code", match: codeMatch, index: codeMatch.index ?? 0 }
        : null,
      linkMatch
        ? { type: "link", match: linkMatch, index: linkMatch.index ?? 0 }
        : null,
    ].filter(Boolean) as {
      type: string
      match: RegExpMatchArray
      index: number
    }[]

    if (matches.length === 0) {
      parts.push(remaining)
      break
    }

    const firstMatch = matches.reduce((a, b) => (a.index < b.index ? a : b))

    if (firstMatch.index > 0) {
      parts.push(remaining.slice(0, firstMatch.index))
    }

    if (firstMatch.type === "bold") {
      parts.push(
        <strong
          key={`bold-${keyIndex++}`}
          className="font-semibold text-gray-900"
        >
          {firstMatch.match[1]}
        </strong>
      )
    } else if (firstMatch.type === "code") {
      parts.push(
        <code
          key={`code-${keyIndex++}`}
          className="rounded bg-gray-100 px-1 py-0.5 font-mono text-sm text-gray-800"
        >
          {firstMatch.match[1]}
        </code>
      )
    } else if (firstMatch.type === "link") {
      const href = firstMatch.match[2] ?? ""
      if (href && isSafeUrl(href)) {
        parts.push(
          <a
            key={`link-${keyIndex++}`}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            {firstMatch.match[1]}
          </a>
        )
      } else {
        parts.push(firstMatch.match[1])
      }
    }

    remaining = remaining.slice(firstMatch.index + firstMatch.match[0].length)
  }

  return <>{parts}</>
}
