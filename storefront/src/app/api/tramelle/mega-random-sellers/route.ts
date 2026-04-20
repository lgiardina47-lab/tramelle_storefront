import { NextRequest, NextResponse } from "next/server"

import {
  listStoreSellers,
  listStoreSellersForParentCategory,
} from "@/lib/data/seller"
import { sellerListingRegionLabel } from "@/lib/helpers/seller-listing-region"
import type { StoreSellerListItem } from "@/types/seller"

export const dynamic = "force-dynamic"

const MAX_ORIGINS = 36
const POOL_LIMIT = 80

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

function rowFromSeller(s: StoreSellerListItem): {
  nation: string
  region: string | null
} | null {
  const nation = nationFromCountryCode(s.country_code)
  const rawRegion =
    sellerListingRegionLabel(s) ||
    (typeof s.state === "string" && s.state.trim() ? s.state.trim() : "") ||
    (typeof s.city === "string" && s.city.trim() ? s.city.trim() : "") ||
    ""

  if (nation) {
    const region =
      rawRegion && rawRegion.toLowerCase() !== nation.toLowerCase()
        ? rawRegion
        : null
    return { nation, region }
  }

  if (rawRegion) {
    return { nation: rawRegion, region: null }
  }

  return null
}

function originsFromSellers(raw: StoreSellerListItem[]): {
  nation: string
  region: string | null
}[] {
  const shuffled = [...raw].sort(() => Math.random() - 0.5)
  const seen = new Set<string>()
  const origins: { nation: string; region: string | null }[] = []

  for (const s of shuffled) {
    const row = rowFromSeller(s)
    if (!row) continue
    const k = originKey(row.nation, row.region)
    if (seen.has(k)) continue
    seen.add(k)
    origins.push(row)
    if (origins.length >= MAX_ORIGINS) break
  }

  origins.sort((a, b) => {
    const c = a.nation.localeCompare(b.nation, "it", { sensitivity: "base" })
    if (c !== 0) return c
    const ar = a.region ?? ""
    const br = b.region ?? ""
    return ar.localeCompare(br, "it", { sensitivity: "base" })
  })

  return origins
}

export async function GET(request: NextRequest) {
  let parentCategoryHandle =
    request.nextUrl.searchParams.get("parent_category_handle")?.trim() || null

  const fetchHead = (parent: string | null) =>
    parent
      ? listStoreSellersForParentCategory({
          parentCategoryHandle: parent,
          limit: 1,
          offset: 0,
        })
      : listStoreSellers({ limit: 1, offset: 0 })

  let first = await fetchHead(parentCategoryHandle)

  if (
    parentCategoryHandle &&
    (first == null || (first.count ?? 0) === 0)
  ) {
    parentCategoryHandle = null
    first = await fetchHead(null)
  }

  const count = first?.count ?? 0
  if (count === 0 || !first) {
    return NextResponse.json({ origins: [] })
  }

  const maxOff = Math.max(0, count - POOL_LIMIT)
  const offset = maxOff > 0 ? Math.floor(Math.random() * (maxOff + 1)) : 0

  const page = parentCategoryHandle
    ? await listStoreSellersForParentCategory({
        parentCategoryHandle,
        limit: POOL_LIMIT,
        offset,
      })
    : await listStoreSellers({ limit: POOL_LIMIT, offset })

  const raw = page?.sellers ?? []
  const origins = originsFromSellers(raw)

  return NextResponse.json({ origins })
}
