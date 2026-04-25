/**
 * Snapshot del prodotto **prima** delle trasformazioni Mercur che appiattiscono
 * `options` / `attribute_values` (serve per serializzare la PDP in indice).
 */
export type PdpSourceSnapshot = {
  optionsRaw: unknown
  variantsRaw: unknown
  attributeValuesRaw: unknown
  created_at: string | null
}

export function cloneJson<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T
}
