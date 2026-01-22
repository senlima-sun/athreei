"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeHighlight from "rehype-highlight"

import { cn } from "@/lib/utils"

interface MarkdownPreviewProps {
  content: string
  className?: string
}

export function MarkdownPreview({ content, className }: MarkdownPreviewProps) {
  if (!content.trim()) {
    return (
      <div className={cn("text-gray-400 text-sm italic p-3", className)}>
        No content to preview
      </div>
    )
  }

  return (
    <div className={cn("prose prose-sm max-w-none", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold mb-4 mt-6 first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-bold mb-3 mt-5 first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-bold mb-2 mt-4 first:mt-0">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-base font-bold mb-2 mt-3 first:mt-0">
              {children}
            </h4>
          ),
          h5: ({ children }) => (
            <h5 className="text-sm font-bold mb-1 mt-2 first:mt-0">
              {children}
            </h5>
          ),
          h6: ({ children }) => (
            <h6 className="text-xs font-bold mb-1 mt-2 first:mt-0">
              {children}
            </h6>
          ),
          p: ({ children }) => (
            <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside mb-3 space-y-1">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="ml-2">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-600 my-3">
              {children}
            </blockquote>
          ),
          code: ({ className: codeClassName, children }) => {
            const isInline = !codeClassName
            if (isInline) {
              return (
                <code className="bg-gray-100 rounded px-1.5 py-0.5 font-mono text-sm text-gray-800">
                  {children}
                </code>
              )
            }
            return (
              <code className={cn("font-mono text-sm", codeClassName)}>
                {children}
              </code>
            )
          },
          pre: ({ children }) => (
            <pre className="bg-gray-900 text-gray-100 rounded-md p-4 overflow-x-auto my-3 text-sm">
              {children}
            </pre>
          ),
          a: ({ children, href }) => {
            const isSafeUrl =
              href && /^(https?:\/\/|mailto:|tel:|#|\/)/i.test(href)
            return (
              <a
                href={isSafeUrl ? href : "#"}
                className="text-blue-600 hover:text-blue-800 underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                {children}
              </a>
            )
          },
          hr: () => <hr className="my-4 border-gray-200" />,
          table: ({ children }) => (
            <div className="overflow-x-auto my-3">
              <table className="min-w-full border-collapse border border-gray-200">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-gray-50">{children}</thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-gray-200">{children}</tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-gray-50">{children}</tr>
          ),
          th: ({ children }) => (
            <th className="border border-gray-200 px-3 py-2 text-left text-sm font-semibold text-gray-900">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-gray-200 px-3 py-2 text-sm">
              {children}
            </td>
          ),
          strong: ({ children }) => (
            <strong className="font-bold">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          del: ({ children }) => (
            <del className="line-through text-gray-500">{children}</del>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
