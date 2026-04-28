"use client"

import LocalizedClientLink from "@/components/molecules/LocalizedLink/LocalizedLink"
import {
  cloudflareAvatarOrLogoDeliveryUrl,
  cloudflareHeroBackdropBlurDeliveryUrl,
  cloudflareHomeHeroCoverResponsive,
} from "@/lib/helpers/cloudflare-images"
import type { HeroCoverSlide } from "@/types/hero"
import Image from "next/image"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

export type { HeroCoverSlide }

/**
 * Ordine per indice catalogo (lineare); punto di partenza casuale al mount client,
 * poi autoplay +1 mod size (nuovo random solo ricaricando la pagina).
 */
export function HomeCinematicHeroRotatingBackdrop({
  slides,
  intervalMs = 6500,
  urlLocale,
  catalogTotal,
  sellerCta,
  prevAria,
  nextAria,
}: {
  slides: HeroCoverSlide[]
  intervalMs?: number
  urlLocale: string
  /** Totale produttori catalogo (facets); se assente si usa solo la lunghezza slide locale. */
  catalogTotal?: number
  sellerCta: string
  prevAria: string
  nextAria: string
}) {
  const ordered = useMemo(() => {
    const withIdx = slides.filter(
      (s): s is HeroCoverSlide & { catalogIndex1Based: number } =>
        typeof s.catalogIndex1Based === "number"
    )
    const without = slides.filter(
      (s) => typeof s.catalogIndex1Based !== "number"
    )
    const sorted = [...withIdx].sort(
      (a, b) => a.catalogIndex1Based - b.catalogIndex1Based
    )
    return [...sorted, ...without]
  }, [slides])

  const len = ordered.length
  const [idx, setIdx] = useState(0)
  const [priorityIdx, setPriorityIdx] = useState(0)
  const [heroEnter, setHeroEnter] = useState<"next" | "prev" | null>(null)
  const [badgeImgFailed, setBadgeImgFailed] = useState(false)
  const seededRef = useRef(false)

  useEffect(() => {
    if (len <= 0) return
    if (len === 1) {
      setIdx(0)
      setPriorityIdx(0)
      return
    }
    if (seededRef.current) return
    seededRef.current = true
    const r = Math.floor(Math.random() * len)
    setPriorityIdx(r)
    setIdx(r)
  }, [len])

  const advance = useCallback(() => {
    setHeroEnter("next")
    setIdx((i) => (i + 1) % ordered.length)
  }, [ordered.length])

  const goDelta = useCallback(
    (delta: number) => {
      const n = ordered.length
      if (n <= 0) return
      setHeroEnter(delta > 0 ? "next" : "prev")
      setIdx((i) => (i + delta + n) % n)
    },
    [ordered.length]
  )

  useEffect(() => {
    if (ordered.length <= 1) return
    const id = window.setInterval(advance, intervalMs)
    return () => window.clearInterval(id)
  }, [advance, ordered.length, intervalMs])

  useEffect(() => {
    setBadgeImgFailed(false)
  }, [idx])

  useEffect(() => {
    if (!heroEnter) return
    const id = window.setTimeout(() => setHeroEnter(null), 650)
    return () => window.clearTimeout(id)
  }, [heroEnter])

  if (!ordered.length) {
    return null
  }

  const current = ordered[idx]!
  const src = decodeURIComponent(current.src.trim())
  const showCard = Boolean(current.handle?.trim())
  const displayName = (current.displayName || "").trim() || "—"
  const locationLine = (current.locationLine || "").trim()
  const logoRaw = (current.logoSrc || "").trim()
  const initials = (displayName || "·").slice(0, 2).toUpperCase()
  const displayIndex = current.catalogIndex1Based ?? idx + 1
  const poolLen = ordered.length
  const showCounter = poolLen > 0
  const totalLabel =
    catalogTotal != null && catalogTotal > 0
      ? new Intl.NumberFormat(urlLocale).format(catalogTotal)
      : String(poolLen)
  const badgeSrc = decodeURIComponent((logoRaw || current.src).trim())
  const badgeDelivery =
    cloudflareAvatarOrLogoDeliveryUrl(badgeSrc, 56) ?? badgeSrc
  const slideMotionKey = `${idx}-${src}`
  const heroCf = cloudflareHomeHeroCoverResponsive(src)
  const blurSrc = cloudflareHeroBackdropBlurDeliveryUrl(src)

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
          {heroCf ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- blur: URL singola CF */}
              <img
                src={blurSrc}
                alt=""
                decoding="async"
                className="pointer-events-none absolute inset-0 z-0 h-full w-full scale-110 object-cover object-center opacity-90 blur-2xl"
                aria-hidden
              />
              {/* eslint-disable-next-line @next/next/no-img-element -- srcset hero */}
              <img
                src={heroCf.src}
                srcSet={heroCf.srcSet}
                sizes={heroCf.sizes}
                alt={current.alt}
                decoding={idx === priorityIdx ? "sync" : "async"}
                fetchPriority={idx === priorityIdx ? "high" : "low"}
                className="absolute inset-0 z-[1] h-full w-full object-contain object-center"
              />
            </>
          ) : (
            <>
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
                alt={current.alt}
                fill
                sizes="100vw"
                quality={85}
                priority={idx === priorityIdx}
                fetchPriority={idx === priorityIdx ? "high" : "low"}
                className="z-[1] object-contain object-center"
              />
            </>
          )}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 z-[10]">
        {showCounter ? (
          <div
            className="pointer-events-auto absolute right-3 top-4 flex w-[min(220px,calc(100%-1.5rem))] max-w-[220px] items-center sm:right-8 sm:top-5 lg:right-14"
            aria-live="polite"
          >
            <div className="relative w-full">
              <button
                type="button"
                onClick={() => goDelta(-1)}
                disabled={poolLen <= 1}
                className="font-tramelle-display absolute left-0 top-1/2 z-[1] flex h-11 min-w-[2.25rem] -translate-y-1/2 items-center justify-center border-0 bg-transparent text-[26px] font-light leading-none text-white drop-shadow-[0_1px_10px_rgba(0,0,0,0.45)] transition-opacity hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40 disabled:pointer-events-none disabled:opacity-35 sm:h-[52px] sm:min-w-[2.5rem] sm:text-[30px] opacity-88"
                aria-label={prevAria}
              >
                ‹
              </button>
              <div className="flex w-full items-baseline justify-center gap-1 px-10 tabular-nums drop-shadow-[0_1px_12px_rgba(0,0,0,0.5)] sm:gap-1.5 sm:px-12">
                <span className="font-tramelle-display text-[clamp(2.45rem,8.5vw,3.65rem)] font-light leading-[0.94] tracking-[-0.035em] text-white sm:text-[clamp(2.65rem,6.5vw,3.95rem)] md:text-[52px]">
                  {new Intl.NumberFormat(urlLocale).format(displayIndex)}
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
                onClick={() => goDelta(1)}
                disabled={poolLen <= 1}
                className="font-tramelle-display absolute right-0 top-1/2 z-[1] flex h-11 min-w-[2.25rem] -translate-y-1/2 items-center justify-center border-0 bg-transparent text-[26px] font-light leading-none text-white drop-shadow-[0_1px_10px_rgba(0,0,0,0.45)] transition-opacity hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40 disabled:pointer-events-none disabled:opacity-35 sm:h-[52px] sm:min-w-[2.5rem] sm:text-[30px] opacity-88"
                aria-label={nextAria}
              >
                ›
              </button>
            </div>
          </div>
        ) : null}

        {showCard ? (
          <div
            className="pointer-events-auto absolute bottom-24 right-3 w-[min(220px,calc(100%-1.5rem))] max-w-[220px] sm:right-8 lg:bottom-[6.25rem] lg:right-14"
            aria-live="polite"
          >
            <div
              key={current.handle}
              className="pointer-events-auto rounded-[12px] border-x-[3px] border-white/92 pl-[20px] pr-[20px] py-[20px] shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl supports-[backdrop-filter]:bg-[rgba(8,8,8,0.42)] bg-[rgba(8,8,8,0.52)]"
            >
              <div
                className="mb-4 flex h-[52px] w-[52px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-white text-center font-tramelle-display text-[13px] font-normal tracking-[0.06em] text-[#0F0E0B] shadow-[0_2px_16px_rgba(0,0,0,0.2)] sm:h-14 sm:w-14"
                aria-hidden={badgeImgFailed ? true : undefined}
              >
                {!badgeImgFailed ? (
                  // eslint-disable-next-line @next/next/no-img-element -- badge CDN
                  <img
                    key={`${current.handle}-${badgeDelivery.slice(0, 80)}`}
                    src={badgeDelivery}
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
              {locationLine.length > 0 ? (
                <p className="font-tramelle-display mb-5 text-[10px] font-normal uppercase leading-relaxed tracking-[0.22em] text-white">
                  {locationLine}
                </p>
              ) : null}
              <LocalizedClientLink
                href={`/sellers/${current.handle}`}
                locale={urlLocale}
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
        ) : null}
      </div>
    </>
  )
}
