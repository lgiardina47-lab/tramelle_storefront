import type { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

type AuthModuleEmailpass = {
  listProviderIdentities: (
    filters: { entity_id?: string; provider?: string },
    config?: { take?: number }
  ) => Promise<{ id: string; auth_identity_id?: string | null }[]>
  softDeleteProviderIdentities: (ids: string | string[]) => Promise<unknown>
  softDeleteAuthIdentities: (ids: string | string[]) => Promise<unknown>
}

type Loggerish = { info: (s: string) => void; error: (s: string) => void }

/**
 * Soft-delete provider_identity + auth_identity Medusa per emailpass (entity_id = email).
 * Necessario se dopo removeCustomerAccount resta l’identità e `auth.register` risponde "already exists".
 */
export async function removeMedusaEmailpassAuthForEmails(
  container: MedusaContainer,
  logger: Loggerish,
  emails: string[],
  logPrefix = "[remove-emailpass-auth]"
): Promise<void> {
  const auth = container.resolve(Modules.AUTH) as unknown as AuthModuleEmailpass
  const seen = new Set<string>()
  for (const raw of emails) {
    const trimmed = raw.trim()
    const lower = trimmed.toLowerCase()
    for (const entityId of [...new Set([lower, trimmed])].filter(
      (e) => e.includes("@")
    )) {
      if (seen.has(entityId)) continue
      seen.add(entityId)
      try {
        const rows = await auth.listProviderIdentities(
          { entity_id: entityId, provider: "emailpass" },
          { take: 20 }
        )
        if (!rows.length) {
          logger.info(`${logPrefix} auth emailpass già assente per ${entityId}`)
          continue
        }
        const pids = rows.map((r) => r.id)
        const authIds = [
          ...new Set(
            rows
              .map((r) => r.auth_identity_id)
              .filter((x): x is string => Boolean(x))
          ),
        ]
        await auth.softDeleteProviderIdentities(pids)
        if (authIds.length) {
          await auth.softDeleteAuthIdentities(authIds)
        }
        logger.info(
          `${logPrefix} rimosso emailpass entity_id=${entityId} (${pids.length} provider, ${authIds.length} auth)`
        )
      } catch (e) {
        logger.error(
          `${logPrefix} errore ${entityId}: ${e instanceof Error ? e.message : String(e)}`
        )
      }
    }
  }
}
