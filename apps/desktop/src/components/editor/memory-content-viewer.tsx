import { useEffect } from "react"
import { LexicalComposer } from "@lexical/react/LexicalComposer"
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin"
import { ContentEditable } from "@lexical/react/LexicalContentEditable"
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { ListPlugin } from "@lexical/react/LexicalListPlugin"
import { $getRoot } from "lexical"
import { lexicalTheme } from "./lexical-theme"
import { EDITOR_NODES, parseMarkdown } from "./markdown-transformers"
import { cn } from "@/lib/utils"

interface MemoryContentViewerProps {
  content: string | null
  className?: string
}

function ContentInitializer({
  content,
}: {
  content: string
}): React.ReactElement | null {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    editor.update(() => {
      const root = $getRoot()
      root.clear()
      parseMarkdown(content)
    })
  }, [editor, content])

  return null
}

export function MemoryContentViewer({
  content,
  className,
}: MemoryContentViewerProps): React.ReactElement | null {
  if (!content) {
    return null
  }

  const initialConfig = {
    namespace: "MemoryViewer",
    theme: lexicalTheme,
    nodes: EDITOR_NODES,
    editable: false,
    onError: (error: Error) => {
      console.error("Lexical error:", error)
    },
  }

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className={cn("lexical-editor", className)}>
        <RichTextPlugin
          contentEditable={
            <ContentEditable className="outline-none" aria-readonly="true" />
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
        <ListPlugin />
        <ContentInitializer content={content} />
      </div>
    </LexicalComposer>
  )
}
