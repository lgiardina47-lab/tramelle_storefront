import type { ExecArgs } from "@medusajs/framework/types"
import { SELLER_MODULE } from "@mercurjs/b2c-core/modules/seller"

import { getSellerListingMetadata } from "../lib/seller-listing-metadata"

/**
 * Debug: stampa listing profile (website, taste handles, …) per handle.
 *   DEBUG_SELLER_HANDLE=mieli-thun npx medusa exec ./src/scripts/debug-seller-metadata.ts
 */
export default async function debugSellerMetadata({ container }: ExecArgs) {
  const handle = (process.env.DEBUG_SELLER_HANDLE || "mieli-thun").trim()
  const sellerModule = container.resolve(SELLER_MODULE) as {
    listSellers: (
      f: { handle?: string },
      c?: { take?: number },
    ) => Promise<{ id: string }[]>
    retrieveSeller: (id: string) => Promise<Record<string, unknown>>
  }
  const found = await sellerModule.listSellers({ handle }, { take: 1 })
  if (!found.length) {
    console.error("Nessun seller per handle:", handle)
    return
  }
  const id = found[0]!.id
  const full = await sellerModule.retrieveSeller(id)
  const listingMeta = await getSellerListingMetadata(container, id)
  console.log("seller id:", id)
  console.log("seller model metadata (Mercur, sempre assente):", full.metadata)
  console.log(
    "seller_listing_profile.metadata:",
    JSON.stringify(listingMeta, null, 2),
  )
}
