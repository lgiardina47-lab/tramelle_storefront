import * as fs from "node:fs"
import * as path from "node:path"

import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { SELLER_MODULE } from "@mercurjs/b2c-core/modules/seller"

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

type JsonRow = {
  slug?: string
  name?: string
  detail_url?: string
  website_url?: string
}

type ImportFile = {
  sellers?: JsonRow[]
}

/**
 * Confronta sellers[] nel JSON con handle già in DB. Scrive *_already_in_db.json accanto al file.
 *
 *   cd backend && DIFF_IMPORT_SELLERS_CONFIRM=1 \\
 *     MARKETPLACE_IMPORT_JSON=../dati_venditori/output/marketplace_sellers_all_taste_15_....json \\
 *     npx medusa exec ./src/scripts/diff-import-sellers-vs-db.ts
 */
export default async function diffImportSellersVsDb({ container }: ExecArgs) {
  if (process.env.DIFF_IMPORT_SELLERS_CONFIRM !== "1") {
    throw new Error(
      "DIFF_IMPORT_SELLERS_CONFIRM=1 e MARKETPLACE_IMPORT_JSON richiesti."
    )
  }

  const rawPath = process.env.MARKETPLACE_IMPORT_JSON?.trim()
  if (!rawPath) {
    throw new Error("MARKETPLACE_IMPORT_JSON obbligatorio.")
  }

  const abs = path.isAbsolute(rawPath) ? rawPath : path.resolve(process.cwd(), rawPath)
  if (!fs.existsSync(abs)) {
    throw new Error(`File non trovato: ${abs}`)
  }

  const data = JSON.parse(fs.readFileSync(abs, "utf-8")) as ImportFile
  const rows = Array.isArray(data.sellers) ? data.sellers : []

  const sellerModule = container.resolve(SELLER_MODULE) as {
    listSellers: (
      filters: Record<string, unknown>,
      config?: { take?: number }
    ) => Promise<{ id: string }[]>
    retrieveSeller: (id: string) => Promise<Record<string, unknown>>
  }

  const dbByHandle = new Map<
    string,
    { id: string; name?: string; email?: string | null }
  >()

  const list = await sellerModule.listSellers({}, { take: 10_000 })
  for (const row of list) {
    const full = await sellerModule.retrieveSeller(row.id)
    const handle =
      typeof full.handle === "string" ? full.handle.trim() : undefined
    if (!handle) {
      continue
    }
    const email =
      typeof full.email === "string" ? full.email.trim() : undefined
    const name =
      typeof full.name === "string" ? full.name.trim() : undefined
    dbByHandle.set(handle, {
      id: full.id as string,
      name,
      email: email ?? null,
    })
  }

  const already_present: {
    slug: string
    handle: string
    name_json?: string
    website_url?: string
    db_id: string
    db_name?: string
    db_email?: string | null
  }[] = []

  const new_sellers: {
    slug: string
    handle: string
    name?: string
    website_url?: string
  }[] = []

  for (const s of rows) {
    const slug = (s.slug || "").trim()
    if (!slug) {
      continue
    }
    const handle = slugify(slug, 96)
    const dbEntry = dbByHandle.get(handle)
    if (dbEntry) {
      already_present.push({
        slug,
        handle,
        name_json: s.name,
        website_url: s.website_url,
        db_id: dbEntry.id,
        db_name: dbEntry.name,
        db_email: dbEntry.email,
      })
    } else {
      new_sellers.push({
        slug,
        handle,
        name: s.name,
        website_url: s.website_url,
      })
    }
  }

  const hostKey = (url: string | undefined): string | null => {
    if (!url || typeof url !== "string") {
      return null
    }
    try {
      const u = new URL(url.startsWith("http") ? url : `https://${url}`)
      return u.hostname.replace(/^www\./i, "").toLowerCase()
    } catch {
      return null
    }
  }

  const byHost = new Map<string, { slug: string; handle: string }[]>()
  for (const s of new_sellers) {
    const h = hostKey(s.website_url)
    if (!h) {
      continue
    }
    if (!byHost.has(h)) {
      byHost.set(h, [])
    }
    byHost.get(h)!.push({ slug: s.slug, handle: s.handle })
  }
  const possible_duplicate_hosts = [...byHost.entries()]
    .filter(([, arr]) => arr.length > 1)
    .map(([hostname, sellers]) => ({ hostname, sellers }))

  const base = path.basename(abs, path.extname(abs))
  const outDir = path.dirname(abs)
  const reportPath = (
    process.env.DIFF_IMPORT_REPORT_PATH?.trim() ||
    path.join(outDir, `${base}_already_in_db.json`)
  ).trim()

  const report = {
    generated_at_utc: new Date().toISOString(),
    source_json: abs,
    counts: {
      json_sellers: rows.length,
      db_sellers_with_handle: dbByHandle.size,
      already_in_db: already_present.length,
      new_in_json_not_in_db: new_sellers.length,
      possible_duplicate_hosts_same_json: possible_duplicate_hosts.length,
    },
    already_present,
    new_sellers,
    possible_duplicate_hosts,
  }

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf-8")

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  logger.info(
    `diff-import-sellers-vs-db → ${reportPath} | già in DB: ${already_present.length} | nuovi: ${new_sellers.length}`
  )
}
