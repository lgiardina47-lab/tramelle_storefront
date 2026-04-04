"use client"

import { HttpTypes } from "@medusajs/types"
import { useEffect } from "react"
import { cn } from "@/lib/utils"
import LocalizedClientLink from "@/components/molecules/LocalizedLink/LocalizedLink"
import { ArrowLeftIcon, CloseIcon } from "@/icons"
import { IconButton } from "@/components/atoms"

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
  const childCategories = category.category_children || []

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }

    return () => {
      document.body.style.overflow = ""
    }
  }, [isOpen])

  const handleLinkClick = () => {
    onLinkClick?.()
    onClose()
  }

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-50 bg-primary/80 transition-opacity duration-300",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
      />

      <div
        className={cn(
          "fixed inset-0 z-50 bg-primary transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-4 border-b p-4">
            <IconButton
              icon={<ArrowLeftIcon size={20} />}
              onClick={onClose}
              aria-label="Indietro"
              variant="icon"
            />
            <h3 className="heading-md uppercase text-primary">{category.name}</h3>
            <IconButton
              icon={<CloseIcon size={20} />}
              onClick={onClose}
              className="ml-auto"
              aria-label="Chiudi"
              variant="icon"
            />
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <nav className="flex flex-col gap-2">
              <LocalizedClientLink
                href={`/categories/${category.handle}`}
                onClick={handleLinkClick}
                className="heading-sm px-4 py-3 uppercase text-primary transition-colors hover:bg-secondary/10"
              >
                Vedi tutto · {category.name}
              </LocalizedClientLink>
              {childCategories.map((dept) => {
                const subs = dept.category_children || []
                return (
                  <div key={dept.id} className="flex flex-col border-b border-secondary/10 pb-2">
                    <LocalizedClientLink
                      href={`/categories/${dept.handle}`}
                      onClick={handleLinkClick}
                      className="label-md px-4 py-2 font-semibold uppercase text-primary transition-colors hover:bg-secondary/10"
                    >
                      {dept.name}
                    </LocalizedClientLink>
                    {subs.length > 0
                      ? subs.map((sub) => (
                          <LocalizedClientLink
                            key={sub.id}
                            href={`/categories/${sub.handle}`}
                            onClick={handleLinkClick}
                            className="label-md border-t border-secondary/5 px-4 py-2.5 pl-8 normal-case text-primary transition-colors hover:bg-secondary/10"
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
      </div>
    </>
  )
}
