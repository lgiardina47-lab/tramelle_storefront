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
import {
  STOREFRONT_EN_URL_SEGMENT,
  storefrontPathToSearchSupportedCountry,
} from "@/lib/i18n/storefront-path-locale"
import { ProductListingSkeleton } from "@/components/organisms/ProductListingSkeleton/ProductListingSkeleton"
import { useEffect, useState } from "react"
import { fetchMedusaCatalogFallback, searchProducts } from "@/lib/data/products"
import { ListingFacetBuckets } from "@/components/organisms/ProductSidebar/CatalogSearchProductSidebar"

export const CatalogSearchListing = ({
  category_id,
  collection_id,
  seller_handle,
  locale = process.env.NEXT_PUBLIC_DEFAULT_REGION,
  currency_code,
  region_id,
}: {
  category_id?: string
  collection_id?: string
  locale?: string
  seller_handle?: string
  currency_code: string
  region_id?: string
}) => {
  const searchParams = useSearchParams()

  const facetFilters: string = getFacedFilters(searchParams)
  const query: string = searchParams.get("query") || ""
  const page: number = +(searchParams.get("page") || 1)

  const searchCountry = storefrontPathToSearchSupportedCountry(locale ?? "")
  const enCatalogFilter =
    (locale ?? "").toLowerCase() === STOREFRONT_EN_URL_SEGMENT
      ? " AND content_locales:en"
      : ""
  const filters = `${
    seller_handle
      ? `NOT seller:null AND seller.handle:${seller_handle} AND `
      : "NOT seller:null AND "
  }NOT seller.store_status:SUSPENDED AND supported_countries:${searchCountry} AND variants.prices.currency_code:${currency_code} AND variants.prices.amount > 0${enCatalogFilter}${
    category_id
      ? ` AND categories.id:${category_id}${
          collection_id !== undefined
            ? ` AND collections.id:${collection_id}`
            : ""
        } ${facetFilters}`
      : ` ${facetFilters}`
  }`

  return (
    <ProductsListing
      locale={locale}
      currency_code={currency_code}
      filters={filters}
      query={query}
      page={page}
      category_id={category_id}
      collection_id={collection_id}
      region_id={region_id}
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
  collection_id,
  region_id,
}: {
  locale?: string
  currency_code: string
  filters: string
  query: string
  page: number
  category_id?: string
  collection_id?: string
  region_id?: string
}) => {
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
          !!region_id

        if (canFallbackCatalog) {
          const offset = (page - 1) * PRODUCT_LIMIT
          try {
            const medusa = await fetchMedusaCatalogFallback({
              countryCode: locale,
              category_id,
              collection_id,
              region_id,
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
  ])

  if (isLoading && products.length === 0) return <ProductListingSkeleton />

  return (
    <div className="min-h-[70vh]">
      <div className="flex justify-between w-full items-center">
        <div className="my-4 label-md">{`${count} listings`}</div>
      </div>
      {!HIDE_LISTING_FILTERS && (
        <div className="hidden md:block">
          <ProductListingActiveFilters />
        </div>
      )}
      <div className="md:flex gap-4">
        {!HIDE_LISTING_FILTERS && (
          <div className="w-[280px] flex-shrink-0 hidden md:block">
            <CatalogSearchProductSidebar facets={facets} />
          </div>
        )}
        <div className="w-full flex flex-col">
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
