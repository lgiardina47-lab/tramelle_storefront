/**
 * Rimuove da Medusa (DB Postgres, es. Supabase) admin user e/o customer con l’email indicata.
 * La CLI `medusa user` non supporta `--delete`; usare questo script.
 *
 * ACCOUNT_DELETE_CONFIRM=1 ACCOUNT_DELETE_EMAIL=info@webclinic.it yarn medusa exec ./src/scripts/delete-account-by-email.ts
 */

import type { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"
import type { ICustomerModuleService } from "@medusajs/framework/types"
import type { IUserModuleService } from "@medusajs/framework/types"
import {
  removeCustomerAccountWorkflow,
  removeUserAccountWorkflow,
} from "@medusajs/medusa/core-flows"

import { removeMedusaEmailpassAuthForEmails } from "../lib/remove-medusa-emailpass-auth"

function wantsConfirm(): boolean {
  return (
    process.env.ACCOUNT_DELETE_CONFIRM === "1" ||
    process.argv.includes("--confirm")
  )
}

export default async function deleteAccountByEmail({ container }: ExecArgs) {
  if (!wantsConfirm()) {
    throw new Error(
      "Imposta ACCOUNT_DELETE_CONFIRM=1 oppure aggiungi --confirm per procedere."
    )
  }

  const email =
    process.env.ACCOUNT_DELETE_EMAIL?.trim() || "info@webclinic.it"
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  const userModule = container.resolve(Modules.USER) as IUserModuleService
  const users = await userModule.listUsers({ email }, { take: 20 })
  for (const u of users) {
    await removeUserAccountWorkflow(container).run({ input: { userId: u.id } })
    logger.info(`[delete-account] Admin user rimosso: ${u.id} (${email})`)
  }
  if (!users.length) {
    logger.info(`[delete-account] Nessun admin user con email ${email}`)
  }

  const customerModule = container.resolve(
    Modules.CUSTOMER
  ) as ICustomerModuleService
  const customers = await customerModule.listCustomers(
    { email },
    { take: 20 }
  )
  for (const c of customers) {
    try {
      await removeCustomerAccountWorkflow(container).run({
        input: { customerId: c.id },
      })
      logger.info(`[delete-account] Customer rimosso: ${c.id} (${email})`)
    } catch (e) {
      logger.warn(
        `[delete-account] Fallita removeCustomerAccount per ${c.id}: ${e instanceof Error ? e.message : String(e)}`
      )
    }
  }
  if (!customers.length) {
    logger.info(`[delete-account] Nessun customer con email ${email}`)
  }

  await removeMedusaEmailpassAuthForEmails(
    container,
    logger,
    [email],
    "[delete-account]"
  )
}
