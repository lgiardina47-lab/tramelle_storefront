import {
  ProductListingActiveFilters,
  ProductListingHeader,
  ProductSidebar,
  ProductsList,
} from "@/components/organisms"
import { ProductListingGridWithPagination } from "@/components/organisms/ProductListingGridWithPagination/ProductListingGridWithPagination"
import { PRODUCT_LIMIT } from "@/const"
import { listProductsWithSort } from "@/lib/data/products"

export const ProductListing = async ({
  category_id,
  category_ids,
  collection_id,
  seller_id,
  showSidebar = false,
  locale = process.env.NEXT_PUBLIC_DEFAULT_REGION || "pl",
  page = 1,
}: {
  category_id?: string
  /** Macro + discendenti: unione categorie per listing (bot / senza Meili). */
  category_ids?: string[]
  collection_id?: string
  seller_id?: string
  showSidebar?: boolean
  locale?: string
  /** Allineato a `?page=` (vedi `usePagination` / `ProductsPagination`). */
  page?: number
}) => {
  const safePage = Number.isFinite(page) && page >= 1 ? page : 1
  const { response } = await listProductsWithSort({
    page: safePage,
    seller_id,
    category_id,
    category_ids,
    collection_id,
    countryCode: locale,
    sortBy: "created_at",
    queryParams: {
      limit: PRODUCT_LIMIT,
    },
  })

  const { products, count: totalCount } = response

  const pages = Math.ceil((totalCount || products.length) / PRODUCT_LIMIT) || 1

  return (
    <div className="py-4" data-testid="product-listing-container">
      <ProductListingHeader total={totalCount || products.length} />
      <div className="hidden md:block">
        <ProductListingActiveFilters />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 mt-6 gap-4">
        {showSidebar && <ProductSidebar />}
        <section className={showSidebar ? "col-span-3" : "col-span-4"} data-testid="product-listing-section">
          <ProductListingGridWithPagination pages={pages}>
            <div data-testid="product-list">
              <ProductsList products={products} />
            </div>
          </ProductListingGridWithPagination>
        </section>
      </div>
    </div>
  )
}
