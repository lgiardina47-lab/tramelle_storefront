"use client"

import { HttpTypes } from "@medusajs/types"
import {
  CatalogSearchProductSidebar,
  ProductListingActiveFilters,
  ProductsPagination,
} from "@/components/organisms"
import {
  ProductListingLoadingView,
  ProductListingNoResultsView,
  ProductListingProductsView,
} from "@/components/molecules"
import { useSearchParams } from "next/navigation"
import { getFacedFilters } from "@/lib/helpers/get-faced-filters"
import { HIDE_LISTING_FILTERS, PRODUCT_LIMIT } from "@/const"
import { ProductListingSkeleton } from "@/components/organisms/ProductListingSkeleton/ProductListingSkeleton"
import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { fetchMedusaCatalogFallback, searchProducts } from "@/lib/data/products"
import { buildCatalogSearchFilterString } from "@/lib/helpers/catalog-search-filters"
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
}) => {
  const searchParams = useSearchParams()

  const facetFilters: string = getFacedFilters(searchParams)
  const query: string = searchParams.get("query") || ""
  const page: number = +(searchParams.get("page") || 1)

  const resolvedCategoryIds = [
    ...new Set(
      [...(category_ids ?? []), ...(category_id ? [category_id] : [])]
        .map((id) => (typeof id === "string" ? id.trim() : ""))
        .filter(Boolean)
    ),
  ]

  const filters = buildCatalogSearchFilterString({
    locale: locale ?? "",
    currency_code,
    category_ids: resolvedCategoryIds,
    collection_id,
    seller_handle,
    facetFilters,
  })

  return (
    <ProductsListing
      locale={locale}
      currency_code={currency_code}
      filters={filters}
      query={query}
      page={page}
      category_id={category_id}
      category_ids={resolvedCategoryIds.length ? resolvedCategoryIds : undefined}
      collection_id={collection_id}
      region_id={region_id}
      seller_handle={seller_handle}
      seller_id={seller_id}
      sellerPageListing={sellerPageListing}
    />
  )
}

const ProductsListing = ({
  locale,
  currency_code,
  filters,
  query,
  page,
  category_id,
  category_ids,
  collection_id,
  region_id,
  seller_handle,
  seller_id,
  sellerPageListing = false,
}: {
  locale?: string
  currency_code: string
  filters: string
  query: string
  page: number
  category_id?: string
  category_ids?: string[]
  collection_id?: string
  region_id?: string
  seller_handle?: string
  seller_id?: string
  sellerPageListing?: boolean
}) => {
  const tSeller = useTranslations("SellerPage")
  const [products, setProducts] = useState<
    (HttpTypes.StoreProduct & { seller?: any })[]
  >([])
  const [facets, setFacets] = useState<
    Record<string, ListingFacetBuckets | undefined>
  >({})
  const [isLoading, setIsLoading] = useState(true)
  const [count, setCount] = useState(0)
  const [pages, setPages] = useState(1)

  useEffect(() => {
    async function fetchProducts() {
      if (!locale) return

      try {
        setIsLoading(true)
        const result = await searchProducts({
          query: query || undefined,
          page: page - 1,
          hitsPerPage: PRODUCT_LIMIT,
          filters,
          currency_code,
          countryCode: locale,
        })

        let products = result.products
        let nbHits = result.nbHits
        let nbPages = result.nbPages
        let facets = result.facets

        const searchEffectivelyEmpty =
          (nbHits ?? 0) === 0 || !(products && products.length > 0)
        const canFallbackCatalog =
          searchEffectivelyEmpty &&
          !query?.trim() &&
          !!locale &&
          !!region_id &&
          (!seller_handle || Boolean(seller_id?.trim()))

        if (canFallbackCatalog) {
          const offset = (page - 1) * PRODUCT_LIMIT
          try {
            const medusa = await fetchMedusaCatalogFallback({
              countryCode: locale,
              category_id,
              category_ids,
              collection_id,
              region_id,
              seller_id: seller_id?.trim() || undefined,
              limit: PRODUCT_LIMIT,
              offset,
            })
            const raw = medusa.products ?? []
            const filtered = raw
              .filter((p) => p.seller?.store_status !== "SUSPENDED")
              .filter((p) => p?.seller)
            products = filtered as (HttpTypes.StoreProduct & { seller?: any })[]
            nbHits = medusa.count ?? filtered.length
            nbPages = Math.max(1, Math.ceil(nbHits / PRODUCT_LIMIT))
            facets = {}
          } catch {
            /* mantieni risultato vuoto dalla ricerca */
          }
        }

        setProducts(products)
        setFacets(facets)
        setCount(nbHits)
        setPages(nbPages)
      } catch (error) {
        setProducts([])
        setFacets({})
        setCount(0)
        setPages(0)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProducts()
  }, [
    locale,
    filters,
    query,
    page,
    currency_code,
    category_id,
    collection_id,
    region_id,
    seller_handle,
    seller_id,
    category_ids,
  ])

  if (isLoading && products.length === 0) return <ProductListingSkeleton />

  return (
    <div className="min-h-[70vh]">
      <div className="flex justify-between w-full items-center border-b border-neutral-100 pb-4">
        <h2 className="heading-sm text-primary uppercase tracking-tight">
          {sellerPageListing
            ? tSeller("productsAvailable", { count })
            : `${count} listings`}
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
            <CatalogSearchProductSidebar facets={facets} />
          </div>
        )}
        <div className="order-1 w-full flex flex-col md:order-2 md:min-w-0 md:flex-1">
          {isLoading && <ProductListingLoadingView />}

          {!isLoading && !products.length && <ProductListingNoResultsView />}

          {!isLoading && products.length > 0 && (
            <ProductListingProductsView products={products} />
          )}

          <div className="mt-auto">
            <ProductsPagination pages={pages} />
          </div>
        </div>
      </div>
    </div>
  )
}
