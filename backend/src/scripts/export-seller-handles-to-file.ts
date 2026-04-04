import * as fs from "node:fs"
import * as path from "node:path"

import type { ExecArgs } from "@medusajs/framework/types"
import { SELLER_MODULE } from "@mercurjs/b2c-core/modules/seller"

/**
 *   EXPORT_SELLER_HANDLES_CONFIRM=1 \
 *   EXPORT_SELLER_HANDLES_OUT=../dati_venditori/output/db_seller_handles.json \
 *   npx medusa exec ./src/scripts/export-seller-handles-to-file.ts
 */
export default async function exportSellerHandlesToFile({ container }: ExecArgs) {
  if (process.env.EXPORT_SELLER_HANDLES_CONFIRM !== "1") {
    throw new Error("EXPORT_SELLER_HANDLES_CONFIRM=1 richiesto.")
  }

  const outRaw = process.env.EXPORT_SELLER_HANDLES_OUT?.trim()
  if (!outRaw) {
    throw new Error("EXPORT_SELLER_HANDLES_OUT obbligatorio (path file JSON).")
  }

  const outPath = path.isAbsolute(outRaw) ? outRaw : path.resolve(process.cwd(), outRaw)

  const sellerModule = container.resolve(SELLER_MODULE) as {
    listSellers: (
      filters: Record<string, unknown>,
      config?: { take?: number }
    ) => Promise<{ id: string }[]>
    retrieveSeller: (id: string) => Promise<Record<string, unknown>>
  }

  const handles = new Set<string>()
  const list = await sellerModule.listSellers({}, { take: 10_000 })
  for (const row of list) {
    const full = await sellerModule.retrieveSeller(row.id)
    const h = typeof full.handle === "string" ? full.handle.trim() : ""
    if (h) {
      handles.add(h)
    }
  }

  const sorted = [...handles].sort((a, b) => a.localeCompare(b, "en"))
  fs.writeFileSync(outPath, JSON.stringify(sorted, null, 2), "utf-8")
  console.info(`Scritti ${sorted.length} handle → ${outPath}`)
}
