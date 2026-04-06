import { HttpTypes } from "@medusajs/types"
import { getPercentageDiff } from "./get-precentage-diff"
import { convertToLocale, minorUnitsToMajor } from "./money"

export const getPricesForVariant = (variant: any) => {
  if (
    !variant?.calculated_price?.calculated_amount_with_tax &&
    !variant?.calculated_price?.calculated_amount
  ) {
    return null
  }

  const cc = variant.calculated_price.currency_code

  if (!variant?.calculated_price?.calculated_amount_with_tax) {
    const calc = minorUnitsToMajor(
      variant.calculated_price.calculated_amount,
      cc
    )
    const wot = minorUnitsToMajor(
      variant.calculated_price.calculated_amount_without_tax,
      cc
    )
    const orig = minorUnitsToMajor(variant.calculated_price.original_amount, cc)
    return {
      calculated_price_number: calc,
      calculated_price: convertToLocale({
        amount: calc,
        currency_code: cc,
      }),
      calculated_price_without_tax: convertToLocale({
        amount: wot,
        currency_code: cc,
      }),
      calculated_price_without_tax_number: wot,
      original_price_number: orig,
      original_price: convertToLocale({
        amount: orig,
        currency_code: cc,
      }),
      currency_code: cc,
      price_type: variant.calculated_price.calculated_price.price_list_type,
      percentage_diff: getPercentageDiff(
        variant.calculated_price.original_amount,
        variant.calculated_price.calculated_amount
      ),
    }
  }

  const withTax = minorUnitsToMajor(
    variant.calculated_price.calculated_amount_with_tax,
    cc
  )
  const withoutTax = minorUnitsToMajor(
    variant.calculated_price.calculated_amount_without_tax,
    cc
  )
  const origWithTax = minorUnitsToMajor(
    variant.calculated_price.original_amount_with_tax,
    cc
  )

  return {
    calculated_price_number: withTax,
    calculated_price: convertToLocale({
      amount: withTax,
      currency_code: cc,
    }),
    calculated_price_without_tax: convertToLocale({
      amount: withoutTax,
      currency_code: cc,
    }),
    calculated_price_without_tax_number: withoutTax,
    original_price_number: origWithTax,
    original_price: convertToLocale({
      amount: origWithTax,
      currency_code: cc,
    }),
    currency_code: cc,
    price_type: variant.calculated_price.calculated_price.price_list_type,
    percentage_diff: getPercentageDiff(
      variant.calculated_price.original_amount,
      variant.calculated_price.calculated_amount
    ),
  }
}

export function getProductPrice({
  product,
  variantId,
}: {
  product: HttpTypes.StoreProduct
  variantId?: string
}) {
  if (!product || !product.id) {
    throw new Error("No product provided")
  }

  const cheapestVariant = () => {
    if (!product || !product.variants?.length) {
      return null
    }

    return product.variants
      .filter((v: any) => !!v.calculated_price)
      .sort((a: any, b: any) => {
        return a.calculated_price.calculated_amount_with_tax &&
          b.calculated_price.calculated_amount_with_tax
          ? a.calculated_price.calculated_amount_with_tax -
              b.calculated_price.calculated_amount_with_tax
          : a.calculated_amount - b.calculated_amount
      })[0]
  }

  const cheapestPrice = () => {
    if (!product || !product.variants?.length) {
      return null
    }

    const variant: any = cheapestVariant()

    return getPricesForVariant(variant)
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
    cheapestVariant: cheapestVariant(),
  }
}
