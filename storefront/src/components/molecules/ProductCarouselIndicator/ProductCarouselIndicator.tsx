"use client"
import { TramelleProductImage } from "@/components/atoms"
import { HttpTypes } from "@medusajs/types"
import { EmblaCarouselType } from "embla-carousel"
import { useCallback, useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { Indicator } from "@/components/atoms"
import { resolveProductThumbnailSrc } from "@/lib/helpers/get-image-url"
import useEmblaCarousel from "embla-carousel-react"
import { cloudflareProductImageQuality } from "@/lib/helpers/cloudflare-images"

export const ProductCarouselIndicator = ({
  slides = [],
  embla: parentEmbla,
}: {
  slides: HttpTypes.StoreProduct["images"]
  embla?: EmblaCarouselType
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [loadedById, setLoadedById] = useState<Record<string, boolean>>({})

  const markLoaded = useCallback((id: string) => {
    setLoadedById((prev) => (prev[id] ? prev : { ...prev, [id]: true }))
  }, [])

  const fallbackQuality = cloudflareProductImageQuality()

  const [emblaRef, emblaApi] = useEmblaCarousel({
    axis: "y",
    loop: true,
    align: "start",
  })

  const changeSlideHandler = useCallback(
    (index: number) => {
      if (!parentEmbla) return
      parentEmbla.scrollTo(index)

      if (!emblaApi) return
      emblaApi.scrollTo(index)
    },
    [parentEmbla, emblaApi]
  )

  const onSelect = useCallback((emblaApi: EmblaCarouselType) => {
    setSelectedIndex(emblaApi.selectedScrollSnap())
  }, [])

  useEffect(() => {
    if (!parentEmbla) return

    onSelect(parentEmbla)
    parentEmbla.on("reInit", onSelect).on("select", onSelect)
  }, [parentEmbla, onSelect])

  return (
    <div className="embla__dots absolute lg:top-3 bottom-3 lg:bottom-auto left-3 w-[calc(100%-24px)] h-[2px] pointer-events-none">
      <div className="lg:hidden pointer-events-auto">
        <Indicator
          step={selectedIndex + 1}
          size="large"
          maxStep={slides?.length || 0}
        />
      </div>

      <div className="embla relative hidden lg:block pointer-events-auto">
        <div
          className="embla__viewport overflow-hidden rounded-xs"
          ref={emblaRef}
        >
          <div className="embla__container h-[350px] lg:h-[680px] flex lg:block">
            {(slides || []).map((slide, index) => {
              const src =
                resolveProductThumbnailSrc(slide.url) ??
                decodeURIComponent(slide.url)
              const showPulse = !loadedById[slide.id]

              return (
                <div
                  key={slide.id}
                  className="mb-3 rounded-sm cursor-pointer w-16 h-16 bg-neutral-100 relative overflow-hidden hidden lg:block shrink-0"
                  onClick={() => changeSlideHandler(index)}
                >
                  {showPulse ? (
                    <div
                      className="absolute inset-0 z-[1] bg-neutral-200"
                      aria-hidden
                    />
                  ) : null}
                  <TramelleProductImage
                    layout="fill"
                    src={src}
                    alt="Product carousel Indicator"
                    preset="pdp-indicator"
                    quality={fallbackQuality}
                    className={cn(
                      "relative z-[2] rounded-sm border-2 transition-color duration-300 object-cover bg-white",
                      selectedIndex === index
                        ? "border-primary"
                        : "border-tertiary"
                    )}
                    onLoad={() => markLoaded(slide.id)}
                    onError={() => markLoaded(slide.id)}
                  />
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
