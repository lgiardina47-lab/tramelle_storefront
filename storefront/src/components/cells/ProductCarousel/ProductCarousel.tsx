"use client"

import useEmblaCarousel from "embla-carousel-react"
import { HttpTypes } from "@medusajs/types"
import { TramelleProductImage } from "@/components/atoms"
import { ProductCarouselIndicator } from "@/components/molecules"
import { useScreenSize } from "@/hooks/useScreenSize"
import { resolveProductThumbnailSrc } from "@/lib/helpers/get-image-url"
import { cloudflareProductImageQuality } from "@/lib/helpers/cloudflare-images"
import { useCallback, useState } from "react"

export const ProductCarousel = ({
  slides = [],
}: {
  slides: HttpTypes.StoreProduct["images"]
}) => {
  const screenSize = useScreenSize()
  const [loadedById, setLoadedById] = useState<Record<string, boolean>>({})

  const markLoaded = useCallback((id: string) => {
    setLoadedById((prev) => (prev[id] ? prev : { ...prev, [id]: true }))
  }, [])

  const fallbackQuality = cloudflareProductImageQuality()

  const [emblaRef, emblaApi] = useEmblaCarousel({
    axis:
      screenSize === "xs" || screenSize === "sm" || screenSize === "md"
        ? "x"
        : "y",
    loop: true,
    align: "start",
  })

  return (
    <div className="embla relative" data-testid="product-carousel">
      <div
        className="embla__viewport overflow-hidden rounded-xs"
        ref={emblaRef}
        data-testid="product-carousel-viewport"
      >
        <div
          className="embla__container h-[350px] lg:h-fit max-h-[698px] flex lg:block"
          data-testid="product-carousel-container"
        >
          {(slides || []).map((slide, idx) => {
            const src =
              resolveProductThumbnailSrc(slide.url) ??
              decodeURIComponent(slide.url)
            const showPulse = !loadedById[slide.id]

            return (
              <div
                key={slide.id}
                className="embla__slide h-[350px] w-full min-w-0 shrink-0 lg:h-auto lg:max-h-[698px]"
                data-testid={`product-carousel-slide-${idx}`}
              >
                {/**
                 * `fill` + `object-cover`: il riquadro è sempre pieno (come nelle PDP classiche).
                 * Cloudflare resta `fit=scale-down` sullo srcset (risoluzione); il crop è solo CSS.
                 */}
                <div className="relative h-full w-full overflow-hidden lg:mx-auto lg:aspect-square lg:max-h-[698px] lg:w-full lg:max-w-[min(100%,698px)]">
                  {showPulse ? (
                    <div
                      className="absolute inset-0 z-[1] bg-neutral-100"
                      aria-hidden
                    />
                  ) : null}
                  <TramelleProductImage
                    layout="fill"
                    priority={idx === 0}
                    forceEager={idx === 0}
                    src={src}
                    alt="Product image"
                    preset="pdp-gallery"
                    quality={fallbackQuality}
                    className="relative z-[2] object-cover object-center"
                    data-testid={`product-carousel-image-${idx}`}
                    onLoad={() => markLoaded(slide.id)}
                    onError={() => markLoaded(slide.id)}
                  />
                </div>
              </div>
            )
          })}
        </div>
        {slides?.length ? (
          <ProductCarouselIndicator slides={slides} embla={emblaApi} />
        ) : null}
      </div>
    </div>
  )
}
