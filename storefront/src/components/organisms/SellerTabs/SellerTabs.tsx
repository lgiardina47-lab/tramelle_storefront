import { Suspense } from "react"
import { ProductListingSkeleton } from "../ProductListingSkeleton/ProductListingSkeleton"
import { ProductListing } from "@/components/sections"
import { TabsContent, TabsList } from "@/components/molecules"
import { SellerReviewTab } from "@/components/cells"

export const SellerTabs = ({
  tab,
  seller_handle,
  seller_id,
  locale,
  currency_code,
}: {
  tab: string
  seller_handle: string
  seller_id: string
  locale: string
  /** Riservato (es. Algolia su altre route); la tab prodotti seller usa solo Medusa. */
  currency_code: string
}) => {
  void currency_code
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
        <Suspense fallback={<div data-testid="seller-tabs-products-loading"><ProductListingSkeleton /></div>}>
          {/*
            Pagina seller: sempre Medusa /store/products + filtro seller_id.
            Algolia spesso è indietro rispetto all’admin → listing vuota in prod se non si reindicizza.
          */}
          <ProductListing seller_id={seller_id} locale={locale} />
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
