import { useTranslation } from "react-i18next"

import { StatusCell } from "../../common/status-cell"
import { HttpTypes } from "@medusajs/types"

type ProductStatusCellProps = {
  status: HttpTypes.AdminProductStatus
  "data-testid"?: string
}

export const ProductStatusCell = ({ status, "data-testid": dataTestId }: ProductStatusCellProps) => {
  const { t } = useTranslation()

  if (!status) {
    return null
  }

  const map: Partial<
    Record<
      HttpTypes.AdminProductStatus,
      ["grey" | "orange" | "green" | "red", string]
    >
  > = {
    draft: ["grey", t("products.productStatus.draft")],
    proposed: ["orange", t("products.productStatus.proposed")],
    published: ["green", t("products.productStatus.published")],
    rejected: ["red", t("products.productStatus.rejected")],
  }

  const entry = map[status]
  if (!entry) {
    return (
      <StatusCell color="grey" data-testid={dataTestId}>
        {String(status)}
      </StatusCell>
    )
  }

  const [color, text] = entry
  return (
    <StatusCell color={color} data-testid={dataTestId}>
      {text}
    </StatusCell>
  )
}

export const ProductStatusHeader = () => {
  const { t } = useTranslation()

  return (
    <div className="flex h-full w-full items-center" data-testid="products-table-header-status">
      <span data-testid="products-table-header-status-text">{t("fields.status")}</span>
    </div>
  )
}
