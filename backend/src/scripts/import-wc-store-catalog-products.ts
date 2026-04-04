/**
 * Import prodotti da JSON catalogo WooCommerce Store API (es. output di dati_ecommerce/scripts/alpemagna-catalog-build.mjs).
 *
 * Modello Mercur / Medusa 2 (marketplace):
 * - **Store**: un solo record piattaforma in tabella `store` (es. "Medusa Store"). Non esiste uno `store` per ogni brand.
 * - **Vendor "Alpe Magna"**: è un **seller** (`seller.handle` = `alpe-magna`, `seller.name` ≈ ALPE MAGNA).
 * - **Associazione prodotto → vendor**: tabella di link `seller_seller_product_product` (product_id ↔ seller_id),
 *   creata da `createProductsWorkflow` con `additional_data: { seller_id }`. La tabella `product` **non** ha `store_id`.
 *
 * ID nel DB: `npx medusa exec ./src/scripts/print-marketplace-store-and-seller-ids.ts`
 *
 * IMPORT_MARKETPLACE_CONFIRM=1 \
 * MARKETPLACE_WC_CATALOG_JSON=../dati_ecommerce/output/alpemagna-catalog.json \
 * IMPORT_WC_PRODUCTS_SELLER_HANDLE=alpe-magna \
 * npx medusa exec ./src/scripts/import-wc-store-catalog-products.ts
 *
 * Opzionale:
 * - MARKETPLACE_WC_CATALOG_JSON: path (default: ../dati_ecommerce/output/alpemagna-catalog.json da cwd backend)
 * - IMPORT_WC_PRODUCT_HANDLE_PREFIX: prefisso handle (default: "{sellerHandle}-" — no doppio trattino, non URL-safe in Medusa)
 * - IMPORT_WC_SKIP_EXISTING=0: se "0", tenta comunque la creazione (utile solo per debug; fallirà su handle duplicati)
 */

import * as fs from "node:fs"
import * as path from "node:path"

import type { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils"
import { createProductsWorkflow } from "@medusajs/medusa/core-flows"
import { SELLER_MODULE } from "@mercurjs/b2c-core/modules/seller"

type WcCatalogTerm = { id?: number; slug: string; name: string }
type WcCatalogAttribute = {
  id?: number
  name: string
  taxonomy: string
  terms: WcCatalogTerm[]
}
type WcProductImage = { role?: string; url: string }
type WcProductCategory = { id?: number; slug: string; name: string }
type WcPrices = {
  amount: number
  regularAmount?: number
  currency?: string
}
type WcProductDetail = {
  description?: string
  title?: string
  line?: string
  url?: string
}
type WcProduct = {
  id: number
  sku: string
  slug: string
  name: string
  permalink: string
  type: string
  onSale?: boolean
  prices: WcPrices
  categories?: WcProductCategory[]
  images?: WcProductImage[]
  attributes?: WcCatalogAttribute[]
  tags?: unknown[]
  brands?: unknown[]
  detail?: WcProductDetail
}

type WcCatalogFile = {
  products?: WcProduct[]
}

function wantsConfirm(): boolean {
  return (
    process.env.IMPORT_MARKETPLACE_CONFIRM === "1" ||
    process.argv.includes("--confirm")
  )
}

function defaultCatalogPath(): string {
  const fromEnv = process.env.MARKETPLACE_WC_CATALOG_JSON?.trim()
  if (fromEnv) {
    return path.isAbsolute(fromEnv)
      ? fromEnv
      : path.resolve(process.cwd(), fromEnv)
  }
  return path.resolve(
    process.cwd(),
    "../dati_ecommerce/output/alpemagna-catalog.json"
  )
}

function slugify(input: string, max = 96): string {
  const s = input
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  const base = s || "p"
  return base.length > max ? base.slice(0, max) : base
}

function pickImages(p: WcProduct): {
  thumbnail?: string
  images: { url: string }[]
} {
  const imgs = p.images ?? []
  const urls = imgs.map((i) => String(i.url).trim()).filter(Boolean)
  const productFirst = imgs.find((i) => i.role === "product")?.url?.trim()
  const thumb = (productFirst || urls[0])?.trim()
  const unique = [...new Set(urls)]
  return {
    thumbnail: thumb,
    images: unique.map((url) => ({ url })),
  }
}

function buildOptionsFromAttributes(attrs: WcCatalogAttribute[] | undefined): {
  options: { title: string; values: string[] }[]
  variantOptions: Record<string, string>
} {
  const options: { title: string; values: string[] }[] = []
  const variantOptions: Record<string, string> = {}
  if (!attrs?.length) {
    return { options, variantOptions }
  }
  for (const a of attrs) {
    const title = String(a.name || a.taxonomy || "Attributo").slice(0, 120)
    const termLabels = (a.terms ?? [])
      .map((t) => String(t.name || t.slug).trim())
      .filter(Boolean)
    if (!termLabels.length) {
      continue
    }
    const value = termLabels.join(", ").slice(0, 255)
    options.push({ title, values: [value] })
    variantOptions[title] = value
  }
  return { options, variantOptions }
}

function descriptionFromProduct(p: WcProduct): string {
  const html = p.detail?.description?.trim()
  if (html) {
    return html.slice(0, 65000)
  }
  const line = p.detail?.line?.trim()
  if (line) {
    return line.slice(0, 2000)
  }
  const { options } = buildOptionsFromAttributes(p.attributes)
  if (!options.length) {
    return ""
  }
  const lines = options.map((o) => `<p><strong>${o.title}</strong>: ${o.values[0]}</p>`)
  return lines.join("\n").slice(0, 8000)
}

function parsePriceAmount(p: WcProduct): number {
  const raw = p.prices?.amount
  if (typeof raw !== "number" || Number.isNaN(raw)) {
    return 0
  }
  return Math.round(raw * 100) / 100
}

export default async function importWcStoreCatalogProducts({
  container,
}: ExecArgs) {
  if (!wantsConfirm()) {
    throw new Error(
      "Imposta IMPORT_MARKETPLACE_CONFIRM=1 oppure aggiungi --confirm per eseguire."
    )
  }

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const jsonPath = defaultCatalogPath()
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`File catalogo non trovato: ${jsonPath}`)
  }

  const raw = fs.readFileSync(jsonPath, "utf-8")
  const data = JSON.parse(raw) as WcCatalogFile
  if (!Array.isArray(data.products) || !data.products.length) {
    throw new Error("JSON non valido: atteso products[] non vuoto")
  }

  const sellerHandle = (
    process.env.IMPORT_WC_PRODUCTS_SELLER_HANDLE || "alpe-magna"
  )
    .trim()
    .toLowerCase()
  const sellerHandleNorm = slugify(sellerHandle, 96)

  const prefixRaw = process.env.IMPORT_WC_PRODUCT_HANDLE_PREFIX?.trim()
  const handlePrefix =
    prefixRaw === ""
      ? ""
      : (prefixRaw ?? `${sellerHandleNorm}-`)

  const skipExisting =
    process.env.IMPORT_WC_SKIP_EXISTING !== "0" &&
    process.env.IMPORT_WC_SKIP_EXISTING !== "false"

  const sellerModule = container.resolve(SELLER_MODULE) as {
    listSellers: (
      filters: { handle?: string },
      config?: { take?: number }
    ) => Promise<{ id: string }[]>
  }
  const [seller] = await sellerModule.listSellers(
    { handle: sellerHandleNorm },
    { take: 1 }
  )
  if (!seller) {
    throw new Error(
      `Seller non trovato per handle "${sellerHandleNorm}". Crea prima il seller o imposta IMPORT_WC_PRODUCTS_SELLER_HANDLE.`
    )
  }

  const salesChannelModule = container.resolve(Modules.SALES_CHANNEL)
  const [salesChannel] = await salesChannelModule.listSalesChannels(
    {},
    { take: 1 }
  )
  if (!salesChannel) {
    throw new Error("Nessun sales channel: eseguire prima seed / setup store.")
  }

  const productModule = container.resolve(Modules.PRODUCT)
  const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION) as unknown as {
    (table: string): any
  }

  const linkRows = await knex("seller_seller_product_product")
    .where({ seller_id: seller.id })
    .whereNull("deleted_at")
    .select("product_id")
  const productIds = linkRows.map((r: { product_id: string }) => r.product_id)

  const existingHandles = new Set<string>()
  if (productIds.length) {
    const chunk = 200
    for (let i = 0; i < productIds.length; i += chunk) {
      const slice = productIds.slice(i, i + chunk)
      const [batch] = await productModule.listAndCountProducts(
        { id: slice },
        { select: ["handle"] }
      )
      for (const p of batch) {
        if (p.handle) {
          existingHandles.add(p.handle)
        }
      }
    }
  }

  logger.info(
    `=== Import WC catalog: ${jsonPath} → seller ${sellerHandleNorm} (${data.products.length} righe JSON, ${existingHandles.size} handle già collegati) ===`
  )

  let skipped = 0
  const inputProducts: Record<string, unknown>[] = []

  for (const p of data.products) {
    if (p.type && p.type !== "simple") {
      logger.info(`Salto prodotto non simple: ${p.slug} (${p.type})`)
      skipped++
      continue
    }
    const handle = `${handlePrefix}${slugify(p.slug, 100)}`.replace(
      /^-+|-+$/g,
      ""
    )
    if (skipExisting && existingHandles.has(handle)) {
      skipped++
      continue
    }

    const { thumbnail, images } = pickImages(p)
    const { options, variantOptions } = buildOptionsFromAttributes(p.attributes)
    const amount = parsePriceAmount(p)
    const currency = (p.prices?.currency || "EUR").toLowerCase()

    const subtitle = p.detail?.line?.trim()?.slice(0, 255) || undefined

    const categories: { id: string }[] = []
    for (const c of p.categories ?? []) {
      const slug = String(c.slug || "").trim()
      if (!slug) {
        continue
      }
      const [cat] = await productModule.listProductCategories(
        { handle: slug },
        { take: 1, select: ["id"] }
      )
      if (cat?.id) {
        categories.push({ id: cat.id })
      }
    }

    const variantTitle =
      options.length > 0
        ? Object.values(variantOptions).join(" · ").slice(0, 200) || p.name
        : p.name

    const variantBlock =
      options.length > 0
        ? {
            title: variantTitle,
            sku: String(p.sku || "").slice(0, 200) || undefined,
            allow_backorder: false,
            manage_inventory: true,
            prices: [{ amount, currency_code: currency }],
            options: variantOptions,
          }
        : {
            title: variantTitle,
            sku: String(p.sku || "").slice(0, 200) || undefined,
            allow_backorder: false,
            manage_inventory: true,
            prices: [{ amount, currency_code: currency }],
          }

    const row = {
      title: p.name.slice(0, 255),
      handle,
      subtitle,
      description: descriptionFromProduct(p) || p.name,
      is_giftcard: false,
      status: ProductStatus.PUBLISHED,
      discountable: true,
      ...(thumbnail ? { thumbnail } : {}),
      images,
      ...(options.length ? { options } : {}),
      variants: [variantBlock],
      sales_channels: [{ id: salesChannel.id }],
      ...(categories.length ? { categories } : {}),
      metadata: {
        wc_product_id: String(p.id),
        wc_permalink: p.permalink,
        import_source: "wc-store-catalog",
        import_catalog_path: path.basename(jsonPath),
      } as Record<string, unknown>,
    }

    inputProducts.push(row)
  }

  if (!inputProducts.length) {
    logger.info(`Nessun prodotto da creare (saltati ${skipped}).`)
    return
  }

  const BATCH = 8
  let created = 0
  for (let i = 0; i < inputProducts.length; i += BATCH) {
    const chunk = inputProducts.slice(i, i + BATCH)
    const { result } = await createProductsWorkflow.run({
      container,
      input: {
        products: chunk,
        additional_data: {
          seller_id: seller.id,
        },
      },
    })
    created += result?.length ?? chunk.length
    logger.info(`Batch prodotti: ${i + 1}-${i + chunk.length} / ${inputProducts.length}`)
  }

  logger.info(
    `=== Fine import WC: creati ~${created} prodotti, già presenti/saltati ${skipped} ===`
  )
}
