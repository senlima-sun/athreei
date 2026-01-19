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
  const hasLinks = plugin.homepage || plugin.repository
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
            {plugin.homepage && (
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
            {plugin.repository && (
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

function ReadmeContent({ content }: { content: string }) {
  const lines = content.split("\n")

  return (
    <div className="prose prose-sm prose-gray max-w-none">
      {lines.map((line, index) => {
        const trimmedLine = line.trim()

        if (trimmedLine.startsWith("### ")) {
          return (
            <h3
              key={index}
              className="mt-4 text-base font-semibold text-gray-900"
            >
              {trimmedLine.slice(4)}
            </h3>
          )
        }
        if (trimmedLine.startsWith("## ")) {
          return (
            <h2
              key={index}
              className="mt-5 text-lg font-semibold text-gray-900"
            >
              {trimmedLine.slice(3)}
            </h2>
          )
        }
        if (trimmedLine.startsWith("# ")) {
          return (
            <h1 key={index} className="mt-6 text-xl font-bold text-gray-900">
              {trimmedLine.slice(2)}
            </h1>
          )
        }
        if (trimmedLine.startsWith("- ") || trimmedLine.startsWith("* ")) {
          return (
            <li key={index} className="ml-4 text-gray-600">
              <FormattedText text={trimmedLine.slice(2)} />
            </li>
          )
        }
        if (trimmedLine.startsWith("```")) {
          return null
        }
        if (trimmedLine === "") {
          return <div key={index} className="h-2" />
        }

        return (
          <p key={index} className="text-gray-600">
            <FormattedText text={trimmedLine} />
          </p>
        )
      })}
    </div>
  )
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
        ? { type: "bold", match: boldMatch, index: boldMatch.index! }
        : null,
      codeMatch
        ? { type: "code", match: codeMatch, index: codeMatch.index! }
        : null,
      linkMatch
        ? { type: "link", match: linkMatch, index: linkMatch.index! }
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
