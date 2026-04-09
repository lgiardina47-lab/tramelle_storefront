/**
 * Elimina **tutti** i seller (e i relativi account emailpass Medusa), per ripartire da DB pulito.
 * Non tocca il CDN (cartelle partner): gestione manuale.
 *
 * Esclusi di default: **alpe-magna@tramelle.com** (override con `DELETE_ALL_SELLERS_PROTECT_EMAILS`).
 *
 * Dry-run (elenco sola lettura):
 *   cd backend && npx medusa exec ./src/scripts/delete-all-sellers.ts
 *
 * Esecuzione:
 *   DELETE_ALL_SELLERS_CONFIRM=1 npx medusa exec ./src/scripts/delete-all-sellers.ts
 *
 * Ulteriori email da non eliminare (virgola):
 *   DELETE_ALL_SELLERS_PROTECT_EMAILS=alpe-magna@tramelle.com,altro@tramelle.com
 */

import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { deleteProductsWorkflow } from "@medusajs/medusa/core-flows"
import { SELLER_MODULE } from "@mercurjs/b2c-core/modules/seller"
import { deleteSellerWorkflow } from "@mercurjs/b2c-core/workflows"

import { removeMedusaEmailpassAuthForEmails } from "../lib/remove-medusa-emailpass-auth"
import { getSellerListingMetadata } from "../lib/seller-listing-metadata"
import { SELLER_LISTING_PROFILE_MODULE } from "../modules/seller-listing-profile"
import type SellerListingProfileModuleService from "../modules/seller-listing-profile/service"

const BATCH_PRODUCTS = 80
const DEFAULT_PROTECTED = ["alpe-magna@tramelle.com"]

function wantsConfirm(): boolean {
  return (
    process.env.DELETE_ALL_SELLERS_CONFIRM === "1" ||
    process.argv.includes("--confirm")
  )
}

function protectedEmails(): Set<string> {
  const raw =
    process.env.DELETE_ALL_SELLERS_PROTECT_EMAILS?.trim() ||
    DEFAULT_PROTECTED.join(",")
  const set = new Set<string>()
  for (const part of raw.split(/[\s,]+/)) {
    const e = part.trim().toLowerCase()
    if (e.includes("@")) {
      set.add(e)
    }
  }
  for (const e of DEFAULT_PROTECTED) {
    set.add(e.toLowerCase())
  }
  return set
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

function sellerMatchesProtected(
  sellerEmail: string | null | undefined,
  members: { email?: string | null }[] | undefined,
  protectedSet: Set<string>
): boolean {
  for (const e of collectEmailsForSeller(sellerEmail, members)) {
    if (protectedSet.has(e)) {
      return true
    }
  }
  return false
}

async function deleteAllProductsForSeller(
  container: ExecArgs["container"],
  sellerId: string,
  logger: { info: (s: string) => void }
): Promise<number> {
  const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION) as {
    (table: string): {
      where: (w: Record<string, unknown>) => {
        whereNull: (c: string) => {
          select: (cols: string) => Promise<{ product_id: string }[]>
        }
      }
    }
  }

  const rows = await knex("seller_seller_product_product")
    .where({ seller_id: sellerId })
    .whereNull("deleted_at")
    .select("product_id")

  const idSet = new Set<string>()
  for (const r of rows) {
    idSet.add(String(r.product_id))
  }
  const ids = [...idSet]
  if (!ids.length) {
    return 0
  }

  let done = 0
  for (let i = 0; i < ids.length; i += BATCH_PRODUCTS) {
    const chunk = ids.slice(i, i + BATCH_PRODUCTS)
    await deleteProductsWorkflow(container).run({ input: { ids: chunk } })
    done += chunk.length
  }
  logger.info(`[delete-all-sellers] seller ${sellerId}: eliminati ${done} prodotti`)
  return done
}

export default async function deleteAllSellers({ container }: ExecArgs) {
  const confirm = wantsConfirm()
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const protect = protectedEmails()

  const sellerModule = container.resolve(SELLER_MODULE) as {
    listSellers: (
      filters: Record<string, unknown>,
      config: { take: number }
    ) => Promise<{ id: string }[]>
    retrieveSeller: (
      id: string,
      config?: { relations?: string[] }
    ) => Promise<
      Record<string, unknown> & {
        members?: { id: string; email?: string | null }[]
        email?: string | null
      }
    >
    softDeleteMembers: (id: string) => Promise<unknown>
  }

  const slp = container.resolve(
    SELLER_LISTING_PROFILE_MODULE
  ) as InstanceType<typeof SellerListingProfileModuleService> & {
    listSellerListingProfiles: (
      filters: Record<string, unknown>,
      config: { take: number }
    ) => Promise<{ id: string }[]>
    softDeleteSellerListingProfiles?: (ids: string[]) => Promise<unknown>
  }

  const list = await sellerModule.listSellers({}, { take: 50_000 })
  const toProcess: { id: string }[] = []
  const skippedProtected: string[] = []

  for (const ref of list) {
    const full = await sellerModule.retrieveSeller(ref.id, {
      relations: ["members"],
    })
    if (sellerMatchesProtected(full.email ?? null, full.members, protect)) {
      skippedProtected.push(
        `${ref.id} (${full.email ?? full.members?.[0]?.email ?? "?"})`
      )
      continue
    }
    toProcess.push(ref)
  }

  logger.info(
    `[delete-all-sellers] seller totali: ${list.length} | da eliminare: ${toProcess.length} | protetti (saltati): ${skippedProtected.length}`
  )
  for (const line of skippedProtected) {
    logger.info(`[delete-all-sellers] PROTETTO (non eliminato): ${line}`)
  }

  if (!confirm) {
    logger.info(
      "[delete-all-sellers] Dry-run. Imposta DELETE_ALL_SELLERS_CONFIRM=1 per eseguire."
    )
    return
  }

  let removed = 0
  let errors = 0

  for (const ref of toProcess) {
    const id = ref.id
    try {
      await deleteAllProductsForSeller(container, id, logger)

      let emailsForAuth: string[] = []
      let snap = await sellerModule.retrieveSeller(id, {
        relations: ["members"],
      })
      emailsForAuth = collectEmailsForSeller(
        typeof snap.email === "string" ? snap.email : null,
        snap.members
      )

      try {
        const profiles = await slp.listSellerListingProfiles(
          { seller_id: id },
          { take: 10 }
        )
        if (
          profiles.length &&
          typeof slp.softDeleteSellerListingProfiles === "function"
        ) {
          await slp.softDeleteSellerListingProfiles(
            profiles.map((p) => p.id)
          )
        }
      } catch (e) {
        logger.error(
          `[delete-all-sellers] listing profile ${id}: ${e instanceof Error ? e.message : String(e)}`
        )
      }

      try {
        snap = await sellerModule.retrieveSeller(id, {
          relations: ["members"],
        })
        const members = snap.members
        if (Array.isArray(members) && members.length) {
          for (const m of members) {
            await sellerModule.softDeleteMembers(m.id)
          }
        }
      } catch (e) {
        logger.error(
          `[delete-all-sellers] membri ${id}: ${e instanceof Error ? e.message : String(e)}`
        )
      }

      await deleteSellerWorkflow(container).run({ input: id })

      await removeMedusaEmailpassAuthForEmails(
        container,
        logger,
        emailsForAuth,
        "[delete-all-sellers]"
      )

      logger.info(`[delete-all-sellers] eliminato seller ${id}`)
      removed++
    } catch (e) {
      errors++
      logger.error(
        `[delete-all-sellers] ERRORE seller ${id}: ${e instanceof Error ? e.message : String(e)}`
      )
    }
  }

  logger.info(
    `[delete-all-sellers] Fine: rimossi ${removed}, errori ${errors}, protetti ${skippedProtected.length}`
  )
}
