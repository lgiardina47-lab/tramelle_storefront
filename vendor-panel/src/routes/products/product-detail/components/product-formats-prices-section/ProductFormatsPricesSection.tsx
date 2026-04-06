import { Trash } from "@medusajs/icons"
import { Button, Container, Heading, Input, Label, Text, toast } from "@medusajs/ui"
import { Fragment, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { productsQueryKeys } from "../../../../../hooks/api/products"
import { useStockLocations } from "../../../../../hooks/api/stock-locations"
import { useStore } from "../../../../../hooks/api/store"
import { queryClient } from "../../../../../lib/query-client"
import type { ExtendedAdminProduct } from "../../../../../types/products"
import {
  type FormatRow,
  type MeasureFamily,
  FORMAT_OPTION_TITLE,
  formatLabel,
  inferMeasureFamilyFromProductType,
  rowsFromProduct,
  skuForRow,
  unitsForFamily,
  emptyWholesaleTier,
} from "../../lib/formato-product"
import { persistFormatVariants } from "../../lib/persist-format-variants"
import { VENDOR_PRODUCT_DETAIL_FIELDS } from "../../product-detail-fields"

type ProductFormatsPricesSectionProps = {
  product: ExtendedAdminProduct
}

export function ProductFormatsPricesSection({
  product,
}: ProductFormatsPricesSectionProps) {
  const { t } = useTranslation()
  const { store } = useStore()
  const { stock_locations } = useStockLocations({ limit: 100 })

  const defaultCurrency = useMemo(() => {
    const c = store?.supported_currencies?.[0]?.currency_code
    return (c || "eur").toLowerCase()
  }, [store])

  const defaultStockLocationId = stock_locations?.[0]?.id ?? null

  const inferredFamily = useMemo(() => {
    const fromMeta = product.metadata?.tramelle_measure_family as
      | MeasureFamily
      | undefined
    if (fromMeta === "mass" || fromMeta === "volume") return fromMeta
    return inferMeasureFamilyFromProductType(product.type?.value)
  }, [product.metadata, product.type?.value])

  const [measureFamily, setMeasureFamily] =
    useState<MeasureFamily>(inferredFamily)
  const [rows, setRows] = useState<FormatRow[]>(() =>
    rowsFromProduct(product, inferredFamily)
  )
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setMeasureFamily(inferredFamily)
    setRows(rowsFromProduct(product, inferredFamily))
  }, [product, inferredFamily])

  const unitChoices = unitsForFamily(measureFamily)

  const addRow = () => {
    const phs =
      product.hs_code != null && String(product.hs_code).trim() !== ""
        ? String(product.hs_code).trim()
        : ""
    setRows((prev) => [
      ...prev,
      {
        key: `new-${crypto.randomUUID?.() ?? String(Date.now())}`,
        amount: "",
        unit: unitChoices[0],
        priceEuros: "",
        stock: "",
        ean: "",
        hsCode: phs,
        piecesPerCarton: "",
        wholesaleTiers: [],
      },
    ])
  }

  const removeRow = (key: string) => {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.key !== key)))
  }

  const updateRow = (key: string, patch: Partial<FormatRow>) => {
    setRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, ...patch } : r))
    )
  }

  const addTierRow = (rowKey: string) => {
    setRows((prev) =>
      prev.map((r) =>
        r.key === rowKey
          ? { ...r, wholesaleTiers: [...r.wholesaleTiers, emptyWholesaleTier()] }
          : r
      )
    )
  }

  const removeTierRow = (rowKey: string, tierKey: string) => {
    setRows((prev) =>
      prev.map((r) =>
        r.key === rowKey
          ? {
              ...r,
              wholesaleTiers: r.wholesaleTiers.filter((x) => x.key !== tierKey),
            }
          : r
      )
    )
  }

  const updateTierRow = (
    rowKey: string,
    tierKey: string,
    patch: Partial<{ minQty: number | ""; priceEuros: number | "" }>
  ) => {
    setRows((prev) =>
      prev.map((r) =>
        r.key === rowKey
          ? {
              ...r,
              wholesaleTiers: r.wholesaleTiers.map((x) =>
                x.key === tierKey ? { ...x, ...patch } : x
              ),
            }
          : r
      )
    )
  }

  const onFamilyChange = (f: MeasureFamily) => {
    setMeasureFamily(f)
    const allowed = unitsForFamily(f)
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        unit: allowed.includes(r.unit as (typeof allowed)[number])
          ? r.unit
          : allowed[0],
      }))
    )
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await persistFormatVariants({
        product,
        rows,
        fields: VENDOR_PRODUCT_DETAIL_FIELDS,
        defaultCurrency,
        stockLocationId: defaultStockLocationId,
        measureFamily,
      })
      await queryClient.invalidateQueries({
        queryKey: productsQueryKeys.detail(product.id, {
          fields: VENDOR_PRODUCT_DETAIL_FIELDS,
        }),
      })
      toast.success(t("products.formats.saveSuccess"))
    } catch (e: any) {
      toast.error(e?.message || t("products.formats.saveError"))
    } finally {
      setSaving(false)
    }
  }

  const tooManyOptions =
    (product.options?.length ?? 0) > 1 &&
    !product.options?.some(
      (o) => o.title?.toLowerCase() === FORMAT_OPTION_TITLE.toLowerCase()
    )

  if (tooManyOptions) {
    return (
      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <Text className="text-ui-fg-muted">
            {t("products.formats.multiOptionBlocked")}
          </Text>
        </div>
      </Container>
    )
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex flex-col gap-3 px-6 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Heading level="h2">{t("products.formats.title")}</Heading>
            <Text size="small" className="text-ui-fg-muted mt-1">
              {t("products.formats.subtitle")}
            </Text>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="small"
            onClick={addRow}
          >
            {t("products.formats.addRow")}
          </Button>
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-y-1">
            <Label>{t("products.formats.measureFamily")}</Label>
            <select
              className="bg-ui-bg-field border-ui-border-base txt-compact-small rounded-md border px-2 py-1.5"
              value={measureFamily}
              onChange={(e) =>
                onFamilyChange(e.target.value as MeasureFamily)
              }
            >
              <option value="mass">{t("products.formats.familyMass")}</option>
              <option value="volume">
                {t("products.formats.familyVolume")}
              </option>
            </select>
            <Text size="xsmall" className="text-ui-fg-muted">
              {t("products.formats.measureHint", {
                type: product.type?.value || "—",
              })}
            </Text>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto px-6 py-4">
        <table className="w-full min-w-[1180px] text-left text-sm">
          <thead>
            <tr className="text-ui-fg-muted border-b border-ui-border-base">
              <th className="pb-2 pr-2 font-medium">
                {t("products.formats.colAmount")}
              </th>
              <th className="pb-2 pr-2 font-medium">
                {t("products.formats.colUnit")}
              </th>
              <th className="pb-2 pr-2 font-medium">
                {t("products.formats.colPrice")}
              </th>
              <th className="pb-2 pr-2 font-medium">
                {t("products.formats.colStock")}
              </th>
              <th className="pb-2 pr-2 font-medium">
                {t("products.formats.colEan")}
              </th>
              <th className="pb-2 pr-2 font-medium min-w-[100px]">
                {t("products.formats.colHs")}
              </th>
              <th className="pb-2 pr-2 font-medium w-24">
                {t("products.formats.colPieces")}
              </th>
              <th className="pb-2 pr-2 font-medium">
                {t("products.formats.colSku")}
              </th>
              <th className="pb-2 w-12" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const label =
                row.amount !== "" && !Number.isNaN(Number(row.amount))
                  ? formatLabel(row.amount as number, row.unit)
                  : "—"
              return (
                <Fragment key={row.key}>
                  <tr className="border-b border-ui-border-base">
                    <td className="py-2 pr-2 align-middle">
                      <Input
                        type="number"
                        min={0}
                        step="any"
                        value={row.amount === "" ? "" : row.amount}
                        onChange={(e) => {
                          const v = e.target.value
                          updateRow(row.key, {
                            amount: v === "" ? "" : parseFloat(v),
                          })
                        }}
                      />
                    </td>
                    <td className="py-2 pr-2 align-middle">
                      <select
                        className="bg-ui-bg-field border-ui-border-base txt-compact-small w-full rounded-md border px-2 py-1.5"
                        value={row.unit}
                        onChange={(e) =>
                          updateRow(row.key, {
                            unit: e.target.value as FormatRow["unit"],
                          })
                        }
                      >
                        {unitChoices.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 pr-2 align-middle">
                      <div className="flex items-center gap-1">
                        <span className="text-ui-fg-muted shrink-0">€</span>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={row.priceEuros === "" ? "" : row.priceEuros}
                          onChange={(e) => {
                            const v = e.target.value
                            updateRow(row.key, {
                              priceEuros: v === "" ? "" : parseFloat(v),
                            })
                          }}
                        />
                      </div>
                    </td>
                    <td className="py-2 pr-2 align-middle">
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        placeholder={
                          defaultStockLocationId
                            ? undefined
                            : t("products.formats.stockNoLocation")
                        }
                        value={row.stock === "" ? "" : row.stock}
                        onChange={(e) => {
                          const v = e.target.value
                          updateRow(row.key, {
                            stock: v === "" ? "" : parseInt(v, 10),
                          })
                        }}
                      />
                    </td>
                    <td className="py-2 pr-2 align-middle min-w-[140px]">
                      <Input
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        placeholder={t("products.formats.eanPlaceholder")}
                        value={row.ean}
                        onChange={(e) =>
                          updateRow(row.key, {
                            ean: e.target.value.replace(/\s+/g, ""),
                          })
                        }
                      />
                    </td>
                    <td className="py-2 pr-2 align-middle">
                      <Input
                        type="text"
                        autoComplete="off"
                        placeholder={t("products.formats.hsPlaceholder")}
                        value={row.hsCode}
                        onChange={(e) =>
                          updateRow(row.key, { hsCode: e.target.value })
                        }
                      />
                    </td>
                    <td className="py-2 pr-2 align-middle">
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        placeholder="—"
                        value={
                          row.piecesPerCarton === "" ? "" : row.piecesPerCarton
                        }
                        onChange={(e) => {
                          const v = e.target.value
                          updateRow(row.key, {
                            piecesPerCarton:
                              v === "" ? "" : parseInt(v, 10),
                          })
                        }}
                      />
                    </td>
                    <td className="py-2 pr-2 align-middle">
                      <Text size="small" className="font-mono text-ui-fg-muted">
                        {label !== "—"
                          ? skuForRow(product.handle, label)
                          : "—"}
                      </Text>
                    </td>
                    <td className="py-2 align-middle">
                      <Button
                        type="button"
                        variant="transparent"
                        size="small"
                        className="px-1"
                        disabled={rows.length <= 1}
                        onClick={() => removeRow(row.key)}
                        title={t("actions.delete")}
                      >
                        <Trash className="text-ui-fg-muted" />
                      </Button>
                    </td>
                  </tr>
                  <tr className="border-b border-ui-border-base last:border-0">
                    <td colSpan={9} className="bg-ui-bg-subtle-hover py-3 pr-2 pl-2">
                      <div className="rounded-md border border-ui-border-base bg-ui-bg-base p-3">
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                          <Text size="small" className="font-medium">
                            {t("products.formats.tiersSection")}
                          </Text>
                          <Button
                            type="button"
                            variant="secondary"
                            size="small"
                            onClick={() => addTierRow(row.key)}
                          >
                            {t("products.formats.addTier")}
                          </Button>
                        </div>
                        <Text size="xsmall" className="text-ui-fg-muted mb-2">
                          {t("products.formats.tierHint")}
                        </Text>
                        {row.wholesaleTiers.length === 0 ? (
                          <Text size="small" className="text-ui-fg-muted">
                            —
                          </Text>
                        ) : (
                          <table className="w-full max-w-lg text-left text-sm">
                            <thead>
                              <tr className="text-ui-fg-muted border-b border-ui-border-base">
                                <th className="pb-1 pr-2 font-medium">
                                  {t("products.formats.colTierMin")}
                                </th>
                                <th className="pb-1 pr-2 font-medium">
                                  {t("products.formats.colTierPrice")}
                                </th>
                                <th className="pb-1 w-10" />
                              </tr>
                            </thead>
                            <tbody>
                              {row.wholesaleTiers.map((tier) => (
                                <tr key={tier.key}>
                                  <td className="py-1 pr-2 align-middle">
                                    <Input
                                      type="number"
                                      min={2}
                                      step={1}
                                      value={
                                        tier.minQty === "" ? "" : tier.minQty
                                      }
                                      onChange={(e) => {
                                        const v = e.target.value
                                        updateTierRow(row.key, tier.key, {
                                          minQty:
                                            v === "" ? "" : parseInt(v, 10),
                                        })
                                      }}
                                    />
                                  </td>
                                  <td className="py-1 pr-2 align-middle">
                                    <div className="flex items-center gap-1">
                                      <span className="text-ui-fg-muted shrink-0">
                                        €
                                      </span>
                                      <Input
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        value={
                                          tier.priceEuros === ""
                                            ? ""
                                            : tier.priceEuros
                                        }
                                        onChange={(e) => {
                                          const v = e.target.value
                                          updateTierRow(row.key, tier.key, {
                                            priceEuros:
                                              v === "" ? "" : parseFloat(v),
                                          })
                                        }}
                                      />
                                    </div>
                                  </td>
                                  <td className="py-1 align-middle">
                                    <Button
                                      type="button"
                                      variant="transparent"
                                      size="small"
                                      className="px-1"
                                      onClick={() =>
                                        removeTierRow(row.key, tier.key)
                                      }
                                      title={t("actions.delete")}
                                    >
                                      <Trash className="text-ui-fg-muted" />
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </td>
                  </tr>
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end px-6 py-4">
        <Button type="button" onClick={handleSave} isLoading={saving}>
          {t("products.formats.save")}
        </Button>
      </div>
    </Container>
  )
}
