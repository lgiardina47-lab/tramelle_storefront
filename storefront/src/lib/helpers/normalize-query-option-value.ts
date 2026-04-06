/**
 * Allinea il valore letto dalla query string al valore opzione Medusa (es. "500 g").
 * In URL compaiono spesso `+` al posto dello spazio (`formato=500+g`).
 */
export function normalizeQueryOptionValue(
  raw: string | undefined | null
): string {
  if (raw == null || raw === "") return ""
  let s = String(raw)
  try {
    s = decodeURIComponent(s)
  } catch {
    // ignore invalid escape sequences
  }
  return s.replace(/\+/g, " ").trim()
}
