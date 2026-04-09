import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

const DESCRIPTION_LOCALES = new Set(["it", "en", "fr", "de", "es"])

/**
 * Elenco pubblico produttori per lo storefront (esclude sospesi).
 * Unisce `seller_listing_profile.metadata` per hero / storytelling come su by-ref.
 *
 * Query opzionale `content_locale=it|en|fr|de|es`: mostra solo seller con testo
 * descrizione in quella lingua (`metadata.tramelle_description_i18n`; per `it`
 * anche `seller.description` legacy o `metadata.tramelle_import_description_source` se non c’è i18n).
 */
export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const limit = Math.min(Math.max(Number(req.query.limit) || 48, 1), 100)
  const offset = Math.max(Number(req.query.offset) || 0, 0)

  const rawLocale =
    typeof req.query.content_locale === "string"
      ? req.query.content_locale.trim().toLowerCase()
      : ""
  const contentLocale = DESCRIPTION_LOCALES.has(rawLocale) ? rawLocale : null

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
