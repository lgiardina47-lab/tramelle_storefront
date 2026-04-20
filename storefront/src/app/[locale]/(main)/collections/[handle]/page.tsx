import NotFound from "@/app/not-found"
import { Breadcrumbs } from "@/components/atoms"
import { ProductListingSkeleton } from "@/components/organisms/ProductListingSkeleton/ProductListingSkeleton"
import { CatalogSearchListing, ProductListing } from "@/components/sections"
import { getCollectionByHandle } from "@/lib/data/collections"
import { getRegion } from "@/lib/data/regions"
import isBot from "@/lib/helpers/isBot"
import { preferBackendProductSearchListing } from "@/lib/constants/site"
import { parseProductListingPage } from "@/lib/helpers/product-listing-page"
import { headers } from "next/headers"
import { Suspense } from "react"
const SingleCollectionsPage = async ({
  params,
  searchParams,
}: {
  params: Promise<{ handle: string; locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) => {
  const { handle, locale } = await params
  const sp = await searchParams
  const listingPage = parseProductListingPage(sp)

  const ua = (await headers()).get("user-agent") || ""
  const bot = isBot(ua)
  const collection = await getCollectionByHandle(handle)

  if (!collection) return <NotFound />

  const region = await getRegion(locale)
  const currency_code = region?.currency_code || "usd"
  const region_id = region?.id

  const breadcrumbsItems = [
    {
      path: collection.handle,
      label: collection.title,
    },
  ]

  return (
    <main className="container">
      <div className="hidden md:block mb-2">
        <Breadcrumbs items={breadcrumbsItems} />
      </div>

      <h1 className="heading-xl uppercase">{collection.title}</h1>

      <Suspense fallback={<div data-testid="collection-page-loading"><ProductListingSkeleton /></div>}>
        {bot || !preferBackendProductSearchListing() ? (
          <ProductListing
            collection_id={collection.id}
            locale={locale}
            page={listingPage}
          />
        ) : (
          <CatalogSearchListing
            collection_id={collection.id}
            locale={locale}
            currency_code={currency_code}
            region_id={region_id}
          />
        )}
      </Suspense>
    </main>
  )
}

export default SingleCollectionsPage
