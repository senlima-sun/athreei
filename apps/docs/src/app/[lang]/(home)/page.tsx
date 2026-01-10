import Link from "next/link"

const translations = {
  en: {
    title: "Hello World",
    description: "You can open",
    linkText: "/docs",
    suffix: "and see the documentation.",
  },
  "zh-TW": {
    title: "歡迎使用",
    description: "您可以開啟",
    linkText: "/docs",
    suffix: "查看文檔。",
  },
} as const

type Locale = keyof typeof translations

function isValidLocale(locale: string): locale is Locale {
  return locale in translations
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params
  const t = isValidLocale(lang) ? translations[lang] : translations.en

  const docsPath = lang === "en" ? "/docs" : `/${lang}/docs`

  return (
    <div className="flex flex-col justify-center text-center flex-1">
      <h1 className="text-2xl font-bold mb-4">{t.title}</h1>
      <p>
        {t.description}{" "}
        <Link href={docsPath} className="font-medium underline">
          {t.linkText}
        </Link>{" "}
        {t.suffix}
      </p>
    </div>
  )
}
