import type { MedusaContainer } from "@medusajs/framework"

import { SELLER_LISTING_PROFILE_MODULE } from "../modules/seller-listing-profile"
import type SellerListingProfileModuleService from "../modules/seller-listing-profile/service"

type ListingService = InstanceType<typeof SellerListingProfileModuleService>

export async function getSellerListingMetadata(
  container: MedusaContainer,
  sellerId: string
): Promise<Record<string, unknown>> {
  const svc = container.resolve(
    SELLER_LISTING_PROFILE_MODULE
  ) as ListingService
  const rows = await svc.listSellerListingProfiles(
    { seller_id: sellerId },
    { take: 1 }
  )
  const m = rows[0]?.metadata
  if (m && typeof m === "object" && !Array.isArray(m)) {
    return { ...(m as Record<string, unknown>) }
  }
  return {}
}

/** Sostituisce l’intero blob metadata listing per il seller (merge va fatto a monte). */
export async function setSellerListingMetadata(
  container: MedusaContainer,
  sellerId: string,
  metadata: Record<string, unknown>
): Promise<void> {
  const svc = container.resolve(
    SELLER_LISTING_PROFILE_MODULE
  ) as ListingService
  const rows = await svc.listSellerListingProfiles(
    { seller_id: sellerId },
    { take: 1 }
  )
  if (rows.length) {
    await svc.updateSellerListingProfiles({
      id: rows[0]!.id,
      metadata,
    })
    return
  }
  if (Object.keys(metadata).length === 0) {
    return
  }
  await svc.createSellerListingProfiles({
    seller_id: sellerId,
    metadata,
  })
}

/** Aggiorna solo P.IVA / REA / SDI nel metadata listing (admin + vendor POST). */
const FISCAL_BODY_KEYS = ["partita_iva", "rea", "sdi"] as const

export async function mergeSellerListingFiscalFromRequestBody(
  container: MedusaContainer,
  sellerId: string,
  body: Record<string, unknown> | null | undefined
): Promise<void> {
  if (!body || typeof body !== "object") {
    return
  }
  const touched = FISCAL_BODY_KEYS.some((k) => Object.prototype.hasOwnProperty.call(body, k))
  if (!touched) {
    return
  }
  const prev = await getSellerListingMetadata(container, sellerId)
  const next: Record<string, unknown> = { ...prev }
  for (const k of FISCAL_BODY_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(body, k)) {
      continue
    }
    const v = body[k]
    if (v === null || v === undefined) {
      delete next[k]
      continue
    }
    if (typeof v === "string") {
      const t = v.trim()
      if (t === "") {
        delete next[k]
      } else {
        next[k] = t
      }
    }
  }
  await setSellerListingMetadata(container, sellerId, next)
}
