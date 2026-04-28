import { CatalogSearchListing } from "@/components/sections"
import { TabsContent, TabsList } from "@/components/molecules"
import { SellerReviewTab } from "@/components/cells"
import type { SellerProps } from "@/types/seller"

export const SellerTabs = ({
  tab,
  seller_handle,
  seller_id,
  locale,
  currency_code,
  region_id,
  /** Se passato, la tab recensioni non rifà GET seller. */
  seller,
}: {
  tab: string
  seller_handle: string
  seller_id: string
  locale: string
  currency_code: string
  region_id?: string
  seller?: SellerProps | null
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
      </TabsContent>
      <TabsContent value="reviews" activeTab={tab}>
        <SellerReviewTab
          seller_handle={seller_handle}
          seller={seller}
          urlLocale={locale}
        />
      </TabsContent>
    </div>
  )
}
