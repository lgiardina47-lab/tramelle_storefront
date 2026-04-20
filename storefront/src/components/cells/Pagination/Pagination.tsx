"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { PaginationButton } from "@/components/atoms"
import { CollapseIcon, MeatballsMenuIcon } from "@/icons"
import { cn } from "@/lib/utils"

const linkNavClass =
  "border w-10 h-10 rounded-sm label-md flex items-center justify-center hover:bg-component-hover cursor-pointer"

export const Pagination = ({
  pages,
  currentPage,
  setPage,
  hrefForPage,
}: {
  pages: number
  currentPage: number
  /** Preferire con App Router: prefetch RSC, navigazione più fluida. */
  hrefForPage?: (page: number) => string
  /** Fallback se non si usa `hrefForPage` (es. contesti senza URL). */
  setPage?: (page: number) => void
}) => {
  const useLinks = Boolean(hrefForPage)
  const h = hrefForPage!

  const go = (p: number) => {
    if (!useLinks) setPage?.(p)
  }

  const renderPaginationButtons = () => {
    const buttons: ReactNode[] = []

    if (currentPage > 2) {
      buttons.push(
        <PaginationButton
          key="gap-left"
          disabled
          aria-label="More pages"
          data-testid="pagination-ellipsis-left"
        >
          <MeatballsMenuIcon />
        </PaginationButton>
      )
    }

    if (currentPage > 1) {
      buttons.push(
        useLinks ? (
          <Link
            key={`page-${currentPage - 1}`}
            href={h(currentPage - 1)}
            scroll={false}
            prefetch
            className={linkNavClass}
            aria-label={`Go to page ${currentPage - 1}`}
            data-testid={`pagination-button-${currentPage - 1}`}
          >
            {currentPage - 1}
          </Link>
        ) : (
          <PaginationButton
            key={`page-${currentPage - 1}`}
            aria-label={`Go to page ${currentPage - 1}`}
            onClick={() => go(currentPage - 1)}
            data-testid={`pagination-button-${currentPage - 1}`}
          >
            {currentPage - 1}
          </PaginationButton>
        )
      )
    }

    buttons.push(
      <PaginationButton
        key={`page-${currentPage}`}
        isActive
        aria-label={`Current page, page ${currentPage}`}
        data-testid={`pagination-button-current-${currentPage}`}
      >
        {currentPage}
      </PaginationButton>
    )

    if (currentPage < pages) {
      buttons.push(
        useLinks ? (
          <Link
            key={`page-${currentPage + 1}`}
            href={h(currentPage + 1)}
            scroll={false}
            prefetch
            className={linkNavClass}
            aria-label={`Go to page ${currentPage + 1}`}
            data-testid={`pagination-button-${currentPage + 1}`}
          >
            {currentPage + 1}
          </Link>
        ) : (
          <PaginationButton
            key={`page-${currentPage + 1}`}
            aria-label={`Go to page ${currentPage + 1}`}
            onClick={() => go(currentPage + 1)}
            data-testid={`pagination-button-${currentPage + 1}`}
          >
            {currentPage + 1}
          </PaginationButton>
        )
      )
    }

    if (currentPage < pages - 1) {
      buttons.push(
        <PaginationButton
          key="gap-right"
          disabled
          aria-label="More pages"
          data-testid="pagination-ellipsis-right"
        >
          <MeatballsMenuIcon />
        </PaginationButton>
      )
    }

    return buttons
  }

  return (
    <div className="flex items-center" data-testid="pagination">
      {useLinks && currentPage > 1 ? (
        <Link
          href={h(currentPage - 1)}
          scroll={false}
          prefetch
          className={cn(linkNavClass, "border-none")}
          aria-label="Previous page"
          data-testid="pagination-previous"
        >
          <CollapseIcon size={20} className="rotate-90" />
        </Link>
      ) : (
        <PaginationButton
          disabled={Boolean(currentPage === 1)}
          onClick={() => go(currentPage - 1)}
          className="border-none"
          aria-label="Previous page"
          data-testid="pagination-previous"
        >
          <CollapseIcon size={20} className="rotate-90" />
        </PaginationButton>
      )}

      {renderPaginationButtons()}

      {useLinks && currentPage < pages ? (
        <Link
          href={h(currentPage + 1)}
          scroll={false}
          prefetch
          className={cn(linkNavClass, "border-none")}
          aria-label="Next page"
          data-testid="pagination-next"
        >
          <CollapseIcon size={20} className="-rotate-90" />
        </Link>
      ) : (
        <PaginationButton
          disabled={Boolean(currentPage === pages)}
          onClick={() => go(currentPage + 1)}
          className="border-none"
          aria-label="Next page"
          data-testid="pagination-next"
        >
          <CollapseIcon size={20} className="-rotate-90" />
        </PaginationButton>
      )}
    </div>
  )
}
