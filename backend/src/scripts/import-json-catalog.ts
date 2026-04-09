import * as fs from "node:fs"
import * as path from "node:path"

import type { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework"
import {
  createProductCategoriesWorkflow,
  createServiceZonesWorkflow,
  updateProductCategoriesWorkflow,
} from "@medusajs/medusa/core-flows"
import { SELLER_MODULE } from "@mercurjs/b2c-core/modules/seller"
import {
  createSellerWorkflow,
  updateSellerWorkflow,
} from "@mercurjs/b2c-core/workflows"

import { TRAMELLE_IMPORT_DESCRIPTION_SOURCE_KEY } from "../lib/tramelle-listing-description-keys"
import {
  getSellerListingMetadata,
  setSellerListingMetadata,
} from "../lib/seller-listing-metadata"
import {
  createSellerShippingOption,
  createSellerStockLocation,
} from "./seed/seed-functions"

const EU_SHIPPING_COUNTRIES = [
  "be",
  "de",
  "dk",
  "se",
  "fr",
  "es",
  "it",
  "pl",
  "cz",
  "nl",
]

/** ISO paese seller per cataloghi marketplace italiani (override: IMPORT_SELLER_COUNTRY_CODE). */
const IMPORT_SELLER_COUNTRY_CODE = (
  process.env.IMPORT_SELLER_COUNTRY_CODE || "it"
)
  .trim()
  .toLowerCase()

/** Nome service zone univoco (il vincolo DB non consente duplicati su "Europe"). */
async function createServiceZoneForImportedSeller(
  container: MedusaContainer,
  sellerId: string,
  fulfillmentSetId: string,
  zoneName: string
) {
  await createServiceZonesWorkflow.run({
    container,
    input: {
      data: [
        {
          fulfillment_set_id: fulfillmentSetId,
          name: zoneName,
          geo_zones: EU_SHIPPING_COUNTRIES.map((country_code) => ({
            type: "country" as const,
            country_code,
          })),
        },
      ],
    },
  })

  const fulfillmentService = container.resolve(Modules.FULFILLMENT)
  const zones = await fulfillmentService.listServiceZones({
    fulfillment_set: { id: fulfillmentSetId },
  })
  const zone =
    zones.find((z) => z.name === zoneName) ?? zones[zones.length - 1]
  if (!zone) {
    throw new Error(`Service zone non creata per ${zoneName}`)
  }

  const link = container.resolve(ContainerRegistrationKeys.LINK)
  await link.create({
    [SELLER_MODULE]: { seller_id: sellerId },
    [Modules.FULFILLMENT]: { service_zone_id: zone.id },
  })

  return zone
}

type Merceology = {
  merceology_id: string
  label: string
  parent_menu_title: string
}

type OtherMerceology = {
  other_merceology_id: string
  label: string
}

type JsonSeller = {
  slug: string
  name: string
  short_description?: string
  /** Testo lungo scheda (se presente, preferito come description in store) */
  company_profile?: string
  logo_url?: string
  /** Hero / banner store (URL pubblico, es. CDN) — salvato in seller.metadata.hero_image_url */
  brand_banner_url?: string
  /** Lookbook / gallery (es. URL CDN dopo sync_partner_media_cdn --storytelling) → metadata.storytelling_gallery_urls */
  product_image_urls?: string[] | null
  /** Sito web brand → metadata.website_url (admin / storefront) */
  website_url?: string
  /** Dominio (es. da JSON Pitti) → metadata.website_domain, usato se website_url manca */
  website_domain?: string
  /** Opzionale: mostrato in admin sul seller */
  phone?: string
  /** Dati fiscali Italia → metadata listing (admin: P.IVA, REA, SDI) */
  partita_iva?: string
  rea?: string
  sdi?: string
  /**
   * Regione di provenienza (es. TOSCANA) da scheda fiera → `seller.state`, `metadata.listing_region`,
   * `metadata.taste_region_by_handle` (handle categoria taste → regione) e aggregato su categoria prodotto.
   */
  listing_country?: string
  filters?: {
    merceologies?: Merceology[] | null
    other_company_products?: OtherMerceology[] | null
  }
}

type ImportFile = {
  sellers: JsonSeller[]
}

/** Testo scheda dal JSON Pitti — va in metadata sorgente (intero), non nelle tab i18n. */
function importDescriptionSourceText(row: JsonSeller): string {
  return (
    row.company_profile?.trim() ||
    row.short_description?.trim() ||
    ""
  )
}

function buildSellerImportMetadata(row: JsonSeller): Record<string, unknown> | undefined {
  const bannerUrl = row.brand_banner_url?.trim()
  const rawGallery = row.product_image_urls
  const gallery =
    Array.isArray(rawGallery) && rawGallery.length
      ? rawGallery.map((u) => String(u).trim()).filter(Boolean)
      : []
  const meta: Record<string, unknown> = {}
  if (bannerUrl) {
    meta.hero_image_url = bannerUrl
  }
  if (gallery.length) {
    meta.storytelling_gallery_urls = gallery
  }
  const website = row.website_url?.trim()
  if (website) {
    meta.website_url = website
  }
  const websiteDomain = row.website_domain?.trim()
  if (websiteDomain) {
    meta.website_domain = websiteDomain.replace(/^https?:\/\//i, "").split("/")[0]
  }
  const logo = row.logo_url?.trim()
  if (logo) {
    meta.logo_url = logo
  }
  const region = row.listing_country?.trim()
  if (region) {
    meta.listing_region = region
  }
  const handles = tasteCategoryHandlesForSeller(row)
  if (handles.length) {
    meta.taste_category_handles = handles
  }
  if (region && handles.length) {
    meta.taste_region_by_handle = Object.fromEntries(
      handles.map((h) => [h, region])
    )
  }
  const piva = row.partita_iva?.trim()
  if (piva) {
    meta.partita_iva = piva
  }
  const rea = row.rea?.trim()
  if (rea) {
    meta.rea = rea
  }
  const sdi = row.sdi?.trim()
  if (sdi) {
    meta.sdi = sdi
  }
  const source = importDescriptionSourceText(row)
  if (source) {
    meta[TRAMELLE_IMPORT_DESCRIPTION_SOURCE_KEY] = source
  }
  return Object.keys(meta).length ? meta : undefined
}

const SYNTHETIC_PARENT = {
  name: "Altri prodotti dichiarati",
  handle: "taste-altri-prodotti-dichiarati",
}

function slugify(input: string, max = 96): string {
  const s = input
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  const base = s || "cat"
  return base.length > max ? base.slice(0, max) : base
}

/**
 * `IMPORT_SELLER_SLUGS=mieli-thun,lalaina` — limita creazione/aggiornamento seller a questi slug (test mirati).
 */
function sellerSlugAllowlist(): Set<string> | null {
  const raw = process.env.IMPORT_SELLER_SLUGS?.trim()
  if (!raw) {
    return null
  }
  const set = new Set<string>()
  for (const part of raw.split(/[\s,]+/)) {
    const t = part.trim()
    if (!t) {
      continue
    }
    set.add(slugify(t, 96))
  }
  return set.size > 0 ? set : null
}

function importRowMatchesSlugAllowlist(
  row: JsonSeller,
  allow: Set<string> | null
): boolean {
  if (!allow) {
    return true
  }
  return allow.has(slugify(row.slug, 96))
}

function sellerImportEmailDomain(): string {
  const d = (process.env.IMPORT_SELLER_EMAIL_DOMAIN || "tramelle.com")
    .trim()
    .toLowerCase()
    .replace(/^@/, "")
  return d || "tramelle.com"
}

/** Email canonica import: `{slugify(slug,64)}@{IMPORT_SELLER_EMAIL_DOMAIN}`. */
function sellerImportEmailFromSlug(slug: string): string {
  return `${slugify(slug, 64)}@${sellerImportEmailDomain()}`
}

type ParentSpec = { title: string; handle: string }
type ChildSpec = { name: string; handle: string }

function collectCategorySpecs(data: ImportFile): {
  parents: Map<string, ParentSpec>
  childrenByParent: Map<string, Map<string, ChildSpec>>
} {
  const parents = new Map<string, ParentSpec>()
  const childrenByParent = new Map<string, Map<string, ChildSpec>>()

  const ensureParent = (title: string) => {
    const handle = slugify(title)
    if (!parents.has(handle)) {
      parents.set(handle, { title, handle })
    }
    if (!childrenByParent.has(handle)) {
      childrenByParent.set(handle, new Map())
    }
    return handle
  }

  const addChild = (parentHandle: string, child: ChildSpec) => {
    const bucket = childrenByParent.get(parentHandle)!
    bucket.set(child.handle, child)
  }

  for (const seller of data.sellers) {
    const m = seller.filters?.merceologies
    if (m) {
      for (const row of m) {
        const ptitle = (row.parent_menu_title || "").trim()
        if (!ptitle) {
          continue
        }
        const ph = ensureParent(ptitle)
        const ch = slugify(`${row.label}-m${row.merceology_id}`)
        addChild(ph, { name: row.label, handle: ch })
      }
    }
    const o = seller.filters?.other_company_products
    if (o) {
      parents.set(SYNTHETIC_PARENT.handle, {
        title: SYNTHETIC_PARENT.name,
        handle: SYNTHETIC_PARENT.handle,
      })
      if (!childrenByParent.has(SYNTHETIC_PARENT.handle)) {
        childrenByParent.set(SYNTHETIC_PARENT.handle, new Map())
      }
      for (const row of o) {
        const ch = slugify(`${row.label}-o${row.other_merceology_id}`)
        addChild(SYNTHETIC_PARENT.handle, {
          name: row.label,
          handle: ch,
        })
      }
    }
  }

  return { parents, childrenByParent }
}

/** Handle delle sottocategorie Merceologia / «altri prodotti» dichiarati (stessa logica di collectCategorySpecs). */
function tasteCategoryHandlesForSeller(seller: JsonSeller): string[] {
  const handles: string[] = []
  const m = seller.filters?.merceologies
  if (m) {
    for (const row of m) {
      if (!(row.parent_menu_title || "").trim()) {
        continue
      }
      handles.push(slugify(`${row.label}-m${row.merceology_id}`))
    }
  }
  const o = seller.filters?.other_company_products
  if (o) {
    for (const row of o) {
      handles.push(slugify(`${row.label}-o${row.other_merceology_id}`))
    }
  }
  return [...new Set(handles)]
}

/**
 * Per ogni sottocategoria taste (handle), aggrega in metadata le regioni di provenienza
 * dei seller del JSON (`listing_country`) che dichiarano quella merceologia.
 * Chiave: `seller_origin_regions` (array di stringhe ordinate, es. `["LAZIO","TOSCANA"]`).
 */
async function syncTasteCategoryOriginRegions(
  container: ExecArgs["container"],
  data: ImportFile,
  logger: { info: (msg: string) => void }
): Promise<void> {
  const regionsByHandle = new Map<string, Set<string>>()
  for (const row of data.sellers) {
    const region = row.listing_country?.trim()
    if (!region) {
      continue
    }
    for (const h of tasteCategoryHandlesForSeller(row)) {
      if (!regionsByHandle.has(h)) {
        regionsByHandle.set(h, new Set())
      }
      regionsByHandle.get(h)!.add(region)
    }
  }
  if (!regionsByHandle.size) {
    logger.info(
      "Regioni su categorie taste: nessun listing_country nel JSON, salto sync metadata categorie"
    )
    return
  }

  const productModule = container.resolve(Modules.PRODUCT)
  const [existing] = await productModule.listAndCountProductCategories(
    {},
    {
      take: 10000,
      select: ["id", "handle", "metadata"],
    }
  )
  const byHandle = new Map(
    existing.map((c) => [c.handle as string, c] as const)
  )

  let updated = 0
  for (const [handle, regions] of regionsByHandle) {
    const cat = byHandle.get(handle)
    if (!cat?.id) {
      continue
    }
    const labels = [...regions].sort((a, b) =>
      a.localeCompare(b, "it", { sensitivity: "base" })
    )
    const prevRaw = cat.metadata
    const prevMeta =
      prevRaw &&
      typeof prevRaw === "object" &&
      !Array.isArray(prevRaw)
        ? { ...(prevRaw as Record<string, unknown>) }
        : {}
    prevMeta.seller_origin_regions = labels

    await updateProductCategoriesWorkflow(container).run({
      input: {
        selector: { id: cat.id },
        update: { metadata: prevMeta },
      },
    })
    updated++
  }
  logger.info(
    `Categorie taste: seller_origin_regions aggiornate su ${updated} sottocategorie (da JSON)`
  )
}

async function ensureCategories(
  container: ExecArgs["container"],
  data: ImportFile,
  logger: { info: (msg: string) => void }
): Promise<void> {
  const productModule = container.resolve(Modules.PRODUCT)
  const { parents, childrenByParent } = collectCategorySpecs(data)

  const [existing] = await productModule.listAndCountProductCategories(
    {},
    { take: 10000, select: ["id", "handle", "parent_category_id"] }
  )
  const byHandle = new Map(existing.map((c) => [c.handle, c]))

  const missingParents = [...parents.values()].filter((p) => !byHandle.has(p.handle))
  if (missingParents.length) {
    const { result } = await createProductCategoriesWorkflow(container).run({
      input: {
        product_categories: missingParents.map((p) => ({
          name: p.title,
          handle: p.handle,
          is_active: true,
        })),
      },
    })
    for (const c of result) {
      byHandle.set(c.handle, c)
    }
    logger.info(`Categorie (livello principale): create ${missingParents.length}`)
  }

  const childPayload: {
    name: string
    handle: string
    parent_category_id: string
    is_active: boolean
  }[] = []

  for (const [parentHandle, childMap] of childrenByParent) {
    const parent = byHandle.get(parentHandle)
    if (!parent?.id) {
      throw new Error(`Categoria padre mancante per handle: ${parentHandle}`)
    }
    for (const ch of childMap.values()) {
      if (!byHandle.has(ch.handle)) {
        childPayload.push({
          name: ch.name,
          handle: ch.handle,
          parent_category_id: parent.id,
          is_active: true,
        })
      }
    }
  }

  if (childPayload.length) {
    const { result } = await createProductCategoriesWorkflow(container).run({
      input: { product_categories: childPayload },
    })
    for (const c of result) {
      byHandle.set(c.handle, c)
    }
    logger.info(`Sottocategorie: create ${childPayload.length}`)
  } else {
    logger.info("Sottocategorie: nessuna nuova (già presenti)")
  }
}

function wantsRunConfirm(): boolean {
  return (
    process.env.IMPORT_MARKETPLACE_CONFIRM === "1" ||
    process.argv.includes("--confirm")
  )
}

function defaultJsonPath(): string {
  const fromEnv = process.env.MARKETPLACE_IMPORT_JSON?.trim()
  if (fromEnv) {
    return path.isAbsolute(fromEnv)
      ? fromEnv
      : path.resolve(process.cwd(), fromEnv)
  }
  return path.resolve(process.cwd(), "../marketplace_sellers_all_10.json")
}

/**
 * Import da marketplace_sellers_all_*.json:
 * - albero categorie da merceologie (parent_menu_title → label) + other_company_products
 * - seller: email {slug}@IMPORT_SELLER_EMAIL_DOMAIN (default tramelle.com), password IMPORT_SELLER_PASSWORD (default **testpassword**, vedi `dati_venditori/tramelle_import_defaults.py`)
 * - fulfillment minimo come nel seed (stock, shipping Europe)
 *
 * IMPORT_MARKETPLACE_CONFIRM=1 npx medusa exec ./src/scripts/import-json-catalog.ts
 *
 * Testo lungo Pitti: **`metadata.tramelle_import_description_source`** su listing profile (intero, nessun taglio).
 * Le tab **`tramelle_description_i18n`** non sono riempite dall’import (es. revisione IT + traduzioni a parte).
 * Alla creazione seller, **`description`** sul record resta vuota; lo storefront può usare la sorgente come fallback IT finché manca i18n.
 *
 * Seller già presenti (`IMPORT_UPDATE_SELLER_PHOTOS=1`): aggiorna `photo`, `state` (regione da `listing_country`),
 * **`country_code`** (default `it`, vedi `IMPORT_SELLER_COUNTRY_CODE`),
 * metadata (sito, logo_url, hero, gallery, **listing_region**, **taste_category_handles**, **taste_region_by_handle**),
 * e **email / phone** sul record seller: email = sellerImportEmailFromSlug (stesso schema della creazione).
 *
 * IMPORT_UPDATE_SELLER_PHOTOS=1 IMPORT_MARKETPLACE_CONFIRM=1 MARKETPLACE_IMPORT_JSON=... npx medusa exec ./src/scripts/import-json-catalog.ts
 *
 * Dominio email seller (default tramelle.com): IMPORT_SELLER_EMAIL_DOMAIN=tramelle.com
 *
 * Allineare password login vendor (Auth emailpass) a IMPORT_SELLER_PASSWORD sugli seller aggiornati:
 * IMPORT_SYNC_SELLER_AUTH=1 IMPORT_UPDATE_SELLER_PHOTOS=1 ...
 *
 * Solo foto/auth su seller già presenti (nessuna creazione account):
 * IMPORT_SKIP_SELLER_CREATE=1 IMPORT_UPDATE_SELLER_PHOTOS=1 ...
 *
 * Solo categorie/sottocategorie dall’intero JSON (es. 783 espositori):
 * IMPORT_CATEGORIES_ONLY=1 IMPORT_MARKETPLACE_CONFIRM=1 MARKETPLACE_IMPORT_JSON=... npx medusa exec ./src/scripts/import-json-catalog.ts
 *
 * Scrivere su ogni seller metadata.taste_category_handles e **taste_region_by_handle** (allineati al JSON):
 * IMPORT_SELLER_TASTE_CATEGORIES=1 (componibile con le flag sopra).
 *
 * Dopo ensureCategories, le sottocategorie taste ricevono **metadata.seller_origin_regions** (regioni dei seller nel JSON).
 *
 * **Solo aggiornare dati seller già in DB** (nessuna nuova categoria, nessun sync metadata categorie):
 * `IMPORT_SELLER_DATA_UPDATE_ONLY=1` + `IMPORT_UPDATE_SELLER_PHOTOS=1` (+ conferma). Con il merge da `buildSellerImportMetadata`,
 * ogni run aggiorna in place metadata (sito, regione, **taste_category_handles**, taste_region_by_handle, hero, gallery, **tramelle_import_description_source**, …) senza “rifare” l’albero categorie.
 *
 * Test su uno o più slug: `IMPORT_SELLER_SLUGS=mieli-thun` (comma/spazio separati).
 */
function wantsSellerDataUpdateOnly(): boolean {
  return (
    process.env.IMPORT_SELLER_DATA_UPDATE_ONLY === "1" ||
    process.argv.includes("--seller-data-update-only")
  )
}

function wantsSellerPhotoUpdate(): boolean {
  return (
    process.env.IMPORT_UPDATE_SELLER_PHOTOS === "1" ||
    process.argv.includes("--update-photos")
  )
}

/**
 * Dopo IMPORT_UPDATE_SELLER_PHOTOS, allinea provider Auth emailpass alla stessa password di creazione
 * (IMPORT_SELLER_PASSWORD), così il login vendor coincide con l’email impostata sul seller.
 */
function wantsSyncSellerAuth(): boolean {
  return (
    process.env.IMPORT_SYNC_SELLER_AUTH === "1" ||
    process.argv.includes("--sync-seller-auth")
  )
}

/** Solo ensureCategories (+ opz. metadata categorie): usare con JSON completo senza creare seller. */
function wantsCategoriesOnly(): boolean {
  return (
    process.env.IMPORT_CATEGORIES_ONLY === "1" ||
    process.argv.includes("--categories-only")
  )
}

function wantsSkipSellerCreate(): boolean {
  return (
    process.env.IMPORT_SKIP_SELLER_CREATE === "1" ||
    process.argv.includes("--skip-seller-create")
  )
}

/** Aggiorna metadata.taste_category_handles per ogni seller già nel DB. */
function wantsSellerTasteCategoryMetadata(): boolean {
  return (
    process.env.IMPORT_SELLER_TASTE_CATEGORIES === "1" ||
    process.argv.includes("--seller-taste-categories")
  )
}

async function updateSellerTasteCategoryMetadata(
  container: ExecArgs["container"],
  data: ImportFile,
  logger: { info: (msg: string) => void },
  sellerModule: {
    listSellers: (
      filters: { handle?: string },
      config?: { take?: number }
    ) => Promise<{ id: string }[]>
  },
  slugAllow: Set<string> | null
) {
  let updated = 0
  for (const row of data.sellers) {
    if (!importRowMatchesSlugAllowlist(row, slugAllow)) {
      continue
    }
    const handle = slugify(row.slug, 96)
    const handles = tasteCategoryHandlesForSeller(row)
    if (!handles.length) {
      continue
    }
    const found = await sellerModule.listSellers({ handle }, { take: 1 })
    if (!found.length) {
      continue
    }
    const id = found[0]!.id
    const existingMeta = await getSellerListingMetadata(container, id)
    const region = row.listing_country?.trim()
    const meta: Record<string, unknown> = {
      ...existingMeta,
      taste_category_handles: handles,
    }
    if (region) {
      meta.taste_region_by_handle = Object.fromEntries(
        handles.map((h) => [h, region])
      )
    }
    await setSellerListingMetadata(container, id, meta)
    updated++
  }
  logger.info(
    `=== Metadata taste_category_handles aggiornati per ${updated} seller (presenti nel DB) ===`
  )
}

export default async function importJsonCatalog({ container }: ExecArgs) {
  if (!wantsRunConfirm()) {
    throw new Error(
      "Import non eseguito. Usa IMPORT_MARKETPLACE_CONFIRM=1 (consigliato) oppure --confirm"
    )
  }

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const pwd = process.env.IMPORT_SELLER_PASSWORD || "testpassword"
  if (!wantsCategoriesOnly() && pwd.length < 8) {
    throw new Error("IMPORT_SELLER_PASSWORD deve avere almeno 8 caratteri")
  }
  if (wantsSyncSellerAuth() && pwd.length < 8) {
    throw new Error(
      "IMPORT_SYNC_SELLER_AUTH richiede IMPORT_SELLER_PASSWORD (minimo 8 caratteri)"
    )
  }

  const jsonPath = defaultJsonPath()
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`File JSON non trovato: ${jsonPath}`)
  }

  const raw = fs.readFileSync(jsonPath, "utf-8")
  const data = JSON.parse(raw) as ImportFile
  if (!Array.isArray(data.sellers)) {
    throw new Error("JSON non valido: manca sellers[]")
  }

  logger.info(`=== Import catalogo da ${jsonPath} (${data.sellers.length} seller) ===`)

  const slugAllow = sellerSlugAllowlist()
  if (slugAllow) {
    logger.info(
      `=== IMPORT_SELLER_SLUGS: aggiornamento/creazione limitato a [${[...slugAllow].join(", ")}] ===`
    )
  }

  if (wantsSellerDataUpdateOnly()) {
    logger.info(
      "=== IMPORT_SELLER_DATA_UPDATE_ONLY: salto ensureCategories e sync regioni su categorie (solo aggiornamento seller) ==="
    )
  } else {
    await ensureCategories(container, data, logger)
    await syncTasteCategoryOriginRegions(container, data, logger)
  }

  const sellerModuleEarly = container.resolve(SELLER_MODULE) as {
    listSellers: (
      filters: { email?: string; handle?: string },
      config?: { take?: number }
    ) => Promise<{ id: string }[]>
  }

  if (wantsSellerTasteCategoryMetadata()) {
    logger.info(
      "=== Aggiornamento metadata categorie Taste (taste_category_handles) ==="
    )
    await updateSellerTasteCategoryMetadata(
      container,
      data,
      logger,
      sellerModuleEarly,
      slugAllow
    )
  }

  if (wantsCategoriesOnly()) {
    logger.info(
      "=== IMPORT_CATEGORIES_ONLY: fatto. Uscita senza creare seller. ==="
    )
    return
  }

  let created = 0
  let skipped = 0

  if (!wantsSkipSellerCreate() && !wantsSellerDataUpdateOnly()) {
  const regionModule = container.resolve(Modules.REGION)
  const [region] = await regionModule.listRegions({}, { take: 1 })
  if (!region) {
    throw new Error("Nessuna regione nel DB. Esegui prima il seed delle regioni.")
  }

  const salesChannelModule = container.resolve(Modules.SALES_CHANNEL)
  const [salesChannel] = await salesChannelModule.listSalesChannels({}, { take: 1 })
  if (!salesChannel) {
    throw new Error("Nessun sales channel. Esegui prima il seed / setup store.")
  }

  const userService = container.resolve(Modules.USER)
  const authService = container.resolve(Modules.AUTH)
  const sellerModule = container.resolve(SELLER_MODULE) as {
    listSellers: (
      filters: { email?: string; handle?: string },
      config?: { take?: number }
    ) => Promise<{ id: string }[]>
  }

  for (const row of data.sellers) {
    const email = sellerImportEmailFromSlug(row.slug)
    const handle = slugify(row.slug, 96)
    if (!importRowMatchesSlugAllowlist(row, slugAllow)) {
      continue
    }
    const [existingUser] = await userService.listUsers({ email })
    const existingByHandle = await sellerModule.listSellers(
      { handle },
      { take: 1 }
    )
    if (existingUser || existingByHandle.length) {
      logger.info(
        `Seller saltato (già presente): ${email} (handle ${handle})`
      )
      skipped++
      continue
    }

      // Provider Auth module = "emailpass" (actor "seller" è solo nel path HTTP /auth/seller/emailpass)
      const { authIdentity } = await authService.register("emailpass", {
        body: { email, password: pwd },
      })

      const { result: seller } = await createSellerWorkflow.run({
        container,
        input: {
          auth_identity_id: authIdentity?.id,
          member: {
            name: row.name.slice(0, 200),
            email,
          },
          seller: {
            name: row.name.slice(0, 200),
          },
        },
      })

      const phone = row.phone?.trim()
      const importMeta = buildSellerImportMetadata(row)
      await updateSellerWorkflow(container).run({
        input: {
          id: seller.id,
          handle,
          email,
          phone: phone || undefined,
          photo: row.logo_url || undefined,
          state: row.listing_country?.trim() || undefined,
          country_code: IMPORT_SELLER_COUNTRY_CODE,
        } as never,
      })
      if (importMeta && Object.keys(importMeta).length) {
        await setSellerListingMetadata(container, seller.id, importMeta)
      }

      const stockLocation = await createSellerStockLocation(
        container,
        seller.id,
        salesChannel.id
      )
      const fulfillmentSetId =
        stockLocation.fulfillment_sets?.[0]?.id
      if (!fulfillmentSetId) {
        throw new Error(`Fulfillment set mancante per seller ${seller.id}`)
      }
      const serviceZone = await createServiceZoneForImportedSeller(
        container,
        seller.id,
        fulfillmentSetId,
        `EU - ${row.slug}`
      )
      await createSellerShippingOption(
        container,
        seller.id,
        row.slug,
        region.id,
        serviceZone.id
      )

      logger.info(`Seller creato: ${email} (${seller.name})`)
      created++
  }
  } else {
    logger.info(
      "=== IMPORT_SKIP_SELLER_CREATE: creazione seller saltata (solo aggiornamenti sotto) ==="
    )
  }

  const sellerModule = container.resolve(SELLER_MODULE) as {
    listSellers: (
      filters: { email?: string; handle?: string },
      config?: { take?: number }
    ) => Promise<{ id: string }[]>
  }

  if (wantsSellerPhotoUpdate()) {
    let mediaUpdated = 0
    logger.info(
      "=== Aggiornamento seller da JSON: email/phone, photo, hero (metadata) ==="
    )
    for (const row of data.sellers) {
      const email = sellerImportEmailFromSlug(row.slug)
      const phone = row.phone?.trim()
      const logo = row.logo_url?.trim()
      const banner = row.brand_banner_url?.trim()
      const handle = slugify(row.slug, 96)
      if (!importRowMatchesSlugAllowlist(row, slugAllow)) {
        continue
      }
      const found = await sellerModule.listSellers({ handle }, { take: 1 })
      if (!found.length) {
        logger.info(`Seller non trovato per handle ${handle}, salto`)
        continue
      }
      const id = found[0]!.id
      const existingMeta = await getSellerListingMetadata(container, id)
      const meta: Record<string, unknown> = { ...existingMeta }
      const importMetaPatch = buildSellerImportMetadata(row)
      if (importMetaPatch) {
        Object.assign(meta, importMetaPatch)
      }
      const listing = row.listing_country?.trim()
      const input: {
        id: string
        email: string
        phone?: string
        photo?: string
        state?: string
        country_code: string
      } = { id, email, country_code: IMPORT_SELLER_COUNTRY_CODE }
      if (phone) {
        input.phone = phone
      }
      if (logo) {
        input.photo = logo
      }
      if (listing) {
        input.state = listing
      }
      await updateSellerWorkflow(container).run({ input })
      await setSellerListingMetadata(container, id, meta)
      if (wantsSyncSellerAuth()) {
        const authService = container.resolve(Modules.AUTH)
        try {
          const result = await authService.updateProvider("emailpass", {
            entity_id: email,
            password: pwd,
          })
          if (
            result &&
            typeof result === "object" &&
            "success" in result &&
            (result as { success?: boolean }).success === false
          ) {
            logger.info(
              `Auth emailpass non aggiornato per ${email} (identity mancante?): controlla repair-seller-auth-identities`
            )
          }
        } catch (e) {
          logger.info(
            `Auth sync saltato per ${email}: ${e instanceof Error ? e.message : String(e)}`
          )
        }
      }
      logger.info(
        `Seller aggiornato: ${handle} email=${email}` +
          (phone ? ` tel=${phone}` : "") +
          (logo ? ` logo=…` : "") +
          (banner ? ` hero=…` : "") +
          (wantsSyncSellerAuth() ? ` auth=emailpass` : "")
      )
      mediaUpdated++
    }
    logger.info(`=== Seller aggiornati dal JSON: ${mediaUpdated} ===`)
  }

  logger.info(`=== Fine import: seller creati ${created}, saltati ${skipped} ===`)
}
