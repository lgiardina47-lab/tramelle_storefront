import { listStoreSellers, listStoreSellersFacets } from "@/lib/data/seller"
import { countryCodeToStorefrontMessagesLocale } from "@/lib/i18n/storefront-messages-locale"
import { sellerHeroImageCandidates } from "@/lib/helpers/seller-media-url"
import type { StoreSellerListItem } from "@/types/seller"
import { getTranslations } from "next-intl/server"
import Link from "next/link"

import {
  HomeCinematicHeroRotatingBackdrop,
  type HeroCoverSlide,
} from "./HomeCinematicHeroRotatingBackdrop"

const HERO_COVER_MAX_SLIDES = 28

/** Nome leggibile se l’API non espone `name` ma solo `handle` (slug). */
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

function buildHeroCoverSlides(
  sellers: StoreSellerListItem[],
  t: Awaited<ReturnType<typeof getTranslations>>
): HeroCoverSlide[] {
  const seen = new Set<string>()
  const out: HeroCoverSlide[] = []
  const pool = [...sellers].sort(() => Math.random() - 0.5)

  for (const s of pool) {
    const raw = sellerHeroImageCandidates(s)[0]
    if (!raw) continue
    const url = raw.trim()
    if (!url || seen.has(url)) continue
    seen.add(url)
    const displayName = heroSellerDisplayName(s)
    const alt = displayName
      ? t("cinematicImageAlt", { name: displayName })
      : t("cinematicImageAltFallback")

    out.push({
      src: url,
      alt,
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

function formatProducerCount(localeSeg: string, count: number): string {
  try {
    return new Intl.NumberFormat(localeSeg, { maximumFractionDigits: 0 }).format(
      count
    )
  } catch {
    return String(count)
  }
}

/** Altezza hero home (bassa rispetto al viewport; trust bar assoluta in basso). */
const HERO_MIN_H =
  "min-h-[min(46vh,320px)] sm:min-h-[min(42vh,340px)] md:min-h-[380px] lg:min-h-[400px]"

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

export async function HomeCinematicHero({ locale }: { locale: string }) {
  const ui = countryCodeToStorefrontMessagesLocale(locale)
  const t = await getTranslations({ locale: ui, namespace: "Hero" })

  const [facets, list] = await Promise.all([
    listStoreSellersFacets({ contentLocale: locale }),
    listStoreSellers({ limit: 72, contentLocale: locale }),
  ])

  const sellers = list?.sellers ?? []
  const coverSlides = buildHeroCoverSlides(sellers, t)
  const total = facets?.totalSellerCount ?? 0
  const countLabel = total > 0 ? formatProducerCount(locale, total) : ""
  const eyebrow =
    countLabel.length > 0
      ? t("cinematicEyebrow", { count: countLabel })
      : t("cinematicEyebrowFallback")

  const primaryHref = "/categories"
  const secondaryHref =
    process.env.NEXT_PUBLIC_VENDOR_URL?.trim() || "https://vendor.mercurjs.com"

  return (
    <section
      className={`relative w-full ${HERO_MIN_H} overflow-hidden bg-[#1a1714]`}
      aria-labelledby="home-cinematic-hero-heading"
    >
      <HomeCinematicHeroRotatingBackdrop slides={coverSlides} intervalMs={6500} />
      <div
        className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-r from-[rgba(8,7,5,0.78)] via-[rgba(8,7,5,0.38)] to-[rgba(8,7,5,0.06)]"
        aria-hidden
      />

      <div
        className={`relative z-[2] flex ${HERO_MIN_H} flex-col justify-center px-4 pb-24 pt-8 sm:px-8 sm:pb-24 sm:pt-10 lg:px-14`}
      >
        <div className="max-w-[620px]">
          <p className="mb-3 text-[10px] font-normal uppercase tracking-[0.22em] text-white/[0.38] sm:mb-3.5">
            {eyebrow}
          </p>
          <h1
            id="home-cinematic-hero-heading"
            className="text-[1.85rem] leading-[1.05] tracking-[-0.01em] text-white sm:text-[2.35rem] md:text-[2.75rem] lg:text-[3rem]"
          >
            <span className="block font-tramelle-hero font-bold">
              {t("cinematicHeadlineLead")}
            </span>
            <em className="mt-0.5 block font-tramelle-display text-[0.9em] font-light italic text-white/[0.52] sm:mt-1">
              {t("cinematicHeadlineEm")}
            </em>
          </h1>
          <div className="my-3.5 h-px w-11 bg-white/20 sm:my-4" aria-hidden />
          <p className="mb-5 max-w-[400px] text-[13px] leading-[1.65] text-white/[0.44] sm:mb-6 sm:text-sm sm:leading-[1.75]">
            {t("cinematicSub")}
          </p>
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            <Link
              href={primaryHref}
              prefetch={true}
              className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-[11px] font-medium uppercase tracking-[0.13em] text-[#0F0E0B] transition-colors hover:bg-[#F0EDE8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:px-8 sm:py-3.5"
            >
              {t("buyNow")}
            </Link>
            <Link
              href={secondaryHref}
              prefetch={false}
              className="inline-flex items-center justify-center rounded-full border border-white/25 bg-transparent px-5 py-3 text-[11px] font-medium uppercase tracking-[0.13em] text-white/55 transition-colors hover:border-white/50 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:px-7 sm:py-3.5"
            >
              {t("sellNow")}
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
            <div className="text-[11px] font-medium leading-tight text-white">
              {t(labelKey)}
            </div>
            <div className="mt-0.5 text-[10px] tracking-[0.04em] text-white/[0.38]">
              {t(subKey)}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
