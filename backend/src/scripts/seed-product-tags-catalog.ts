import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createProductTagsWorkflow } from "@medusajs/medusa/core-flows"

const METADATA_KEY = "tag_category"

/** Tag prodotto raggruppati per categoria (visibile in admin tramite `metadata.tag_category`). */
const TAG_GROUPS: { category: string; values: string[] }[] = [
  {
    category: "Qualità e Lavorazione",
    values: [
      "Artigianale",
      "Spremitura a Freddo",
      "Trafilata al Bronzo",
      "Essiccazione Lenta",
      "Senza Conservanti",
      "Senza Coloranti",
      "Ricetta Tradizionale",
      "Lievitazione Naturale",
      "Edizione Limitata",
    ],
  },
  {
    category: "Diete e Stili di Vita",
    values: [
      "Biologico",
      "Vegano",
      "Vegetariano",
      "Senza Glutine",
      "Senza Lattosio",
      "Senza Zuccheri Aggiunti",
      "Nichel Free",
    ],
  },
  {
    category: "Origine e Territorio",
    values: [
      "100% Italiano",
      "DOP",
      "IGP",
      "Prodotto di Montagna",
      "Km 0",
      "Presidio Slow Food",
      "Specialità Regionale",
    ],
  },
  {
    category: "Occasioni d'Uso",
    values: [
      "Idea Regalo",
      "Aperitivo Gourmet",
      "Pronto in 5 Minuti",
      "Da Degustazione",
      "Cesto Natalizio",
      "Snack Sano",
      "Abbinamento Formaggi",
    ],
  },
  {
    category: "Caratteristiche Gustative",
    values: [
      "Piccante",
      "Affumicato",
      "Fruttato",
      "Trafilato al Bronzo",
      "Grezzo",
      "Integrale",
    ],
  },
]

type TagDef = { category: string; value: string }

const BATCH = 30

function flattenCatalog(): TagDef[] {
  const out: TagDef[] = []
  for (const g of TAG_GROUPS) {
    for (const raw of g.values) {
      const value = raw.trim()
      if (value.length) {
        out.push({ category: g.category, value })
      }
    }
  }
  return out
}

export default async function seedProductTagsCatalog({
  container,
}: ExecArgs): Promise<void> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const productModule = container.resolve(Modules.PRODUCT)

  const desired = flattenCatalog()
  const [existing] = await productModule.listAndCountProductTags(
    {},
    { take: 50_000 }
  )

  const byValue = new Map<string, (typeof existing)[0]>()
  for (const t of existing) {
    const v = String(t.value ?? "").trim()
    if (v && !byValue.has(v)) {
      byValue.set(v, t)
    }
  }

  const toCreate: TagDef[] = []
  let metadataUpdated = 0

  for (const d of desired) {
    const cur = byValue.get(d.value)
    if (!cur) {
      toCreate.push(d)
      continue
    }
    const meta = cur.metadata as Record<string, unknown> | null | undefined
    const currentCat =
      meta && typeof meta[METADATA_KEY] === "string"
        ? meta[METADATA_KEY]
        : undefined
    if (currentCat !== d.category) {
      await productModule.updateProductTags(cur.id, {
        metadata: {
          ...(meta && typeof meta === "object" && !Array.isArray(meta)
            ? meta
            : {}),
          [METADATA_KEY]: d.category,
        },
      } as never)
      metadataUpdated += 1
    }
  }

  if (toCreate.length === 0) {
    logger.info(
      `Product tags: nessun tag da creare. Metadata aggiornati su ${metadataUpdated} tag esistenti.`
    )
    return
  }

  logger.info(
    `Product tags: creazione di ${toCreate.length} tag (${metadataUpdated} metadata aggiornati)...`
  )

  for (let i = 0; i < toCreate.length; i += BATCH) {
    const slice = toCreate.slice(i, i + BATCH)
    await createProductTagsWorkflow(container).run({
      input: {
        product_tags: slice.map((d) => ({
          value: d.value,
          metadata: { [METADATA_KEY]: d.category },
        })),
      },
    })
    logger.info(
      `Product tags: batch ${Math.floor(i / BATCH) + 1} — +${slice.length}`
    )
  }

  logger.info(
    `Product tags: completato (${toCreate.length} creati, ${metadataUpdated} metadata aggiornati).`
  )
}
