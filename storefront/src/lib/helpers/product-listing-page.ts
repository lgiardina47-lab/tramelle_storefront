/** Indice pagina 1-based da `searchParams` per listing Medusa server-rendered. */
export function parseProductListingPage(
  sp: Record<string, string | string[] | undefined> | undefined
): number {
  if (!sp) return 1
  const raw = sp.page
  const s = Array.isArray(raw) ? raw[0] : raw
  const n = parseInt(String(s ?? "1"), 10)
  return Number.isFinite(n) && n >= 1 ? n : 1
}
