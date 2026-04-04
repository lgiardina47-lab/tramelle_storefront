"use client"

import { SearchIcon } from "@/icons"
import { useSearchParams } from "next/navigation"
import { redirect } from "next/navigation"
import { useState } from "react"
import { cn } from "@/lib/utils"

type Props = {
  className?: string
  placeholder?: string
}

export function HeaderSearch({
  className,
  placeholder = "Cerca un prodotto o un produttore…",
}: Props) {
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(searchParams.get("query") || "")

  const submit = () => {
    if (search.trim()) {
      redirect(`/categories?query=${encodeURIComponent(search.trim())}`)
    } else {
      redirect(`/categories`)
    }
  }

  return (
    <form
      className={cn("relative w-full max-w-xl", className)}
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      data-testid="header-search-form"
    >
      <button
        type="submit"
        className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-cortilia transition-colors hover:bg-cortilia-muted/80"
        aria-label="Cerca"
      >
        <SearchIcon size={20} color="#000000" />
      </button>
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-full border border-neutral-200 bg-white py-2 pl-12 pr-4 text-sm text-primary placeholder:text-neutral-400 focus:border-cortilia focus:outline-none focus:ring-1 focus:ring-cortilia"
        data-testid="header-search-input"
      />
    </form>
  )
}
