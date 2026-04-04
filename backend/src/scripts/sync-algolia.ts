import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { syncAlgoliaWorkflow } from "@mercurjs/algolia/workflows"

/**
 * Esegue la stessa sincronizzazione prodotti → Algolia del pulsante admin (POST /admin/algolia).
 * Uso: da /backend → `npx medusa exec ./src/scripts/sync-algolia.ts`
 */
export default async function runSyncAlgolia({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  logger.info("Algolia: avvio sync workflow…")
  await syncAlgoliaWorkflow.run({ container })
  logger.info("Algolia: sync workflow completato.")
}
