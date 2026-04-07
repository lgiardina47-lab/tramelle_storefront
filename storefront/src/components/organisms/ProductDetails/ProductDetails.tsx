import {
  ProductDetailsFooter,
  ProductDetailsHeader,
  ProductDetailsSeller,
  ProductDetailsShipping,
  ProductPageDetails,
  ProductAdditionalAttributes,
} from "@/components/cells"

import { retrieveCustomer } from "@/lib/data/customer"
import { getUserWishlists } from "@/lib/data/wishlist"
import { AdditionalAttributeProps } from "@/types/product"
import { SellerProps } from "@/types/seller"
import { Wishlist } from "@/types/wishlist"
import { HttpTypes } from "@medusajs/types"
import { getLocalizedProductContentForCountry } from "@/lib/helpers/tramelle-product-content"

export const ProductDetails = async ({
  product,
  locale,
}: {
  product: HttpTypes.StoreProduct & {
    seller?: SellerProps
    attribute_values?: AdditionalAttributeProps[]
  }
  locale: string
}) => {
  const user = await retrieveCustomer()

  let wishlist: Wishlist = {products: []}
  if (user) {
    wishlist = await getUserWishlists({countryCode: locale})
  }

  const localized = getLocalizedProductContentForCountry(product, locale)

  return (
    <div>
      <ProductDetailsHeader
        product={product}
        locale={locale}
        user={user}
        wishlist={wishlist}
        displayTitle={localized.title}
      />
      <ProductPageDetails details={localized.description || ""} />
      <ProductAdditionalAttributes
        attributes={product?.attribute_values || []}
      />
      <ProductDetailsShipping />
      <ProductDetailsSeller seller={product?.seller} />
      <ProductDetailsFooter
        tags={product?.tags || []}
        posted={product?.created_at}
      />
    </div>
  )
}
