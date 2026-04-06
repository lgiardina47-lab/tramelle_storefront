import * as cp from "node:child_process"

import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { SELLER_MODULE } from "@mercurjs/b2c-core/modules/seller"
import { deleteSellerWorkflow } from "@mercurjs/b2c-core/workflows"

import { removeMedusaEmailpassAuthForEmails } from "../lib/remove-medusa-emailpass-auth"
import { getSellerListingMetadata } from "../lib/seller-listing-metadata"
import { SELLER_LISTING_PROFILE_MODULE } from "../modules/seller-listing-profile"
import type SellerListingProfileModuleService from "../modules/seller-listing-profile/service"

/**
 * Raggruppa i seller per dominio (metadata listing website_url / website_domain).
 * Mantiene created_at più vecchio; per i duplicati:
 * - salta se hanno prodotti collegati (seller_seller_product_product);
 * - soft-delete seller_listing_profile, membri, poi seller (workflow Mercur);
 * - soft-delete Medusa Auth (`provider_identity` + `auth_identity`, provider emailpass) per le email del seller rimosso — stesso Postgres Supabase del progetto;
 * - opzionale: rm -rf cartelle /partner/{slug}/ sul CDN (SSH).
 *
 * Nota: se usi anche Supabase Auth (`auth.users`) oltre a Medusa, quella va allineata a parte; questo script agisce solo sul modulo Auth di Medusa.
 *
 * Dry-run:
 *   cd backend && npx medusa exec ./src/scripts/dedupe-sellers-by-domain-remove-newest.ts
 *
 * DB:
 *   DEDUPE_DOMAIN_SELLERS_CONFIRM=1 npx medusa exec ./src/scripts/dedupe-sellers-by-domain-remove-newest.ts
 *
 * CDN (stesso formato di sync_partner_media_cdn.py):
 *   DEDUPE_DOMAIN_SELLERS_CONFIRM=1 DEDUPE_CDN_DELETE_CONFIRM=1 TRAMELLE_CDN_RSYNC_DEST=user@host:/var/www/cdn/partner npx medusa exec ./src/scripts/dedupe-sellers-by-domain-remove-newest.ts
 */

function normalizedHostFromListingMeta(
  meta: Record<string, unknown>
): string | null {
  const urlRaw =
    typeof meta.website_url === "string" ? meta.website_url.trim() : ""
  const domRaw =
    typeof meta.website_domain === "string"
      ? meta.website_domain.trim()
      : ""
  const hostCandidate =
    urlRaw ||
    (domRaw
      ? domRaw.replace(/^https?:\/\//i, "").split("/")[0]?.trim() ?? ""
      : "")
  if (!hostCandidate) {
    return null
  }
  try {
    const u = new URL(
      hostCandidate.startsWith("http") ? hostCandidate : `https://${hostCandidate}`
    )
    return u.hostname.replace(/^www\./i, "").toLowerCase() || null
  } catch {
    return null
  }
}

type SellerRow = {
  id: string
  handle?: string
  email?: string | null
  name?: string
  createdAt: Date
  host: string
}

function isSafePartnerSlug(s: string): boolean {
  return /^[a-z0-9][a-z0-9_-]*$/i.test(s) && s.length > 0 && s.length < 200
}

function partnerFoldersForCdn(
  row: SellerRow,
  meta: Record<string, unknown>
): string[] {
  const slugs = new Set<string>()
  if (row.handle && isSafePartnerSlug(row.handle)) {
    slugs.add(row.handle)
  }
  if (row.email?.includes("@")) {
    const local = row.email.split("@")[0]!.trim()
    if (local && isSafePartnerSlug(local)) {
      slugs.add(local)
    }
  }
  const urls: string[] = []
  for (const k of ["hero_image_url", "logo_url", "website_url"] as const) {
    const v = meta[k]
    if (typeof v === "string") {
      urls.push(v)
    }
  }
  const gal = meta.storytelling_gallery_urls
  if (Array.isArray(gal)) {
    for (const u of gal) {
      if (typeof u === "string") {
        urls.push(u)
      }
    }
  }
  for (const raw of urls) {
    if (!raw.includes("/partner/")) {
      continue
    }
    try {
      const pathname = new URL(raw).pathname
      const m = pathname.match(/\/partner\/([^/]+)/)
      if (m?.[1]) {
        const seg = decodeURIComponent(m[1])
        if (isSafePartnerSlug(seg)) {
          slugs.add(seg)
        }
      }
    } catch {
      /* skip */
    }
  }
  return [...slugs]
}

function collectEmailsForSeller(
  sellerEmail: string | null | undefined,
  members: { email?: string | null }[] | undefined
): string[] {
  const out = new Set<string>()
  if (typeof sellerEmail === "string" && sellerEmail.includes("@")) {
    out.add(sellerEmail.trim().toLowerCase())
  }
  if (Array.isArray(members)) {
    for (const m of members) {
      const e = m.email
      if (typeof e === "string" && e.includes("@")) {
        out.add(e.trim().toLowerCase())
      }
    }
  }
  return [...out]
}

function removeCdnPartnerFolders(
  logger: { info: (s: string) => void; error: (s: string) => void },
  folders: string[]
): void {
  const dest = process.env.TRAMELLE_CDN_RSYNC_DEST?.trim()
  const enabled = process.env.DEDUPE_CDN_DELETE_CONFIRM === "1"
  if (!folders.length) {
    return
  }
  if (!enabled || !dest) {
    logger.info(
      `[dedupe-domain] CDN: cartelle candidate → ${folders.join(", ")} (per rimuovere: DEDUPE_CDN_DELETE_CONFIRM=1 e TRAMELLE_CDN_RSYNC_DEST)`
    )
    return
  }
  const colon = dest.indexOf(":")
  if (colon < 0) {
    logger.error(
      "[dedupe-domain] TRAMELLE_CDN_RSYNC_DEST atteso come user@host:/path/partner/"
    )
    return
  }
  const sshTarget = dest.slice(0, colon)
  const remotePath = dest.slice(colon + 1).replace(/\/$/, "")
  for (const folder of folders) {
    const target = `${remotePath}/${folder}`.replace(/'/g, "'\\''")
    try {
      cp.execFileSync("ssh", [sshTarget, `rm -rf '${target}'`], {
        stdio: "pipe",
        encoding: "utf-8",
      })
      logger.info(`[dedupe-domain] CDN rimosso: ${sshTarget}:${remotePath}/${folder}`)
    } catch (e) {
      logger.error(
        `[dedupe-domain] CDN rm fallito partner/${folder}: ${e instanceof Error ? e.message : String(e)}`
      )
    }
  }
}

export default async function dedupeSellersByDomainRemoveNewest({
  container,
}: ExecArgs) {
  const confirm = process.env.DEDUPE_DOMAIN_SELLERS_CONFIRM === "1"
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  const sellerModule = container.resolve(SELLER_MODULE) as {
    listSellers: (
      filters: Record<string, unknown>,
      config?: { take?: number }
    ) => Promise<{ id: string }[]>
    retrieveSeller: (
      id: string,
      config?: { relations?: string[] }
    ) => Promise<
      Record<string, unknown> & {
        members?: { id: string; email?: string | null }[]
      }
    >
    softDeleteMembers: (id: string) => Promise<unknown>
  }

  const list = await sellerModule.listSellers({}, { take: 50_000 })
  const rows: SellerRow[] = []

  for (const ref of list) {
    const full = await sellerModule.retrieveSeller(ref.id)
    const meta = await getSellerListingMetadata(container, ref.id)
    const host = normalizedHostFromListingMeta(meta)
    if (!host) {
      continue
    }
    const createdRaw = full.created_at
    const createdAt =
      createdRaw instanceof Date
        ? createdRaw
        : typeof createdRaw === "string"
          ? new Date(createdRaw)
          : new Date(0)
    const handle =
      typeof full.handle === "string" ? full.handle.trim() : undefined
    const email =
      typeof full.email === "string" ? full.email.trim() : undefined
    const name = typeof full.name === "string" ? full.name.trim() : undefined
    rows.push({
      id: full.id as string,
      handle,
      email: email ?? null,
      name,
      createdAt,
      host,
    })
  }

  const byHost = new Map<string, SellerRow[]>()
  for (const r of rows) {
    if (!byHost.has(r.host)) {
      byHost.set(r.host, [])
    }
    byHost.get(r.host)!.push(r)
  }

  const duplicateGroups = [...byHost.entries()].filter(
    ([, arr]) => arr.length > 1
  )

  const toRemove: SellerRow[] = []

  for (const [, group] of duplicateGroups) {
    const sorted = [...group].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    )
    const remove = sorted.slice(1)
    for (const r of remove) {
      toRemove.push(r)
    }
  }

  logger.info(
    `[dedupe-domain] seller con sito: ${rows.length} | gruppi dominio duplicati: ${duplicateGroups.length} | da rimuovere (più recenti): ${toRemove.length} | confirm=${confirm}`
  )

  for (const g of duplicateGroups) {
    const [host, arr] = g
    const sorted = [...arr].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    )
    logger.info(
      `[dedupe-domain] host=${host} keeper=${sorted[0]!.id} ${sorted[0]!.createdAt.toISOString()} duplicates=${sorted.slice(1).map((x) => `${x.id}@${x.createdAt.toISOString()}`).join(", ")}`
    )
  }

  if (!confirm) {
    logger.info(
      "[dedupe-domain] Dry-run: nessuna cancellazione. Imposta DEDUPE_DOMAIN_SELLERS_CONFIRM=1 per applicare."
    )
    return
  }

  const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION) as {
    (t: string): {
      where: (w: Record<string, unknown>) => {
        count: (expr: string) => { first: () => Promise<{ c: string | number } | undefined> }
      }
    }
  }

  const slp = container.resolve(
    SELLER_LISTING_PROFILE_MODULE
  ) as InstanceType<typeof SellerListingProfileModuleService> & {
    softDeleteSellerListingProfiles?: (ids: string[]) => Promise<unknown>
  }

  let done = 0
  let skippedProducts = 0

  for (const row of toRemove) {
    const pc = await knex("seller_seller_product_product")
      .where({ seller_id: row.id, deleted_at: null })
      .count("* as c")
      .first()
    const productCount = Number(pc?.c ?? 0)
    if (productCount > 0) {
      logger.warn(
        `[dedupe-domain] SALTO ${row.id} (${row.handle ?? row.email}): ${productCount} prodotti collegati`
      )
      skippedProducts++
      continue
    }

    const meta = await getSellerListingMetadata(container, row.id)
    const cdnFolders = partnerFoldersForCdn(row, meta)

    let emailsForAuth: string[] = []
    try {
      const snap = await sellerModule.retrieveSeller(row.id, {
        relations: ["members"],
      })
      emailsForAuth = collectEmailsForSeller(row.email ?? null, snap.members)
    } catch {
      emailsForAuth = collectEmailsForSeller(row.email ?? null, undefined)
    }

    try {
      const profiles = await slp.listSellerListingProfiles(
        { seller_id: row.id },
        { take: 10 }
      )
      if (profiles.length && typeof slp.softDeleteSellerListingProfiles === "function") {
        await slp.softDeleteSellerListingProfiles(profiles.map((p) => p.id))
        logger.info(
          `[dedupe-domain] seller_listing_profile rimosso per seller ${row.id}`
        )
      }
    } catch (e) {
      logger.error(
        `[dedupe-domain] seller_listing_profile: ${e instanceof Error ? e.message : String(e)}`
      )
    }

    try {
      const full = await sellerModule.retrieveSeller(row.id, {
        relations: ["members"],
      })
      const members = full.members
      if (Array.isArray(members) && members.length) {
        for (const m of members) {
          await sellerModule.softDeleteMembers(m.id)
        }
        logger.info(
          `[dedupe-domain] ${members.length} membri rimossi per seller ${row.id}`
        )
      }
    } catch (e) {
      logger.error(
        `[dedupe-domain] membri: ${e instanceof Error ? e.message : String(e)}`
      )
    }

    try {
      await deleteSellerWorkflow(container).run({ input: row.id })
      logger.info(
        `[dedupe-domain] soft-delete seller ${row.id} (${row.host}) handle=${row.handle ?? ""}`
      )
      done++
    } catch (e) {
      logger.error(
        `[dedupe-domain] ERRORE eliminando seller ${row.id}: ${e instanceof Error ? e.message : String(e)}`
      )
      continue
    }

    await removeMedusaEmailpassAuthForEmails(
      container,
      logger,
      emailsForAuth,
      "[dedupe-domain]"
    )

    removeCdnPartnerFolders(logger, cdnFolders)
  }

  logger.info(
    `[dedupe-domain] Fine: seller rimossi ${done}, saltati (prodotti) ${skippedProducts}, tentativi totali ${toRemove.length}. Auth emailpass Medusa (DB Supabase) rimosso per le email dei seller eliminati.`
  )
}
