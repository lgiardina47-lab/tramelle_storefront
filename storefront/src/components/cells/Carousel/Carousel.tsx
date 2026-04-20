"use client"

import useEmblaCarousel from "embla-carousel-react"

import { Indicator } from "@/components/atoms"
import { ArrowLeftIcon, ArrowRightIcon } from "@/icons"
import { Children, isValidElement, useCallback, useEffect, useState } from "react"
import { EmblaCarouselType } from "embla-carousel"
import tailwindConfig from "../../../../tailwind.config"

const SLIDE_CLASS_DEFAULT =
  "embla__slide mr-4 max-w-full min-w-0 last:mr-0 !flex-[0_0_min(100%,280px)] sm:!flex-[0_0_calc(50%-8px)] lg:!flex-[0_0_calc(25%-12px)]"

/**
 * Home / PDP “altri prodotti”: **2** card per viewport su mobile, **5** da `md` in poi
 * (gaps `mr-3`: 1 gap tra 2 colonne, 4 gap tra 5 colonne → `-3rem` nel calc da md).
 */
const SLIDE_CLASS_HOME_FEATURED =
  "embla__slide mr-3 max-w-full min-w-0 last:mr-0 !flex-[0_0_calc((100%-0.75rem)/2)] md:!flex-[0_0_calc((100%-3rem)/5)]"

export const CustomCarousel = ({
  variant = "light",
  items,
  align = "start",
  slidesPreset = "default",
  /** Avanzamento automatico verso la slide successiva (es. home prodotti). */
  autoAdvanceIntervalMs,
}: {
  variant?: "light" | "dark"
  items: React.ReactNode[]
  align?: "center" | "start" | "end"
  /** `homeFeatured`: 2 colonne mobile, 5 da md, scroll orizzontale. */
  slidesPreset?: "default" | "homeFeatured"
  autoAdvanceIntervalMs?: number
}) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align,
  })

  const [selectedIndex, setSelectedIndex] = useState(0)
  const [reduceMotion, setReduceMotion] = useState(false)

  const maxStep = items.length

  const onSelect = useCallback((emblaApi: EmblaCarouselType) => {
    setSelectedIndex(emblaApi.selectedScrollSnap())
  }, [])

  useEffect(() => {
    if (!emblaApi) return

    onSelect(emblaApi)
    emblaApi.on("reInit", onSelect).on("select", onSelect)
  }, [emblaApi, onSelect])

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const apply = () => setReduceMotion(mq.matches)
    apply()
    mq.addEventListener("change", apply)
    return () => mq.removeEventListener("change", apply)
  }, [])

  useEffect(() => {
    if (
      !emblaApi ||
      !autoAdvanceIntervalMs ||
      autoAdvanceIntervalMs < 800 ||
      items.length < 2 ||
      reduceMotion
    ) {
      return
    }
    const id = window.setInterval(() => {
      emblaApi.scrollNext()
    }, autoAdvanceIntervalMs)
    return () => window.clearInterval(id)
  }, [emblaApi, autoAdvanceIntervalMs, items.length, reduceMotion])

  const changeSlideHandler = useCallback(
    (index: number) => {
      if (!emblaApi) return
      emblaApi.scrollTo(index)
    },
    [emblaApi]
  )

  const arrowColor = {
    light: tailwindConfig.theme.extend.colors.primary,
    dark: tailwindConfig.theme.extend.colors.tertiary,
  }

  const slideClass =
    slidesPreset === "homeFeatured" ? SLIDE_CLASS_HOME_FEATURED : SLIDE_CLASS_DEFAULT

  return (
    <div className="embla relative w-full flex justify-center">
      <div
        className="embla__viewport w-full overflow-hidden rounded-xs"
        ref={emblaRef}
      >
        <div className="embla__container flex">
          {Children.map(items, (slide, index) => {
            if (!isValidElement(slide)) {
              return slide
            }
            return (
              <div
                key={slide.key ?? index}
                className={slideClass}
              >
                {slide}
              </div>
            )
          })}
        </div>

        <div className="flex justify-between items-center mt-4 sm:hidden">
          <div className="w-1/2">
            <Indicator
              variant={variant}
              maxStep={maxStep}
              step={selectedIndex + 1}
            />
          </div>
          <div>
            <button onClick={() => changeSlideHandler(selectedIndex - 1)}>
              <ArrowLeftIcon color={arrowColor[variant]} />
            </button>
            <button onClick={() => changeSlideHandler(selectedIndex + 1)}>
              <ArrowRightIcon color={arrowColor[variant]} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
