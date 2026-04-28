"use client"

import { useTranslations } from "next-intl"
import Link from "next/link"
import { useEffect, useState } from "react"
import { normalizeListingContentLocale } from "@/lib/i18n/listing-content-locale"
import type {
  HeroHomeStatePayload,
  HeroSubcategoryPillScope,
} from "@/lib/hero/hero-home-load"
import type { HeroCatalogSlide } from "@/lib/helpers/hero-catalog-slide"

import { CategoryBrandHeroIntro } from "./CategoryBrandHeroIntro"
import { CategoryBrandHeroSubcategoryStack } from "./CategoryBrandHeroSubcategoryStack"
import { HomeCinematicHeroFrame } from "./HomeCinematicHeroFrame"
import { HomeCinematicHeroRotatingBackdrop } from "./HomeCinematicHeroRotatingBackdrop"

/** Altezza hero home (cover alta; trust bar assoluta in basso). */
const HERO_MIN_H =
  "min-h-[min(82vh,620px)] sm:min-h-[min(78vh,680px)] md:min-h-[720px] lg:min-h-[min(80vh,800px)]"

/**
 * Dati hero da RSC (`getHeroHomeState`): nessun fetch client al primo paint della home.
 * L’interattività (frecce catalogo) usa ancora `POST /api/tramelle/hero-catalog-step`.
 */
export function HomeCinematicHero({
  locale,
  initialState,
  parentCategoryHandles,
  primaryCtaHref = "/categories",
  titleAsDecorative = false,
  /** Pagina categoria: marchio in evidenza a sinistra, niente card a destra. */
  categorySellerFocus = false,
  subcategoryPillScope,
  /** Pagina categoria: base path per link pillole (`?categories_name=`). */
  subcategoryPillLinkBasePath,
}: {
  locale: string
  initialState: HeroHomeStatePayload
  /** Scope elenco seller (frecce hero / API step); allineato al server state. */
  parentCategoryHandles?: string[]
  /** CTA principale sotto il testo (home: `/categories`; categoria: anchor al contenuto). */
  primaryCtaHref?: string
  /** Evita secondo <h1> quando la pagina ha già titolo categoria sotto. */
  titleAsDecorative?: boolean
  categorySellerFocus?: boolean
  subcategoryPillScope?: HeroSubcategoryPillScope
  subcategoryPillLinkBasePath?: string
}) {
  const t = useTranslations("Hero")

  const resolved = initialState

  const total = resolved.total
  const heroInit = resolved.heroInit
  const [catalogSlide, setCatalogSlide] = useState<HeroCatalogSlide | null>(
    () => heroInit?.slide ?? null
  )

  useEffect(() => {
    if (!heroInit?.slide) return
    setCatalogSlide(heroInit.slide)
    // Solo allineamento allo stato SSR (cambio offset/handle nel listing).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- evita loop su ogni nuovo oggetto slide
  }, [heroInit?.offset0, heroInit?.slide?.handle])
  let coverSlides = resolved.coverSlides ?? []
  if (!heroInit && coverSlides.length === 0) {
    coverSlides = [
      {
        src: "/images/hero/Image.jpg",
        alt: t("cinematicImageAltFallback"),
      },
    ]
  }

  const listingContentLocale = normalizeListingContentLocale(locale)
  const primaryHref = primaryCtaHref
  const HeadingTag = titleAsDecorative ? "div" : "h1"
  const heroHeadingId = titleAsDecorative
    ? undefined
    : "home-cinematic-hero-heading"

  const showCategoryBrandIntro =
    categorySellerFocus && Boolean(heroInit) && catalogSlide !== null

  return (
    <section
      className={`relative w-full ${HERO_MIN_H} overflow-hidden bg-[#1a1714]`}
      aria-labelledby={heroHeadingId}
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
          parentCategoryHandles={parentCategoryHandles}
          subcategoryPillScope={subcategoryPillScope}
          hideSellerCard={categorySellerFocus}
          onActiveSlideChange={
            categorySellerFocus ? setCatalogSlide : undefined
          }
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
        className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-r from-[rgba(8,7,5,0.5)] via-[rgba(8,7,5,0.18)] to-transparent"
        aria-hidden
      />

      <div
        className={`pointer-events-none relative z-[2] flex ${HERO_MIN_H} flex-col justify-center px-4 pb-24 pt-8 sm:px-8 sm:pb-24 sm:pt-10 lg:px-14`}
      >
        <div
          className={`pointer-events-auto w-full ${showCategoryBrandIntro ? "max-w-[min(100%,1240px)]" : "max-w-[620px]"}`}
        >
          {showCategoryBrandIntro && catalogSlide ? (
            <div className="flex w-full flex-col gap-8 lg:flex-row lg:items-end lg:justify-between lg:gap-10 xl:gap-14">
              <div className="min-w-0 flex-1 lg:max-w-[min(100%,640px)]">
                <CategoryBrandHeroIntro
                  slide={catalogSlide}
                  locale={locale}
                />
              </div>
              <div className="shrink-0 lg:pt-2">
                <CategoryBrandHeroSubcategoryStack
                  slide={catalogSlide}
                  locale={locale}
                  subcategoryLinkBaseHref={subcategoryPillLinkBasePath}
                />
              </div>
            </div>
          ) : (
            <>
              <HeadingTag
                {...(heroHeadingId ? { id: heroHeadingId } : {})}
                className="text-white sm:tracking-[-0.01em]"
              >
                <span className="block font-tramelle-hero text-[clamp(1.85rem,4.2vw,2.75rem)] font-bold leading-[1.05] sm:text-[clamp(2.1rem,3.8vw,3.25rem)] md:text-[38px] lg:text-[clamp(2.5rem,3.2vw,3.5rem)]">
                  {t("cinematicHeadlineLead")}
                </span>
                <em className="mt-0.5 block font-tramelle-display text-[clamp(1.85rem,4.2vw,2.75rem)] font-light italic leading-[1.12] text-white/[0.78] sm:mt-1 sm:text-[clamp(2.1rem,3.8vw,3.25rem)] md:text-[38px] lg:text-[clamp(2.5rem,3.2vw,3.5rem)]">
                  {t("cinematicHeadlineEm")}
                </em>
              </HeadingTag>
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
            </>
          )}
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
