"use client"

import LocalizedClientLink from "@/components/molecules/LocalizedLink/LocalizedLink"
import type { HeroCatalogSlide } from "@/lib/helpers/hero-catalog-slide"
import Image from "next/image"
import { useCallback, useEffect, useRef, useState } from "react"

async function fetchSlideAtOffset(
  offset: number,
  locale: string,
  listingContentLocale: string | undefined
): Promise<HeroCatalogSlide | null> {
  const q = new URLSearchParams({
    offset: String(offset),
    locale,
  })
  if (listingContentLocale) {
    q.set("content_locale", listingContentLocale)
  }
  const res = await fetch(`/api/tramelle/hero-seller-slide?${q.toString()}`, {
    cache: "no-store",
  })
  if (!res.ok) return null
  const data: { slide?: HeroCatalogSlide | null } = await res.json()
  return data.slide ?? null
}

/**
 * Da `start` (indice listing 0-based), prova `start`, `start+step`, … (mod total)
 * fino a una slide con hero. Massimo `total` tentativi.
 */
async function scanCatalogStep(
  start: number,
  total: number,
  locale: string,
  listingContentLocale: string | undefined,
  step: 1 | -1
): Promise<{ off: number; slide: HeroCatalogSlide } | null> {
  let off = ((start % total) + total) % total
  for (let i = 0; i < total; i++) {
    const slide = await fetchSlideAtOffset(off, locale, listingContentLocale)
    if (slide) return { off, slide }
    off = (off + step + total) % total
  }
  return null
}

/**
 * Hero catalogo: avanzamento lineare sugli offset del listing (stesso `total` delle facets).
 * Prima slide da client init; le successive = una GET `/api/tramelle/hero-seller-slide` per volta.
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
        const hit = await scanCatalogStep(
          from,
          total,
          locale,
          listingContentLocale,
          step
        )
        if (hit) {
          offsetRef.current = hit.off
          setHeroEnter(step === 1 ? "next" : "prev")
          setOffset0(hit.off)
          setSlide(hit.slide)
        }
      } finally {
        busyRef.current = false
      }
    },
    [total, locale, listingContentLocale]
  )

  const go = useCallback(
    (delta: number) => {
      if (total <= 0) return
      void stepTo(delta < 0 ? -1 : 1)
    },
    [total, stepTo]
  )

  useEffect(() => {
    if (total <= 1) return
    const id = window.setInterval(() => {
      void stepTo(1)
    }, intervalMs)
    return () => window.clearInterval(id)
  }, [total, intervalMs, stepTo])

  const displayCatalogIndex = slide.catalogIndex1Based
  const totalLabel = new Intl.NumberFormat(locale).format(Math.max(0, catalogTotal))
  const src = decodeURIComponent(slide.src.trim())
  /** Remount del wrapper = animazione CSS sempre da capo (stesso nodo riusa la classe senza riavvio). */
  const slideMotionKey = `${offset0}-${src}`
  const logoRaw = (slide.logoSrc || "").trim()
  const displayName = (slide.displayName || "").trim() || "—"
  const regionText = (slide.regionLabel || "").trim()
  const countryText = (slide.countryLabel || "").trim()
  const metaLine = [regionText, countryText].filter(Boolean).join(" · ")
  const initials = (() => {
    const t = displayName.trim()
    if (!t) return "·"
    const parts = t.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
      const a = parts[0]?.charAt(0) ?? ""
      const b = parts[1]?.charAt(0) ?? ""
      return (a + b).toUpperCase() || "·"
    }
    return t.slice(0, 2).toUpperCase() || "·"
  })()
  const badgeSrc = decodeURIComponent((logoRaw || slide.src).trim())

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
          <Image
            src={src}
            alt={slide.alt}
            fill
            sizes="100vw"
            quality={85}
            priority
            fetchPriority="high"
            className="object-cover object-center"
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
              <p className="font-tramelle-display mb-5 text-[10px] font-normal uppercase leading-relaxed tracking-[0.22em] text-white">
                {metaLine}
              </p>
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
      </div>
    </>
  )
}
