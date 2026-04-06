import { PencilSquare } from "@medusajs/icons"
import { ExtendedAdminProduct } from "../../../../../types/products"
import { Container, Heading } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { ActionMenu } from "../../../../../components/common/action-menu"
import { SectionRow } from "../../../../../components/common/section"
import { useDashboardExtension } from "../../../../../extensions"
import { getFormattedCountry } from "../../../../../lib/addresses"

type ProductAttributeSectionProps = {
  product: ExtendedAdminProduct
}

function formatDimWithUnit(
  value: string | number | null | undefined,
  unit: string
): string | undefined {
  if (value === null || value === undefined || value === "") {
    return undefined
  }
  return `${value} ${unit}`
}

export const ProductAttributeSection = ({
  product,
}: ProductAttributeSectionProps) => {
  const { t } = useTranslation()
  const { getDisplays } = useDashboardExtension()

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">{t("products.attributes")}</Heading>
        <ActionMenu
          groups={[
            {
              actions: [
                {
                  label: t("actions.edit"),
                  to: "attributes",
                  icon: <PencilSquare />,
                },
              ],
            },
          ]}
        />
      </div>
      <SectionRow
        title={t("fields.height")}
        value={formatDimWithUnit(product.height, t("fields.dimensionUnitCm"))}
      />
      <SectionRow
        title={t("fields.width")}
        value={formatDimWithUnit(product.width, t("fields.dimensionUnitCm"))}
      />
      <SectionRow
        title={t("fields.length")}
        value={formatDimWithUnit(product.length, t("fields.dimensionUnitCm"))}
      />
      <SectionRow
        title={t("fields.weight")}
        value={formatDimWithUnit(product.weight, t("fields.weightUnitG"))}
      />
      <SectionRow title={t("fields.midCode")} value={product.mid_code} />
      <SectionRow title={t("fields.hsCode")} value={product.hs_code} />
      <SectionRow
        title={t("fields.countryOfOrigin")}
        value={getFormattedCountry(product.origin_country)}
      />
      {getDisplays("product", "attributes").map((Component, i) => {
        return <Component key={i} data={product} />
      })}
    </Container>
  )
}
