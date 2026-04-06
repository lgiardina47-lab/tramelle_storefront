import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import type { ICustomerModuleService } from "@medusajs/framework/types"

const META_KEY = "tramelle_registration_type"
const META_VALUE = "b2b_pro"
const DEFAULT_GROUP_NAME = "B2B_Pro"

/**
 * Dopo registrazione storefront con metadata `tramelle_registration_type: b2b_pro`,
 * assegna il cliente al gruppo `B2B_Pro` (listini wholesale in admin).
 * Il gruppo deve esistere (script `ensure-b2b-pro-customer-group` o admin).
 */
export default async function customerRegisterB2bPro({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const customerId = data?.id
  if (!customerId) {
    return
  }

  const customerModule = container.resolve(
    Modules.CUSTOMER
  ) as ICustomerModuleService

  const customer = await customerModule.retrieveCustomer(customerId, {
    select: ["id", "metadata"],
  })

  const metadata = customer.metadata as Record<string, unknown> | null | undefined
  if (metadata?.[META_KEY] !== META_VALUE) {
    return
  }

  const groupName =
    process.env.TRAMELLE_B2B_PRO_GROUP_NAME?.trim() || DEFAULT_GROUP_NAME

  const groups = await customerModule.listCustomerGroups(
    { name: groupName },
    { take: 1 }
  )
  const group = groups[0]
  if (!group?.id) {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER) as {
      warn: (m: string) => void
    }
    logger.warn(
      `[tramelle] Gruppo clienti "${groupName}" non trovato: impossibile assegnare B2B il cliente ${customerId}`
    )
    return
  }

  await customerModule.addCustomerToGroup({
    customer_id: customerId,
    customer_group_id: group.id,
  })
}

export const config: SubscriberConfig = {
  event: "customer.created",
}
