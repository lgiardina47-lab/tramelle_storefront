"use client"

import { HttpTypes } from "@medusajs/types"
import { SearchIcon } from "@/icons"
import LocalizedClientLink from "@/components/molecules/LocalizedLink/LocalizedLink"
import { useCartContext } from "@/components/providers"
import { instantSearchProducts } from "@/lib/data/products"
import { getProductPrice } from "@/lib/helpers/get-product-price"
import { resolveProductThumbnailSrc } from "@/lib/helpers/get-image-url"
import { getLocalizedProductContentForCountry } from "@/lib/helpers/tramelle-product-content"
import { SellerProps } from "@/types/seller"
import { cn } from "@/lib/utils"
import { useRouter, useSearchParams } from "next/navigation"
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react"

type Props = {
  className?: string
  /** Override classi sull’input (es. shell integrato nel header gourmet). */
  inputClassName?: string
  /** Stile compatto come MVP header (icona 16px, input senza bordo interno). */
  variant?: "default" | "gourmet"
  placeholder?: string
  locale: string
  currency_code: string
}

const DEBOUNCE_MS = 260

export function HeaderSearch({
  className,
  inputClassName,
  variant = "default",
  placeholder = "Cerca un prodotto o un produttore…",
  locale,
  currency_code,
}: Props) {
  const { wholesaleBuyer } = useCartContext()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(searchParams.get("query") || "")
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<
    (HttpTypes.StoreProduct & { seller?: SellerProps })[]
  >([])
  const listId = useId()
  const wrapRef = useRef<HTMLDivElement>(null)
  const seqRef = useRef(0)

  const submit = () => {
    setOpen(false)
    const q = search.trim()
    if (q) {
      router.push(`/${locale}/categories?query=${encodeURIComponent(q)}`)
    } else {
      router.push(`/${locale}/categories`)
    }
  }

  const runSearch = useCallback(
    async (q: string) => {
      const trimmed = q.trim()
      if (trimmed.length < 2) {
        setResults([])
        setLoading(false)
        return
      }
      const id = ++seqRef.current
      setLoading(true)
      try {
        const { products } = await instantSearchProducts({
          query: trimmed,
          locale,
          currency_code,
        })
        if (id === seqRef.current) {
          setResults(products)
        }
      } finally {
        if (id === seqRef.current) {
          setLoading(false)
        }
      }
    },
    [currency_code, locale]
  )

  useEffect(() => {
    const trimmed = search.trim()
    if (trimmed.length < 2) {
      setResults([])
      setLoading(false)
      return
    }
    setResults([])
    setLoading(true)
    const t = window.setTimeout(() => {
      void runSearch(search)
    }, DEBOUNCE_MS)
    return () => window.clearTimeout(t)
  }, [search, runSearch])

  useEffect(() => {
    const onDoc = (e: globalThis.MouseEvent) => {
      const el = wrapRef.current
      if (!el?.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [])

  const showPanel =
    open && search.trim().length >= 2 && (loading || results.length > 0)

  const showEmpty =
    open &&
    search.trim().length >= 2 &&
    !loading &&
    results.length === 0

  return (
    <div ref={wrapRef} className={cn("relative w-full max-w-xl", className)}>
      <form
        className="relative"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
        data-testid="header-search-form"
      >
        <button
          type="submit"
          className={cn(
            "absolute left-3 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-full transition-colors",
            variant === "gourmet"
              ? "left-3 h-4 w-4 p-0 text-gray-400 hover:text-gray-600"
              : "h-9 w-9 text-cortilia hover:bg-cortilia-muted/80"
          )}
          aria-label="Cerca"
        >
          {variant === "gourmet" ? (
            <svg
              className="h-4 w-4 shrink-0"
              fill="none"
              viewBox="0 0 16 16"
              aria-hidden
            >
              <circle
                cx="7"
                cy="7"
                r="5"
                stroke="currentColor"
                strokeWidth="1.4"
              />
              <path
                d="M11.5 11.5L14 14"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <SearchIcon size={20} color="#000000" />
          )}
        </button>
        <input
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          className={cn(
            variant === "gourmet"
              ? "h-9 w-full rounded-full border-0 bg-transparent py-0 pl-10 pr-3 text-[14px] font-medium leading-none text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-0 focus-visible:ring-2 focus-visible:ring-gray-900/15"
              : "h-11 w-full rounded-full border border-neutral-200 bg-white py-2 pl-12 pr-4 text-sm text-primary placeholder:text-neutral-400 focus:border-cortilia focus:outline-none focus:ring-1 focus:ring-cortilia",
            inputClassName
          )}
          data-testid="header-search-input"
          autoComplete="off"
        />
        <input type="submit" className="hidden" />
      </form>

      {(showPanel || showEmpty) && (
        <div
          id={listId}
          role="listbox"
          className={cn(
            "absolute left-0 right-0 top-[calc(100%+6px)] z-[80] max-h-[min(70vh,24rem)] overflow-y-auto rounded-xl border bg-white py-2 shadow-lg",
            variant === "gourmet"
              ? "border-gray-200/90 shadow-xl"
              : "border-neutral-200"
          )}
        >
          {loading && (
            <p className="px-4 py-3 text-sm text-neutral-500">Ricerca…</p>
          )}
          {!loading &&
            results.map((product) => {
              const thumb = resolveProductThumbnailSrc(product.thumbnail)
              const { title: titleUi } = getLocalizedProductContentForCountry(
                product,
                locale
              )
              const { cheapestPrice } = getProductPrice({
                product,
                restrictToB2cVisible: !wholesaleBuyer,
              })
              return (
                <LocalizedClientLink
                  key={product.id}
                  href={`/products/${product.handle}`}
                  locale={locale}
                  role="option"
                  className="flex gap-3 px-3 py-2 text-left hover:bg-neutral-50"
                  onMouseDown={(e: ReactMouseEvent) => e.preventDefault()}
                  onClick={() => setOpen(false)}
                >
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-neutral-100">
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumb}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-primary">
                      {titleUi}
                    </p>
                    {product.seller?.name ? (
                      <p className="truncate text-xs text-neutral-500">
                        {product.seller.name}
                      </p>
                    ) : null}
                    {cheapestPrice?.calculated_price ? (
                      <p className="mt-0.5 text-sm font-semibold text-primary">
                        {cheapestPrice.calculated_price}
                      </p>
                    ) : null}
                  </div>
                </LocalizedClientLink>
              )
            })}
          {showEmpty && (
            <div className="px-4 py-3 text-sm text-neutral-500">
              <p>Nessun risultato</p>
              <LocalizedClientLink
                href={`/categories?query=${encodeURIComponent(search.trim())}`}
                locale={locale}
                className="mt-2 inline-block font-semibold text-cortilia"
                onMouseDown={(e: ReactMouseEvent) => e.preventDefault()}
                onClick={() => setOpen(false)}
              >
                Cerca nella pagina categorie
              </LocalizedClientLink>
            </div>
          )}
          {!loading && results.length > 0 && (
            <div className="border-t border-neutral-100 px-2 pt-2">
              <LocalizedClientLink
                href={`/categories?query=${encodeURIComponent(search.trim())}`}
                locale={locale}
                className="block rounded-lg px-3 py-2 text-center text-sm font-semibold text-cortilia hover:bg-cortilia-muted/40"
                onMouseDown={(e: ReactMouseEvent) => e.preventDefault()}
                onClick={() => setOpen(false)}
              >
                Vedi tutti i risultati
              </LocalizedClientLink>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
