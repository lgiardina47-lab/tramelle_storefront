import { it } from "date-fns/locale"
import { Language } from "./types"

/** Allineato a `tramelle-locales.ts` / `config.ts`: solo italiano. */
export const languages: Language[] = [
  {
    code: "it",
    display_name: "Italiano",
    ltr: true,
    date_locale: it,
  },
]
