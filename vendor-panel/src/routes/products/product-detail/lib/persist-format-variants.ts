import { fetchQuery } from "../../../../lib/client"
import type { ExtendedAdminProduct } from "../../../../types/products"
import {
  FORMAT_OPTION_TITLE,
  TRAMELLE_B2C_DISCOUNT_PERCENT,
  TRAMELLE_B2C_LIST_PRICE_EUROS,
  TRAMELLE_B2C_VISIBLE,
  TRAMELLE_PIECES_PER_CARTON,
  TRAMELLE_WHOLESALE_TIERS,
  type MeasureFamily,
  effectiveRetailEuros,
  eurAmountToCents,
  formatLabel,
  getFormatOption,
  skuForRow,
  variantFormatLabel,
} from "./formato-product"

type TierInput = {
  minQty: number | ""
  priceEuros: number | ""
  layerLabel?: string
  qtyUnitLabel?: string
  minOrderLabel?: string
}

type FormatInputRow = {
  amount: number | ""
  unit: string
  listPriceEuros: number | ""
  b2cDiscountPercent: number | ""
  b2cVisible: boolean
  stock: number | ""
  ean: string
  hsCode: string
  piecesPerCarton: number | ""
  wholesaleTiers: TierInput[]
  variantId?: string
}

async function refetchProduct(
  productId: string,
  fields: string
): Promise<ExtendedAdminProduct> {
  const res = await fetchQuery(`/vendor/products/${productId}`, {
    method: "GET",
    query: { fields },
  })
  return res.product as ExtendedAdminProduct
}

function inventoryItemIdFromVariant(v: {
  inventory_items?: Array<{
    inventory_item_id?: string
    inventory?: { id?: string }
  }>
}): string | undefined {
  const link = v.inventory_items?.[0]
  if (!link) return undefined
  return link.inventory_item_id ?? link.inventory?.id
}

async function ensureLocationStockedQuantity(
  inventoryItemId: string,
  locationId: string,
  quantity: number
): Promise<void> {
  const qty = Math.max(0, Math.floor(quantity))
  type LevelRow = { id?: string; location_id?: string }
  let levels: LevelRow[] = []
  try {
    const res = await fetchQuery(
      `/vendor/inventory-items/${inventoryItemId}/location-levels`,
      { method: "GET" }
    )
    const raw = res as Record<string, LevelRow[] | undefined>
    levels =
      raw.location_levels ?? raw.inventory_levels ?? ([] as LevelRow[])
  } catch {
    levels = []
  }

  const existing = levels.find((l) => l.location_id === locationId)

  if (existing?.id) {
    await fetchQuery(
      `/vendor/inventory-items/${inventoryItemId}/location-levels/${locationId}`,
      {
        method: "POST",
        body: { stocked_quantity: qty },
      }
    )
    return
  }

  await fetchQuery("/vendor/inventory-items/location-levels/batch", {
    method: "POST",
    body: {
      create: [
        {
          inventory_item_id: inventoryItemId,
          location_id: locationId,
          stocked_quantity: qty,
        },
      ],
      update: [],
      delete: [],
    },
  })
}

async function refetchVariantInventoryItemId(
  productId: string,
  variantId: string
): Promise<string | undefined> {
  try {
    const res = await fetchQuery(
      `/vendor/products/${productId}/variants/${variantId}`,
      {
        method: "GET",
        query: { fields: "*inventory_items,*inventory_items.inventory" },
      }
    )
    const v = (res as { variant?: Parameters<typeof inventoryItemIdFromVariant>[0] })
      .variant
    return v ? inventoryItemIdFromVariant(v) : undefined
  } catch {
    return undefined
  }
}

function normalizeTiers(row: FormatInputRow): {
  min_qty: number
  unit_price_euros: number
  layer_label?: string
  qty_unit_label?: string
  min_order_label?: string
}[] {
  const out: {
    min_qty: number
    unit_price_euros: number
    layer_label?: string
    qty_unit_label?: string
    min_order_label?: string
  }[] = []
  const seen = new Set<number>()
  for (const t of row.wholesaleTiers || []) {
    if (t.minQty === "" || Number.isNaN(Number(t.minQty))) continue
    if (t.priceEuros === "" || Number.isNaN(Number(t.priceEuros))) continue
    const min = Math.floor(Number(t.minQty))
    const price = Number(t.priceEuros)
    if (min < 2) {
      throw new Error("Ogni scaglione wholesale deve avere quantità minima ≥ 2 (il prezzo da 1 è il retail).")
    }
    if (price < 0) continue
    if (seen.has(min)) {
      throw new Error(`Quantità minima duplicata negli scaglioni: ${min}`)
    }
    seen.add(min)
    const layer_label = String(t.layerLabel ?? "").trim()
    const qty_unit_label = String(t.qtyUnitLabel ?? "").trim()
    const min_order_label = String(t.minOrderLabel ?? "").trim()
    out.push({
      min_qty: min,
      unit_price_euros: price,
      ...(layer_label ? { layer_label } : {}),
      ...(qty_unit_label ? { qty_unit_label } : {}),
      ...(min_order_label ? { min_order_label } : {}),
    })
  }
  out.sort((a, b) => a.min_qty - b.min_qty)
  return out
}

function variantMetaPatch(
  existing: Record<string, unknown> | null | undefined,
  pieces: number | "",
  tiers: ReturnType<typeof normalizeTiers>,
  listPrice: number,
  discountPercent: number | "",
  b2cVisible: boolean
): Record<string, unknown> {
  const base =
    existing && typeof existing === "object" ? { ...existing } : {}
  if (pieces === "" || Number.isNaN(Number(pieces)) || Number(pieces) < 1) {
    delete base[TRAMELLE_PIECES_PER_CARTON]
  } else {
    base[TRAMELLE_PIECES_PER_CARTON] = Math.floor(Number(pieces))
  }
  if (!tiers.length) {
    delete base[TRAMELLE_WHOLESALE_TIERS]
  } else {
    base[TRAMELLE_WHOLESALE_TIERS] = JSON.stringify(tiers)
  }

  base[TRAMELLE_B2C_LIST_PRICE_EUROS] = listPrice
  if (discountPercent === "" || Number(discountPercent) <= 0) {
    delete base[TRAMELLE_B2C_DISCOUNT_PERCENT]
  } else {
    base[TRAMELLE_B2C_DISCOUNT_PERCENT] = Math.min(100, Number(discountPercent))
  }
  if (b2cVisible) {
    delete base[TRAMELLE_B2C_VISIBLE]
  } else {
    base[TRAMELLE_B2C_VISIBLE] = false
  }
  return base
}

async function postVariant(
  url: string,
  body: Record<string, unknown>
): Promise<void> {
  await fetchQuery(url, { method: "POST", body })
}

/**
 * Sincronizza opzione "Formato", varianti, prezzi (EUR), metadata B2B, HS, EAN, stock.
 */
export async function persistFormatVariants(params: {
  product: ExtendedAdminProduct
  rows: FormatInputRow[]
  fields: string
  defaultCurrency: string
  stockLocationId: string | null
  measureFamily: MeasureFamily
}): Promise<void> {
  const {
    product,
    rows,
    fields,
    defaultCurrency,
    stockLocationId,
    measureFamily,
  } = params

  const validRows = rows.filter(
    (r) =>
      r.amount !== "" &&
      !Number.isNaN(Number(r.amount)) &&
      r.listPriceEuros !== "" &&
      !Number.isNaN(Number(r.listPriceEuros))
  )

  if (!validRows.length) {
    throw new Error("Aggiungi almeno un formato con quantità e prezzo.")
  }

  const productHs = String(product.hs_code ?? "").trim()
  for (const r of validRows) {
    const hs = String(r.hsCode ?? "").trim()
    if (!hs && !productHs) {
      throw new Error(
        "HS Code (dogana) obbligatorio: impostalo per ogni formato o sul prodotto."
      )
    }
  }

  const eans = validRows
    .map((r) => String(r.ean ?? "").trim())
    .filter((e) => e.length > 0)
  if (new Set(eans).size !== eans.length) {
    throw new Error("Ogni EAN deve essere univoco tra i formati di questo prodotto.")
  }

  const desiredLabels = validRows.map((r) =>
    formatLabel(r.amount as number, r.unit)
  )

  const uniq = new Set(desiredLabels)
  if (uniq.size !== desiredLabels.length) {
    throw new Error("Ogni formato deve essere univoco (es. 180 g e 500 g).")
  }

  let working = product
  const pid = product.id

  await fetchQuery(`/vendor/products/${pid}`, {
    method: "POST",
    body: {
      metadata: {
        ...(product.metadata || {}),
        tramelle_measure_family: measureFamily,
      },
    },
  })

  const opts = working.options || []
  if (opts.length > 1) {
    const hasFormato = opts.some(
      (o) => o.title?.toLowerCase() === FORMAT_OPTION_TITLE.toLowerCase()
    )
    if (!hasFormato) {
      throw new Error(
        "Questo prodotto ha più opzioni manuali. Usa solo la tabella Formati o contatta l'admin."
      )
    }
  }

  const formatOpt0 = getFormatOption(working)
  const optionTitle = formatOpt0?.title || FORMAT_OPTION_TITLE
  const formatOptionId0 = formatOpt0?.id ?? null

  const currentVariants = working.variants || []
  for (const v of currentVariants) {
    const lbl = variantFormatLabel(v, optionTitle, formatOptionId0)
    const notInTable = !lbl || !desiredLabels.includes(lbl)
    if (notInTable) {
      await fetchQuery(`/vendor/products/${pid}/variants/${v.id}`, {
        method: "DELETE",
      })
    }
  }

  working = await refetchProduct(pid, fields)

  let formatOpt = getFormatOption(working)
  const optId = formatOpt?.id

  if (optId) {
    await fetchQuery(`/vendor/products/${pid}/options/${optId}`, {
      method: "POST",
      body: { title: FORMAT_OPTION_TITLE, values: desiredLabels },
    })
  } else if ((working.options || []).length === 1) {
    const only = working.options![0]
    await fetchQuery(`/vendor/products/${pid}/options/${only.id}`, {
      method: "POST",
      body: { title: FORMAT_OPTION_TITLE, values: desiredLabels },
    })
  } else if (!(working.options || []).length) {
    await fetchQuery(`/vendor/products/${pid}/options`, {
      method: "POST",
      body: { title: FORMAT_OPTION_TITLE, values: desiredLabels },
    })
  } else {
    throw new Error("Impossibile creare l'opzione Formato automaticamente.")
  }

  working = await refetchProduct(pid, fields)
  formatOpt = getFormatOption(working)!
  const resolvedTitle = formatOpt.title || FORMAT_OPTION_TITLE
  const resolvedOptId = formatOpt.id ?? null

  const currency = (defaultCurrency || "eur").toLowerCase()

  for (let i = 0; i < validRows.length; i++) {
    const row = validRows[i]
    const label = desiredLabels[i]
    const tiers = normalizeTiers(row)
    const list = Number(row.listPriceEuros)
    const effective = effectiveRetailEuros(
      row.listPriceEuros,
      row.b2cDiscountPercent
    )
    const retailCents = eurAmountToCents(effective)
    const eanTrim = row.ean != null ? String(row.ean).trim() : ""
    /** Medusa/vendor: `ean` deve essere stringa; `null` → "Expected type: 'string' … got: 'null'". */
    const eanPayload = eanTrim
    const hsTrim =
      String(row.hsCode ?? "").trim() || productHs

    const pricesMulti = [
      {
        currency_code: currency,
        amount: retailCents,
        min_quantity: 1,
      },
      ...tiers.map((t) => ({
        currency_code: currency,
        amount: eurAmountToCents(t.unit_price_euros),
        min_quantity: t.min_qty,
      })),
    ]

    let variant = (working.variants || []).find(
      (v) => variantFormatLabel(v, resolvedTitle, resolvedOptId) === label
    )

    const existingMeta = (variant?.metadata as Record<string, unknown>) || {}
    const metadata = variantMetaPatch(
      existingMeta,
      row.piecesPerCarton,
      tiers,
      list,
      row.b2cDiscountPercent,
      row.b2cVisible
    )

    const baseBody: Record<string, unknown> = {
      title: label,
      sku: skuForRow(working.handle, label),
      ean: eanPayload,
      hs_code: hsTrim,
      manage_inventory: true,
      allow_backorder: false,
      options: { [resolvedTitle]: label },
      metadata,
    }

    const trySave = async (prices: typeof pricesMulti | { currency_code: string; amount: number }[]) => {
      await postVariant(
        variant
          ? `/vendor/products/${pid}/variants/${variant!.id}`
          : `/vendor/products/${pid}/variants`,
        { ...baseBody, prices }
      )
    }

    try {
      await trySave(pricesMulti)
    } catch (firstErr) {
      try {
        await trySave([{ currency_code: currency, amount: retailCents }])
      } catch {
        throw firstErr
      }
    }

    working = await refetchProduct(pid, fields)
    variant = (working.variants || []).find(
      (v) => variantFormatLabel(v, resolvedTitle, resolvedOptId) === label
    )
  }

  working = await refetchProduct(pid, fields)

  // Seconda passata: elimina residue non allineate alla tabella (es. DELETE falliti o dati incoerenti).
  const tailOpt = getFormatOption(working)
  const tailTitle = tailOpt?.title || FORMAT_OPTION_TITLE
  const tailOptId = tailOpt?.id ?? null
  for (const v of working.variants || []) {
    const lbl = variantFormatLabel(v, tailTitle, tailOptId)
    if (!lbl || !desiredLabels.includes(lbl)) {
      await fetchQuery(`/vendor/products/${pid}/variants/${v.id}`, {
        method: "DELETE",
      })
    }
  }
  working = await refetchProduct(pid, fields)

  if (stockLocationId) {
    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i]
      const label = desiredLabels[i]
      const variant = (working.variants || []).find(
        (v) => variantFormatLabel(v, resolvedTitle, resolvedOptId) === label
      )
      if (!variant?.id) continue

      let invId = inventoryItemIdFromVariant(variant)
      if (!invId) {
        invId = await refetchVariantInventoryItemId(pid, variant.id)
      }
      if (!invId) continue

      const qty =
        row.stock === "" || Number.isNaN(Number(row.stock))
          ? 0
          : Number(row.stock)

      await ensureLocationStockedQuantity(invId, stockLocationId, qty)
    }
  }
}
