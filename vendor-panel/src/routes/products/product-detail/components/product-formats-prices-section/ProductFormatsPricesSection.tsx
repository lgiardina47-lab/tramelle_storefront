import { Trash } from "@medusajs/icons"
import {
  Button,
  Container,
  Heading,
  Input,
  Label,
  Switch,
  Text,
  toast,
} from "@medusajs/ui"
import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { productsQueryKeys, variantsQueryKeys } from "../../../../../hooks/api/products"
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
  effectiveRetailEuros,
} from "../../lib/formato-product"
import { persistFormatVariants } from "../../lib/persist-format-variants"
import { VENDOR_PRODUCT_DETAIL_FIELDS } from "../../product-detail-fields"

type ProductFormatsPricesSectionProps = {
  product: ExtendedAdminProduct
}

/** Tabella densa: meno alPadding, input bassi. */
const denseCell = "py-1 pr-1.5 align-middle"
const denseTh =
  "text-ui-fg-muted pb-1 pr-1.5 text-left text-xs font-medium whitespace-nowrap"
const denseInputWrap = "[&_input]:h-8 [&_input]:text-xs"

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
        listPriceEuros: "",
        b2cDiscountPercent: "",
        b2cVisible: true,
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

  type TierPatch = Partial<{
    minQty: number | ""
    priceEuros: number | ""
    layerLabel: string
    qtyUnitLabel: string
    minOrderLabel: string
  }>

  const updateTierRow = (rowKey: string, tierKey: string, patch: TierPatch) => {
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
        queryKey: productsQueryKeys.all,
      })
      await queryClient.invalidateQueries({
        queryKey: variantsQueryKeys.all,
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
    <div className="flex flex-col gap-4">
      {/* Card 1: strumenti + SOLO tabella B2C (nulla B2B qui sotto) */}
      <Container className="divide-y p-0">
        <div className="flex flex-col gap-2 px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <Heading level="h2" className="text-base">
                {t("products.formats.title")}
              </Heading>
              <Text size="xsmall" className="text-ui-fg-muted">
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

          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-y-0.5">
              <Label className="text-xs">
                {t("products.formats.measureFamily")}
              </Label>
              <select
                className="bg-ui-bg-field border-ui-border-base h-8 rounded-md border px-2 text-xs"
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
            </div>
            <Text size="xsmall" className="text-ui-fg-muted max-w-md">
              {t("products.formats.measureHint", {
                type: product.type?.value || "—",
              })}
            </Text>
          </div>
        </div>

        <div className="px-6 py-3">
          <div className="mb-2 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
            <Heading level="h3" className="text-sm font-semibold">
              {t("products.formats.sectionB2c")}
            </Heading>
            <Text size="xsmall" className="text-ui-fg-muted">
              {t("products.formats.sectionB2cShort")}
            </Text>
          </div>
          <div className={`overflow-x-auto ${denseInputWrap}`}>
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead>
                <tr className="border-ui-border-base border-b">
                  <th className={denseTh}>{t("products.formats.colAmount")}</th>
                  <th className={denseTh}>{t("products.formats.colUnit")}</th>
                  <th className={denseTh}>{t("products.formats.colListPrice")}</th>
                  <th className={denseTh}>{t("products.formats.colDiscountPct")}</th>
                  <th className={denseTh}>
                    {t("products.formats.colEffectivePrice")}
                  </th>
                  <th className={denseTh}>{t("products.formats.colB2cVisible")}</th>
                  <th className={denseTh}>{t("products.formats.colStock")}</th>
                  <th className={denseTh}>{t("products.formats.colEan")}</th>
                  <th className={denseTh}>{t("products.formats.colHs")}</th>
                  <th className={denseTh}>{t("products.formats.colSku")}</th>
                  <th className="w-8 pb-1" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const label =
                    row.amount !== "" && !Number.isNaN(Number(row.amount))
                      ? formatLabel(row.amount as number, row.unit)
                      : "—"
                  const effective = effectiveRetailEuros(
                    row.listPriceEuros,
                    row.b2cDiscountPercent
                  )
                  return (
                    <tr
                      key={row.key}
                      className="border-ui-border-base border-b last:border-0"
                    >
                      <td className={denseCell}>
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
                      <td className={denseCell}>
                        <select
                          className="bg-ui-bg-field border-ui-border-base h-8 w-full rounded-md border px-1.5 text-xs"
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
                      <td className={denseCell}>
                        <div className="flex items-center gap-0.5">
                          <span className="text-ui-fg-muted shrink-0 text-xs">
                            €
                          </span>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={
                              row.listPriceEuros === ""
                                ? ""
                                : row.listPriceEuros
                            }
                            onChange={(e) => {
                              const v = e.target.value
                              updateRow(row.key, {
                                listPriceEuros:
                                  v === "" ? "" : parseFloat(v),
                              })
                            }}
                          />
                        </div>
                      </td>
                      <td className={`${denseCell} w-14`}>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step="0.1"
                          placeholder="—"
                          value={
                            row.b2cDiscountPercent === ""
                              ? ""
                              : row.b2cDiscountPercent
                          }
                          onChange={(e) => {
                            const v = e.target.value
                            updateRow(row.key, {
                              b2cDiscountPercent:
                                v === "" ? "" : parseFloat(v),
                            })
                          }}
                        />
                      </td>
                      <td className={`${denseCell} text-ui-fg-muted whitespace-nowrap`}>
                        {row.listPriceEuros !== "" &&
                        !Number.isNaN(Number(row.listPriceEuros))
                          ? `€ ${effective.toFixed(2)}`
                          : "—"}
                      </td>
                      <td className={denseCell}>
                        <Switch
                          checked={row.b2cVisible}
                          onCheckedChange={(v) =>
                            updateRow(row.key, { b2cVisible: v })
                          }
                          title={
                            row.b2cVisible
                              ? t("products.formats.visibleOn")
                              : t("products.formats.visibleOff")
                          }
                        />
                      </td>
                      <td className={denseCell}>
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
                      <td className={`${denseCell} min-w-[6.5rem]`}>
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
                      <td className={denseCell}>
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
                      <td
                        className={`${denseCell} font-mono text-ui-fg-muted max-w-[7rem] truncate`}
                        title={
                          label !== "—"
                            ? skuForRow(product.handle, label)
                            : ""
                        }
                      >
                        {label !== "—"
                          ? skuForRow(product.handle, label)
                          : "—"}
                      </td>
                      <td className={`${denseCell} w-8 p-0`}>
                        <Button
                          type="button"
                          variant="transparent"
                          size="small"
                          className="px-1"
                          disabled={rows.length <= 1}
                          onClick={() => removeRow(row.key)}
                          title={t("actions.delete")}
                        >
                          <Trash className="text-ui-fg-subtle" />
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </Container>

      {/* Card 2: SOLO tabella B2B — blocco separato sotto, non annidato nella B2C */}
      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
            <Heading level="h3" className="text-sm font-semibold">
              {t("products.formats.sectionB2b")}
            </Heading>
            <Text size="xsmall" className="text-ui-fg-muted">
              {t("products.formats.sectionB2bShort")}
            </Text>
          </div>
        </div>

        <div className={`px-6 py-3 ${denseInputWrap}`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead>
                <tr className="border-ui-border-base border-b">
                  <th className={denseTh}>
                    {t("products.formats.b2bVariantLabel")}
                  </th>
                  <th className={denseTh}>{t("products.formats.colPieces")}</th>
                  <th className={denseTh}>{t("products.formats.colLayerLabel")}</th>
                  <th className={denseTh}>{t("products.formats.colQtyUnit")}</th>
                  <th className={denseTh}>{t("products.formats.colTierMin")}</th>
                  <th className={denseTh}>{t("products.formats.colTierPrice")}</th>
                  <th className={denseTh}>
                    {t("products.formats.colMinOrderLabel")}
                  </th>
                  <th className="w-8 pb-1" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const label =
                    row.amount !== "" && !Number.isNaN(Number(row.amount))
                      ? formatLabel(row.amount as number, row.unit)
                      : "—"
                  const tiers = row.wholesaleTiers

                  if (tiers.length === 0) {
                    return (
                      <tr
                        key={`${row.key}-b2b`}
                        className="border-ui-border-base border-b last:border-0"
                      >
                        <td className={`${denseCell} font-medium`}>{label}</td>
                        <td className={denseCell}>
                          <Input
                            type="number"
                            min={0}
                            step={1}
                            placeholder="—"
                            className="max-w-[5rem]"
                            value={
                              row.piecesPerCarton === ""
                                ? ""
                                : row.piecesPerCarton
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
                        <td
                          className={`${denseCell} text-ui-fg-muted`}
                          colSpan={5}
                        >
                          —
                        </td>
                        <td className={`${denseCell} w-8`}>
                          <Button
                            type="button"
                            variant="secondary"
                            size="small"
                            className="h-8"
                            onClick={() => addTierRow(row.key)}
                          >
                            {t("products.formats.addTier")}
                          </Button>
                        </td>
                      </tr>
                    )
                  }

                  return tiers.map((tier, tierIdx) => (
                    <tr
                      key={tier.key}
                      className="border-ui-border-base border-b last:border-0"
                    >
                      {tierIdx === 0 ? (
                        <td
                          className={`${denseCell} align-top font-medium`}
                          rowSpan={tiers.length}
                        >
                          {label}
                        </td>
                      ) : null}
                      {tierIdx === 0 ? (
                        <td
                          className={`${denseCell} align-top`}
                          rowSpan={tiers.length}
                        >
                          <Input
                            type="number"
                            min={0}
                            step={1}
                            placeholder="—"
                            className="max-w-[5rem]"
                            value={
                              row.piecesPerCarton === ""
                                ? ""
                                : row.piecesPerCarton
                            }
                            onChange={(e) => {
                              const v = e.target.value
                              updateRow(row.key, {
                                piecesPerCarton:
                                  v === "" ? "" : parseInt(v, 10),
                              })
                            }}
                          />
                          <Button
                            type="button"
                            variant="secondary"
                            size="small"
                            className="mt-1 h-7 w-full px-1 text-[10px]"
                            onClick={() => addTierRow(row.key)}
                          >
                            {t("products.formats.addTier")}
                          </Button>
                        </td>
                      ) : null}
                      <td className={denseCell}>
                        <Input
                          type="text"
                          placeholder={t(
                            "products.formats.layerPlaceholder"
                          )}
                          value={tier.layerLabel}
                          onChange={(e) =>
                            updateTierRow(row.key, tier.key, {
                              layerLabel: e.target.value,
                            })
                          }
                        />
                      </td>
                      <td className={denseCell}>
                        <Input
                          type="text"
                          placeholder={t(
                            "products.formats.qtyUnitPlaceholder"
                          )}
                          value={tier.qtyUnitLabel}
                          onChange={(e) =>
                            updateTierRow(row.key, tier.key, {
                              qtyUnitLabel: e.target.value,
                            })
                          }
                        />
                      </td>
                      <td className={`${denseCell} w-16`}>
                        <Input
                          type="number"
                          min={2}
                          step={1}
                          value={tier.minQty === "" ? "" : tier.minQty}
                          onChange={(e) => {
                            const v = e.target.value
                            updateTierRow(row.key, tier.key, {
                              minQty: v === "" ? "" : parseInt(v, 10),
                            })
                          }}
                        />
                      </td>
                      <td className={denseCell}>
                        <div className="flex items-center gap-0.5">
                          <span className="text-ui-fg-muted shrink-0 text-xs">
                            €
                          </span>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={
                              tier.priceEuros === "" ? "" : tier.priceEuros
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
                      <td className={denseCell}>
                        <Input
                          type="text"
                          placeholder={t(
                            "products.formats.minOrderPlaceholder"
                          )}
                          value={tier.minOrderLabel}
                          onChange={(e) =>
                            updateTierRow(row.key, tier.key, {
                              minOrderLabel: e.target.value,
                            })
                          }
                        />
                      </td>
                      <td className={`${denseCell} w-8 p-0`}>
                        <Button
                          type="button"
                          variant="transparent"
                          size="small"
                          className="px-1"
                          onClick={() => removeTierRow(row.key, tier.key)}
                          title={t("actions.delete")}
                        >
                          <Trash className="text-ui-fg-subtle" />
                        </Button>
                      </td>
                    </tr>
                  ))
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end px-6 py-4">
          <Button type="button" onClick={handleSave} isLoading={saving}>
            {t("products.formats.save")}
          </Button>
        </div>
      </Container>
    </div>
  )
}
