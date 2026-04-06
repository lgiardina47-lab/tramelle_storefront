import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import type { ICustomerModuleService } from "@medusajs/framework/types"

import { removeMedusaEmailpassAuthForEmails } from "../lib/remove-medusa-emailpass-auth"

/**
 * Dopo eliminazione cliente (soft-delete), Medusa può aver lasciato ancora
 * `provider_identity` emailpass (entity_id = email): la registrazione fallisce con "already exists".
 * Rimuove quell’auth in linea con removeMedusaEmailpassAuthForEmails.
 */
export default async function customerDeletedRemoveEmailpass({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const customerId = data?.id
  if (!customerId) {
    return
  }

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER) as {
    warn: (m: string) => void
    info: (m: string) => void
    error: (m: string) => void
  }
  const customerModule = container.resolve(
    Modules.CUSTOMER
  ) as ICustomerModuleService

  let email: string | undefined
  try {
    const customer = await customerModule.retrieveCustomer(customerId, {
      withDeleted: true,
      select: ["id", "email"],
    })
    email =
      typeof customer.email === "string" ? customer.email.trim() : undefined
  } catch (e) {
    logger.warn(
      `[customer-deleted-emailpass] retrieveCustomer ${customerId}: ${e instanceof Error ? e.message : String(e)}`
    )
    return
  }

  if (!email?.includes("@")) {
    return
  }

  await removeMedusaEmailpassAuthForEmails(
    container,
    logger,
    [email],
    "[customer-deleted-emailpass]"
  )
}

export const config: SubscriberConfig = {
  event: "customer.deleted",
}
