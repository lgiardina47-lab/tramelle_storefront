"use client"

import { type ReactNode } from "react"
import { cn } from "@/lib/utils"

interface CategoryDropdownContainerProps {
  children: ReactNode
  isVisible: boolean
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

export const CategoryDropdownContainer = ({
  children,
  isVisible,
  onMouseEnter,
  onMouseLeave,
}: CategoryDropdownContainerProps) => {
  return (
    <>
      <div
        className="pointer-events-auto absolute left-1/2 top-full z-40 h-10 w-screen max-w-[100vw] -translate-x-1/2 -translate-y-3"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      />

      <div
        className={cn(
          "absolute left-1/2 top-full z-50 w-screen max-w-[100vw] -translate-x-1/2 border-b border-neutral-100 bg-white shadow-lg transition-all duration-200 ease-out",
          isVisible ? "visible translate-y-0 opacity-100" : "pointer-events-none invisible -translate-y-1 opacity-0"
        )}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        aria-hidden={!isVisible}
      >
        <div className="mx-auto max-h-[28rem] w-full max-w-[1440px] overflow-hidden bg-white">
          {children}
        </div>
      </div>
    </>
  )
}
