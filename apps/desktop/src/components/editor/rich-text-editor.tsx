import { useEffect, useCallback } from "react"
import { LexicalComposer } from "@lexical/react/LexicalComposer"
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin"
import { ContentEditable } from "@lexical/react/LexicalContentEditable"
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary"
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin"
import { ListPlugin } from "@lexical/react/LexicalListPlugin"
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin"
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin"
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import {
  $getRoot,
  BLUR_COMMAND,
  COMMAND_PRIORITY_LOW,
  KEY_ESCAPE_COMMAND,
  type EditorState,
} from "lexical"
import { lexicalTheme } from "./lexical-theme"
import {
  EDITOR_NODES,
  MARKDOWN_TRANSFORMERS,
  parseMarkdown,
  serializeMarkdown,
} from "./markdown-transformers"
import { ToolbarPlugin } from "./plugins"
import { cn } from "@/lib/utils"

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  variant?: "default" | "borderless"
  showToolbar?: boolean
  stickyToolbar?: boolean
  onEscape?: () => void
  onBlur?: () => void
}

function ContentInitializer({
  initialContent,
}: {
  initialContent: string
}): React.ReactElement | null {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    if (initialContent) {
      editor.update(() => {
        const root = $getRoot()
        if (root.getTextContent().length === 0) {
          parseMarkdown(initialContent)
        }
      })
    }
  }, [editor, initialContent])

  return null
}

function MarkdownSerializer({
  onChange,
}: {
  onChange: (value: string) => void
}): React.ReactElement | null {
  const handleChange = useCallback(
    (editorState: EditorState) => {
      editorState.read(() => {
        const markdown = serializeMarkdown()
        onChange(markdown)
      })
    },
    [onChange]
  )

  return <OnChangePlugin onChange={handleChange} ignoreSelectionChange />
}

function EscapeHandler({
  onEscape,
}: {
  onEscape?: () => void
}): React.ReactElement | null {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    if (!onEscape) return

    return editor.registerCommand(
      KEY_ESCAPE_COMMAND,
      () => {
        editor.blur()
        onEscape()
        return true
      },
      COMMAND_PRIORITY_LOW
    )
  }, [editor, onEscape])

  return null
}

function BlurHandler({
  onBlur,
}: {
  onBlur?: () => void
}): React.ReactElement | null {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    if (!onBlur) return

    return editor.registerCommand(
      BLUR_COMMAND,
      () => {
        onBlur()
        return false
      },
      COMMAND_PRIORITY_LOW
    )
  }, [editor, onBlur])

  return null
}

function Placeholder({
  text,
}: {
  text: string
}): React.ReactElement {
  return <div className="lexical-editor-placeholder">{text}</div>
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Write something...",
  className,
  variant = "default",
  showToolbar = true,
  stickyToolbar = false,
  onEscape,
  onBlur,
}: RichTextEditorProps): React.ReactElement {
  const initialConfig = {
    namespace: "RichTextEditor",
    theme: lexicalTheme,
    nodes: EDITOR_NODES,
    editable: true,
    onError: (error: Error) => {
      console.error("Lexical error:", error)
    },
  }

  const contentEditableClass =
    variant === "borderless"
      ? "lexical-editor-input outline-none"
      : "lexical-editor-input rounded-md border border-input bg-background p-3 focus-visible:ring-1 focus-visible:ring-ring"

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className={cn("lexical-editor", className)}>
        <div className="relative">
          <RichTextPlugin
            contentEditable={<ContentEditable className={contentEditableClass} />}
            placeholder={<Placeholder text={placeholder} />}
            ErrorBoundary={LexicalErrorBoundary}
          />
        </div>
        {showToolbar && <ToolbarPlugin sticky={stickyToolbar} />}
        <HistoryPlugin />
        <ListPlugin />
        <LinkPlugin />
        <MarkdownShortcutPlugin transformers={MARKDOWN_TRANSFORMERS} />
        <ContentInitializer initialContent={value} />
        <MarkdownSerializer onChange={onChange} />
        <EscapeHandler onEscape={onEscape} />
        <BlurHandler onBlur={onBlur} />
      </div>
    </LexicalComposer>
  )
}
