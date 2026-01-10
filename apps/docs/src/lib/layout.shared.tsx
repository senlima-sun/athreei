import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared"
import { i18n } from "@/lib/i18n"

export function baseOptions(_lang: string): BaseLayoutProps {
  return {
    nav: {
      title: "athreei",
    },
    i18n,
  }
}
