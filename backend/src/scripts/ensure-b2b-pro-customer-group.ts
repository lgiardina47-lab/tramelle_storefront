import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import type { ICustomerModuleService } from "@medusajs/framework/types"

const DEFAULT_NAME = "B2B_Pro"

/**
 * Crea il customer group B2B_Pro se assente (collegare i listini wholesale in admin).
 * Uso: yarn medusa exec ./src/scripts/ensure-b2b-pro-customer-group.ts
 */
export default async function ensureB2bProCustomerGroup({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const customerModule = container.resolve(
    Modules.CUSTOMER
  ) as ICustomerModuleService

  const name = process.env.TRAMELLE_B2B_PRO_GROUP_NAME?.trim() || DEFAULT_NAME
  const existing = await customerModule.listCustomerGroups({ name }, { take: 1 })
  if (existing[0]?.id) {
    logger.info(`[tramelle] Customer group "${name}" già presente (${existing[0].id})`)
    return
  }

  const created = await customerModule.createCustomerGroups({ name })
  logger.info(`[tramelle] Creato customer group "${name}" (${created.id})`)
}
