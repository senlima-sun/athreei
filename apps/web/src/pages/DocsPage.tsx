import { DocsSidebar } from '../components/DocsSidebar'
import { MarkdownRenderer } from '../components/MarkdownRenderer'

interface DocsPageProps {
  path?: string
  '*'?: string
}

export function DocsPage(props: DocsPageProps) {
  // Build the full path from route params
  const subPath = props['*'] || ''
  const fullPath = subPath ? `/docs/${subPath}` : '/docs'
  const mdPath = subPath ? `/docs/${subPath}.md` : '/docs/index.md'

  return (
    <div class="docs-layout">
      <DocsSidebar currentPath={fullPath} />
      <main class="docs-main">
        <MarkdownRenderer path={mdPath} />
      </main>
    </div>
  )
}
