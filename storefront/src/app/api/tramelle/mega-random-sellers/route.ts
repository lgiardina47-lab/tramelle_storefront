import { NextRequest, NextResponse } from "next/server"

import {
  fetchStoreSellersFacetsForParentCategoryNoStore,
  type StoreSellersFacetsResponse,
} from "@/lib/data/seller"

export const dynamic = "force-dynamic"

const MAX_ORIGINS = 64

function nationFromCountryCode(countryCode: string | undefined): string {
  const cc = (countryCode ?? "").trim().toUpperCase()
  if (!cc || cc.length !== 2) return ""
  try {
    return new Intl.DisplayNames(["it"], { type: "region" }).of(cc) ?? cc
  } catch {
    return cc
  }
}

function originKey(nation: string, region: string | null): string {
  const n = nation.trim().toLowerCase()
  const r = (region ?? "").trim().toLowerCase()
  return `${n}|${r}`
}

/**
 * Stessi seller della directory per macro: `GET /store/sellers?facets=1&parent_category_handle=…`
 * (taste o prodotto pubblicato in sottoalbero). Niente campione casuale né shuffle.
 */
function originsFromFacets(f: StoreSellersFacetsResponse): {
  nation: string
  region: string | null
  country_code: string
}[] {
  const countries = f.countries ?? []
  if (!countries.length) return []
  const { regionsByCountry, sellerCountByCountry, sellerCountByRegion } = f

  const out: { nation: string; region: string | null; country_code: string }[] =
    []
  const seen = new Set<string>()
  const add = (
    nation: string,
    region: string | null,
    countryCode: string
  ) => {
    const k = originKey(nation, region)
    if (seen.has(k)) return
    seen.add(k)
    out.push({ nation, region, country_code: countryCode })
  }

  for (const cc of countries) {
    const nation = nationFromCountryCode(cc)
    if (!nation) continue
    const ccLower = cc.trim().toLowerCase()
    if (!ccLower) continue
    const regs = regionsByCountry[cc] ?? []
    const nCountry = sellerCountByCountry[cc] ?? 0
    const regMap = sellerCountByRegion[cc] ?? {}
    const sumReg = Object.values(regMap).reduce(
      (a, b) => a + (Number.isFinite(b) ? b : 0),
      0
    )

    if (regs.length === 0) {
      add(nation, null, ccLower)
      continue
    }
    for (const reg of regs) {
      add(nation, reg, ccLower)
    }
    if (nCountry > sumReg) {
      add(nation, null, ccLower)
    }
  }

  out.sort((a, b) => {
    const c = a.nation.localeCompare(b.nation, "it", { sensitivity: "base" })
    if (c !== 0) return c
    const ar = a.region ?? ""
    const br = b.region ?? ""
    return ar.localeCompare(br, "it", { sensitivity: "base" })
  })

  return out.length > MAX_ORIGINS ? out.slice(0, MAX_ORIGINS) : out
}

export async function GET(request: NextRequest) {
  const parent =
    request.nextUrl.searchParams.get("parent_category_handle")?.trim() || ""
  if (!parent || !/^[a-z0-9][a-z0-9-]{0,118}$/i.test(parent)) {
    return NextResponse.json({ origins: [] })
  }

  const facets = await fetchStoreSellersFacetsForParentCategoryNoStore(parent)
  if (!facets || (facets.totalSellerCount ?? 0) === 0) {
    return NextResponse.json({ origins: [] })
  }

  return NextResponse.json({ origins: originsFromFacets(facets) })
}
