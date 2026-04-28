/**
 * Parametri per `generateStaticParams` (build / ISR). Limiti contenuti per non
 * esplodere i tempi di build: `dynamicParams: true` copre handle non pre-renderizzati.
 */
import { routing } from "@/i18n/routing"
import { listProducts } from "@/lib/data/products"
import { listStoreSellers } from "@/lib/data/seller"
import { listCategories } from "@/lib/data/categories"
import { listCollections } from "@/lib/data/collections"
import { categorySlugForStorefrontUrl } from "@/lib/helpers/category-public-url"

const DEFAULT_BUILD_LOCALE =
  process.env.NEXT_PUBLIC_DEFAULT_REGION?.trim().toLowerCase() || "it"

function envNum(env: string | undefined, fallback: number) {
  const n = parseInt((env || "").trim(), 10)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

const MAX_PRODUCT_HANDLES = Math.min(300, Math.max(20, envNum(process.env.STATIC_BUILD_PRODUCT_LIMIT, 200)))
const MAX_SELLER_HANDLES = Math.min(200, Math.max(20, envNum(process.env.STATIC_BUILD_SELLER_LIMIT, 150)))

/** ISO URL segment → `{ locale, handle }[]` per prodotti. */
export async function buildProductStaticParamList(): Promise<
  { locale: string; handle: string }[]
> {
  const { response } = await listProducts({
    countryCode: DEFAULT_BUILD_LOCALE,
    queryParams: {
      limit: MAX_PRODUCT_HANDLES,
      order: "created_at",
    },
  })
  const handles = (response.products ?? [])
    .map((p) => p.handle)
    .filter((h): h is string => Boolean(h && typeof h === "string"))
  const uniq = [...new Set(handles)]
  return routing.locales.flatMap((locale) =>
    uniq.map((handle) => ({ locale, handle }))
  )
}

export async function buildSellerStaticParamList(): Promise<
  { locale: string; handle: string }[]
> {
  const size = Math.min(100, MAX_SELLER_HANDLES)
  const row = await listStoreSellers({
    limit: size,
    offset: 0,
    contentLocale: DEFAULT_BUILD_LOCALE,
  })
  const handles = (row?.sellers ?? [])
    .map((s) => s.handle)
    .filter((h): h is string => Boolean(h && typeof h === "string"))
  const uniq = [...new Set(handles)]
  return routing.locales.flatMap((locale) =>
    uniq.map((handle) => ({ locale, handle }))
  )
}

export async function buildCategoryStaticParamList(): Promise<
  { locale: string; category: string }[]
> {
  const { parentCategories } = await listCategories({ query: { limit: 200 } })
  const slugs = (parentCategories ?? [])
    .map((c) => categorySlugForStorefrontUrl(c.handle))
    .filter((h): h is string => Boolean(h))
  const uniq = [...new Set(slugs)]
  return routing.locales.flatMap((locale) =>
    uniq.map((category) => ({ locale, category }))
  )
}

export async function buildCollectionStaticParamList(): Promise<
  { locale: string; handle: string }[]
> {
  const { collections } = await listCollections({ limit: "200", offset: "0" })
  const handles = (collections ?? [])
    .map((c) => c.handle)
    .filter((h): h is string => Boolean(h))
  const uniq = [...new Set(handles)]
  return routing.locales.flatMap((locale) =>
    uniq.map((handle) => ({ locale, handle }))
  )
}
