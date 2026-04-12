import { convertToLocale, medusaStoreAmountAsMajor } from "./money"

export const getPricesForVariant = (variant: any) => {
  if (!variant?.prices[0]?.amount) {
    return null
  }

  const cc = variant.prices[0].currency_code
  const major = medusaStoreAmountAsMajor(variant.prices[0].amount)

  return {
    calculated_price_number: major,
    calculated_price: convertToLocale({
      amount: major,
      currency_code: cc,
    }),
    original_price_number: major,
    original_price: convertToLocale({
      amount: major,
      currency_code: cc,
    }),
  }
}

export function getSellerProductPrice({
  product,
  variantId,
}: {
  product: any
  variantId?: string
}) {
  if (!product || !product.id) {
    throw new Error("No product provided")
  }

  const cheapestPrice = () => {
    if (!product || !product.variants?.length) {
      return null
    }

    const cheapestVariant: any = product.variants
      .filter((v: any) => !!v.prices?.[0])
      .sort((a: any, b: any) => {
        return a.prices?.[0].amount - b.prices?.[0].amount
      })[0]

    return getPricesForVariant(cheapestVariant)
  }

  const variantPrice = () => {
    if (!product || !variantId) {
      return null
    }

    const variant: any = product.variants?.find(
      (v: any) => v.id === variantId || v.sku === variantId
    )

    if (!variant) {
      return null
    }

    return getPricesForVariant(variant)
  }

  return {
    product,
    cheapestPrice: cheapestPrice(),
    variantPrice: variantPrice(),
  }
}
