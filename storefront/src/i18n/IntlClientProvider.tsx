"use client"

import { NextIntlClientProvider } from "next-intl"
import type { ComponentProps, ReactNode } from "react"

type ProviderProps = ComponentProps<typeof NextIntlClientProvider>

/**
 * Wrapper locale: importare `NextIntlClientProvider` solo da qui.
 * In un Server Component, `import from "next-intl"` usa `react-server` e può rompere
 * il Client Manifest (errore `#default` su `NextIntlClientProvider.js`).
 */
export function IntlClientProvider({
  locale,
  messages,
  children,
}: Pick<ProviderProps, "locale" | "messages"> & { children: ReactNode }) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  )
}
