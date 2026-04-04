/**
 * Carica su Medusa File Module le immagini già presenti in disco (sync_partner_media_cdn)
 * e aggiorna seller.photo, metadata.hero_image_url e metadata.storytelling_gallery_urls.
 *
 * IMPORT_MARKETPLACE_CONFIRM=1 \
 * IMPORT_SELLER_MEDIA_LOCAL_DIR=../dati_venditori/partner_media_out/partner \
 * MARKETPLACE_IMPORT_JSON=../dati_venditori/output/marketplace_sellers_storytelling_test_10_import.json \
 * npx medusa exec ./src/scripts/upload-seller-media-local-to-medusa.ts
 *
 * Opzionale: IMPORT_SELLER_MEDIA_SLUG=biscotti-bizantini (slug separati da virgola).
 * Esegui sul backend con lo stesso DATABASE_URL di vendor.tramelle.com (altrimenti restano CDN /logo.svg).
 */
import * as fs from "node:fs"
import * as path from "node:path"

import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import type { IFileModuleService } from "@medusajs/types"
import { SELLER_MODULE } from "@mercurjs/b2c-core/modules/seller"
import { updateSellerWorkflow } from "@mercurjs/b2c-core/workflows"

type SellerRow = { slug: string }

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

function mimeForFile(filePath: string): string {
  const e = path.extname(filePath).replace(".", "").toLowerCase()
  switch (e) {
    case "png":
      return "image/png"
    case "gif":
      return "image/gif"
    case "webp":
      return "image/webp"
    case "svg":
      return "image/svg+xml"
    default:
      return "image/jpeg"
  }
}

function storytellingIndex(filename: string): number {
  const m = filename.match(/-(\d+)\.[^.]+$/)
  return m ? parseInt(m[1]!, 10) : 0
}

async function uploadOne(
  fileModule: IFileModuleService,
  filePath: string,
  logger: { info: (s: string) => void }
): Promise<string> {
  const buf = fs.readFileSync(filePath)
  const [created] = await fileModule.createFiles([
    {
      filename: path.basename(filePath),
      mimeType: mimeForFile(filePath),
      content: buf.toString("binary"),
      access: "public",
    },
  ])
  if (!created?.url) {
    throw new Error(`Upload fallito (nessun url): ${filePath}`)
  }
  logger.info(`    file → ${path.basename(filePath)}`)
  return created.url
}

function wantsConfirm(): boolean {
  return (
    process.env.IMPORT_MARKETPLACE_CONFIRM === "1" ||
    process.argv.includes("--confirm")
  )
}

export default async function uploadSellerMediaLocalToMedusa({
  container,
}: ExecArgs) {
  if (!wantsConfirm()) {
    throw new Error(
      "Aggiungi IMPORT_MARKETPLACE_CONFIRM=1 oppure --confirm per eseguire."
    )
  }

  const localDir = process.env.IMPORT_SELLER_MEDIA_LOCAL_DIR?.trim()
  if (!localDir) {
    throw new Error(
      "Imposta IMPORT_SELLER_MEDIA_LOCAL_DIR (es. .../partner_media_out/partner)"
    )
  }

  const fromEnv = process.env.MARKETPLACE_IMPORT_JSON?.trim()
  const jsonPath = fromEnv
    ? path.isAbsolute(fromEnv)
      ? fromEnv
      : path.resolve(process.cwd(), fromEnv)
    : path.resolve(
        process.cwd(),
        "../dati_venditori/output/marketplace_sellers_storytelling_test_10_import.json"
      )

  if (!fs.existsSync(jsonPath)) {
    throw new Error(`JSON non trovato: ${jsonPath}`)
  }

  const root = path.resolve(localDir)
  if (!fs.existsSync(root)) {
    throw new Error(`Directory media non trovata: ${root}`)
  }

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const fileModule = container.resolve(Modules.FILE) as IFileModuleService
  const sellerModule = container.resolve(SELLER_MODULE) as {
    listSellers: (
      filters: { handle?: string },
      config?: { take?: number }
    ) => Promise<{ id: string }[]>
    retrieveSeller?: (id: string) => Promise<{
      email?: string | null
      metadata?: Record<string, unknown> | null
    }>
  }

  let sellers = (
    JSON.parse(fs.readFileSync(jsonPath, "utf-8")) as { sellers?: SellerRow[] }
  ).sellers || []

  const slugFilter = process.env.IMPORT_SELLER_MEDIA_SLUG?.trim()
  if (slugFilter) {
    const wanted = new Set(
      slugFilter
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
    )
    sellers = sellers.filter((row) =>
      wanted.has(String(row.slug || "").trim().toLowerCase())
    )
    logger.info(`Filtro slug attivo → ${sellers.length} righe`)
  }

  logger.info(
    `=== Upload media locale → Medusa (${sellers.length} righe JSON) ===`
  )
  logger.info(`JSON: ${jsonPath}`)
  logger.info(`Cartella: ${root}`)
  logger.info(
    "Verifica DATABASE_URL: deve coincidere con il DB usato da vendor.tramelle.com."
  )

  let updated = 0
  for (const row of sellers) {
    const slug = String(row.slug || "").trim()
    if (!slug) continue

    const handle = slugify(slug, 96)
    const dir = path.join(root, slug)
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
      logger.info(`[salto] cartella assente: ${slug}`)
      continue
    }

    const found = await sellerModule.listSellers({ handle }, { take: 1 })
    if (!found.length) {
      logger.info(`[salto] seller non in DB handle=${handle}`)
      continue
    }
    const id = found[0]!.id

    const entries = fs.readdirSync(dir).filter((f) => !f.startsWith("."))
    const logo = entries.find((f) => f.startsWith("logo_"))
    const cover = entries.find((f) => f.startsWith("cover_"))
    const story = entries
      .filter((f) => f.startsWith("storytelling_"))
      .sort((a, b) => storytellingIndex(a) - storytellingIndex(b))

    logger.info(`Seller ${handle}:`)

    let photoUrl: string | undefined
    let heroUrl: string | undefined
    const galleryUrls: string[] = []

    if (logo) {
      photoUrl = await uploadOne(fileModule, path.join(dir, logo), logger)
    }
    if (cover) {
      heroUrl = await uploadOne(fileModule, path.join(dir, cover), logger)
    }
    for (const sf of story) {
      galleryUrls.push(await uploadOne(fileModule, path.join(dir, sf), logger))
    }

    if (!photoUrl && !heroUrl && galleryUrls.length === 0) {
      logger.info(`[salto] nessun file in ${dir}`)
      continue
    }

    let email = `${slugify(slug, 64)}@tramelle.com`
    let existingMeta: Record<string, unknown> = {}
    try {
      if (typeof sellerModule.retrieveSeller === "function") {
        const full = await sellerModule.retrieveSeller(id)
        const em = full?.email
        if (typeof em === "string" && em.trim().length > 0) {
          email = em.trim()
        }
        const m = full?.metadata
        if (m && typeof m === "object" && !Array.isArray(m)) {
          existingMeta = { ...m }
        }
      }
    } catch {
      /* opzionale */
    }

    const meta: Record<string, unknown> = { ...existingMeta }
    if (heroUrl) meta.hero_image_url = heroUrl
    if (galleryUrls.length) meta.storytelling_gallery_urls = galleryUrls

    await updateSellerWorkflow(container).run({
      input: {
        id,
        email,
        ...(photoUrl ? { photo: photoUrl } : {}),
        metadata: meta,
      } as never,
    })
    logger.info(
      `  OK email=${email} photo=${photoUrl ? "Medusa URL" : "—"} hero=${heroUrl ? "Medusa URL" : "—"} gallery=${galleryUrls.length}`
    )
    updated++
  }

  logger.info(`=== Completato: ${updated} seller aggiornati ===`)
}
