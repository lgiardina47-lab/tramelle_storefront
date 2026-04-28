import raw from '@/data/italian-provinces.json'

export type ItalianProvince = { code: string; name: string }

const MAP = raw as Record<string, string>

/** Normalizza etichette dal JSON (maiuscole, apostrofi). */
export function normalizeItalianProvinceLabel(name: string): string {
  const t = name.trim()
  if (/^l'aquila$/i.test(t)) return "L'Aquila"
  if (/^la spezia$/i.test(t)) return 'La Spezia'
  if (/^vibo valentia$/i.test(t)) return 'Vibo Valentia'
  return t
}

export const ITALIAN_PROVINCES: ItalianProvince[] = Object.entries(MAP)
  .map(([code, name]) => ({
    code,
    name: normalizeItalianProvinceLabel(name),
  }))
  .sort((a, b) => a.name.localeCompare(b.name, 'it'))

export function provinceNameFromCode(code: string | undefined | null): string | null {
  if (!code?.trim()) return null
  const c = code.trim().toUpperCase()
  const n = MAP[c]
  return n ? normalizeItalianProvinceLabel(n) : null
}

/** Allinea valore salvato (sigla o nome) al codice provincia per il Listbox. */
export function resolveItalianProvinceCode(
  stored: string | undefined | null
): string | null {
  if (!stored?.trim()) return null
  const s = stored.trim()
  if (/^[a-z]{2}$/i.test(s)) {
    const up = s.toUpperCase()
    if (MAP[up]) return up
  }
  const lower = s.toLowerCase()
  for (const [code, name] of Object.entries(MAP)) {
    const norm = normalizeItalianProvinceLabel(name).toLowerCase()
    if (name.trim().toLowerCase() === lower || norm === lower) return code
  }
  return null
}
