"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import type { TranslationValues } from "next-intl"
import {
  listStoreSellersFacets,
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
import Link from "next/link"

import { HomeCinematicHeroFrame } from "./HomeCinematicHeroFrame"
import {
  HomeCinematicHeroRotatingBackdrop,
  type HeroCoverSlide,
} from "./HomeCinematicHeroRotatingBackdrop"

/** Max slide per il fallback cover (pagina singola API); il pool catalogo non è limitato. */
const HERO_COVER_MAX_SLIDES = 28

type HeroT = (key: string, values?: TranslationValues) => string

/** Nome leggibile se l'API non espone `name` ma solo `handle` (slug). */
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

function buildHeroCoverSlides(
  sellers: StoreSellerListItem[],
  t: HeroT,
  /** Offset API della prima riga in `sellers` (per contatore `n / totale`). */
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

function shuffleInPlace<T>(a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

/**
 * Prima slide hero: offset casuale nel listing **per lingua** (`content_locale` come directory),
 * poi avanzamento lineare lato client (`/api/tramelle/hero-seller-slide`).
 */
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

  /** Prima era fino a 48 GET con `limit=1` in serie (chiudeva tardi lo stream RSC → rotellina). */
  const CHUNK = 48
  const nChunks = Math.max(1, Math.ceil(total / CHUNK))
  /** Pochi tentativi = meno attese in serie su `/store/sellers` (hero già in Suspense). */
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

/** Altezza hero home (cover alta; trust bar assoluta in basso). */
const HERO_MIN_H =
  "min-h-[min(82vh,620px)] sm:min-h-[min(78vh,680px)] md:min-h-[720px] lg:min-h-[min(80vh,800px)]"

export function HomeCinematicHeroSkeleton() {
  return (
    <section
      className={`relative w-full ${HERO_MIN_H} overflow-hidden bg-[#1a1714]`}
      aria-hidden
    >
      <div className="absolute inset-0 animate-pulse bg-neutral-800" />
      <div
        className={`relative z-[2] flex ${HERO_MIN_H} flex-col justify-center px-4 pb-24 pt-8 sm:px-8 sm:pb-24 sm:pt-10 lg:px-14`}
      >
        <div className="max-w-[620px] space-y-5">
          <div className="h-3 w-48 rounded bg-white/20" />
          <div className="space-y-3">
            <div className="h-12 w-full max-w-md rounded bg-white/15" />
            <div className="h-12 w-4/5 max-w-sm rounded bg-white/10" />
          </div>
          <div className="h-px w-11 bg-white/20" />
          <div className="h-16 w-full max-w-sm rounded bg-white/10" />
          <div className="flex gap-3 pt-2">
            <div className="h-12 w-40 rounded-full bg-white/25" />
            <div className="h-12 w-36 rounded-full bg-white/10" />
          </div>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 z-[5] grid grid-cols-2 border-t border-white/10 bg-[rgba(8,7,5,0.42)] backdrop-blur-md supports-[backdrop-filter]:bg-[rgba(8,7,5,0.35)] lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="min-w-0 border-b border-r border-white/[0.08] p-3.5 last:border-r-0 sm:p-4 lg:border-b-0"
          >
            <div className="space-y-1.5">
              <div className="h-3 w-20 rounded bg-white/20" />
              <div className="h-2.5 w-28 rounded bg-white/10" />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

/**
 * Dati Medusa in **client** (useEffect): lo stream RSC non attende facet/seller/hero;
 * first paint: skeleton, poi sostituzione con contenuto reale.
 */
export function HomeCinematicHero({ locale }: { locale: string }) {
  const t = useTranslations("Hero")
  const ui = countryCodeToStorefrontMessagesLocale(locale)
  const intlLocales = [ui, "it"] as const

  const [ready, setReady] = useState(false)
  const [total, setTotal] = useState(0)
  const [heroInit, setHeroInit] = useState<{
    offset0: number
    slide: HeroCatalogSlide
  } | null>(null)
  const [coverSlides, setCoverSlides] = useState<HeroCoverSlide[]>([])

  useEffect(() => {
    setReady(false)
    let cancelled = false
    const intlLocalesLocal = intlLocales
    ;(async () => {
      const listingContentLocale = normalizeListingContentLocale(locale)
      try {
        const facets = await withTimeout(
          listStoreSellersFacets(
            listingContentLocale ? { contentLocale: listingContentLocale } : {}
          ),
          14_000,
          null
        )
        const tot = facets?.totalSellerCount ?? 0
        if (cancelled) return
        setTotal(tot)

        const hi =
          tot > 0
            ? await withTimeout(
                pickInitialHeroCatalogSlide(
                  tot,
                  t,
                  intlLocalesLocal,
                  listingContentLocale
                ),
                22_000,
                null
              )
            : null
        if (cancelled) return
        setHeroInit(hi)

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
        if (cancelled) return
        setCoverSlides(nextCover)
      } catch {
        if (!cancelled) {
          setTotal(0)
          setHeroInit(null)
          setCoverSlides(
            buildHeroCoverSlides([], t, 0)
          )
        }
      } finally {
        if (!cancelled) setReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
    // t da next-intl è stabile per namespace; intlLocales dipende da locale
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-fetch when cambia `locale` (URL)
  }, [locale])

  if (!ready) {
    return <HomeCinematicHeroSkeleton />
  }

  const listingContentLocale = normalizeListingContentLocale(locale)
  const primaryHref = "/categories"

  return (
    <section
      className={`relative w-full ${HERO_MIN_H} overflow-hidden bg-[#1a1714]`}
      aria-labelledby="home-cinematic-hero-heading"
    >
      {heroInit ? (
        <HomeCinematicHeroFrame
          locale={locale}
          listingContentLocale={listingContentLocale}
          catalogTotal={total}
          initialOffset0={heroInit.offset0}
          initialSlide={heroInit.slide}
          intervalMs={6500}
          prevAria={t("cinematicHeroPrev")}
          nextAria={t("cinematicHeroNext")}
          sellerCta={t("cinematicSellerStoreCta")}
        />
      ) : (
        <HomeCinematicHeroRotatingBackdrop
          slides={coverSlides}
          intervalMs={6500}
          urlLocale={locale}
          catalogTotal={total > 0 ? total : undefined}
          sellerCta={t("cinematicSellerStoreCta")}
          prevAria={t("cinematicHeroPrev")}
          nextAria={t("cinematicHeroNext")}
        />
      )}
      <div
        className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-r from-[rgba(8,7,5,0.78)] via-[rgba(8,7,5,0.38)] to-[rgba(8,7,5,0.06)]"
        aria-hidden
      />

      <div
        className={`relative z-[2] flex ${HERO_MIN_H} flex-col justify-center px-4 pb-24 pt-8 sm:px-8 sm:pb-24 sm:pt-10 lg:px-14`}
      >
        <div className="max-w-[620px]">
          <div className="font-tramelle mb-3 text-[10px] font-normal uppercase leading-snug tracking-[0.22em] text-white sm:mb-3.5">
            <p>{t("cinematicEyebrowLine1")}</p>
          </div>
          <h1
            id="home-cinematic-hero-heading"
            className="text-white sm:tracking-[-0.01em]"
          >
            <span className="block font-tramelle-hero text-[clamp(1.85rem,4.2vw,2.75rem)] font-bold leading-[1.05] sm:text-[clamp(2.1rem,3.8vw,3.25rem)] md:text-[38px] lg:text-[clamp(2.5rem,3.2vw,3.5rem)]">
              {t("cinematicHeadlineLead")}
            </span>
            <em className="mt-0.5 block font-tramelle-display text-[clamp(1.85rem,4.2vw,2.75rem)] font-light italic leading-[1.12] text-white/[0.78] sm:mt-1 sm:text-[clamp(2.1rem,3.8vw,3.25rem)] md:text-[38px] lg:text-[clamp(2.5rem,3.2vw,3.5rem)]">
              {t("cinematicHeadlineEm")}
            </em>
          </h1>
          <div className="my-3.5 h-px w-11 bg-white/20 sm:my-4" aria-hidden />
          <p className="font-tramelle mb-5 max-w-[400px] text-[13px] font-normal leading-[1.7] text-white sm:mb-6 sm:text-[14px]">
            {t("cinematicSub")}
          </p>
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            <Link
              href={primaryHref}
              prefetch={false}
              className="inline-flex items-center justify-center rounded-full border border-white bg-white px-7 py-3 font-tramelle text-[11px] font-medium uppercase tracking-[0.12em] text-[#0F0E0B] shadow-[0_2px_16px_rgba(0,0,0,0.2)] transition-[background-color,color,border-color,opacity] hover:border-[#0F0E0B] hover:bg-[#0F0E0B] hover:text-white active:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              {t("buyNow")} →
            </Link>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-[5] grid grid-cols-2 border-t border-white/10 bg-[rgba(8,7,5,0.42)] backdrop-blur-md supports-[backdrop-filter]:bg-[rgba(8,7,5,0.35)] lg:grid-cols-4">
        {(
          [
            { labelKey: "trust1Label" as const, subKey: "trust1Sub" as const },
            { labelKey: "trust2Label" as const, subKey: "trust2Sub" as const },
            { labelKey: "trust3Label" as const, subKey: "trust3Sub" as const },
            { labelKey: "trust4Label" as const, subKey: "trust4Sub" as const },
          ] as const
        ).map(({ labelKey, subKey }) => (
          <div
            key={labelKey}
            className="min-w-0 border-b border-r border-white/[0.08] px-3 py-2.5 sm:px-4 sm:py-3 last:border-r-0 lg:border-b-0"
          >
            <div className="font-tramelle text-[11px] font-medium leading-tight text-white">
              {t(labelKey)}
            </div>
            <div className="font-tramelle mt-0.5 text-[10px] font-normal tracking-[0.04em] text-white/[0.38]">
              {t(subKey)}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
