"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import type { HeroCatalogSlide } from "@/lib/helpers/hero-catalog-slide"
import Link from "next/link"

import { HomeCinematicHeroFrame } from "./HomeCinematicHeroFrame"
import { HomeCinematicHeroRotatingBackdrop } from "./HomeCinematicHeroRotatingBackdrop"
import type { HeroCoverSlide } from "@/types/hero"
import { normalizeListingContentLocale } from "@/lib/i18n/listing-content-locale"

type HeroStateJson = {
  total: number
  heroInit: { offset0: number; slide: HeroCatalogSlide } | null
  coverSlides: HeroCoverSlide[]
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
        className={`pointer-events-none relative z-[2] flex ${HERO_MIN_H} flex-col justify-center px-4 pb-24 pt-8 sm:px-8 sm:pb-24 sm:pt-10 lg:px-14`}
      >
        <div className="pointer-events-auto max-w-[620px] space-y-5">
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
 * Dati Medusa: **non** chiamare l’SDK dal browser (cache React + `next` su fetch incompatibili col client).
 * Carichiamo lo stato con `GET /api/tramelle/hero-home-state` (stessa logica server di prima).
 */
export function HomeCinematicHero({ locale }: { locale: string }) {
  const t = useTranslations("Hero")

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
    const q = new URLSearchParams({ locale })
    void (async () => {
      try {
        const res = await fetch(
          `/api/tramelle/hero-home-state?${q.toString()}`,
          { cache: "no-store" }
        )
        if (!res.ok) throw new Error(String(res.status))
        const data = (await res.json()) as HeroStateJson
        if (cancelled) return
        setTotal(data.total)
        setHeroInit(data.heroInit)
        setCoverSlides(data.coverSlides ?? [])
      } catch {
        if (!cancelled) {
          setTotal(0)
          setHeroInit(null)
          setCoverSlides([])
        }
      } finally {
        if (!cancelled) setReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
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
        className={`pointer-events-none relative z-[2] flex ${HERO_MIN_H} flex-col justify-center px-4 pb-24 pt-8 sm:px-8 sm:pb-24 sm:pt-10 lg:px-14`}
      >
        <div className="pointer-events-auto max-w-[620px]">
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
