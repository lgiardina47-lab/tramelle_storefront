"use client"

import LocalizedClientLink from "@/components/molecules/LocalizedLink/LocalizedLink"
import type { HeroCatalogSlide } from "@/lib/helpers/hero-catalog-slide"
import { BRAND_DESCRIPTION_READ_MORE_CHAR_THRESHOLD } from "@/lib/helpers/tramelle-brand-copy-i18n"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"
import { useState } from "react"

/**
 * Blocco sinistro hero pagina categoria: marchio, località, copy brand, CTA.
 * Le pillole sottocategoria sono in `CategoryBrandHeroSubcategoryStack` (colonna destra).
 */
export function CategoryBrandHeroIntro({
  slide,
  locale,
}: {
  slide: HeroCatalogSlide
  locale: string
}) {
  const t = useTranslations("Hero")
  const [logoFailed, setLogoFailed] = useState(false)

  const logoRaw = (slide.logoSrc || "").trim()
  const displayName = (slide.displayName || "").trim() || slide.handle
  const regionText = (slide.regionLabel || "").trim()
  const countryText = (slide.countryLabel || "").trim()
  const locationLine = [countryText, regionText].filter(Boolean).join(" · ")

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

  const brandHeadline = (slide.brandHeadline || "").trim()
  const brandSubheadline = (slide.brandSubheadline || "").trim()
  const brandDescription = (slide.brandDescription || "").trim()
  const hasBrandCopy =
    brandHeadline.length > 0 ||
    brandSubheadline.length > 0 ||
    brandDescription.length > 0

  return (
    <div className="mt-1 sm:mt-2">
      <div className="flex flex-wrap items-center gap-3 sm:gap-5">
        <div
          className="flex h-[80px] w-[80px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-white shadow-[0_4px_20px_rgba(0,0,0,0.22)] sm:h-[92px] sm:w-[92px] md:h-[100px] md:w-[100px]"
          aria-hidden={logoFailed ? true : undefined}
        >
          {!logoFailed && badgeSrc ? (
            // eslint-disable-next-line @next/next/no-img-element -- logo CDN
            <img
              key={`${slide.handle}-${badgeSrc.slice(0, 80)}`}
              src={badgeSrc}
              alt={displayName ? `Logo — ${displayName}` : "Logo"}
              width={100}
              height={100}
              className="box-border max-h-full max-w-full object-contain object-center p-2 sm:p-2.5"
              loading="eager"
              decoding="async"
              referrerPolicy="no-referrer"
              onError={() => setLogoFailed(true)}
            />
          ) : (
            <span
              className="font-tramelle-display text-[19px] font-normal tracking-[0.08em] text-[#0F0E0B] sm:text-[21px]"
              aria-hidden
            >
              {initials}
            </span>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center self-stretch">
          <p className="font-tramelle-display text-[clamp(1.15rem,3.2vw,1.85rem)] font-normal uppercase leading-[1.08] tracking-[0.06em] text-white sm:text-[clamp(1.2rem,2.8vw,1.95rem)]">
            {displayName}
          </p>
          {locationLine.length > 0 ? (
            <p className="font-tramelle-display mt-1 text-[11px] font-normal uppercase leading-relaxed tracking-[0.2em] text-white sm:mt-1.5 sm:text-[12px]">
              {locationLine}
            </p>
          ) : null}
        </div>
      </div>

      {hasBrandCopy ? (
        <div className="mt-5 max-w-[min(92vw,400px)] space-y-3 text-white/90 sm:mt-6">
          {brandHeadline ? (
            <p className="font-tramelle-display text-[clamp(1.05rem,2.6vw,1.45rem)] font-semibold leading-snug tracking-[0.02em] text-white sm:text-[1.35rem] md:text-[1.5rem]">
              {brandHeadline}
            </p>
          ) : null}
          {brandSubheadline ? (
            <p className="font-tramelle text-[13px] font-normal italic leading-relaxed text-white/70 sm:text-[14px]">
              {brandSubheadline}
            </p>
          ) : null}
          {brandDescription ? (
            <BrandHeroDescriptionCollapsible
              text={brandDescription}
              readMoreLabel={`${t("brandReadMore")} →`}
              readLessLabel={t("brandReadLess")}
            />
          ) : null}
        </div>
      ) : null}

      <div className="mt-8 sm:mt-9">
        <LocalizedClientLink
          href={`/sellers/${slide.handle}`}
          locale={locale}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t("cinematicBrandExploreAllProductsCta", { name: displayName })}
          className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-white bg-white px-8 py-3.5 text-center font-tramelle text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0F0E0B] shadow-[0_4px_20px_rgba(0,0,0,0.22)] transition-[background-color,color,border-color,opacity] hover:border-[#0F0E0B] hover:bg-[#0F0E0B] hover:text-white active:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:min-h-[52px] sm:text-[12px]"
        >
          {t("cinematicBrandExploreAllProductsCta", { name: displayName })} →
        </LocalizedClientLink>
      </div>
    </div>
  )
}

function BrandHeroDescriptionCollapsible({
  text,
  readMoreLabel,
  readLessLabel,
}: {
  text: string
  readMoreLabel: string
  readLessLabel: string
}) {
  const [expanded, setExpanded] = useState(false)
  const needToggle = text.length > BRAND_DESCRIPTION_READ_MORE_CHAR_THRESHOLD

  return (
    <div className="mt-1">
      <p
        className={cn(
          "font-tramelle text-[12px] font-normal leading-relaxed text-white/80 sm:text-[13px]",
          !expanded && needToggle && "line-clamp-2"
        )}
      >
        {text}
      </p>
      {needToggle ? (
        <button
          type="button"
          className="mt-2 font-tramelle text-[10px] font-medium uppercase tracking-[0.2em] text-white/65 transition-colors hover:text-white"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          {expanded ? readLessLabel : readMoreLabel}
        </button>
      ) : null}
    </div>
  )
}
