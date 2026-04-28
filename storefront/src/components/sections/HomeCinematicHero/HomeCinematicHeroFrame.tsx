"use client"

import LocalizedClientLink from "@/components/molecules/LocalizedLink/LocalizedLink"
import { fetchWithTimeout, DEFAULT_FETCH_TIMEOUT_MS } from "@/lib/helpers/fetch-with-timeout"
import type { HeroCatalogSlide } from "@/lib/helpers/hero-catalog-slide"
import type { HeroSubcategoryPillScope } from "@/lib/hero/hero-slide-product-subcategories"
import Image from "next/image"
import { useTranslations } from "next-intl"
import { useCallback, useEffect, useRef, useState } from "react"

/** Un solo `fetch` verso la Route Handler: lo scan (anche centinaia di offset) avviene in Node verso Medusa. */
const HERO_CATALOG_STEP_TIMEOUT_MS = Math.max(
  DEFAULT_FETCH_TIMEOUT_MS,
  60_000
)

async function requestCatalogStep(
  from0: number,
  total: number,
  step: 1 | -1,
  locale: string,
  listingContentLocale: string | undefined,
  parentCategoryHandles?: string[],
  subcategoryPillScope?: HeroSubcategoryPillScope
): Promise<{ off: number; slide: HeroCatalogSlide } | null> {
  const path = "/api/tramelle/hero-catalog-step"
  const url =
    typeof window !== "undefined"
      ? new URL(path, window.location.origin).href
      : path
  try {
    const res = await fetchWithTimeout(
      url,
      {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from0,
          total,
          step,
          locale,
          contentLocale: listingContentLocale ?? null,
          ...(parentCategoryHandles && parentCategoryHandles.length > 0
            ? { parentCategoryHandles }
            : {}),
          ...(subcategoryPillScope?.category_ids.length
            ? { subcategoryPillScope }
            : {}),
        }),
      },
      HERO_CATALOG_STEP_TIMEOUT_MS
    )
    if (!res.ok) return null
    const data: {
      hit?: { off: number; slide: HeroCatalogSlide } | null
    } = await res.json()
    return data.hit ?? null
  } catch {
    return null
  }
}

/**
 * Hero catalogo: frecce e autoplay chiamano **una** API che esegue lo scan lato server.
 */
export function HomeCinematicHeroFrame({
  locale,
  listingContentLocale,
  catalogTotal,
  initialOffset0,
  initialSlide,
  intervalMs = 6500,
  prevAria,
  nextAria,
  sellerCta,
  parentCategoryHandles,
  subcategoryPillScope,
  hideSellerCard = false,
  onActiveSlideChange,
}: {
  locale: string
  /** Allineato a `GET /store/sellers?content_locale=` (it/en/…); assente = nessun filtro lingua. */
  listingContentLocale: string | undefined
  catalogTotal: number
  /** Offset 0-based nel listing `GET /store/sellers`. */
  initialOffset0: number
  initialSlide: HeroCatalogSlide
  intervalMs?: number
  prevAria: string
  nextAria: string
  sellerCta: string
  /** Scope pagina categoria: stessi handle passati a `getHeroHomeState`. */
  parentCategoryHandles?: string[]
  /** Allineato a `getHeroHomeState` / facet prodotti per pillole sottocategoria. */
  subcategoryPillScope?: HeroSubcategoryPillScope
  /** Pagina categoria: niente card in basso a destra (marchio a sinistra nel parent). */
  hideSellerCard?: boolean
  onActiveSlideChange?: (slide: HeroCatalogSlide) => void
}) {
  const total = Math.max(0, catalogTotal)
  const [offset0, setOffset0] = useState(initialOffset0)
  const [slide, setSlide] = useState(initialSlide)
  /** Ingresso visivo: next = da destra verso sinistra, prev = da sinistra. */
  const [heroEnter, setHeroEnter] = useState<"next" | "prev" | null>(null)
  const [badgeImgFailed, setBadgeImgFailed] = useState(false)

  const offsetRef = useRef(initialOffset0)
  const busyRef = useRef(false)

  useEffect(() => {
    offsetRef.current = offset0
  }, [offset0])

  useEffect(() => {
    setBadgeImgFailed(false)
  }, [offset0, slide?.handle])

  useEffect(() => {
    onActiveSlideChange?.(slide)
  }, [slide, onActiveSlideChange])

  /** Se l'animazione è disattivata (es. reduced-motion), `animationend` può non arrivare: evita stato bloccato. */
  useEffect(() => {
    if (!heroEnter) return
    const id = window.setTimeout(() => setHeroEnter(null), 650)
    return () => window.clearTimeout(id)
  }, [heroEnter])

  const stepTo = useCallback(
    async (step: 1 | -1) => {
      if (total <= 0 || busyRef.current) return
      busyRef.current = true
      try {
        const from =
          step === 1
            ? (offsetRef.current + 1) % total
            : (offsetRef.current - 1 + total) % total
        const hit = await requestCatalogStep(
          from,
          total,
          step,
          locale,
          listingContentLocale,
          parentCategoryHandles,
          subcategoryPillScope
        )
        if (hit) {
          offsetRef.current = hit.off
          setHeroEnter(step === 1 ? "next" : "prev")
          setOffset0(hit.off)
          /** Indice 1-based = colonna “corrente” del listing: sempre allineato a `off` così le cifre girano col click. */
          setSlide({
            ...hit.slide,
            catalogIndex1Based: hit.off + 1,
          })
        }
      } catch (e) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[HomeCinematicHeroFrame] stepTo failed", e)
        }
      } finally {
        busyRef.current = false
      }
    },
    [total, locale, listingContentLocale, parentCategoryHandles, subcategoryPillScope]
  )

  const go = useCallback(
    (delta: number) => {
      if (total <= 0) return
      void stepTo(delta < 0 ? -1 : 1).catch(() => {
        /* in dev Next segnala Promise reject da async senza .catch, anche con try in stepTo */
      })
    },
    [total, stepTo]
  )

  useEffect(() => {
    if (total <= 1) return
    const id = window.setInterval(() => {
      void stepTo(1).catch(() => {})
    }, intervalMs)
    return () => window.clearInterval(id)
  }, [total, intervalMs, stepTo])

  /** Sempre deriva da `offset0` (stato) così contatore e frecce restano allineati anche se l’API omette campi. */
  const displayCatalogIndex =
    total > 0 ? Math.min(offset0 + 1, total) : offset0 + 1
  const totalLabel = new Intl.NumberFormat(locale).format(Math.max(0, catalogTotal))
  const src = decodeURIComponent(slide.src.trim())
  /** Remount del wrapper = animazione CSS sempre da capo (stesso nodo riusa la classe senza riavvio). */
  const slideMotionKey = `${offset0}-${src}`

  return (
    <>
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div
          key={slideMotionKey}
          className={
            heroEnter === "next"
              ? "tramelle-hero-slide-in-next relative h-full w-full"
              : heroEnter === "prev"
                ? "tramelle-hero-slide-in-prev relative h-full w-full"
                : "relative h-full w-full"
          }
          onAnimationEnd={() => setHeroEnter(null)}
        >
          {/*
            Doppio strato: dietro cover+blur riempie il box (niente “buchi”); davanti contain
            mostra l’immagine intera senza alzare l’altezza hero (stesso src, cache browser).
          */}
          <Image
            src={src}
            alt=""
            fill
            sizes="100vw"
            quality={65}
            className="pointer-events-none scale-110 object-cover object-center opacity-90 blur-2xl"
            aria-hidden
          />
          <Image
            src={src}
            alt={slide.alt}
            fill
            sizes="100vw"
            quality={85}
            priority
            fetchPriority="high"
            className="z-[1] object-contain object-center"
          />
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 z-[10]">
        <div
          className="pointer-events-auto absolute right-3 top-4 flex w-[min(220px,calc(100%-1.5rem))] max-w-[220px] items-center sm:right-8 sm:top-5 lg:right-14"
          aria-live="polite"
        >
          <div className="relative w-full">
            <button
              type="button"
              onClick={() => go(-1)}
              disabled={total <= 1}
              className="font-tramelle-display absolute left-0 top-1/2 z-[1] flex h-11 min-w-[2.25rem] -translate-y-1/2 items-center justify-center border-0 bg-transparent text-[26px] font-light leading-none text-white drop-shadow-[0_1px_10px_rgba(0,0,0,0.45)] transition-opacity hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40 disabled:pointer-events-none disabled:opacity-35 sm:h-[52px] sm:min-w-[2.5rem] sm:text-[30px] opacity-88"
              aria-label={prevAria}
            >
              ‹
            </button>
            <div className="flex w-full items-baseline justify-center gap-1 px-10 tabular-nums drop-shadow-[0_1px_12px_rgba(0,0,0,0.5)] sm:gap-1.5 sm:px-12">
              <span className="font-tramelle-display text-[clamp(2.45rem,8.5vw,3.65rem)] font-light leading-[0.94] tracking-[-0.035em] text-white sm:text-[clamp(2.65rem,6.5vw,3.95rem)] md:text-[52px]">
                {new Intl.NumberFormat(locale).format(displayCatalogIndex)}
              </span>
              <span
                className="font-tramelle-display mx-0.5 shrink-0 translate-y-[-0.06em] text-[clamp(0.95rem,2.2vw,1.1rem)] font-light text-white sm:text-[1.05rem]"
                aria-hidden
              >
                /
              </span>
              <span className="font-tramelle-display shrink-0 text-[clamp(0.98rem,2.4vw,1.28rem)] font-light tabular-nums tracking-[-0.02em] text-white sm:text-[1.28rem] md:text-[1.38rem]">
                {totalLabel}
              </span>
            </div>
            <button
              type="button"
              onClick={() => go(1)}
              disabled={total <= 1}
              className="font-tramelle-display absolute right-0 top-1/2 z-[1] flex h-11 min-w-[2.25rem] -translate-y-1/2 items-center justify-center border-0 bg-transparent text-[26px] font-light leading-none text-white drop-shadow-[0_1px_10px_rgba(0,0,0,0.45)] transition-opacity hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40 disabled:pointer-events-none disabled:opacity-35 sm:h-[52px] sm:min-w-[2.5rem] sm:text-[30px] opacity-88"
              aria-label={nextAria}
            >
              ›
            </button>
          </div>
        </div>

        {!hideSellerCard ? (
          <HomeCinematicHeroSellerCard
            slide={slide}
            locale={locale}
            sellerCta={sellerCta}
            badgeImgFailed={badgeImgFailed}
            setBadgeImgFailed={setBadgeImgFailed}
          />
        ) : null}
      </div>
    </>
  )
}

/** Card venditore home (angolo in basso a destra). */
function HomeCinematicHeroSellerCard({
  slide,
  locale,
  sellerCta,
  badgeImgFailed,
  setBadgeImgFailed,
}: {
  slide: HeroCatalogSlide
  locale: string
  sellerCta: string
  badgeImgFailed: boolean
  setBadgeImgFailed: (v: boolean) => void
}) {
  const tHero = useTranslations("Hero")
  const logoRaw = (slide.logoSrc || "").trim()
  const displayName = (slide.displayName || "").trim() || "—"
  const regionText = (slide.regionLabel || "").trim()
  const countryText = (slide.countryLabel || "").trim()
  const metaLine = [regionText, countryText].filter(Boolean).join(" · ")
  const initials = (() => {
    const n = displayName.trim()
    if (!n) return "·"
    const parts = n.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
      const a = parts[0]?.charAt(0) ?? ""
      const b = parts[1]?.charAt(0) ?? ""
      return (a + b).toUpperCase() || "·"
    }
    return n.slice(0, 2).toUpperCase() || "·"
  })()
  const badgeSrc = decodeURIComponent((logoRaw || slide.src).trim())

  return (
    <div
      className="pointer-events-auto absolute bottom-24 right-3 w-[min(220px,calc(100%-1.5rem))] max-w-[220px] sm:right-8 lg:bottom-[6.25rem] lg:right-14"
      data-testid="hero-cover-seller-credit"
      aria-live="polite"
    >
      <div
        key={slide.handle}
        className="pointer-events-auto rounded-[12px] border-x-[3px] border-white/92 pl-[20px] pr-[20px] py-[20px] shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl supports-[backdrop-filter]:bg-[rgba(8,8,8,0.42)] bg-[rgba(8,8,8,0.52)]"
      >
        <div
          className="mb-4 flex h-[52px] w-[52px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-white text-center font-tramelle-display text-[13px] font-normal tracking-[0.06em] text-[#0F0E0B] shadow-[0_2px_16px_rgba(0,0,0,0.2)] sm:h-14 sm:w-14"
          aria-hidden={badgeImgFailed ? true : undefined}
        >
          {!badgeImgFailed ? (
            // eslint-disable-next-line @next/next/no-img-element -- badge CDN
            <img
              key={`${slide.handle}-${badgeSrc.slice(0, 80)}`}
              src={badgeSrc}
              alt={displayName.length > 0 ? `Logo — ${displayName}` : "Logo"}
              width={56}
              height={56}
              className="box-border max-h-full max-w-full object-contain object-center p-2"
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              onError={() => setBadgeImgFailed(true)}
            />
          ) : (
            <span aria-hidden>{initials}</span>
          )}
        </div>
        {displayName.length > 0 ? (
          <p className="font-tramelle-display mb-2 text-[14px] font-normal uppercase leading-snug tracking-[0.12em] text-white sm:text-[15px]">
            {displayName}
          </p>
        ) : null}
        {metaLine.length > 0 ? (
          <p className="font-tramelle-display mb-4 text-[10px] font-normal uppercase leading-relaxed tracking-[0.22em] text-white">
            {metaLine}
          </p>
        ) : null}
        {slide.subcategoryPills && slide.subcategoryPills.length > 0 ? (
          <div className="mb-4 border-t border-white/15 pt-3">
            <p className="font-tramelle-display mb-2 text-[9px] font-normal uppercase tracking-[0.18em] text-white/55">
              {tHero("cinematicSellerSubcategories")}
            </p>
            <div
              className="flex max-h-[min(28vh,200px)] flex-wrap gap-1.5 gap-y-2 overflow-y-auto overscroll-contain px-0.5 pr-0.5 [scrollbar-color:rgba(255,255,255,0.25)_transparent]"
              role="list"
              aria-label={tHero("cinematicSellerSubcategories")}
            >
              {slide.subcategoryPills.map((pill) => (
                <span
                  key={`${slide.handle}-${pill.label}`}
                  role="listitem"
                  className="inline-flex max-w-full items-center rounded-full border border-secondary/25 bg-primary px-2.5 py-1 text-[11px] font-medium leading-tight text-primary normal-case tracking-normal sm:text-xs"
                >
                  <span className="line-clamp-2 break-words text-left">
                    {pill.label}
                  </span>
                  {pill.count != null ? (
                    <span className="ml-0.5 shrink-0 tabular-nums text-[10px] opacity-80 sm:text-[11px]">{` (${pill.count})`}</span>
                  ) : null}
                </span>
              ))}
            </div>
          </div>
        ) : null}
        <LocalizedClientLink
          href={`/sellers/${slide.handle}`}
          locale={locale}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={
            displayName.length > 0
              ? `${sellerCta} — ${displayName}`
              : sellerCta
          }
          className="inline-block border-b border-white pb-[2px] font-tramelle-display text-[10px] font-normal uppercase tracking-[0.12em] text-white transition-colors hover:border-white hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40"
        >
          {sellerCta} →
        </LocalizedClientLink>
      </div>
    </div>
  )
}
