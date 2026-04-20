import { Suspense } from "react"
import { CatalogSearchListing } from "@/components/sections"
import { TabsContent, TabsList } from "@/components/molecules"
import { SellerReviewTab } from "@/components/cells"

export const SellerTabs = ({
  tab,
  seller_handle,
  seller_id,
  locale,
  currency_code,
  region_id,
}: {
  tab: string
  seller_handle: string
  seller_id: string
  locale: string
  currency_code: string
  region_id?: string
}) => {
  const tabsList = [
    { label: "products", link: `/sellers/${seller_handle}/` },
    {
      label: "reviews",
      link: `/sellers/${seller_handle}/reviews`,
    },
  ]

  return (
    <div className="mt-8">
      <TabsList list={tabsList} activeTab={tab} />
      <TabsContent value="products" activeTab={tab}>
        <Suspense
          fallback={
            <div
              className="py-6 animate-pulse"
              data-testid="seller-tabs-products-loading"
              aria-busy
            >
              <div className="mb-6 h-7 w-40 rounded bg-neutral-100" />
              <div className="flex flex-wrap gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-72 min-w-[250px] flex-1 rounded-sm bg-neutral-50 sm:flex-[0_0_calc(50%-8px)] lg:flex-[0_0_calc(25%-12px)]"
                  />
                ))}
              </div>
            </div>
          }
        >
          {/*
            Listing Meilisearch (veloce + filtri a sinistra); fallback Medusa seller se indice vuoto.
          */}
          <CatalogSearchListing
            seller_handle={seller_handle}
            seller_id={seller_id}
            locale={locale}
            currency_code={currency_code}
            region_id={region_id}
            sellerPageListing
          />
        </Suspense>
      </TabsContent>
      <TabsContent value="reviews" activeTab={tab}>
        <Suspense fallback={<div data-testid="seller-tabs-reviews-loading">Loading...</div>}>
          <SellerReviewTab seller_handle={seller_handle} />
        </Suspense>
      </TabsContent>
    </div>
  )
}
