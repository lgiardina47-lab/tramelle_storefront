import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { Knex } from "knex"

type Loggerish = { info: (s: string) => void; error: (s: string) => void }

/**
 * Rimuove `provider_identity` + `auth_identity` per emailpass (entity_id = email).
 *
 * L'indice unico `IDX_provider_identity_provider_entity_id` su `(entity_id, provider)`
 * **non** esclude `deleted_at`: uno soft-delete lascia la riga e `auth.register`
 * risponde ancora "Provider identity ... already exists". Serve DELETE fisico.
 */
export async function removeMedusaEmailpassAuthForEmails(
  container: MedusaContainer,
  logger: Loggerish,
  emails: string[],
  logPrefix = "[remove-emailpass-auth]"
): Promise<void> {
  const knex = container.resolve(
    ContainerRegistrationKeys.PG_CONNECTION
  ) as Knex

  const seen = new Set<string>()
  for (const raw of emails) {
    const trimmed = raw.trim()
    const lower = trimmed.toLowerCase()
    for (const entityId of [...new Set([lower, trimmed])].filter((e) =>
      e.includes("@")
    )) {
      if (seen.has(entityId)) continue
      seen.add(entityId)
      try {
        const rows = (await knex("provider_identity")
          .where({ provider: "emailpass" })
          .whereRaw("LOWER(TRIM(entity_id)) = ?", [lower])
          .select("id", "auth_identity_id")) as Array<{
          id: string
          auth_identity_id: string | null
        }>

        if (!rows.length) {
          logger.info(`${logPrefix} auth emailpass già assente per ${entityId}`)
          continue
        }

        const pids = rows.map((r) => r.id)
        const authIds = [
          ...new Set(
            rows.map((r) => r.auth_identity_id).filter((x): x is string => Boolean(x))
          ),
        ]

        await knex.transaction(async (trx) => {
          await trx("provider_identity").whereIn("id", pids).delete()
          if (authIds.length) {
            await trx("auth_identity").whereIn("id", authIds).delete()
          }
        })

        logger.info(
          `${logPrefix} rimosso emailpass (hard delete) entity_id=${entityId} (${pids.length} provider, ${authIds.length} auth)`
        )
      } catch (e) {
        logger.error(
          `${logPrefix} errore ${entityId}: ${e instanceof Error ? e.message : String(e)}`
        )
      }
    }
  }
}
