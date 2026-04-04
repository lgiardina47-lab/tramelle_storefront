import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

/**
 * Reimposta la password email/password dell’admin (provider emailpass).
 * Uso: ADMIN_EMAIL=admin@mercurjs.com ADMIN_PASSWORD=la_tua_pass npx medusa exec ./src/scripts/reset-admin-password.ts
 */
export default async function resetAdminPassword({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const auth = container.resolve(Modules.AUTH)

  const email = process.env.ADMIN_EMAIL || "admin@mercurjs.com"
  const password = process.env.ADMIN_PASSWORD

  if (!password || password.length < 8) {
    throw new Error(
      "Imposta ADMIN_PASSWORD (min. 8 caratteri), es: ADMIN_PASSWORD=LaMiaPassSicura npx medusa exec ./src/scripts/reset-admin-password.ts"
    )
  }

  const result = await auth.updateProvider("emailpass", {
    entity_id: email,
    password,
  })

  if (result && "success" in result && result.success === false) {
    throw new Error(
      (result as { error?: string }).error || "updateProvider fallito"
    )
  }

  logger.info(`Password aggiornata per ${email}.`)
}
