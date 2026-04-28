"use client"

import LocalizedClientLink from "@/components/molecules/LocalizedLink/LocalizedLink"
import type { HeroCatalogSlide } from "@/lib/helpers/hero-catalog-slide"
import { useTranslations } from "next-intl"

/**
 * Pillole sottocategoria hero pagina categoria: colonna destra, stack verticale (mockup brand).
 */
export function CategoryBrandHeroSubcategoryStack({
  slide,
  locale,
  subcategoryLinkBaseHref,
}: {
  slide: HeroCatalogSlide
  locale: string
  subcategoryLinkBaseHref?: string
}) {
  const t = useTranslations("Hero")
  const pills = slide.subcategoryPills ?? []
  if (!pills.length) return null

  const base = subcategoryLinkBaseHref?.trim()
  const sellerH = slide.handle?.trim()

  return (
    <div
      className="flex w-full min-w-0 flex-col gap-2 lg:max-w-[260px] lg:items-stretch"
      role="list"
      aria-label={t("cinematicSellerSubcategories")}
    >
      {pills.map((pill) => {
        const href =
          base && sellerH
            ? (() => {
                const sp = new URLSearchParams()
                sp.set("categories_name", pill.label)
                sp.set("seller_handle", sellerH)
                return `${base}?${sp.toString()}#category-heading`
              })()
            : null
        const line =
          pill.count != null
            ? `${pill.label} (${pill.count})`
            : pill.label
        const a11y = line
        const inner = (
          <span className="line-clamp-2 break-words text-left">{line}</span>
        )
        const className =
          "flex w-full items-center rounded-full bg-white px-3.5 py-2.5 text-left text-[11px] font-medium leading-tight text-[#0F0E0B] shadow-[0_2px_14px_rgba(0,0,0,0.18)] transition-[opacity,transform] hover:opacity-95 sm:text-xs"

        if (href) {
          return (
            <LocalizedClientLink
              key={`${slide.handle}-${pill.label}`}
              href={href}
              locale={locale}
              className={className}
              role="listitem"
              aria-label={a11y}
            >
              {inner}
            </LocalizedClientLink>
          )
        }
        return (
          <span
            key={`${slide.handle}-${pill.label}`}
            role="listitem"
            className={className}
          >
            {inner}
          </span>
        )
      })}
    </div>
  )
}
