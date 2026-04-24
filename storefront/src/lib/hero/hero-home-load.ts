/**
 * Logica hero home **solo server** (Route Handler / RSC). Non importare in "use client":
 * le chiamate Medusa con `cache`/`next.revalidate` e `cache()` di React non sono affidabili dal browser.
 */
import {
  fetchStoreSellersFacetsRaw,
  listStoreSellersNoStore,
} from "@/lib/data/seller"
import {
  buildHeroCatalogSlideFromSeller,
  type HeroCatalogSlide,
} from "@/lib/helpers/hero-catalog-slide"
import { normalizeListingContentLocale } from "@/lib/i18n/listing-content-locale"
import { countryCodeToStorefrontMessagesLocale } from "@/lib/i18n/storefront-messages-locale"
import { sellerListingRegionLabel } from "@/lib/helpers/seller-listing-region"
import {
  sellerDirectoryLogoImageCandidates,
  sellerHeroImageCandidates,
} from "@/lib/helpers/seller-media-url"
import type { StoreSellerListItem } from "@/types/seller"
import { withTimeout } from "@/lib/helpers/with-timeout"
import type { StorefrontI18nLocale } from "@/i18n/routing"

import de from "../../../messages/de.json"
import en from "../../../messages/en.json"
import es from "../../../messages/es.json"
import fr from "../../../messages/fr.json"
import it from "../../../messages/it.json"
import ja from "../../../messages/ja.json"

import type { HeroCoverSlide } from "@/types/hero"

const HERO_MSG: Record<StorefrontI18nLocale, (typeof it)["Hero"]> = {
  it: it.Hero,
  en: en.Hero,
  fr: fr.Hero,
  de: de.Hero,
  es: es.Hero,
  ja: ja.Hero,
}

const HERO_COVER_MAX_SLIDES = 28

type HeroT = (key: string, values?: Record<string, string | number>) => string

function makeHeroT(ui: StorefrontI18nLocale): HeroT {
  const h = HERO_MSG[ui] ?? HERO_MSG.it
  return (key: string, values?: TranslationValues) => {
    const v = h[key as keyof typeof h]
    if (typeof v !== "string") return key
    if (!values) return v
    return v.replace(
      /\{(\w+)\}/g,
      (_, k: string) =>
        String((values as Record<string, string | number>)[k] ?? "")
    ) as string
  }
}

function heroSellerDisplayName(s: StoreSellerListItem): string {
  const n = s.name?.trim()
  if (n) return n
  const h = s.handle?.trim()
  if (!h) return ""
  return h
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ")
}

function buildHeroLocationLine(s: StoreSellerListItem): string {
  const country = s.country_code?.trim().toUpperCase() || ""
  const region = sellerListingRegionLabel(s)
  if (country && region) return `${country} · ${region}`
  return country || region || ""
}

function shuffleInPlace<T>(a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

function buildHeroCoverSlides(
  sellers: StoreSellerListItem[],
  t: HeroT,
  listBaseOffset: number
): HeroCoverSlide[] {
  const seen = new Set<string>()
  const out: HeroCoverSlide[] = []
  const order = sellers.map((_, i) => i)
  shuffleInPlace(order)

  for (const idx of order) {
    const s = sellers[idx]!
    const raw = sellerHeroImageCandidates(s)[0]
    if (!raw) continue
    const url = raw.trim()
    if (!url || seen.has(url)) continue
    seen.add(url)
    const displayName = heroSellerDisplayName(s)
    const alt = displayName
      ? t("cinematicImageAlt", { name: displayName })
      : t("cinematicImageAltFallback")

    const logoRaw = (sellerDirectoryLogoImageCandidates(s)[0] || "").trim()

    out.push({
      src: url,
      alt,
      handle: s.handle,
      displayName,
      locationLine: buildHeroLocationLine(s),
      logoSrc: logoRaw || undefined,
      catalogIndex1Based: listBaseOffset + idx + 1,
    })
    if (out.length >= HERO_COVER_MAX_SLIDES) break
  }

  if (!out.length) {
    out.push({
      src: "/images/hero/Image.jpg",
      alt: t("cinematicImageAltFallback"),
    })
  }
  return out
}

async function pickInitialHeroCatalogSlide(
  total: number,
  t: HeroT,
  intlLocales: readonly string[],
  listingContentLocale: string | undefined
): Promise<{ offset0: number; slide: HeroCatalogSlide } | null> {
  if (total <= 0) return null

  const tSlide = {
    altForName: (name: string) => t("cinematicImageAlt", { name }),
    altFallback: () => t("cinematicImageAltFallback"),
  }

  const CHUNK = 48
  const nChunks = Math.max(1, Math.ceil(total / CHUNK))
  const maxChunkAttempts = Math.min(nChunks, 3)
  const firstChunk = Math.floor(Math.random() * nChunks)

  for (let a = 0; a < maxChunkAttempts; a++) {
    const ci = (firstChunk + a) % nChunks
    const off = ci * CHUNK
    if (off >= total) continue
    const limit = Math.min(CHUNK, total - off)

    const row = await listStoreSellersNoStore({
      limit,
      offset: off,
      ...(listingContentLocale ? { contentLocale: listingContentLocale } : {}),
    })
    const sellers = row?.sellers ?? []
    if (!sellers.length) continue

    const order = sellers.map((_, i) => i)
    shuffleInPlace(order)

    for (const idx of order) {
      const s = sellers[idx]!
      const offset0 = off + idx
      const slide = buildHeroCatalogSlideFromSeller(
        s,
        tSlide,
        intlLocales,
        offset0 + 1
      )
      if (slide) return { offset0, slide }
    }
  }

  return null
}

export type HeroHomeStatePayload = {
  total: number
  heroInit: {
    offset0: number
    slide: HeroCatalogSlide
  } | null
  coverSlides: HeroCoverSlide[]
}

/**
 * Stesso flusso di `HomeCinematicHero` (useEffect) ma eseguito in ambiente **Node** (SDK Medusa, cache, timeout).
 */
export async function getHeroHomeState(
  urlLocaleSegment: string
): Promise<HeroHomeStatePayload> {
  const ui = countryCodeToStorefrontMessagesLocale(urlLocaleSegment)
  const intlLocales = [ui, "it"] as const
  const t = makeHeroT(ui)
  const listingContentLocale = normalizeListingContentLocale(urlLocaleSegment)

  try {
    const facets = await withTimeout(
      fetchStoreSellersFacetsRaw(
        listingContentLocale ? { contentLocale: listingContentLocale } : {}
      ),
      14_000,
      null
    )
    const tot = facets?.totalSellerCount ?? 0

    const hi =
      tot > 0
        ? await withTimeout(
            pickInitialHeroCatalogSlide(
              tot,
              t,
              intlLocales,
              listingContentLocale
            ),
            22_000,
            null
          )
        : null

    let nextCover: HeroCoverSlide[] = []
    if (!hi) {
      const coverPageSize = 72
      const coverOffset =
        tot > coverPageSize
          ? Math.floor(Math.random() * (tot - coverPageSize + 1))
          : 0
      const list =
        tot > 0
          ? await withTimeout(
              listStoreSellersNoStore({
                limit: coverPageSize,
                offset: coverOffset,
                ...(listingContentLocale
                  ? { contentLocale: listingContentLocale }
                  : {}),
              }),
              18_000,
              null
            )
          : null
      const sellers = list?.sellers ?? []
      nextCover = buildHeroCoverSlides(sellers, t, coverOffset)
    }

    return {
      total: tot,
      heroInit: hi,
      coverSlides: nextCover,
    }
  } catch {
    return {
      total: 0,
      heroInit: null,
      coverSlides: buildHeroCoverSlides([], t, 0),
    }
  }
}
