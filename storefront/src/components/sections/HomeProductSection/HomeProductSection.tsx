import { HomeProductsCarousel } from "@/components/organisms"
import { Product } from "@/types/product"
import type { HttpTypes } from "@medusajs/types"

export const HomeProductSection = async ({
  heading,
  locale = process.env.NEXT_PUBLIC_DEFAULT_REGION || "pl",
  products = [],
  home = false,
}: {
  heading: string
  locale?: string
  /** Home: {@link Product} legacy; PDP: {@link HttpTypes.StoreProduct} (anche shape Meilisearch). */
  products?: Product[] | HttpTypes.StoreProduct[]
  home?: boolean
}) => {
  return (
    <section className="py-8 w-full">
      <h2 className="mb-6 heading-lg font-bold tracking-tight uppercase">
        {heading}
      </h2>
      <HomeProductsCarousel
        locale={locale}
        sellerProducts={products.slice(0, 15)}
        home={home}
      />
    </section>
  )
}
