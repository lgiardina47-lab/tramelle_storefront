import { it } from "date-fns/locale"
import { Language } from "./types"

/** Allineato a `config.ts`: solo italiano in UI admin Tramelle. */
export const languages: Language[] = [
  {
    code: "it",
    display_name: "Italiano",
    ltr: true,
    date_locale: it,
  },
]
