import { unstable_cache } from "next/cache"
import type { HttpTypes } from "@medusajs/types"

import { sdk } from "@/lib/config"
import { toHreflang } from "@/lib/helpers/hreflang"

/**
 * hreflang in `generateMetadata`: senza dipendere da cookie/cache-tag per visitatore,
 * così `unstable_cache` riduce chiamate Medusa `/store/regions` tra richieste.
 */
async function computeHomeHreflangLanguages(
  baseUrl: string
): Promise<Record<string, string>> {
  try {
    const regions = await sdk.client
      .fetch<{ regions: HttpTypes.StoreRegion[] }>(`/store/regions`, {
        method: "GET",
        cache: "force-cache",
        next: { revalidate: 3600 },
      })
      .then(({ regions }) => regions ?? [])
      .catch(() => [] as HttpTypes.StoreRegion[])

    const locales = Array.from(
      new Set(
        (regions || [])
          .map((r) => r.countries?.map((c) => c.iso_2) || [])
          .flat()
          .filter(Boolean)
      )
    ) as string[]

    return locales.reduce<Record<string, string>>((acc, code) => {
      const hrefLang = toHreflang(code)
      acc[hrefLang] = `${baseUrl}/${code}`
      return acc
    }, {})
  } catch {
    return {}
  }
}

export function getCachedHomeHreflangLanguages(baseUrl: string) {
  const normalized = baseUrl.replace(/\/$/, "")
  return unstable_cache(
    () => computeHomeHreflangLanguages(normalized),
    ["tramelle-home-hreflang", normalized],
    { revalidate: 3600 }
  )()
}
