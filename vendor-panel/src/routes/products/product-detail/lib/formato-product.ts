import type { ExtendedAdminProduct } from "../../../../types/products"
import type { ExtendedAdminProductVariant } from "../../../../types/products"

/** Option title used for pack-size variants (must match storefront URL param key `formato`). */
export const FORMAT_OPTION_TITLE = "Formato"

/** Variant metadata keys (storefront + vendor). */
export const TRAMELLE_PIECES_PER_CARTON = "tramelle_pieces_per_carton"
export const TRAMELLE_WHOLESALE_TIERS = "tramelle_wholesale_tiers"

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
}

export type FormatRow = {
  /** Stable id for React lists (variant id when known) */
  key: string
  amount: number | ""
  unit: FormatUnit
  priceEuros: number | ""
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

export type ParsedWholesaleTier = { min_qty: number; unit_price_euros: number }

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
    out.push({ min_qty: Math.floor(min), unit_price_euros: price })
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
    }))
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

export function variantFormatLabel(
  variant: ExtendedAdminProductVariant,
  optionTitle: string
): string | null {
  const raw = variant.options as unknown
  if (Array.isArray(raw)) {
    const match = (raw as { value?: string; option?: { title?: string } }[]).find(
      (o) =>
        o.option?.title?.toLowerCase() === optionTitle.toLowerCase() ||
        o.option?.title?.toLowerCase() === FORMAT_OPTION_TITLE.toLowerCase()
    )
    if (match?.value) return match.value
    const first = (raw as { value?: string }[])[0]
    return first?.value ?? null
  }
  if (raw && typeof raw === "object") {
    const rec = raw as Record<string, string>
    return (
      rec[optionTitle] ||
      rec[FORMAT_OPTION_TITLE] ||
      Object.values(rec)[0] ||
      null
    )
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
      (v) => variantFormatLabel(v, optionTitle) === val
    )
    rows.push({
      key: variant?.id || `new-${val}`,
      amount: parsed?.amount ?? "",
      unit: parsed?.unit ?? unitsForFamily(family)[0],
      priceEuros: variant ? variantPriceEur(variant) : "",
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
    const label = variantFormatLabel(v, optionTitle)
    const parsed = label ? parseFormatLabel(label) : null
    rows.push({
      key: v.id,
      amount: parsed?.amount ?? "",
      unit: parsed?.unit ?? unitsForFamily(family)[0],
      priceEuros: variantPriceEur(v),
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
  return { key: newTierKey(), minQty: "", priceEuros: "" }
}

function emptyRow(family: MeasureFamily): FormatRow {
  return {
    key: `row-${Date.now()}`,
    amount: "",
    unit: unitsForFamily(family)[0],
    priceEuros: "",
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
