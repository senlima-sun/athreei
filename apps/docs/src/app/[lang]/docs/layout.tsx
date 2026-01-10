import { source } from "@/lib/source"
import { DocsLayout } from "fumadocs-ui/layouts/docs"
import { baseOptions } from "@/lib/layout.shared"
import { i18n } from "@/lib/i18n"

export default async function Layout({
  params,
  children,
}: {
  params: Promise<{ lang: string }>
  children: React.ReactNode
}) {
  const { lang } = await params
  const tree =
    source.pageTree[lang] ?? source.pageTree[i18n.defaultLanguage] ?? []
  return (
    <DocsLayout tree={tree} {...baseOptions(lang)}>
      {children}
    </DocsLayout>
  )
}
