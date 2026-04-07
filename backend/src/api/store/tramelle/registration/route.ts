import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import type { ICustomerModuleService } from "@medusajs/framework/types"

const B2B_META = "b2b_pro"
const DEFAULT_GROUP_NAME = "B2B_Pro"

type Body = {
  registration_type?: string
  company_name?: string
  vat_id?: string
  sdi_or_pec?: string
  first_name?: string
  last_name?: string
  phone?: string
}

/**
 * Dopo signup, lo store API non persiste sempre `metadata` sul customer.
 * Questa route (Bearer cliente) salva tipo registrazione + dati fiscali e,
 * se professionista, aggiunge al gruppo B2B_Pro.
 */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const ctx = (
    req as AuthenticatedMedusaRequest & {
      auth_context?: { actor_id?: string; actor_type?: string }
    }
  ).auth_context

  const customerId = ctx?.actor_id
  if (!customerId) {
    res.status(401).json({ message: "Unauthorized" })
    return
  }

  const body = (req.body || {}) as Body
  const registrationType = body.registration_type === B2B_META ? B2B_META : "b2c"

  const customerModule = req.scope.resolve(
    Modules.CUSTOMER
  ) as ICustomerModuleService

  const company = (body.company_name || "").trim()
  const vat = (body.vat_id || "").trim()
  const sdiOrPec = (body.sdi_or_pec || "").trim()

  const metadata: Record<string, unknown> = {
    tramelle_registration_type: registrationType,
  }
  if (registrationType === B2B_META) {
    metadata.tramelle_vat_id = vat
    metadata.tramelle_sdi_or_pec = sdiOrPec
  }

  const updatePayload: {
    metadata: Record<string, unknown>
    company_name?: string | null
    first_name?: string
    last_name?: string
    phone?: string | null
  } = {
    metadata,
  }

  if (registrationType === B2B_META) {
    updatePayload.company_name = company || null
    updatePayload.first_name = company.slice(0, 100) || "—"
    updatePayload.last_name = "—"
  } else {
    const fn = (body.first_name || "").trim()
    const ln = (body.last_name || "").trim()
    const ph = (body.phone || "").trim()
    if (fn) updatePayload.first_name = fn
    if (ln) updatePayload.last_name = ln
    if (ph) updatePayload.phone = ph
  }

  await customerModule.updateCustomers(customerId, updatePayload)

  if (registrationType === B2B_META) {
    const groupName =
      process.env.TRAMELLE_B2B_PRO_GROUP_NAME?.trim() || DEFAULT_GROUP_NAME
    const groups = await customerModule.listCustomerGroups(
      { name: groupName },
      { take: 1 }
    )
    const group = groups[0]
    if (group?.id) {
      try {
        await customerModule.addCustomerToGroup({
          customer_id: customerId,
          customer_group_id: group.id,
        })
      } catch {
        /* già nel gruppo o vincolo DB */
      }
    }
  }

  res.status(200).json({ ok: true })
}
