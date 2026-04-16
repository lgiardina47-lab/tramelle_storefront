"use client"

import { type ReactNode } from "react"
import { cn } from "@/lib/utils"

interface CategoryDropdownContainerProps {
  children: ReactNode
  isVisible: boolean
}

export const CategoryDropdownContainer = ({
  children,
  isVisible,
}: CategoryDropdownContainerProps) => {
  return (
    <div
      className={cn(
        "absolute left-1/2 top-full z-50 w-screen max-w-[100vw] -translate-x-1/2 border-b border-neutral-100 bg-white shadow-lg transition-all duration-200 ease-out",
        isVisible ? "visible translate-y-0 opacity-100" : "pointer-events-none invisible -translate-y-1 opacity-0"
      )}
      aria-hidden={!isVisible}
    >
      <div className="max-h-[28rem] w-full overflow-hidden bg-white px-4 md:px-6 lg:px-8">
        {children}
      </div>
    </div>
  )
}
