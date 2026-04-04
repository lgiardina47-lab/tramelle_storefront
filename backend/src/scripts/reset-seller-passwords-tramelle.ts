import type { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"
import { SELLER_MODULE } from "@mercurjs/b2c-core/modules/seller"

/**
 * Reimposta la password email/pass per tutti gli seller con email sul dominio indicato
 * (default tramelle.com), tipicamente slug@tramelle.com creati dall’import JSON.
 *
 *   SELLER_PASSWORD_RESET_CONFIRM=1 SELLER_PASSWORD=testpassword npx medusa exec ./src/scripts/reset-seller-passwords-tramelle.ts
 *
 * Opzionale: SELLER_EMAIL_DOMAIN=tramelle.com
 */
export default async function resetSellerPasswordsTramelle({
  container,
}: ExecArgs) {
  if (process.env.SELLER_PASSWORD_RESET_CONFIRM !== "1") {
    throw new Error(
      "Aggiungi SELLER_PASSWORD_RESET_CONFIRM=1 per eseguire il reset."
    )
  }

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const auth = container.resolve(Modules.AUTH)
  const sellerModule = container.resolve(SELLER_MODULE) as {
    listSellers: (
      filters: Record<string, unknown>,
      config: { take: number }
    ) => Promise<{ id: string }[]>
    retrieveSeller: (id: string) => Promise<{
      id: string
      email?: string | null
      members?: { email?: string | null }[]
    }>
  }

  const password = process.env.SELLER_PASSWORD || "testpassword"
  if (password.length < 8) {
    throw new Error("SELLER_PASSWORD deve avere almeno 8 caratteri")
  }

  const domain = (process.env.SELLER_EMAIL_DOMAIN || "tramelle.com")
    .toLowerCase()
    .replace(/^@/, "")
  const suffix = `@${domain}`

  const sellers = await sellerModule.listSellers({}, { take: 10_000 })
  let updated = 0

  for (const row of sellers) {
    const full = await sellerModule.retrieveSeller(row.id)
    let email = full.email?.trim()
    if (
      !email &&
      Array.isArray(full.members) &&
      full.members[0]?.email
    ) {
      email = String(full.members[0].email).trim()
    }
    if (!email || !email.toLowerCase().endsWith(suffix)) {
      continue
    }

    const result = await auth.updateProvider("emailpass", {
      entity_id: email,
      password,
    })

    if (result && "success" in result && result.success === false) {
      throw new Error(
        (result as { error?: string }).error ||
          `updateProvider fallito per ${email}`
      )
    }

    logger.info(`Password reimpostata: ${email}`)
    updated++
  }

  logger.info(`Totale seller aggiornati (${suffix}): ${updated}`)
}
