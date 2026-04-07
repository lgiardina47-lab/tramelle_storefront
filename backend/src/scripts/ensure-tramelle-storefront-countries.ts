import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { updateRegionsWorkflow } from "@medusajs/medusa/core-flows"

/** Paesi per lo switcher storefront (NL olandese, GB inglese). */
const ENSURE_COUNTRIES = ["nl", "gb"] as const

/**
 * Aggiunge NL e GB alle regioni che non li hanno (switcher lingua / URL /en vs /nl).
 * Uso: `yarn medusa exec ./src/scripts/ensure-tramelle-storefront-countries.ts`
 */
export default async function ensureTramelleStorefrontCountries({
  container,
}: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const regionModule = container.resolve(Modules.REGION)
  const regions = await regionModule.listRegions(
    {},
    { take: 50, relations: ["countries"] }
  )

  if (!regions.length) {
    logger.warn(
      "[tramelle] Nessuna regione nel DB. Esegui prima il seed."
    )
    return
  }

  for (const region of regions) {
    const countries = region.countries as { iso_2?: string }[] | undefined
    const codes = new Set(
      (countries ?? [])
        .map((c) => c.iso_2?.toLowerCase())
        .filter((c): c is string => Boolean(c))
    )

    const missing = ENSURE_COUNTRIES.filter((c) => !codes.has(c))
    if (!missing.length) {
      logger.info(
        `[tramelle] Regione "${region.name}" (${region.id}): ${ENSURE_COUNTRIES.join(", ").toUpperCase()} già presenti.`
      )
      continue
    }

    const merged = [...codes, ...missing]
    await updateRegionsWorkflow(container).run({
      input: {
        selector: { id: region.id },
        update: { countries: merged },
      },
    })
    logger.info(
      `[tramelle] Regione "${region.name}": aggiunti paesi ${missing.join(", ").toUpperCase()}. Controlla tasse e fulfillment in admin.`
    )
  }
}
