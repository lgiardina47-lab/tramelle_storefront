import { InitOptions } from "i18next"

import translations from "./translations"

/** Solo italiano in UI Tramelle: bundle ridotto e nessun cambio lingua pannello. */
const italianOnlyResources = {
  it: translations.it,
} as const

export const defaultI18nOptions: InitOptions = {
  debug: process.env.NODE_ENV === "development",
  detection: {
    caches: ["cookie", "localStorage", "header"],
    lookupCookie: "lng",
    lookupLocalStorage: "lng",
    order: ["cookie", "localStorage", "header"],
  },
  lng: "it",
  fallbackLng: "it",
  interpolation: {
    escapeValue: false,
  },
  resources: italianOnlyResources as unknown as InitOptions["resources"],
  supportedLngs: ["it"],
}
