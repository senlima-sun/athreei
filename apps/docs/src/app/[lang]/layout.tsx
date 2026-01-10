import { RootProvider } from "fumadocs-ui/provider/next"
import { defineI18nUI, type Translations } from "fumadocs-ui/i18n"
import { i18n } from "@/lib/i18n"
import { Inter } from "next/font/google"
import "../global.css"

const inter = Inter({
  subsets: ["latin"],
})

const zhTWTranslations: Partial<Translations> = {
  search: "搜尋文檔",
  searchNoResult: "找不到結果",
  toc: "目錄",
  tocNoHeadings: "本頁無標題",
  lastUpdate: "最後更新",
  chooseTheme: "選擇主題",
  nextPage: "下一頁",
  previousPage: "上一頁",
  chooseLanguage: "選擇語言",
  editOnGithub: "在 GitHub 上編輯",
}

const { provider } = defineI18nUI(i18n, {
  translations: {
    en: { displayName: "English" },
    "zh-TW": { displayName: "繁體中文", ...zhTWTranslations },
  },
})

export default async function LangLayout({
  params,
  children,
}: {
  params: Promise<{ lang: string }>
  children: React.ReactNode
}) {
  const { lang } = await params

  return (
    <html lang={lang} className={inter.className} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <RootProvider i18n={provider(lang)}>{children}</RootProvider>
      </body>
    </html>
  )
}
