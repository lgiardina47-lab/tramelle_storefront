import { useParams } from "react-router-dom"

import { TwoColumnPageSkeleton } from "../../../components/common/skeleton"
import { TwoColumnPage } from "../../../components/layout/pages"
import { useProduct } from '../../../hooks/api'
import { ProductGeneralSection } from "./components/product-general-section"
import { TechnicalSheetForm } from "./components/technical-sheet-form"
import { ProductFormatsPricesSection } from "./components/product-formats-prices-section"
import { ProductMediaSection } from "./components/product-media-section"
import { ProductOrganizationSection } from "./components/product-organization-section"
import { ProductVariantSection } from "./components/product-variant-section"

import { useDashboardExtension } from "../../../extensions"
import { ProductAdditionalAttributesSection } from "./components/product-additional-attribute-section/ProductAdditionalAttributesSection"
import { ProductAttributeSection } from "./components/product-attribute-section/product-attribute-section"
import { VENDOR_PRODUCT_DETAIL_FIELDS } from "./product-detail-fields"

export const ProductDetail = () => {
  const { id } = useParams()
  const { product, isLoading, isError, error } = useProduct(id!, {
    fields: VENDOR_PRODUCT_DETAIL_FIELDS,
  })

  const { getWidgets } = useDashboardExtension()

  const after = getWidgets("product.details.after")
  const before = getWidgets("product.details.before")
  const sideAfter = getWidgets("product.details.side.after")
  const sideBefore = getWidgets("product.details.side.before")

  if (isLoading || !product) {
    return <TwoColumnPageSkeleton mainSections={4} sidebarSections={3} />
  }

  if (isError) {
    throw error
  }

  return (
    <TwoColumnPage
      widgets={{
        after,
        before,
        sideAfter,
        sideBefore,
      }}
      data={product}
    >
      <TwoColumnPage.Main>
        <ProductGeneralSection product={product} />
        <ProductFormatsPricesSection product={product} />
        <TechnicalSheetForm product={product} />
        <ProductMediaSection product={product} />
        <ProductVariantSection product={product} />
      </TwoColumnPage.Main>
      <TwoColumnPage.Sidebar>
        <ProductOrganizationSection product={product} />
        <ProductAttributeSection product={product} />
        <ProductAdditionalAttributesSection product={product} />
      </TwoColumnPage.Sidebar>
    </TwoColumnPage>
  )
}
