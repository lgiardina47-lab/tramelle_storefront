import type { Locale } from "date-fns"
import itJson from "./translations/it.json"

const resources = {
  translation: itJson,
} as const

export type Resources = typeof resources

export type Language = {
  code: string
  display_name: string
  ltr: boolean
  date_locale: Locale
}
