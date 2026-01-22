"use client"

import { useEffect, useCallback, useState } from "react"
import { LexicalComposer } from "@lexical/react/LexicalComposer"
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin"
import { ContentEditable } from "@lexical/react/LexicalContentEditable"
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin"
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin"
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin"
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { HeadingNode, QuoteNode } from "@lexical/rich-text"
import { ListNode, ListItemNode } from "@lexical/list"
import { CodeNode, CodeHighlightNode } from "@lexical/code"
import { LinkNode, AutoLinkNode } from "@lexical/link"
import { HorizontalRuleNode } from "@lexical/react/LexicalHorizontalRuleNode"
import {
  $convertToMarkdownString,
  $convertFromMarkdownString,
  TRANSFORMERS,
} from "@lexical/markdown"
import type { EditorState, LexicalEditor } from "lexical"

import { cn } from "@/lib/utils"

const EDITOR_NODES = [
  HeadingNode,
  QuoteNode,
  ListNode,
  ListItemNode,
  CodeNode,
  CodeHighlightNode,
  LinkNode,
  AutoLinkNode,
  HorizontalRuleNode,
]

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  minHeight?: string
  disabled?: boolean
  id?: string
}

function InitializePlugin({
  value,
  onReady,
}: {
  value: string
  onReady: () => void
}) {
  const [editor] = useLexicalComposerContext()
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (initialized) return

    if (value) {
      editor.update(() => {
        $convertFromMarkdownString(value, TRANSFORMERS)
      })
    }
    setInitialized(true)
    onReady()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}

function SyncValuePlugin({
  value,
  isReady,
}: {
  value: string
  isReady: boolean
}) {
  const [editor] = useLexicalComposerContext()
  const [lastExternalValue, setLastExternalValue] = useState(value)

  useEffect(() => {
    if (!isReady) return
    if (value === lastExternalValue) return

    const currentMarkdown = editor.getEditorState().read(() => {
      return $convertToMarkdownString(TRANSFORMERS)
    })

    if (value !== currentMarkdown) {
      editor.update(() => {
        $convertFromMarkdownString(value, TRANSFORMERS)
      })
    }
    setLastExternalValue(value)
  }, [editor, value, lastExternalValue, isReady])

  return null
}

function PlaceholderComponent({ placeholder }: { placeholder: string }) {
  return (
    <div className="pointer-events-none absolute left-3 top-2 select-none text-gray-400 text-sm">
      {placeholder}
    </div>
  )
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = "Write markdown content...",
  className,
  minHeight = "200px",
  disabled = false,
  id,
}: MarkdownEditorProps) {
  const [isReady, setIsReady] = useState(false)

  const handleChange = useCallback(
    (editorState: EditorState, _editor: LexicalEditor) => {
      if (!isReady) return
      editorState.read(() => {
        const markdown = $convertToMarkdownString(TRANSFORMERS)
        onChange(markdown)
      })
    },
    [onChange, isReady]
  )

  const handleReady = useCallback(() => {
    setIsReady(true)
  }, [])

  const initialConfig = {
    namespace: id || "MarkdownEditor",
    nodes: EDITOR_NODES,
    onError: (error: Error) => {
      console.error("Lexical error:", error)
    },
    editable: !disabled,
    theme: {
      root: "focus:outline-none",
      paragraph: "mb-2 last:mb-0",
      heading: {
        h1: "text-2xl font-bold mb-4",
        h2: "text-xl font-bold mb-3",
        h3: "text-lg font-bold mb-2",
        h4: "text-base font-bold mb-2",
        h5: "text-sm font-bold mb-1",
        h6: "text-xs font-bold mb-1",
      },
      list: {
        ul: "list-disc list-inside mb-2",
        ol: "list-decimal list-inside mb-2",
        listitem: "ml-4",
        nested: {
          listitem: "ml-4",
        },
      },
      quote: "border-l-4 border-gray-300 pl-4 italic text-gray-600 my-2",
      code: "bg-gray-100 rounded px-1 py-0.5 font-mono text-sm",
      codeHighlight: {
        atrule: "text-purple-600",
        attr: "text-blue-600",
        boolean: "text-orange-600",
        builtin: "text-cyan-600",
        cdata: "text-gray-500",
        char: "text-green-600",
        class: "text-yellow-600",
        "class-name": "text-yellow-600",
        comment: "text-gray-400 italic",
        constant: "text-orange-600",
        deleted: "text-red-600",
        doctype: "text-gray-500",
        entity: "text-red-600",
        function: "text-blue-600",
        important: "text-red-600 font-bold",
        inserted: "text-green-600",
        keyword: "text-purple-600",
        namespace: "text-gray-500",
        number: "text-orange-600",
        operator: "text-gray-600",
        prolog: "text-gray-500",
        property: "text-blue-600",
        punctuation: "text-gray-600",
        regex: "text-orange-600",
        selector: "text-green-600",
        string: "text-green-600",
        symbol: "text-orange-600",
        tag: "text-red-600",
        url: "text-cyan-600",
        variable: "text-orange-600",
      },
      link: "text-blue-600 underline",
      text: {
        bold: "font-bold",
        italic: "italic",
        underline: "underline",
        strikethrough: "line-through",
        code: "bg-gray-100 rounded px-1 py-0.5 font-mono text-sm",
      },
    },
  }

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div
        className={cn(
          "relative rounded-md border border-gray-300 bg-white transition-colors focus-within:border-gray-500 focus-within:ring-1 focus-within:ring-gray-500",
          disabled && "cursor-not-allowed opacity-50",
          className
        )}
        style={{ minHeight }}
      >
        <RichTextPlugin
          contentEditable={
            <ContentEditable
              id={id}
              className="prose prose-sm max-w-none p-3 outline-none"
              style={{ minHeight }}
              aria-placeholder={placeholder}
              placeholder={<PlaceholderComponent placeholder={placeholder} />}
            />
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
        <HistoryPlugin />
        <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
        <OnChangePlugin onChange={handleChange} />
        <InitializePlugin value={value} onReady={handleReady} />
        <SyncValuePlugin value={value} isReady={isReady} />
      </div>
    </LexicalComposer>
  )
}
