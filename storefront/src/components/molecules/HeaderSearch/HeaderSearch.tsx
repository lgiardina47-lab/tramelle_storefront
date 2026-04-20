"use client"

import { HttpTypes } from "@medusajs/types"
import { SearchIcon } from "@/icons"
import LocalizedClientLink from "@/components/molecules/LocalizedLink/LocalizedLink"
import { useCartContext } from "@/components/providers"
import { instantSearchProducts } from "@/lib/data/products"
import {
  getCheapestB2bOnlyCatalogPrice,
  getProductPrice,
} from "@/lib/helpers/get-product-price"
import { useB2BPricingModal } from "@/components/providers/B2BPricingModal/B2BPricingModalProvider"
import { useTranslations } from "next-intl"
import { TramelleProductImage } from "@/components/atoms"
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
  /**
   * Gourmet: `start` = lente a sinistra (desktop). `end` = bottone invio cerchio a destra (mobile stile marketplace).
   */
  submitAlign?: "start" | "end"
  placeholder?: string
  locale: string
  currency_code: string
}

const DEBOUNCE_MS = 260

export function HeaderSearch({
  className,
  inputClassName,
  variant = "default",
  submitAlign = "start",
  placeholder = "Cerca un prodotto o un produttore…",
  locale,
  currency_code,
}: Props) {
  const { wholesaleBuyer } = useCartContext()
  const { open: openB2bModal } = useB2BPricingModal()
  const tProduct = useTranslations("Product")
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

  const gourmetEnd = variant === "gourmet" && submitAlign === "end"

  const searchIconGourmet = (
    <svg
      className="h-4 w-4 shrink-0"
      fill="none"
      viewBox="0 0 16 16"
      aria-hidden
    >
      <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M11.5 11.5L14 14"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  )

  return (
    <div
      ref={wrapRef}
      className={cn(
        "relative w-full",
        variant === "gourmet" ? "max-w-none" : "max-w-xl",
        className
      )}
    >
      <form
        className={cn(
          "relative",
          variant === "gourmet" && "group",
          gourmetEnd && "flex items-center gap-2"
        )}
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
        data-testid="header-search-form"
      >
        {!gourmetEnd ? (
          <button
            type="submit"
            className={cn(
              "absolute top-1/2 flex -translate-y-1/2 items-center justify-center rounded-full transition-colors",
              variant === "gourmet"
                ? "left-0 h-5 w-5 p-0 text-[#B5B0A8] group-focus-within:text-[#0F0E0B] hover:text-[#8A8580]"
                : "left-3 h-9 w-9 text-cortilia hover:bg-cortilia-muted/80"
            )}
            aria-label="Cerca"
          >
            {variant === "gourmet" ? searchIconGourmet : (
              <SearchIcon size={20} color="#000000" />
            )}
          </button>
        ) : null}
        <input
          type={variant === "gourmet" ? "text" : "search"}
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
              ? gourmetEnd
                ? cn(
                    "font-tramelle min-h-[44px] min-w-0 flex-1 rounded-none border-0 bg-transparent py-0 pl-3 pr-1 text-[13px] font-normal leading-snug text-[#0F0E0B] placeholder:text-[#B5B0A8] outline-none focus:border-transparent focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0",
                    search.length > 0 ? "pr-1" : "pr-1"
                  )
                : cn(
                    "font-tramelle min-h-0 w-full border-0 bg-transparent py-0 pl-8 text-[13px] font-normal leading-snug text-[#0F0E0B] placeholder:text-[#B5B0A8] outline-none focus:border-transparent focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0",
                    search.length > 0 ? "pr-8" : "pr-0"
                  )
              : "h-11 w-full rounded-full border border-neutral-200 bg-white py-2 pl-12 pr-4 text-sm text-primary placeholder:text-neutral-400 focus:border-cortilia focus:outline-none focus:ring-1 focus:ring-cortilia",
            inputClassName
          )}
          data-testid="header-search-input"
          autoComplete="off"
        />
        {variant === "gourmet" && search.length > 0 && !gourmetEnd ? (
          <button
            type="button"
            className="absolute right-0 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-[#8A8580] transition-colors hover:text-[#0F0E0B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F0E0B]/20"
            aria-label="Cancella ricerca"
            onClick={(e) => {
              e.preventDefault()
              setSearch("")
              setResults([])
              setOpen(false)
            }}
          >
            <svg
              width={14}
              height={14}
              viewBox="0 0 14 14"
              fill="none"
              className="shrink-0"
              aria-hidden
            >
              <path
                d="M3.5 3.5l7 7M10.5 3.5l-7 7"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
              />
            </svg>
          </button>
        ) : null}
        {variant === "gourmet" && search.length > 0 && gourmetEnd ? (
          <button
            type="button"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#8A8580] transition-colors hover:text-[#0F0E0B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F0E0B]/20"
            aria-label="Cancella ricerca"
            onClick={(e) => {
              e.preventDefault()
              setSearch("")
              setResults([])
              setOpen(false)
            }}
          >
            <svg
              width={14}
              height={14}
              viewBox="0 0 14 14"
              fill="none"
              className="shrink-0"
              aria-hidden
            >
              <path
                d="M3.5 3.5l7 7M10.5 3.5l-7 7"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
              />
            </svg>
          </button>
        ) : null}
        {gourmetEnd ? (
          <button
            type="submit"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0F0E0B] text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F0E0B]/30"
            aria-label="Cerca"
          >
            <span className="text-white [&_circle]:stroke-white [&_path]:stroke-white">
              {searchIconGourmet}
            </span>
          </button>
        ) : (
          <input type="submit" className="hidden" />
        )}
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
              const retail = getProductPrice({
                product,
                restrictToB2cVisible: true,
              })
              const all = getProductPrice({
                product,
                restrictToB2cVisible: false,
              })
              const display =
                retail.cheapestPrice ??
                (wholesaleBuyer ? all.cheapestPrice : null)
              const b2bOnly = getCheapestB2bOnlyCatalogPrice(product)
              const showSearchB2bLock =
                !wholesaleBuyer && retail.cheapestPrice
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
                      <TramelleProductImage
                        layout="intrinsic"
                        src={thumb}
                        alt=""
                        width={48}
                        height={48}
                        preset="header-search"
                        quality={85}
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
                    {display?.calculated_price ? (
                      <p className="mt-0.5 text-sm font-semibold text-primary">
                        {display.calculated_price}
                      </p>
                    ) : null}
                    {showSearchB2bLock ? (
                      <button
                        type="button"
                        className="mt-1 inline-flex max-w-full items-center gap-1 rounded-full bg-[#F5F3F0] px-2 py-0.5 text-[9px] text-[#B5B0A8]"
                        onMouseDown={(e: ReactMouseEvent) => {
                          e.preventDefault()
                          e.stopPropagation()
                        }}
                        onClick={(e: ReactMouseEvent) => {
                          e.preventDefault()
                          e.stopPropagation()
                          openB2bModal()
                        }}
                      >
                        <span className="font-medium text-[#8A8580]">B2B</span>
                        <span
                          className="select-none font-medium blur-[3px] text-[#8A8580]"
                          aria-hidden
                        >
                          {b2bOnly?.calculated_price ?? "€ ····"}
                        </span>
                        <span aria-hidden>·</span>
                        <span className="font-medium text-[#8A8580]">
                          {tProduct("cardB2bLogin")}
                        </span>
                      </button>
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
