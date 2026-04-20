"use client"

import { useSellerDirectoryImageCoordination } from "@/components/organisms/SellerDirectoryCard/SellerDirectoryImageLoadContext"
import {
  cloudflareDirectoryCardHeroResponsive,
  cloudflareDirectoryCardLogoDeliveryUrl,
} from "@/lib/helpers/cloudflare-images"
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react"
import { useTranslations } from "next-intl"

type Props = {
  heroCandidates: string[]
  logoCandidates: string[]
  name: string
  initials: string
  /** Es. "IT · Toscana" sotto il nome nella fascia in basso */
  locationLine: string
  /** Riga nella griglia a 4 colonne (`floor(index/4)`). */
  imageRowIndex?: number
}

/**
 * Hero Cloudflare con **flexible variants** (`w=…,fit=cover` + srcset) se
 * `NEXT_PUBLIC_CLOUDFLARE_IMAGES_FLEXIBLE_VARIANTS=1` e abilitato su Cloudflare Images → Delivery.
 * Altrimenti URL nominata (`public` / env). Con `SellerDirectoryImageLoadProvider`: righe da 4, lazy.
 */
export function SellerDirectoryCardMedia({
  heroCandidates,
  logoCandidates,
  name,
  initials,
  locationLine,
  imageRowIndex = 0,
}: Props) {
  const t = useTranslations("Sellers")
  const coord = useSellerDirectoryImageCoordination()
  const canShowMedia = coord == null || imageRowIndex <= coord.allowedRow

  const [heroAttempt, setHeroAttempt] = useState(0)
  const [heroDead, setHeroDead] = useState(false)
  const [logoAttempt, setLogoAttempt] = useState(0)
  const [logoDead, setLogoDead] = useState(false)
  const [heroImageLoaded, setHeroImageLoaded] = useState(false)
  const [logoImageLoaded, setLogoImageLoaded] = useState(false)
  const heroSlotReportedRef = useRef(false)
  const heroImgRef = useRef<HTMLImageElement | null>(null)

  const onHeroError = useCallback(() => {
    setHeroAttempt((a) => {
      const next = a + 1
      if (next >= heroCandidates.length) {
        setHeroDead(true)
        return next
      }
      return next
    })
  }, [heroCandidates.length])

  const onLogoError = useCallback(() => {
    setLogoAttempt((a) => {
      const next = a + 1
      if (next >= logoCandidates.length) {
        setLogoDead(true)
        return next
      }
      return next
    })
  }, [logoCandidates.length])

  const heroSrc =
    !heroDead &&
    heroCandidates.length > 0 &&
    heroAttempt < heroCandidates.length
      ? heroCandidates[heroAttempt]!
      : null

  const logoSrc =
    !logoDead &&
    logoCandidates.length > 0 &&
    logoAttempt < logoCandidates.length
      ? logoCandidates[logoAttempt]!
      : null

  const showHeroPlaceholder = !heroSrc

  const reportHeroRowOnce = useCallback(() => {
    if (!coord || heroSlotReportedRef.current) return
    heroSlotReportedRef.current = true
    coord.reportHeroRowSlotComplete(imageRowIndex)
  }, [coord, imageRowIndex])

  useEffect(() => {
    heroSlotReportedRef.current = false
  }, [heroSrc, heroDead, imageRowIndex])

  useEffect(() => {
    if (!canShowMedia || !showHeroPlaceholder) return
    reportHeroRowOnce()
  }, [canShowMedia, showHeroPlaceholder, reportHeroRowOnce])

  useEffect(() => {
    setHeroImageLoaded(false)
  }, [heroSrc])

  /** Immagini già in cache: onLoad a volte non parte; sblocca riga e coordinamento. */
  useLayoutEffect(() => {
    if (!canShowMedia || showHeroPlaceholder) return
    const el = heroImgRef.current
    if (el?.complete && el.naturalWidth > 0) {
      setHeroImageLoaded(true)
      reportHeroRowOnce()
    }
  }, [
    canShowMedia,
    showHeroPlaceholder,
    heroSrc,
    heroAttempt,
    reportHeroRowOnce,
  ])

  useEffect(() => {
    setLogoImageLoaded(false)
  }, [logoSrc])

  /** Con provider: righe sbloccate devono caricare subito (lazy ritarda sotto piega → mai 4 onLoad → righe successive bloccate). */
  const heroLoading: "eager" | "lazy" = coord == null ? "lazy" : "eager"
  const logoLoading: "eager" | "lazy" = coord == null ? "lazy" : "eager"

  const heroBlock = (() => {
    if (!canShowMedia) {
      return (
        <div
          className="absolute inset-0 z-[1] bg-neutral-200 animate-pulse"
          aria-hidden
        />
      )
    }
    if (showHeroPlaceholder) {
      return (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-neutral-200 to-neutral-100">
          <span className="text-4xl font-semibold tracking-tight text-neutral-400">
            {initials}
          </span>
        </div>
      )
    }
    const heroResponsive =
      heroSrc != null ? cloudflareDirectoryCardHeroResponsive(heroSrc) : null

    return (
      <>
        {!heroImageLoaded ? (
          <div
            className="absolute inset-0 z-[1] bg-neutral-200 animate-pulse"
            aria-hidden
          />
        ) : null}
        {heroResponsive ? (
          // eslint-disable-next-line @next/next/no-img-element -- srcset verso Cloudflare flexible `w=`
          <img
            ref={heroImgRef}
            key={heroSrc}
            src={heroResponsive.src}
            srcSet={heroResponsive.srcSet}
            sizes={heroResponsive.sizes}
            alt={name}
            loading={heroLoading}
            decoding="async"
            className="absolute inset-0 z-[2] h-full w-full object-cover"
            onLoad={() => {
              setHeroImageLoaded(true)
              reportHeroRowOnce()
            }}
            onError={onHeroError}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            ref={heroImgRef}
            key={heroSrc}
            src={heroSrc!}
            alt={name}
            loading={heroLoading}
            decoding="async"
            className="absolute inset-0 z-[2] h-full w-full object-cover"
            onLoad={() => {
              setHeroImageLoaded(true)
              reportHeroRowOnce()
            }}
            onError={onHeroError}
          />
        )}
      </>
    )
  })()

  const logoBlock = (() => {
    if (!logoSrc) {
      if (!canShowMedia) {
        return (
          <div
            className="flex h-11 w-11 shrink-0 rounded-full border border-neutral-200 bg-neutral-200 animate-pulse"
            aria-hidden
          />
        )
      }
      return (
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-neutral-100 text-xs font-semibold tracking-tight text-neutral-600"
          aria-hidden
        >
          {initials}
        </div>
      )
    }
    if (!canShowMedia) {
      return (
        <div
          className="h-11 w-11 shrink-0 rounded-full border border-neutral-200 bg-neutral-200 animate-pulse"
          aria-hidden
        />
      )
    }
    const logoDelivery =
      cloudflareDirectoryCardLogoDeliveryUrl(logoSrc) ?? logoSrc

    return (
      <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-neutral-200 bg-white shadow-sm">
        {!logoImageLoaded ? (
          <div
            className="absolute inset-0 z-[1] bg-neutral-200 animate-pulse rounded-full"
            aria-hidden
          />
        ) : null}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={logoDelivery}
          src={logoDelivery}
          alt=""
          loading={logoLoading}
          decoding="async"
          className="relative z-[2] max-h-9 max-w-9 object-contain"
          onLoad={() => setLogoImageLoaded(true)}
          onError={onLogoError}
        />
      </div>
    )
  })()

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden bg-neutral-100">
      {heroBlock}

      <span className="absolute left-3 top-3 z-[3] rounded-full border border-neutral-200/90 bg-white/95 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-800 shadow-sm backdrop-blur-sm sm:left-4">
        {t("directoryCardBadge")}
      </span>

      <div className="absolute bottom-0 left-0 right-0 z-[3] flex items-center gap-3 border-t border-neutral-200/90 bg-white/95 px-3 py-2.5 backdrop-blur-sm sm:gap-3.5 sm:px-4">
        {logoBlock}
        <div className="min-w-0 flex-1 text-left">
          <div className="min-h-[3rem]">
            <p
              className="text-[0.7rem] font-semibold uppercase leading-snug tracking-[0.14em] text-neutral-900 sm:text-xs sm:tracking-[0.16em] line-clamp-2"
              style={{ wordBreak: "break-word" }}
            >
              {name}
            </p>
            {locationLine ? (
              <p className="mt-1 text-[0.65rem] font-medium uppercase tracking-wider text-neutral-500 sm:text-[0.7rem]">
                {locationLine}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
