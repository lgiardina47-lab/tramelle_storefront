/**
 * Ensures email/password auth exists for seller emails (Medusa Auth provider id: "emailpass").
 * HTTP routes use /auth/seller/emailpass but IAuthModuleService.register/updateProvider take provider "emailpass" only.
 *
 * Run on server:
 *   REPAIR_SELLER_AUTH_CONFIRM=1 REPAIR_SELLER_PASSWORD=testpassword npx medusa exec ./src/scripts/repair-seller-auth-identities.ts
 *
 * Domini (default: tramelle.com + mercurjs.com):
 *   REPAIR_SELLER_EMAIL_DOMAINS=tramelle.com,mercurjs.com
 *   oppure solo uno: REPAIR_SELLER_EMAIL_DOMAIN=@tramelle.com
 */
import { ExecArgs } from '@medusajs/framework/types'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import { createWorkflow } from '@medusajs/framework/workflows-sdk'
import {
  createStep,
  StepResponse,
  WorkflowResponse,
} from '@medusajs/framework/workflows-sdk'

import { SELLER_MODULE } from '@mercurjs/b2c-core/modules/seller'

const CONFIRM = process.env.REPAIR_SELLER_AUTH_CONFIRM === '1'
const password =
  process.env.REPAIR_SELLER_PASSWORD || process.env.SELLER_PASSWORD || 'testpassword'

function parseRepairEmailDomains(): string[] {
  const multi = process.env.REPAIR_SELLER_EMAIL_DOMAINS?.trim()
  if (multi) {
    return multi
      .split(',')
      .map((s) => s.trim().toLowerCase().replace(/^@/, ''))
      .filter(Boolean)
  }
  const single = (process.env.REPAIR_SELLER_EMAIL_DOMAIN || '').trim()
  if (single) {
    return [single.toLowerCase().replace(/^@/, '')]
  }
  return ['tramelle.com', 'mercurjs.com']
}

function emailEndsWithDomain(email: string, domains: string[]): boolean {
  const e = email.toLowerCase()
  const at = e.lastIndexOf('@')
  if (at < 0) return false
  const host = e.slice(at + 1)
  return domains.some((d) => host === d.toLowerCase())
}

const listEmailsStep = createStep('list-seller-emails', async (_, { container }) => {
  const domains = parseRepairEmailDomains()
  const sellerModule = container.resolve(SELLER_MODULE) as {
    listSellers: (
      filters: Record<string, unknown>,
      config: { take: number }
    ) => Promise<{ id: string }[]>
    retrieveSeller: (id: string) => Promise<{
      id: string
      name?: string | null
      email?: string | null
      members?: { email?: string | null }[]
    }>
  }

  const rows = await sellerModule.listSellers({}, { take: 10_000 })
  const emails: { id: string; email: string; name?: string }[] = []

  for (const row of rows) {
    const full = await sellerModule.retrieveSeller(row.id)
    let email = full.email?.trim()
    if (
      !email &&
      Array.isArray(full.members) &&
      full.members[0]?.email
    ) {
      email = String(full.members[0].email).trim()
    }
    const norm = email?.toLowerCase() ?? ''
    if (!norm || !emailEndsWithDomain(norm, domains)) continue
    emails.push({
      id: full.id,
      email: norm,
      name: full.name ?? undefined,
    })
  }

  return new StepResponse(emails)
})

function isUpdateProviderFailed(
  result: unknown
): result is { success: false; error?: string } {
  return (
    !!result &&
    typeof result === 'object' &&
    'success' in result &&
    (result as { success: boolean }).success === false
  )
}

const repairAuthStep = createStep(
  'repair-seller-auth',
  async (emails: { id: string; email: string; name?: string }[], { container }) => {
    const auth = container.resolve(Modules.AUTH)
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

    for (const row of emails) {
      let updated = false
      try {
        const upd = await auth.updateProvider('emailpass', {
          entity_id: row.email,
          password,
        })
        if (!isUpdateProviderFailed(upd)) {
          logger.info(`[repair-seller-auth] Updated emailpass for: ${row.email}`)
          updated = true
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        logger.info(
          `[repair-seller-auth] updateProvider skipped for ${row.email}: ${msg}`
        )
      }

      if (updated) continue

      const reg = await auth.register('emailpass', {
        body: { email: row.email, password },
      })

      if (reg.success && reg.authIdentity) {
        logger.info(`[repair-seller-auth] Registered emailpass identity: ${row.email}`)
        continue
      }

      const errMsg = reg.error || 'unknown'
      if (/exists|already|duplicate|Identity with email already exists/i.test(errMsg)) {
        const upd2 = await auth.updateProvider('emailpass', {
          entity_id: row.email,
          password,
        })
        if (isUpdateProviderFailed(upd2)) {
          logger.warn(
            `[repair-seller-auth] Could not update after existing identity ${row.email}: ${(upd2 as { error?: string }).error || errMsg}`
          )
        } else {
          logger.info(`[repair-seller-auth] Updated password (existing identity): ${row.email}`)
        }
      } else {
        logger.warn(`[repair-seller-auth] Register failed for ${row.email}: ${errMsg}`)
      }
    }
    return new StepResponse({ ok: true })
  }
)

const repairSellerAuthWorkflow = createWorkflow(
  'repair-seller-auth-workflow',
  function (input: Record<string, never>) {
    const emails = listEmailsStep()
    repairAuthStep(emails)
    return new WorkflowResponse({ done: true })
  }
)

export default async function repairSellerAuthIdentities({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  if (!CONFIRM) {
    logger.info(
      `Set REPAIR_SELLER_AUTH_CONFIRM=1 to repair seller auth (domains: ${parseRepairEmailDomains().join(', ')})`
    )
    return
  }

  if (!password) {
    logger.error('Set REPAIR_SELLER_PASSWORD or SELLER_PASSWORD')
    return
  }

  await repairSellerAuthWorkflow(container).run({ input: {} })
  logger.info('[repair-seller-auth] Done.')
}
