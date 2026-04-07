export const TRAMELLE_PIECES_PER_CARTON = "tramelle_pieces_per_carton"
export const TRAMELLE_WHOLESALE_TIERS = "tramelle_wholesale_tiers"
export const TRAMELLE_B2C_VISIBLE = "tramelle_b2c_visible"

/** Variante nascosta in vetrina B2C (i buyer wholesale continuano a vederla). */
export function isVariantVisibleB2c(
  meta: Record<string, unknown> | null | undefined
): boolean {
  if (!meta || typeof meta !== "object") return true
  const v = meta[TRAMELLE_B2C_VISIBLE]
  if (v === false || v === "false") return false
  return true
}

export type WholesaleTier = { min_qty: number; unit_price_euros: number }

export function parsePiecesPerCarton(
  meta: Record<string, unknown> | null | undefined
): number {
  if (!meta) return 0
  const raw = meta[TRAMELLE_PIECES_PER_CARTON]
  if (raw == null || raw === "") return 0
  const n = parseInt(String(raw), 10)
  return Number.isFinite(n) && n > 0 ? n : 0
}

export function parseWholesaleTiers(
  meta: Record<string, unknown> | null | undefined
): WholesaleTier[] {
  if (!meta) return []
  const raw = meta[TRAMELLE_WHOLESALE_TIERS]
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
  const out: WholesaleTier[] = []
  for (const x of arr) {
    if (!x || typeof x !== "object") continue
    const o = x as Record<string, unknown>
    const min = Number(o.min_qty ?? o.minQty)
    const price = Number(o.unit_price_euros ?? o.unitPriceEuros)
    if (!Number.isFinite(min) || min < 1 || !Number.isFinite(price) || price < 0) continue
    out.push({ min_qty: Math.floor(min), unit_price_euros: price })
  }
  return out.sort((a, b) => a.min_qty - b.min_qty)
}

/** Active tier for quantity q: highest min_qty still satisfied. */
export function unitPriceForWholesaleQty(
  tiers: WholesaleTier[],
  retailEuros: number,
  quantity: number
): number {
  const q = Math.max(0, Math.floor(quantity))
  const all: WholesaleTier[] = [
    { min_qty: 1, unit_price_euros: retailEuros },
    ...tiers.filter((t) => t.min_qty >= 2),
  ].sort((a, b) => a.min_qty - b.min_qty)
  let price = retailEuros
  for (const t of all) {
    if (q >= t.min_qty) price = t.unit_price_euros
  }
  return price
}

export function nextCartonDelta(currentQty: number, carton: number): number {
  if (carton <= 0) return 0
  const q = Math.max(0, Math.floor(currentQty))
  const rem = q % carton
  return rem === 0 ? 0 : carton - rem
}
