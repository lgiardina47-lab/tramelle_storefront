import { listRegions } from "@/lib/data/regions"

import type { StoreCountryOption } from "./store-country-option"

export type { StoreCountryOption }

/**
 * Paesi dai region Medusa (store), per select registrazione / lead.
 */
export async function listStoreCountryOptions(): Promise<StoreCountryOption[]> {
  const regions = await listRegions()
  const byIso = new Map<string, string>()
  for (const region of regions) {
    for (const c of region.countries ?? []) {
      const iso = c.iso_2?.trim().toUpperCase()
      if (!iso || !/^[A-Z]{2}$/.test(iso)) continue
      const label =
        (c as { display_name?: string }).display_name?.trim() ||
        c.name?.trim() ||
        iso
      if (!byIso.has(iso)) byIso.set(iso, label)
    }
  }
  return Array.from(byIso.entries())
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, "it"))
}
