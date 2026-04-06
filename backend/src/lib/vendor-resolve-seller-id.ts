import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { SELLER_MODULE } from "@mercurjs/b2c-core/modules/seller"

type SellerModuleLike = {
  listSellers: (
    filters: Record<string, unknown>,
    config: { take: number }
  ) => Promise<{ id: string }[]>
  retrieveSeller: (
    id: string
  ) => Promise<{
    id: string
    email?: string | null
    auth_identity_id?: string | null
    members?: { id?: string; user_id?: string; email?: string | null }[]
  }>
}

function normEmail(v: string | null | undefined): string {
  return (v ?? "").trim().toLowerCase()
}

function memberMatchesActor(
  members: { id?: string; user_id?: string }[] | undefined,
  actorId: string
): boolean {
  if (!Array.isArray(members)) return false
  return members.some((m) => String(m.id || "") === actorId || String(m.user_id || "") === actorId)
}

/**
 * Risolve l'id seller per il vendor loggato.
 * actor_id nel JWT può essere: id membro, user_id del membro, auth_identity_id, ecc.
 * Salva da errori Graph tipo "Primary key(s) [id] not found in filters" e da login che torna al login.
 */
export async function resolveVendorSellerId(
  scope: MedusaContainer,
  actorId: string
): Promise<string | null> {
  if (!actorId?.trim()) return null

  const query = scope.resolve(ContainerRegistrationKeys.QUERY)
  const sellerModule = scope.resolve(SELLER_MODULE) as SellerModuleLike

  const tryMemberGraph = async () => {
    try {
      const { data } = await query.graph(
        {
          entity: "seller",
          filters: { members: { id: actorId } },
          fields: ["id"],
        },
        { throwIfKeyNotFound: false }
      )
      const row = Array.isArray(data) ? data[0] : undefined
      const id = row && typeof row === "object" && "id" in row ? String(row.id) : ""
      return id || null
    } catch {
      return null
    }
  }

  const tryAuthIdentityGraph = async () => {
    try {
      const { data } = await query.graph(
        {
          entity: "seller",
          filters: { auth_identity_id: actorId } as Record<string, unknown>,
          fields: ["id"],
        },
        { throwIfKeyNotFound: false }
      )
      const row = Array.isArray(data) ? data[0] : undefined
      const id = row && typeof row === "object" && "id" in row ? String(row.id) : ""
      return id || null
    } catch {
      return null
    }
  }

  const tryListByAuthOnModule = async () => {
    try {
      const rows = await sellerModule.listSellers(
        { auth_identity_id: actorId },
        { take: 5 }
      )
      if (rows[0]?.id) return String(rows[0].id)
    } catch {
      /* filtro non supportato o errore modulo */
    }
    return null
  }

  /** auth_identity_id → provider emailpass.entity_id (email) → seller.email / member.email */
  const tryResolveViaProviderEmail = async () => {
    try {
      const auth = scope.resolve(Modules.AUTH) as {
        listProviderIdentities?: (
          filters: Record<string, unknown>,
          config?: { take?: number }
        ) => Promise<{ entity_id?: string | null }[]>
      }
      if (typeof auth.listProviderIdentities !== "function") return null
      const rows = await auth.listProviderIdentities(
        { auth_identity_id: actorId, provider: "emailpass" },
        { take: 5 }
      )
      for (const r of rows ?? []) {
        const email = normEmail(r.entity_id ?? undefined)
        if (!email.includes("@")) continue
        const all = await sellerModule.listSellers({}, { take: 50_000 })
        for (const row of all) {
          const full = await sellerModule.retrieveSeller(row.id)
          if (normEmail(full.email) === email) return full.id
          if (full.members?.some((m) => normEmail(m.email) === email)) return full.id
        }
      }
    } catch {
      return null
    }
    return null
  }

  const fromMember = await tryMemberGraph()
  if (fromMember) return fromMember

  const fromAuthGraph = await tryAuthIdentityGraph()
  if (fromAuthGraph) return fromAuthGraph

  const fromModuleFilter = await tryListByAuthOnModule()
  if (fromModuleFilter) return fromModuleFilter

  const fromProviderEmail = await tryResolveViaProviderEmail()
  if (fromProviderEmail) return fromProviderEmail

  // Fallback: scansione (DB grandi: costoso ma ultima risorsa)
  const list = await sellerModule.listSellers({}, { take: 50_000 })
  for (const row of list) {
    const full = await sellerModule.retrieveSeller(row.id)
    if (full.auth_identity_id === actorId) return full.id
    if (memberMatchesActor(full.members, actorId)) return full.id
  }

  return null
}
