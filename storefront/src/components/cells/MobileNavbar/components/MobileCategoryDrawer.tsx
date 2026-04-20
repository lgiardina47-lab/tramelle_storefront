"use client"

import { HttpTypes } from "@medusajs/types"
import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"
import LocalizedClientLink from "@/components/molecules/LocalizedLink/LocalizedLink"
import { categoryPublicHref } from "@/lib/helpers/category-public-url"
import { useTranslations } from "next-intl"

interface MobileCategoryDrawerProps {
  category: HttpTypes.StoreProductCategory
  isOpen: boolean
  onClose: () => void
  onLinkClick?: () => void
}

export const MobileCategoryDrawer = ({
  category,
  isOpen,
  onClose,
  onLinkClick,
}: MobileCategoryDrawerProps) => {
  const t = useTranslations("Header.gourmet")
  const childCategories = category.category_children || []
  const [entered, setEntered] = useState(false)
  const [portalReady, setPortalReady] = useState(false)
  const openSeq = useRef(0)

  useEffect(() => {
    setPortalReady(true)
  }, [])

  const handleLinkClick = () => {
    onLinkClick?.()
    onClose()
  }

  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow
      document.body.style.overflow = "hidden"
      const seq = ++openSeq.current
      setEntered(false)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (openSeq.current === seq) setEntered(true)
        })
      })
      return () => {
        document.body.style.overflow = prev
      }
    }
    setEntered(false)
    return () => {}
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [isOpen, onClose])

  if (!isOpen || !portalReady) return null

  return createPortal(
    <>
      <button
        type="button"
        aria-label={t("closeSubcategoriesPanel")}
        className={cn(
          "fixed inset-0 z-[420] bg-[#0F0E0B]/35 backdrop-blur-[2px] transition-opacity duration-300 motion-reduce:transition-none",
          entered ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-subcategory-sheet-title"
        className={cn(
          "fixed inset-x-0 bottom-0 z-[430] flex max-h-[min(90vh,780px)] min-h-[36vh] flex-col rounded-t-[24px] border border-[#E8E4DE] border-b-0 bg-white shadow-[0_-12px_40px_rgba(15,14,11,0.14)] transition-transform duration-300 ease-out motion-reduce:transition-none",
          entered ? "translate-y-0" : "translate-y-full"
        )}
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        <div className="shrink-0 border-b border-[#E8E4DE] px-4 pb-3 pt-2">
          <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-[#CCC8C0]/80" aria-hidden />
          <div className="flex min-h-[48px] items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#E8E4DE] bg-white text-[26px] font-normal leading-none text-[#0F0E0B] shadow-[0_1px_0_rgba(15,14,11,0.06)] transition-colors hover:border-[#CCC8C0] hover:bg-[#F7F6F3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F0E0B]/20"
              aria-label={t("backCategoryList")}
            >
              <span aria-hidden>‹</span>
            </button>
            <h3
              id="mobile-subcategory-sheet-title"
              className="font-tramelle min-w-0 flex-1 text-left text-[15px] font-semibold leading-snug text-[#0F0E0B] line-clamp-2"
            >
              {category.name}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#8A8580] transition-colors hover:bg-[#F7F6F3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F0E0B]/20"
              aria-label={t("closeSubcategoriesPanel")}
            >
              <span className="text-[22px] font-light leading-none">×</span>
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6 pt-2">
          <nav className="flex flex-col gap-0" aria-label={category.name}>
            <LocalizedClientLink
              href={categoryPublicHref(category.handle)}
              onClick={handleLinkClick}
              className="font-tramelle border-b border-[#E8E4DE] px-1 py-3.5 text-[14px] font-medium leading-snug text-[#0F0E0B] transition-colors hover:bg-[#F7F6F3]"
            >
              {t("seeAllInCategory", { name: category.name })}
            </LocalizedClientLink>
            {childCategories.map((dept) => {
              const subs = dept.category_children || []
              return (
                <div
                  key={dept.id}
                  className="border-b border-[#E8E4DE] py-1 last:border-b-0"
                >
                  <LocalizedClientLink
                    href={categoryPublicHref(dept.handle)}
                    onClick={handleLinkClick}
                    className="font-tramelle block px-1 py-3 text-[13px] font-semibold text-[#0F0E0B] transition-colors hover:bg-[#F7F6F3]"
                  >
                    {dept.name}
                  </LocalizedClientLink>
                  {subs.length > 0
                    ? subs.map((sub) => (
                        <LocalizedClientLink
                          key={sub.id}
                          href={categoryPublicHref(sub.handle)}
                          onClick={handleLinkClick}
                          className="font-tramelle block border-t border-[#F7F6F3] py-2.5 pl-3 pr-1 text-[13px] font-normal text-[#0F0E0B] transition-colors hover:bg-[#FAFAF8]"
                        >
                          {sub.name}
                        </LocalizedClientLink>
                      ))
                    : null}
                </div>
              )
            })}
          </nav>
        </div>
      </div>
    </>,
    document.body
  )
}
