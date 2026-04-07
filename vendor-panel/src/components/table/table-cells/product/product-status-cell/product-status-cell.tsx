import { useTranslation } from "react-i18next"

import { StatusCell } from "../../common/status-cell"
import { HttpTypes } from "@medusajs/types"

type ProductStatusCellProps = {
  status: HttpTypes.AdminProductStatus
}

export const ProductStatusCell = ({ status }: ProductStatusCellProps) => {
  const { t } = useTranslation()

  if (!status) return null

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
    return <StatusCell color="grey">{String(status)}</StatusCell>
  }

  const [color, text] = entry
  return <StatusCell color={color}>{text}</StatusCell>
}

export const ProductStatusHeader = () => {
  const { t } = useTranslation()

  return (
    <div className="flex h-full w-full items-center">
      <span>{t("fields.status")}</span>
    </div>
  )
}
