"use client"

import { HttpTypes } from "@medusajs/types"
import {
  CatalogSearchProductSidebar,
  ProductListingActiveFilters,
  ProductsPagination,
} from "@/components/organisms"
import {
  ProductListingGridSkeleton,
  ProductListingNoResultsView,
  ProductListingProductsView,
} from "@/components/molecules"
import { useSearchParams } from "next/navigation"
import { HIDE_LISTING_FILTERS, PRODUCT_LIMIT } from "@/const"
import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { useTranslations } from "next-intl"
import { buildCatalogRequestFromQueryString } from "@/lib/helpers/build-catalog-request"
import {
  getListingFacetPendingVersion,
  mergePendingListingFacetsIntoSearchString,
  subscribeListingFacetPending,
} from "@/lib/helpers/listing-facet-pending-store"
import { cn } from "@/lib/utils"
import { ListingFacetBuckets } from "@/components/organisms/ProductSidebar/CatalogSearchProductSidebar"

export const CatalogSearchListing = ({
  category_id,
  category_ids,
  collection_id,
  seller_handle,
  seller_id,
  locale = process.env.NEXT_PUBLIC_DEFAULT_REGION,
  currency_code,
  region_id,
  sellerPageListing = false,
  /** Nomi sottocategorie macro (ordine ribbon): sidebar mostra sempre l’elenco completo con conteggi. */
  sidebarMacroSubcategoryNames,
  /** Titolo accordion filtro categorie = nome macro (radice albero). */
  sidebarMacroCategoryHeading,
}: {
  category_id?: string
  category_ids?: string[]
  collection_id?: string
  locale?: string
  seller_handle?: string
  /** Fallback Medusa su `/store/sellers/:id/products` se Meilisearch non restituisce hit. */
  seller_id?: string
  currency_code: string
  region_id?: string
  /** Pagina shop produttore: titolo “Prodotti disponibili (n)”. */
  sellerPageListing?: boolean
  sidebarMacroSubcategoryNames?: string[]
  sidebarMacroCategoryHeading?: string
}) => {
  const searchParams = useSearchParams()

  const searchParamsString = searchParams.toString()

  const resolvedCategoryIds = [
    ...new Set(
      [...(category_ids ?? []), ...(category_id ? [category_id] : [])]
        .map((id) => (typeof id === "string" ? id.trim() : ""))
        .filter(Boolean)
    ),
  ]

  return (
    <ProductsListing
      locale={locale}
      currency_code={currency_code}
      searchParamsString={searchParamsString}
      category_id={category_id}
      category_ids={resolvedCategoryIds.length ? resolvedCategoryIds : undefined}
      collection_id={collection_id}
      region_id={region_id}
      seller_handle={seller_handle}
      seller_id={seller_id}
      sellerPageListing={sellerPageListing}
      sidebarMacroSubcategoryNames={sidebarMacroSubcategoryNames}
      sidebarMacroCategoryHeading={sidebarMacroCategoryHeading}
    />
  )
}

const ProductsListing = ({
  locale,
  currency_code,
  searchParamsString,
  category_id,
  category_ids,
  collection_id,
  region_id,
  seller_handle,
  seller_id,
  sellerPageListing = false,
  sidebarMacroSubcategoryNames,
  sidebarMacroCategoryHeading,
}: {
  locale?: string
  currency_code: string
  /** `useSearchParams().toString()` + stesso tick di `window.location` dopo `router.replace`. */
  searchParamsString: string
  category_id?: string
  category_ids?: string[]
  collection_id?: string
  region_id?: string
  seller_handle?: string
  seller_id?: string
  sellerPageListing?: boolean
  sidebarMacroSubcategoryNames?: string[]
  sidebarMacroCategoryHeading?: string
}) => {
  const tSeller = useTranslations("SellerPage")
  /** Stesso tick del click facet: il POST usa i pending prima di `router.replace` sull’URL. */
  const facetPendingVersion = useSyncExternalStore(
    subscribeListingFacetPending,
    getListingFacetPendingVersion,
    () => 0
  )
  const [products, setProducts] = useState<
    (HttpTypes.StoreProduct & { seller?: any })[]
  >([])
  const [facets, setFacets] = useState<
    Record<string, ListingFacetBuckets | undefined>
  >({})
  const [isLoading, setIsLoading] = useState(true)
  const [count, setCount] = useState(0)
  const [pages, setPages] = useState(1)
  const fetchGen = useRef(0)

  useEffect(() => {
    if (!locale) return
    const g = ++fetchGen.current
    setIsLoading(true)
    const t = window.setTimeout(() => {
      void (async () => {
        if (g !== fetchGen.current) return
        const qsNoQ =
          typeof window !== "undefined" && window.location.search.length > 0
            ? window.location.search.slice(1)
            : searchParamsString
        const effectiveQs = mergePendingListingFacetsIntoSearchString(qsNoQ)
        const { filters, query, page } = buildCatalogRequestFromQueryString(
          effectiveQs,
          {
            locale: locale ?? "",
            currency_code,
            category_ids,
            collection_id,
            seller_handle,
          }
        )
        try {
          const res = await fetch("/api/catalog/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              query: query || undefined,
              page: page - 1,
              hitsPerPage: PRODUCT_LIMIT,
              filters,
              currency_code,
              countryCode: locale,
              region_id: region_id || undefined,
            }),
            credentials: "same-origin",
          })
          if (!res.ok) {
            const j = (await res.json().catch(() => ({}))) as { error?: string }
            throw new Error(j.error || "Catalog search failed")
          }
          const result = (await res.json()) as {
            products: (HttpTypes.StoreProduct & { seller?: unknown })[]
            nbHits: number
            nbPages: number
            facets: Record<string, ListingFacetBuckets | undefined>
          }
          if (g !== fetchGen.current) return

          let nextProducts = result.products
          let nbHits = result.nbHits
          let nbPages = result.nbPages
          let nextFacets = result.facets

          const searchEffectivelyEmpty =
            (nbHits ?? 0) === 0 || !(nextProducts && nextProducts.length > 0)
          const canFallbackCatalog =
            searchEffectivelyEmpty &&
            !query?.trim() &&
            !!locale &&
            !!region_id &&
            (!seller_handle || Boolean(seller_id?.trim()))

          if (canFallbackCatalog) {
            const offset = (page - 1) * PRODUCT_LIMIT
            try {
              const fr = await fetch("/api/catalog/medusa-fallback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  countryCode: locale,
                  category_id,
                  category_ids,
                  collection_id,
                  region_id,
                  seller_id: seller_id?.trim() || undefined,
                  limit: PRODUCT_LIMIT,
                  offset,
                }),
                credentials: "same-origin",
              })
              if (!fr.ok) throw new Error("fallback")
              const medusa = (await fr.json()) as {
                products: HttpTypes.StoreProduct[]
                count: number
              }
              if (g !== fetchGen.current) return
              const raw = medusa.products ?? []
              const filtered = raw
                .filter((p) => p.seller?.store_status !== "SUSPENDED")
                .filter((p) => p?.seller)
              nextProducts = filtered as (HttpTypes.StoreProduct & { seller?: any })[]
              nbHits = medusa.count ?? filtered.length
              nbPages = Math.max(1, Math.ceil(nbHits / PRODUCT_LIMIT))
              nextFacets = {}
            } catch {
              /* mantieni risultato vuoto dalla ricerca */
            }
          }

          if (g !== fetchGen.current) return
          setProducts(nextProducts)
          setFacets(nextFacets)
          setCount(nbHits)
          setPages(nbPages)
        } catch {
          if (g !== fetchGen.current) return
          // Mantieni griglia e facet precedenti (refetch/errore transitorio)
        } finally {
          if (g === fetchGen.current) {
            setIsLoading(false)
          }
        }
      })()
    }, 0)
    return () => {
      window.clearTimeout(t)
      // invalida richieste ancora in corso rispetto a questa generazione
      fetchGen.current += 1
    }
  }, [
    locale,
    searchParamsString,
    facetPendingVersion,
    currency_code,
    category_id,
    collection_id,
    region_id,
    seller_handle,
    seller_id,
    category_ids,
  ])

  return (
    <div className="min-h-[70vh]">
      <div className="flex justify-between w-full items-center border-b border-neutral-100 pb-4">
        <h2
          className={cn(
            "heading-sm text-primary uppercase tracking-tight transition-opacity",
            isLoading && products.length > 0 && "opacity-70"
          )}
        >
          {isLoading && !products.length ? (
            <span
              className="inline-block h-[1.1em] min-w-[10rem] animate-pulse rounded-sm bg-[#E8E4DE]/55"
              aria-hidden
            />
          ) : sellerPageListing ? (
            tSeller("productsAvailable", { count })
          ) : (
            `${count} listings`
          )}
        </h2>
      </div>
      {!HIDE_LISTING_FILTERS && (
        <div className="mt-4 hidden md:block">
          <ProductListingActiveFilters />
        </div>
      )}
      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        {!HIDE_LISTING_FILTERS && (
          <div className="order-2 w-full flex-shrink-0 md:order-1 md:block md:w-[280px] md:sticky md:top-24">
            <CatalogSearchProductSidebar
              facets={facets}
              sidebarMacroSubcategoryNames={sidebarMacroSubcategoryNames}
              sidebarMacroCategoryHeading={sidebarMacroCategoryHeading}
            />
          </div>
        )}
        <div className="order-1 w-full flex flex-col md:order-2 md:min-w-0 md:flex-1">
          {isLoading && !products.length ? (
            <ProductListingGridSkeleton />
          ) : !products.length ? (
            <ProductListingNoResultsView />
          ) : (
            <ProductListingProductsView
              products={products}
              isRefetching={isLoading}
            />
          )}

          <div
            className={cn("mt-auto", isLoading && "pointer-events-none opacity-50")}
          >
            <ProductsPagination pages={pages} />
          </div>
        </div>
      </div>
    </div>
  )
}
