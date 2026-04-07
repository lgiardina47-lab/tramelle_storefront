import { ProductDetails, ProductGallery } from "@/components/organisms"
import { listProducts } from "@/lib/data/products"
import { HomeProductSection } from "../HomeProductSection/HomeProductSection"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"

export const ProductDetailsPage = async ({
  handle,
  locale,
}: {
  handle: string
  locale: string
}) => {
  const prod = await listProducts({
    countryCode: locale,
    queryParams: { handle: [handle], limit: 1 },
    forceCache: true,
  }).then(({ response }) => response.products[0])

  if (!prod) {
    notFound()
  }

  if (prod.seller?.store_status === "SUSPENDED") {
    notFound()
  }

  const t = await getTranslations("ProductSheet")

  return (
    <>
      <div className="flex flex-col md:flex-row lg:gap-12" data-testid="product-details-page">
        <div className="md:w-1/2 md:px-2" data-testid="product-gallery-container">
          <ProductGallery
            images={prod?.images || []}
            thumbnailUrl={prod?.thumbnail}
          />
        </div>
        <div className="md:w-1/2 md:px-2" data-testid="product-details-container">
          <ProductDetails product={prod} locale={locale} />
        </div>
      </div>
      <div className="my-8">
        <HomeProductSection
          heading={t("moreFromSeller")}
          products={prod.seller?.products}
          // seller_handle={prod.seller?.handle}
          locale={locale}
        />
      </div>
    </>
  )
}
