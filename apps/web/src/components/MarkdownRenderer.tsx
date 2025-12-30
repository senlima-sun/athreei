import { useState, useEffect } from 'preact/hooks'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

// Configure marked for better output
marked.setOptions({
  gfm: true,
  breaks: false,
})

interface MarkdownRendererProps {
  path: string
}

export function MarkdownRenderer({ path }: MarkdownRendererProps) {
  const [content, setContent] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadMarkdown() {
      setLoading(true)
      setError(null)

      try {
        // Convert path to markdown file path
        const mdPath = path.endsWith('.md') ? path : `${path}.md`
        const response = await fetch(mdPath)

        if (!response.ok) {
          throw new Error(`Failed to load: ${response.status}`)
        }

        const text = await response.text()
        const html = await marked.parse(text)
        // Sanitize HTML to prevent XSS
        const sanitizedHtml = DOMPurify.sanitize(html, {
          USE_PROFILES: { html: true },
          ADD_ATTR: ['target'],
        })
        setContent(sanitizedHtml)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load documentation')
      } finally {
        setLoading(false)
      }
    }

    loadMarkdown()
  }, [path])

  if (loading) {
    return (
      <div class="markdown-loading">
        <p>Loading documentation...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div class="markdown-error">
        <h2>Error Loading Documentation</h2>
        <p>{error}</p>
        <p>
          <a href="/docs">Return to documentation home</a>
        </p>
      </div>
    )
  }

  return (
    <article
      class="markdown-content"
      dangerouslySetInnerHTML={{ __html: content }}
    />
  )
}
