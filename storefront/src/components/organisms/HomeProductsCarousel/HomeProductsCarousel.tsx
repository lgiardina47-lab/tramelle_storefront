import { Carousel } from "@/components/cells"
import { storefrontHomeCarouselProductFields } from "@/lib/helpers/product-list-fields"
import { listProducts } from "@/lib/data/products"
import { Product } from "@/types/product"
import { ProductCard } from "../ProductCard/ProductCard"
import { ProductsList } from "../ProductsList/ProductsList"
import type { HttpTypes } from "@medusajs/types"

export const HomeProductsCarousel = async ({
  locale,
  sellerProducts,
  home,
}: {
  locale: string
  sellerProducts: Product[]
  home: boolean
}) => {
  const {
    response: { products },
  } = await listProducts({
    countryCode: locale,
    productFields: home ? storefrontHomeCarouselProductFields() : undefined,
    queryParams: {
      limit: home ? 15 : undefined,
      order: "created_at",
      handle: home
        ? undefined
        : sellerProducts.map((product) => product.handle),
    },
    forceCache: !home,
  })

  if (!products.length && !sellerProducts.length) return null

  /** PDP / “altri prodotti”: stessa griglia listing (2 col mobile, 5 md), non il rail orizzontale. */
  if (!home) {
    const gridProducts: HttpTypes.StoreProduct[] =
      products.length > 0
        ? (products as HttpTypes.StoreProduct[])
        : (sellerProducts as unknown as HttpTypes.StoreProduct[])
    return <ProductsList products={gridProducts} />
  }

  return (
    <div className="flex justify-center w-full">
      <Carousel
        align="start"
        slidesPreset="homeFeatured"
        autoAdvanceIntervalMs={4200}
        items={(sellerProducts.length ? sellerProducts : products).map(
          (product, idx) => (
            <ProductCard
              key={product.id}
              product={product}
              imagePriority={idx < 5}
              imageForceEager
              layoutVariant="homeRail"
            />
          )
        )}
      />
    </div>
  )
}
