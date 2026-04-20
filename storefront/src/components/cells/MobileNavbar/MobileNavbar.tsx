"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { useTranslations } from "next-intl"
import { HttpTypes } from "@medusajs/types"

import { cn } from "@/lib/utils"

import { MobileCategoryNavbar } from "./components"

export const MobileNavbar = ({
  categories,
  parentCategories,
}: {
  categories: HttpTypes.StoreProductCategory[]
  parentCategories: HttpTypes.StoreProductCategory[]
}) => {
  const t = useTranslations("Header.gourmet")
  const [isOpen, setIsOpen] = useState(false)
  const [sheetEntered, setSheetEntered] = useState(false)
  const [portalReady, setPortalReady] = useState(false)
  const openSeq = useRef(0)

  useEffect(() => {
    setPortalReady(true)
  }, [])

  const closeMenuHandler = () => {
    setIsOpen(false)
  }

  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow
      document.body.style.overflow = "hidden"
      const seq = ++openSeq.current
      setSheetEntered(false)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (openSeq.current === seq) setSheetEntered(true)
        })
      })
      return () => {
        document.body.style.overflow = prev
      }
    }
    setSheetEntered(false)
    return () => {}
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenuHandler()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [isOpen])

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)")
    const onChange = () => {
      if (mq.matches) setIsOpen(false)
    }
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        data-testid="mobile-menu-toggle"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={t("openCategoriesMenuAria")}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#E8E4DE] bg-white text-[#0F0E0B] transition-colors hover:border-[#CCC8C0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F0E0B]/20"
      >
        <span className="flex flex-col gap-[5px]" aria-hidden>
          <span className="h-0.5 w-[18px] rounded-full bg-[#0F0E0B]" />
          <span className="h-0.5 w-[18px] rounded-full bg-[#0F0E0B]" />
          <span className="h-0.5 w-[18px] rounded-full bg-[#0F0E0B]" />
        </span>
      </button>

      {portalReady && isOpen
        ? createPortal(
            <div data-testid="mobile-menu-drawer-root">
              <button
                type="button"
                aria-label={t("closeCategoriesPanel")}
                className={cn(
                  "fixed inset-0 z-[400] bg-[#0F0E0B]/35 backdrop-blur-[2px] transition-opacity duration-300 motion-reduce:transition-none",
                  sheetEntered ? "opacity-100" : "opacity-0"
                )}
                onClick={closeMenuHandler}
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="mobile-categories-sheet-title"
                className={cn(
                  "fixed inset-x-0 bottom-0 z-[410] flex max-h-[min(88vh,720px)] min-h-[40vh] flex-col rounded-t-[24px] border border-[#E8E4DE] border-b-0 bg-[#FAFAF8] shadow-[0_-12px_40px_rgba(15,14,11,0.12)] transition-transform duration-300 ease-out motion-reduce:transition-none",
                  sheetEntered ? "translate-y-0" : "translate-y-full"
                )}
                style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
              >
                <div className="flex shrink-0 flex-col border-b border-[#E8E4DE] bg-[#FAFAF8] px-4 pb-3 pt-2">
                  <div className="mx-auto mb-2 h-1 w-10 shrink-0 rounded-full bg-[#CCC8C0]/80" aria-hidden />
                  <div className="relative flex min-h-[44px] items-center justify-center px-10">
                    <h2
                      id="mobile-categories-sheet-title"
                      className="font-tramelle text-center text-[15px] font-semibold leading-snug text-[#0F0E0B]"
                    >
                      {t("browseCategoriesTitle")}
                    </h2>
                    <button
                      type="button"
                      onClick={closeMenuHandler}
                      data-testid="mobile-menu-close-button"
                      className="absolute right-0 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-[#8A8580] transition-colors hover:bg-[#F7F6F3] hover:text-[#0F0E0B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F0E0B]/20"
                      aria-label={t("closeCategoriesPanel")}
                    >
                      <span className="text-[22px] font-light leading-none" aria-hidden>
                        ×
                      </span>
                    </button>
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-4 pt-2">
                  <MobileCategoryNavbar
                    onClose={closeMenuHandler}
                    categories={categories}
                    parentCategories={parentCategories}
                  />
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  )
}
