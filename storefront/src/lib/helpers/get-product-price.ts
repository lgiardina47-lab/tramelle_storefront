import { HttpTypes } from "@medusajs/types"
import { getPercentageDiff } from "./get-precentage-diff"
import { convertToLocale, medusaStoreAmountAsMajor } from "./money"
import { isOrphanStoreVariant } from "./product-orphan-variants"
import { isVariantVisibleB2c } from "./tramelle-variant-metadata"

function variantsForCatalog(
  product: HttpTypes.StoreProduct,
  restrictToB2cVisible: boolean
) {
  let vs = product.variants || []
  vs = vs.filter((v: { metadata?: unknown; options?: unknown }) => {
    if (isOrphanStoreVariant(product, v)) return false
    return true
  })
  if (!restrictToB2cVisible) return vs
  return vs.filter((v: { metadata?: unknown }) =>
    isVariantVisibleB2c(v.metadata as Record<string, unknown> | undefined)
  )
}

/**
 * Listino B2B “nascosto” in vetrina B2C: varianti con `tramelle_b2c_visible: false`.
 * Usato per il prezzo sfocato nel lock sotto il retail.
 */
export function getCheapestB2bOnlyCatalogPrice(
  product: HttpTypes.StoreProduct
): ReturnType<typeof getPricesForVariant> | null {
  if (!product?.id) return null
  const pool = variantsForCatalog(product, false).filter(
    (v: { metadata?: unknown; calculated_price?: unknown }) =>
      !isVariantVisibleB2c(v.metadata as Record<string, unknown> | undefined) &&
      !!v.calculated_price
  )
  if (!pool.length) return null
  const sorted = [...pool].sort((a: any, b: any) => {
    const aw = a.calculated_price?.calculated_amount_with_tax
    const bw = b.calculated_price?.calculated_amount_with_tax
    if (aw != null && bw != null) return aw - bw
    return (
      (a.calculated_price?.calculated_amount ?? 0) -
      (b.calculated_price?.calculated_amount ?? 0)
    )
  })
  return getPricesForVariant(sorted[0])
}

export const getPricesForVariant = (variant: any) => {
  if (
    !variant?.calculated_price?.calculated_amount_with_tax &&
    !variant?.calculated_price?.calculated_amount
  ) {
    return null
  }

  const cc = variant.calculated_price.currency_code

  if (!variant?.calculated_price?.calculated_amount_with_tax) {
    const calc = medusaStoreAmountAsMajor(
      variant.calculated_price.calculated_amount
    )
    const wot = medusaStoreAmountAsMajor(
      variant.calculated_price.calculated_amount_without_tax
    )
    const orig = medusaStoreAmountAsMajor(
      variant.calculated_price.original_amount
    )
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

  const withTax = medusaStoreAmountAsMajor(
    variant.calculated_price.calculated_amount_with_tax
  )
  const withoutTax = medusaStoreAmountAsMajor(
    variant.calculated_price.calculated_amount_without_tax
  )
  const origWithTax = medusaStoreAmountAsMajor(
    variant.calculated_price.original_amount_with_tax
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
  restrictToB2cVisible = false,
}: {
  product: HttpTypes.StoreProduct
  variantId?: string
  /** Se true, ignora varianti con metadata `tramelle_b2c_visible: false` (solo catalogo retail). */
  restrictToB2cVisible?: boolean
}) {
  /** Listing Meili / payload parziale: non far saltare il boundary globale. */
  if (!product || !product.id) {
    return {
      product: product as HttpTypes.StoreProduct,
      cheapestPrice: null,
      variantPrice: null,
      cheapestVariant: null,
    }
  }

  const catalogVariants = () => variantsForCatalog(product, restrictToB2cVisible)

  const cheapestVariant = () => {
    const variants = catalogVariants()
    if (!variants.length) {
      return null
    }

    return variants
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
    const variants = catalogVariants()
    if (!variants.length) {
      return null
    }

    const variant: any = cheapestVariant()

    return getPricesForVariant(variant)
  }

  const variantPrice = () => {
    if (!product || !variantId) {
      return null
    }

    const pool = catalogVariants()
    const variant: any = pool.find(
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
