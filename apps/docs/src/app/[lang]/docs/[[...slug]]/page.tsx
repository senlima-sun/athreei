import { getPageImage, source, type PageType } from "@/lib/source"
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from "fumadocs-ui/layouts/docs/page"
import { notFound } from "next/navigation"
import { getMDXComponents } from "@/mdx-components"
import type { Metadata } from "next"
import { createRelativeLink } from "fumadocs-ui/mdx"
import { i18n } from "@/lib/i18n"
import type { TOCItemType } from "fumadocs-core/toc"
import type { MDXContent } from "mdx/types"

interface PageParams {
  lang: string
  slug?: string[]
}

interface PageData {
  title: string
  description?: string
  full?: boolean
  body: MDXContent
  toc: TOCItemType[]
}

export default async function Page({
  params,
}: {
  params: Promise<PageParams>
}) {
  const { lang, slug } = await params
  const page = source.getPage(slug, lang) as PageType & { data: PageData }
  if (!page) notFound()

  const MDX = page.data.body

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <MDX
          components={getMDXComponents({
            a: createRelativeLink(source, page),
          })}
        />
      </DocsBody>
    </DocsPage>
  )
}

export function generateStaticParams() {
  return source.generateParams().flatMap((params) =>
    i18n.languages.map((lang) => ({
      lang,
      slug: params.slug,
    }))
  )
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>
}): Promise<Metadata> {
  const { lang, slug } = await params
  const page = source.getPage(slug, lang) as PageType | undefined
  if (!page) notFound()

  return {
    title: page.data.title,
    description: page.data.description,
    openGraph: {
      images: getPageImage(page).url,
    },
  }
}
