import type { HeroCatalogSlide } from "@/lib/helpers/hero-catalog-slide"
import { buildHeroCatalogSlideFromSeller } from "@/lib/helpers/hero-catalog-slide"
import {
  enrichHeroCatalogSlideSubcategories,
  type HeroSubcategoryPillScope,
} from "@/lib/hero/hero-slide-product-subcategories"
import { getHeroCategoryLabelByHandleMap } from "@/lib/hero/hero-category-label-map"
import { listStoreSellersNoStore } from "@/lib/data/seller"
import { countryCodeToStorefrontMessagesLocale } from "@/lib/i18n/storefront-messages-locale"
import { normalizeListingContentLocale } from "@/lib/i18n/listing-content-locale"
import type { StorefrontI18nLocale } from "@/i18n/routing"

import de from "../../../messages/de.json"
import en from "../../../messages/en.json"
import es from "../../../messages/es.json"
import fr from "../../../messages/fr.json"
import it from "../../../messages/it.json"
import ja from "../../../messages/ja.json"

import { withTimeout } from "@/lib/helpers/with-timeout"

const HERO_MSG_BY_UI: Record<
  StorefrontI18nLocale,
  Partial<{
    cinematicImageAlt: string
    cinematicImageAltFallback: string
  }>
> = {
  it: it.Hero,
  en: en.Hero,
  fr: fr.Hero,
  de: de.Hero,
  es: es.Hero,
  ja: ja.Hero,
}

function heroTFromMessages(
  hero:
    | Partial<{
        cinematicImageAlt: string
        cinematicImageAltFallback: string
      }>
    | undefined
) {
  const altTpl =
    typeof hero?.cinematicImageAlt === "string" && hero.cinematicImageAlt
      ? hero.cinematicImageAlt
      : "Producer cover — {name}"
  const altFb =
    typeof hero?.cinematicImageAltFallback === "string" &&
    hero.cinematicImageAltFallback
      ? hero.cinematicImageAltFallback
      : "Tramelle featured imagery"
  return {
    altForName: (name: string) => altTpl.replace(/\{name\}/g, name),
    altFallback: () => altFb,
  }
}

function contextForLocaleSeg(locale: string) {
  const ui = countryCodeToStorefrontMessagesLocale(
    (locale || "it").trim() || "it"
  )
  const intlLocales = [ui, "it"] as const
  const hero = HERO_MSG_BY_UI[ui] ?? HERO_MSG_BY_UI.it
  return { t: heroTFromMessages(hero), intlLocales, ui }
}

/**
 * Una cella del listing: `offset` 0-based come `GET /store/sellers?offset=`.
 */
export async function loadSlideAtOffsetServer(
  offset: number,
  locale: string,
  contentLocale: string | undefined,
  parentCategoryHandles?: string[],
  subcategoryPillScope?: HeroSubcategoryPillScope
): Promise<HeroCatalogSlide | null> {
  const { t, intlLocales } = contextForLocaleSeg(locale)
  const labelByHandle = await getHeroCategoryLabelByHandleMap()
  const scope =
    parentCategoryHandles && parentCategoryHandles.length > 0
      ? { parentCategoryHandles }
      : {}
  const row = await listStoreSellersNoStore({
    limit: 1,
    offset: Math.max(0, offset),
    ...(contentLocale ? { contentLocale } : {}),
    ...scope,
  })
  const s = row?.sellers?.[0]
  if (!s) return null
  const slide = buildHeroCatalogSlideFromSeller(
    s,
    t,
    intlLocales,
    offset + 1,
    labelByHandle
  )
  if (!slide) return null
  if (subcategoryPillScope?.category_ids.length) {
    return await withTimeout(
      enrichHeroCatalogSlideSubcategories(slide, locale, subcategoryPillScope),
      12_000,
      slide
    )
  }
  return slide
}

/**
 * Stessa semantica di `scanCatalogStep` nel client: da `from0` prova
 * `from0`, `from0+step`, … (mod `total`) fino a una slide con hero.
 * Esegue tutto in **Node** (una sola `fetch` dal browser = route POST).
 */
export async function scanHeroCatalogStepOnServer(
  from0: number,
  total: number,
  step: 1 | -1,
  locale: string,
  contentLocale: string | undefined,
  parentCategoryHandles?: string[],
  subcategoryPillScope?: HeroSubcategoryPillScope
): Promise<{ off: number; slide: HeroCatalogSlide } | null> {
  if (total <= 0) return null
  const normContent = normalizeListingContentLocale(contentLocale)

  let off = ((from0 % total) + total) % total
  const maxIters = Math.min(total, 200)

  const slideTimeoutMs = subcategoryPillScope?.category_ids.length ? 22_000 : 8_000

  for (let i = 0; i < maxIters; i++) {
    const slide = await withTimeout(
      loadSlideAtOffsetServer(
        off,
        locale,
        normContent,
        parentCategoryHandles,
        subcategoryPillScope
      ),
      slideTimeoutMs,
      null
    )
    if (slide) {
      return { off, slide: { ...slide, catalogIndex1Based: off + 1 } }
    }
    off = (off + step + total) % total
  }
  return null
}
