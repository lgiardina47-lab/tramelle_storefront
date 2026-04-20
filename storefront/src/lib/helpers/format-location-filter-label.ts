/** Allinea titoli regione/paese (MAIUSCOLO → title case). */
export function formatLocationFilterLabel(s: string | undefined): string {
  const t = (s ?? "").trim()
  if (!t) return t
  if (t !== t.toUpperCase()) return t
  if (!/[A-Z]/.test(t)) return t
  return t
    .toLowerCase()
    .split(/(\s+)/)
    .map((part) => {
      if (/^\s+$/.test(part)) return part
      if (part.length === 0) return part
      return part.charAt(0).toUpperCase() + part.slice(1)
    })
    .join("")
}
