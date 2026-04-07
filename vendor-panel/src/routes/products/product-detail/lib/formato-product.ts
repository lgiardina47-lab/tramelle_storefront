import type { ExtendedAdminProduct } from "../../../../types/products"
import type { ExtendedAdminProductVariant } from "../../../../types/products"

/** Option title used for pack-size variants (must match storefront URL param key `formato`). */
export const FORMAT_OPTION_TITLE = "Formato"

/** Variant metadata keys (storefront + vendor). */
export const TRAMELLE_PIECES_PER_CARTON = "tramelle_pieces_per_carton"
export const TRAMELLE_WHOLESALE_TIERS = "tramelle_wholesale_tiers"
export const TRAMELLE_B2C_DISCOUNT_PERCENT = "tramelle_b2c_discount_percent"
export const TRAMELLE_B2C_LIST_PRICE_EUROS = "tramelle_b2c_list_price_euros"
export const TRAMELLE_B2C_VISIBLE = "tramelle_b2c_visible"

export type MeasureFamily = "mass" | "volume"

export const MASS_UNITS = ["g", "kg"] as const
export const VOLUME_UNITS = ["ml", "L"] as const

export type MassUnit = (typeof MASS_UNITS)[number]
export type VolumeUnit = (typeof VOLUME_UNITS)[number]
export type FormatUnit = MassUnit | VolumeUnit

export type WholesaleTierRow = {
  key: string
  minQty: number | ""
  priceEuros: number | ""
  /** Etichetta B2B es. Singolo / Cartone (solo UI + metadata, opzionale) */
  layerLabel: string
  /** Es. "12 pz" (opzionale, testo libero) */
  qtyUnitLabel: string
  /** Es. "1 cartone" (opzionale) */
  minOrderLabel: string
}

export type FormatRow = {
  /** Stable id for React lists (variant id when known) */
  key: string
  amount: number | ""
  unit: FormatUnit
  /** Prezzo di listino B2C (€). Il prezzo salvato su Medusa è l'effettivo dopo eventuale sconto %. */
  listPriceEuros: number | ""
  /** Sconto % opzionale sul listino (persistito in metadata + prezzo effettivo). */
  b2cDiscountPercent: number | ""
  /** false = nascosto in vetrina B2C (wholesale continua a vedere la variante). */
  b2cVisible: boolean
  stock: number | ""
  /** Codice a barre EAN-13 / EAN-8 (variante) */
  ean: string
  /** HS / dogana (variante) */
  hsCode: string
  /** Pezzi per cartone (B2B); vuoto = nessun vincolo multiplo */
  piecesPerCarton: number | ""
  /** Scaglioni wholesale aggiuntivi (min qty >= 2 consigliato) */
  wholesaleTiers: WholesaleTierRow[]
  variantId?: string
}

const LABEL_RE = /^([\d.,]+)\s*(g|kg|ml|L)$/i

export type ParsedWholesaleTier = {
  min_qty: number
  unit_price_euros: number
  layer_label?: string
  qty_unit_label?: string
  min_order_label?: string
}

export function parseWholesaleTiersFromMetadata(
  meta: Record<string, unknown> | null | undefined
): ParsedWholesaleTier[] {
  if (!meta || typeof meta !== "object") return []
  const raw = meta[TRAMELLE_WHOLESALE_TIERS]
  if (raw == null) return []
  let arr: unknown
  if (typeof raw === "string") {
    try {
      arr = JSON.parse(raw)
    } catch {
      return []
    }
  } else {
    arr = raw
  }
  if (!Array.isArray(arr)) return []
  const out: ParsedWholesaleTier[] = []
  for (const x of arr) {
    if (!x || typeof x !== "object") continue
    const o = x as Record<string, unknown>
    const min = Number(o.min_qty ?? o.minQty)
    const price = Number(o.unit_price_euros ?? o.unitPriceEuros ?? o.price_euros)
    if (!Number.isFinite(min) || min < 1 || !Number.isFinite(price) || price < 0) continue
    const layer_label =
      typeof o.layer_label === "string"
        ? o.layer_label
        : typeof o.layerLabel === "string"
          ? o.layerLabel
          : undefined
    const qty_unit_label =
      typeof o.qty_unit_label === "string"
        ? o.qty_unit_label
        : typeof o.qtyUnitLabel === "string"
          ? o.qtyUnitLabel
          : undefined
    const min_order_label =
      typeof o.min_order_label === "string"
        ? o.min_order_label
        : typeof o.minOrderLabel === "string"
          ? o.minOrderLabel
          : undefined
    out.push({
      min_qty: Math.floor(min),
      unit_price_euros: price,
      layer_label,
      qty_unit_label,
      min_order_label,
    })
  }
  return out.sort((a, b) => a.min_qty - b.min_qty)
}

export function wholesaleTierRowsFromVariant(
  variant: ExtendedAdminProductVariant | undefined
): WholesaleTierRow[] {
  const parsed = parseWholesaleTiersFromMetadata(
    (variant?.metadata as Record<string, unknown>) || undefined
  )
  return parsed
    .filter((t) => t.min_qty >= 2)
    .map((t, idx) => ({
      key: `tier-${t.min_qty}-${idx}`,
      minQty: t.min_qty,
      priceEuros: t.unit_price_euros,
      layerLabel: t.layer_label ?? "",
      qtyUnitLabel: t.qty_unit_label ?? "",
      minOrderLabel: t.min_order_label ?? "",
    }))
}

/** Prezzo retail effettivo (€) salvato su Medusa a partire da listino e sconto %. */
export function effectiveRetailEuros(
  list: number | "",
  discount: number | ""
): number {
  if (list === "" || Number.isNaN(Number(list))) return 0
  const L = Number(list)
  if (
    discount === "" ||
    Number.isNaN(Number(discount)) ||
    Number(discount) <= 0
  ) {
    return L
  }
  const d = Math.min(100, Math.max(0, Number(discount)))
  return Math.round(L * (1 - d / 100) * 100) / 100
}

function b2cDiscountFromMetadata(meta: Record<string, unknown>): number | "" {
  const raw = meta[TRAMELLE_B2C_DISCOUNT_PERCENT]
  if (raw == null || raw === "") return ""
  const n = Number(raw)
  if (!Number.isFinite(n) || n <= 0) return ""
  return Math.min(100, n)
}

function b2cListFromMetadata(
  meta: Record<string, unknown>,
  effectivePrice: number
): number | "" {
  const raw = meta[TRAMELLE_B2C_LIST_PRICE_EUROS]
  if (raw != null && raw !== "") {
    const n = Number(raw)
    if (Number.isFinite(n) && n > 0) return n
  }
  const d = b2cDiscountFromMetadata(meta)
  if (d !== "" && effectivePrice > 0) {
    const inferred = effectivePrice / (1 - Number(d) / 100)
    if (Number.isFinite(inferred) && inferred > 0) {
      return Math.round(inferred * 100) / 100
    }
  }
  return effectivePrice > 0 ? effectivePrice : ""
}

function b2cVisibleFromMetadata(meta: Record<string, unknown>): boolean {
  const v = meta[TRAMELLE_B2C_VISIBLE]
  if (v === false || v === "false") return false
  return true
}

export function formatLabel(amount: number | "", unit: string): string {
  if (amount === "" || amount === null || Number.isNaN(Number(amount))) {
    return ""
  }
  const n = Number(amount)
  const s = Number.isInteger(n) ? String(n) : String(n).replace(/\.?0+$/, "")
  return `${s} ${unit}`.trim()
}

export function parseFormatLabel(label: string | null | undefined): {
  amount: number
  unit: FormatUnit
} | null {
  if (!label?.trim()) return null
  const m = label.trim().match(LABEL_RE)
  if (!m) return null
  const amount = parseFloat(m[1].replace(",", "."))
  const u = m[2].toLowerCase() === "l" ? "L" : m[2].toLowerCase()
  if (["g", "kg", "ml"].includes(u) || u === "L") {
    return { amount, unit: u as FormatUnit }
  }
  return null
}

export function inferMeasureFamilyFromProductType(
  typeValue: string | null | undefined
): MeasureFamily {
  if (!typeValue) return "mass"
  const v = typeValue.toLowerCase()
  if (
    /\b(vino|birra|olio|liquido|bevanda|succo|acqua|sciroppo|ml)\b/.test(v)
  ) {
    return "volume"
  }
  return "mass"
}

export function unitsForFamily(family: MeasureFamily): readonly FormatUnit[] {
  return family === "volume" ? VOLUME_UNITS : MASS_UNITS
}

export function getFormatOption(product: ExtendedAdminProduct) {
  const opts = product.options || []
  const byName = opts.find(
    (o) => o.title?.toLowerCase() === FORMAT_OPTION_TITLE.toLowerCase()
  )
  if (byName) return byName
  if (opts.length === 1) return opts[0]
  return null
}

/**
 * Valore dell'opzione "Formato" per questa variante.
 * Non usare il "primo valore a caso" dell'array options: crea etichette fantasma e
 * impedisce di eliminare varianti orfane (es. titolo "180gr" senza legame a Formato).
 */
export function variantFormatLabel(
  variant: ExtendedAdminProductVariant,
  optionTitle: string,
  formatOptionId?: string | null
): string | null {
  const raw = variant.options as unknown
  if (Array.isArray(raw)) {
    const arr = raw as {
      value?: string
      option?: { title?: string; id?: string }
      option_id?: string
    }[]
    const titleLower = optionTitle.toLowerCase()
    const formatTitleLower = FORMAT_OPTION_TITLE.toLowerCase()
    const match = arr.find((o) => {
      const t = o.option?.title?.toLowerCase()
      if (t === titleLower || t === formatTitleLower) return true
      if (formatOptionId) {
        if (o.option_id === formatOptionId) return true
        if (o.option?.id === formatOptionId) return true
      }
      return false
    })
    return match?.value ?? null
  }
  if (raw && typeof raw === "object") {
    const rec = raw as Record<string, string>
    return rec[optionTitle] || rec[FORMAT_OPTION_TITLE] || null
  }
  return null
}

export function eurAmountToCents(euros: number | ""): number {
  if (euros === "" || euros === null || Number.isNaN(Number(euros))) return 0
  return Math.round(Number(euros) * 100)
}

export function centsToEuros(cents: number | null | undefined): number {
  if (cents == null || Number.isNaN(cents)) return 0
  return cents / 100
}

type PriceRow = { currency_code?: string | null; amount?: number | null; min_quantity?: number | null }

/** Prezzo retail (EUR): prezzo con min_quantity più bassa, tipicamente 1. */
export function variantPriceEur(variant: ExtendedAdminProductVariant): number {
  const prices = (variant.prices || []) as PriceRow[]
  const eurPrices = prices.filter(
    (p) => (p.currency_code || "").toLowerCase() === "eur"
  )
  const list = eurPrices.length ? eurPrices : prices
  if (!list.length) return 0
  let best = list[0]
  let bestMin = Number(best.min_quantity ?? 1) || 1
  for (const p of list.slice(1)) {
    const m = Number(p.min_quantity ?? 1) || 1
    if (m < bestMin) {
      bestMin = m
      best = p
    }
  }
  return centsToEuros(Number(best.amount))
}

export function productHsCode(product: ExtendedAdminProduct): string {
  const h = product.hs_code
  return h != null && String(h).trim() !== "" ? String(h).trim() : ""
}

export function variantHsCode(variant: ExtendedAdminProductVariant | undefined): string {
  if (!variant) return ""
  const h = (variant as { hs_code?: string | null }).hs_code
  return h != null && String(h).trim() !== "" ? String(h).trim() : ""
}

export function variantPiecesPerCarton(
  variant: ExtendedAdminProductVariant | undefined
): number | "" {
  if (!variant?.metadata || typeof variant.metadata !== "object") return ""
  const raw = (variant.metadata as Record<string, unknown>)[TRAMELLE_PIECES_PER_CARTON]
  if (raw == null || raw === "") return ""
  const n = parseInt(String(raw), 10)
  if (!Number.isFinite(n) || n < 1) return ""
  return n
}

export function rowsFromProduct(
  product: ExtendedAdminProduct,
  family: MeasureFamily
): FormatRow[] {
  const opt = getFormatOption(product)
  const optionTitle = opt?.title || FORMAT_OPTION_TITLE
  const values = (opt?.values || []).map((v) => v.value).filter(Boolean)
  const variants = product.variants || []

  if (!values.length && !variants.length) {
    return [emptyRow(family)]
  }

  const rows: FormatRow[] = []

  for (const val of values.length ? values : []) {
    const parsed = parseFormatLabel(val)
    const variant = variants.find(
      (v) => variantFormatLabel(v, optionTitle, opt?.id) === val
    )
    const meta =
      (variant?.metadata as Record<string, unknown> | undefined) ?? {}
    const effective = variant ? variantPriceEur(variant) : 0
    rows.push({
      key: variant?.id || `new-${val}`,
      amount: parsed?.amount ?? "",
      unit: parsed?.unit ?? unitsForFamily(family)[0],
      listPriceEuros: variant
        ? b2cListFromMetadata(meta, effective)
        : "",
      b2cDiscountPercent: variant ? b2cDiscountFromMetadata(meta) : "",
      b2cVisible: variant ? b2cVisibleFromMetadata(meta) : true,
      stock: variant ? readVariantStock(variant) : "",
      ean: variantEan(variant),
      hsCode: variantHsCode(variant) || productHsCode(product),
      piecesPerCarton: variantPiecesPerCarton(variant),
      wholesaleTiers: wholesaleTierRowsFromVariant(variant),
      variantId: variant?.id,
    })
  }

  if (!rows.length && variants.length === 1) {
    const v = variants[0]
    const label = variantFormatLabel(v, optionTitle, opt?.id)
    const parsed = label ? parseFormatLabel(label) : null
    const meta = (v.metadata as Record<string, unknown> | undefined) ?? {}
    const effective = variantPriceEur(v)
    rows.push({
      key: v.id,
      amount: parsed?.amount ?? "",
      unit: parsed?.unit ?? unitsForFamily(family)[0],
      listPriceEuros: b2cListFromMetadata(meta, effective),
      b2cDiscountPercent: b2cDiscountFromMetadata(meta),
      b2cVisible: b2cVisibleFromMetadata(meta),
      stock: readVariantStock(v),
      ean: variantEan(v),
      hsCode: variantHsCode(v) || productHsCode(product),
      piecesPerCarton: variantPiecesPerCarton(v),
      wholesaleTiers: wholesaleTierRowsFromVariant(v),
      variantId: v.id,
    })
  }

  if (!rows.length) {
    return [emptyRow(family)]
  }

  return rows
}

function variantEan(variant: ExtendedAdminProductVariant | undefined): string {
  if (!variant) return ""
  const e = (variant as { ean?: string | null }).ean
  return e != null && e !== "" ? String(e) : ""
}

function readVariantStock(variant: ExtendedAdminProductVariant): number | "" {
  const items = variant.inventory_items
  if (items?.length) {
    const sum = items.reduce(
      (acc, i) => acc + (Number((i as any).required_quantity) || 0),
      0
    )
    if (sum > 0) return sum
  }
  return ""
}

function newTierKey() {
  return `tier-${typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Date.now()}`
}

export function emptyWholesaleTier(): WholesaleTierRow {
  return {
    key: newTierKey(),
    minQty: "",
    priceEuros: "",
    layerLabel: "",
    qtyUnitLabel: "",
    minOrderLabel: "",
  }
}

function emptyRow(family: MeasureFamily): FormatRow {
  return {
    key: `row-${Date.now()}`,
    amount: "",
    unit: unitsForFamily(family)[0],
    listPriceEuros: "",
    b2cDiscountPercent: "",
    b2cVisible: true,
    stock: "",
    ean: "",
    hsCode: "",
    piecesPerCarton: "",
    wholesaleTiers: [],
  }
}

export function skuForRow(productHandle: string | undefined, label: string) {
  const base = (productHandle || "sku")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
  const suffix = label.replace(/\s+/g, "").replace(/[^a-zA-Z0-9.-]/g, "")
  return `${base}-${suffix}`.slice(0, 80)
}
