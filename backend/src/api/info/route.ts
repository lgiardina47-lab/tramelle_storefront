import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/** Panoramica API per browser o client: la root / non è definita in Medusa. */
export async function GET(_req: MedusaRequest, res: MedusaResponse) {
  res.status(200).json({
    service: "tramelle-medusa",
    status: "ok",
    endpoints: {
      health: "/health",
      store: "/store",
      admin: "/admin",
      auth: "/auth",
    },
    note:
      "Le route /store/* richiedono l'header x-publishable-api-key (publishable key da Medusa Admin).",
  })
}
