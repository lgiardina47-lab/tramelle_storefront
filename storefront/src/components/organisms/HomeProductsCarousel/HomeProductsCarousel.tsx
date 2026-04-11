import { Carousel } from "@/components/cells"
import { storefrontHomeCarouselProductFields } from "@/lib/helpers/product-list-fields"
import { listProducts } from "@/lib/data/products"
import { Product } from "@/types/product"
import { ProductCard } from "../ProductCard/ProductCard"

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
      limit: home ? 4 : undefined,
      order: "created_at",
      handle: home
        ? undefined
        : sellerProducts.map((product) => product.handle),
    },
    forceCache: !home,
  })

  if (!products.length && !sellerProducts.length) return null

  return (
    <div className="flex justify-center w-full">
      <Carousel
        align="start"
        items={(sellerProducts.length ? sellerProducts : products).map(
          (product) => (
            <ProductCard
              key={product.id}
              product={product}
            />
          )
        )}
      />
    </div>
  )
}
