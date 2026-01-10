import { docs } from "fumadocs-mdx:collections/server"
import { type InferPageType, loader } from "fumadocs-core/source"
import { lucideIconsPlugin } from "fumadocs-core/source/lucide-icons"
import { i18n } from "@/lib/i18n"

export const source = loader({
  baseUrl: "/docs",
  source: docs.toFumadocsSource(),
  plugins: [lucideIconsPlugin()],
  i18n,
})

export type PageType = InferPageType<typeof source>

interface PageDataWithText {
  title: string
  getText: (type: "raw" | "processed") => Promise<string>
}

export function getPageImage(page: PageType) {
  const segments = [...page.slugs, "image.png"]

  return {
    segments,
    url: `/og/docs/${segments.join("/")}`,
  }
}

export async function getLLMText(page: PageType) {
  const data = page.data as PageDataWithText
  const processed = await data.getText("processed")

  return `# ${data.title}

${processed}`
}
