/** Testo piano da `description` Medusa (HTML o testo) per meta description, senza duplicare titolo. */
export function plainCategoryDescription(
  raw: unknown,
  maxLen = 158
): string | null {
  if (typeof raw !== "string" || !raw.trim()) return null
  const text = raw
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
  if (text.length < 24) return null
  if (text.length <= maxLen) return text
  const cut = text.slice(0, maxLen)
  const lastSpace = cut.lastIndexOf(" ")
  const base = (lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trimEnd()
  return `${base}…`
}
