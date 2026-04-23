import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

const DESCRIPTION_LOCALES = new Set(["it", "en", "fr", "de", "es"])

type FacetsPayload = {
  countries: string[]
  regionsByCountry: Record<string, string[]>
  sellerCountByCountry: Record<string, number>
  sellerCountByRegion: Record<string, Record<string, number>>
  totalSellerCount: number
  categories: Array<{ handle: string; name: string; sellerCount: number }>
}

async function buildStoreSellersFacets(
  knex: any,
  base: any,
  totalSellerCount: number
): Promise<FacetsPayload> {
  if (totalSellerCount <= 0) {
    return {
      countries: [],
      regionsByCountry: {},
      sellerCountByCountry: {},
      sellerCountByRegion: {},
      totalSellerCount: 0,
      categories: [],
    }
  }

  const countryRows = (await base
    .clone()
    .clearSelect()
    .clearOrder()
    .select(
      knex.raw(
        `UPPER(NULLIF(TRIM(COALESCE(seller.country_code, '')), '')) as cc`
      )
    )
    .countDistinct("seller.id as cnt")
    .groupBy(
      knex.raw(
        `UPPER(NULLIF(TRIM(COALESCE(seller.country_code, '')), ''))`
      )
    )) as Array<{ cc: string | null; cnt: string | number }>

  const countries: string[] = []
  const sellerCountByCountry: Record<string, number> = {}
  for (const row of countryRows) {
    const cc = (row.cc || "").trim().toUpperCase()
    if (!cc || !/^[A-Z]{2}$/.test(cc)) continue
    const n = Number(row.cnt)
    if (!Number.isFinite(n) || n <= 0) continue
    countries.push(cc)
    sellerCountByCountry[cc] = n
  }
  countries.sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }))

  const regionRows = (await base
    .clone()
    .clearSelect()
    .clearOrder()
    .select(
      knex.raw(
        `UPPER(NULLIF(TRIM(COALESCE(seller.country_code, '')), '')) as cc`
      ),
      knex.raw(`NULLIF(TRIM(COALESCE(seller.state, '')), '') as reg_label`)
    )
    .countDistinct("seller.id as cnt")
    .groupByRaw(
      `UPPER(NULLIF(TRIM(COALESCE(seller.country_code, '')), '')), NULLIF(TRIM(COALESCE(seller.state, '')), '')`
    )
    .havingRaw(`NULLIF(TRIM(COALESCE(seller.state, '')), '') IS NOT NULL`)) as Array<{
    cc: string | null
    reg_label: string | null
    cnt: string | number
  }>

  const regionsByCountry: Record<string, string[]> = {}
  const sellerCountByRegion: Record<string, Record<string, number>> = {}
  for (const row of regionRows) {
    const cc = (row.cc || "").trim().toUpperCase()
    const reg = (row.reg_label || "").trim()
    const n = Number(row.cnt)
    if (!cc || !reg || !Number.isFinite(n) || n <= 0) continue
    if (!regionsByCountry[cc]) regionsByCountry[cc] = []
    if (!regionsByCountry[cc].includes(reg)) regionsByCountry[cc].push(reg)
    const regKey = reg.toUpperCase()
    if (!sellerCountByRegion[cc]) sellerCountByRegion[cc] = {}
    sellerCountByRegion[cc][regKey] = n
  }
  for (const cc of Object.keys(regionsByCountry)) {
    regionsByCountry[cc].sort((a, b) =>
      a.localeCompare(b, "it", { sensitivity: "base" })
    )
  }

  const idRows = (await base
    .clone()
    .clearSelect()
    .clearOrder()
    .select("seller.id")
    .groupBy("seller.id")) as Array<{ id: string }>
  const sellerIds = idRows.map((r) => r.id).filter(Boolean)

  const handleCounts = new Map<string, number>()
  if (sellerIds.length) {
    const profiles = (await knex("seller_listing_profile")
      .whereIn("seller_id", sellerIds)
      .whereNull("deleted_at")
      .select("metadata")) as Array<{ metadata: unknown }>
    for (const p of profiles) {
      const m = p.metadata
      if (!m || typeof m !== "object" || Array.isArray(m)) continue
      const raw = (m as Record<string, unknown>).taste_category_handles
      if (!Array.isArray(raw)) continue
      const seen = new Set<string>()
      for (const h of raw) {
        if (typeof h !== "string") continue
        const handle = h.trim()
        if (!handle || seen.has(handle)) continue
        seen.add(handle)
        handleCounts.set(handle, (handleCounts.get(handle) ?? 0) + 1)
      }
    }
  }

  const handles = [...handleCounts.keys()]
  const catRows = handles.length
    ? ((await knex("product_category")
        .whereIn("handle", handles)
        .whereNull("deleted_at")
        .select("handle", "name")) as Array<{ handle: string; name: string | null }>)
    : []
  const nameByHandle = new Map(
    catRows.map((r) => [r.handle, (r.name || r.handle).trim() || r.handle])
  )
  const categories = handles
    .map((handle) => ({
      handle,
      name: String(nameByHandle.get(handle) ?? handle),
      sellerCount: handleCounts.get(handle) ?? 0,
    }))
    .filter((c) => c.sellerCount > 0)
    .sort((a, b) =>
      a.name.localeCompare(b.name, "it", { sensitivity: "base" })
    )

  return {
    countries,
    regionsByCountry,
    sellerCountByCountry,
    sellerCountByRegion,
    totalSellerCount,
    categories,
  }
}

/**
 * Seller visibili per macro tassonomia: albero `product_category` a partire da `parentHandle`
 * + `taste_category_handles` nel listing, oppure almeno un prodotto `published` in categoria
 * del sottoalbero (`product_category_product` + `seller_seller_product_product`).
 */
async function resolveSellerIdsForParentCategory(
  knex: any,
  parentHandle: string
): Promise<string[]> {
  const h = parentHandle.trim()
  if (!h) {
    return []
  }
  const { rows } = (await knex.raw(
    `
    WITH RECURSIVE sub AS (
      SELECT id, handle
      FROM product_category
      WHERE LOWER(handle) = LOWER(?) AND deleted_at IS NULL
      UNION ALL
      SELECT c.id, c.handle
      FROM product_category c
      INNER JOIN sub s ON c.parent_category_id = s.id
      WHERE c.deleted_at IS NULL
    ),
    taste_sellers AS (
      SELECT DISTINCT s.id
      FROM seller s
      INNER JOIN seller_listing_profile slp
        ON slp.seller_id = s.id AND slp.deleted_at IS NULL
      CROSS JOIN LATERAL jsonb_array_elements_text(
        COALESCE(slp.metadata->'taste_category_handles', '[]'::jsonb)
      ) AS t(elem)
      INNER JOIN sub ON LOWER(btrim(t.elem, '"')) = LOWER(sub.handle)
      WHERE s.deleted_at IS NULL
        AND s.store_status IS DISTINCT FROM 'SUSPENDED'
    ),
    product_sellers AS (
      SELECT DISTINCT l.seller_id AS id
      FROM seller_seller_product_product l
      INNER JOIN product p
        ON p.id = l.product_id AND p.deleted_at IS NULL AND p.status = 'published'
      INNER JOIN product_category_product pcp ON pcp.product_id = p.id
      INNER JOIN sub ON pcp.product_category_id = sub.id
      WHERE l.deleted_at IS NULL
    )
    SELECT x.id::text FROM (
      SELECT id FROM taste_sellers
      UNION
      SELECT id FROM product_sellers
    ) x
  `,
    [h]
  )) as { rows: { id: string }[] }
  return rows.map((r) => r.id).filter(Boolean)
}

/**
 * Elenco pubblico produttori per lo storefront (esclude sospesi).
 * Unisce `seller_listing_profile.metadata` per hero / storytelling come su by-ref.
 *
 * Query opzionale `content_locale=it|en|fr|de|es`: mostra solo seller con testo
 * descrizione in quella lingua (`metadata.tramelle_description_i18n`; per `it`
 * anche `seller.description` legacy o `metadata.tramelle_import_description_source` se non c’è i18n).
 *
 * `parent_category_handle=slug`: solo seller con listing `taste_category_handles` o prodotto pubblicato
 * in una `product_category` del sottoalbero (megamenu provenienze / directory coerente).
 */
export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const limit = Math.min(Math.max(Number(req.query.limit) || 48, 1), 100)
  const offset = Math.max(Number(req.query.offset) || 0, 0)

  const rawLocale =
    typeof req.query.content_locale === "string"
      ? req.query.content_locale.trim().toLowerCase()
      : ""
  const contentLocale = DESCRIPTION_LOCALES.has(rawLocale) ? rawLocale : null

  const parentCategoryRaw =
    typeof req.query.parent_category_handle === "string"
      ? req.query.parent_category_handle.trim()
      : ""
  const hasParentParam = parentCategoryRaw.length > 0
  if (hasParentParam) {
    if (!/^[a-z0-9][a-z0-9-]{0,118}$/i.test(parentCategoryRaw)) {
      res.status(400).json({ message: "parent_category_handle non valido" })
      return
    }
  }

  const knex = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION) as any

  let base = knex("seller")
    .whereNull("seller.deleted_at")
    .whereNot("seller.store_status", "SUSPENDED")
    .whereNotNull("seller.handle")
    .where("seller.handle", "!=", "")
    .leftJoin("seller_listing_profile as slp", function joinSlp(this: any) {
      this.on("seller.id", "=", "slp.seller_id").andOnNull("slp.deleted_at")
    })

  if (contentLocale === "it") {
    base = base.whereRaw(
      `(trim(COALESCE(slp.metadata->'tramelle_description_i18n'->>'it','')) <> '' OR trim(COALESCE(seller.description::text,'')) <> '' OR trim(COALESCE(slp.metadata->>'tramelle_import_description_source','')) <> '')`
    )
  } else if (contentLocale) {
    base = base.whereRaw(
      `trim(COALESCE(slp.metadata->'tramelle_description_i18n'->>'${contentLocale}', '')) <> ''`
    )
  }

  if (hasParentParam) {
    const allow = await resolveSellerIdsForParentCategory(
      knex,
      parentCategoryRaw
    )
    if (allow.length === 0) {
      base = base.whereRaw("1 = 0")
    } else {
      base = base.whereIn("seller.id", allow)
    }
  }

  const countRow = await base
    .clone()
    .clearSelect()
    .clearOrder()
    .countDistinct("seller.id as c")
    .first()
  const count = Number(
    countRow && typeof countRow === "object" && "c" in countRow
      ? (countRow as { c: string | number }).c
      : 0
  )

  const rawFacets = req.query.facets
  const wantFacets =
    rawFacets === "1" ||
    rawFacets === "true" ||
    (typeof rawFacets === "string" && rawFacets.toLowerCase() === "yes")

  if (wantFacets) {
    const facets = await buildStoreSellersFacets(knex, base, count)
    res.json(facets)
    return
  }

  const rows = (await base
    .clone()
    .select(
      "seller.id",
      "seller.name",
      "seller.handle",
      "seller.description",
      "seller.photo",
      "seller.city",
      "seller.state",
      "seller.country_code",
      "seller.store_status"
    )
    .orderBy("seller.name", "asc")
    .limit(limit)
    .offset(offset)) as Array<{
    id: string
    name: string | null
    handle: string | null
    description: string | null
    photo: string | null
    city: string | null
    state: string | null
    country_code: string | null
    store_status: string | null
  }>

  const ids = rows.map((r) => r.id).filter(Boolean)
  const profileMeta = new Map<string, Record<string, unknown>>()
  if (ids.length) {
    const profiles = (await knex("seller_listing_profile")
      .whereIn("seller_id", ids)
      .whereNull("deleted_at")
      .select("seller_id", "metadata")) as Array<{
      seller_id: string
      metadata: unknown
    }>
    for (const p of profiles) {
      const m = p.metadata
      if (m && typeof m === "object" && !Array.isArray(m)) {
        profileMeta.set(p.seller_id, m as Record<string, unknown>)
      }
    }
  }

  const sellers = rows.map((r) => {
    const meta = profileMeta.get(r.id)
    const baseSeller = {
      id: r.id,
      name: r.name ?? "",
      handle: r.handle ?? "",
      description: r.description ?? "",
      photo: r.photo ?? "",
      city: r.city ?? "",
      state: r.state ?? "",
      country_code: r.country_code ?? "",
      store_status: r.store_status ?? "",
    }
    return meta && Object.keys(meta).length > 0
      ? { ...baseSeller, metadata: meta }
      : baseSeller
  })

  res.json({ sellers, count, limit, offset })
}
