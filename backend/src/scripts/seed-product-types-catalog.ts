import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createProductTypesWorkflow } from "@medusajs/medusa/core-flows"

/** Tipi prodotto (filtri catalogo): idempotente — crea solo i `value` non già presenti. */
const PRODUCT_TYPE_VALUES: string[] = [
  "Acqua frizzante",
  "Acqua naturale",
  "Cioccolato",
  "Funghi",
  "Tartufi",
  "Distillati",
  "Liquori",
  "Creme spalmabili",
  "Marmellate e confetture dolci",
  "Marmellate e confetture salate",
  "Miele",
  "Prodotti derivati dal miele",
  "Pane",
  "Sostituti del pane",
  "Altri prodotti della panificazione",
  "Pepe",
  "Sale",
  "Spezie",
  "Caffè",
  "Infusi",
  "Tè",
  "Biscotti",
  "Cereali da colazione",
  "Dolci lievitati",
  "Dolciumi",
  "Gelati",
  "Aceto balsamico",
  "Aceto DOP balsamico",
  "Aceto di vino",
  "Condimenti",
  "Olii aromatizzati",
  "Olio extravergine di oliva",
  "Olio extravergine di oliva DOP",
  "Olio extravergine di oliva IGP",
  "Pasta",
  "Pasta all'uovo",
  "Pasta ripiena",
  "Riso",
  "Carne avicola",
  "Carne bovina",
  "Carne suina",
  "Chiocciole e lumache",
  "Selvaggina",
  "Uova",
  "Conserve di carne",
  "Conserve di pesce",
  "Sottaceti di pesce",
  "Sottoli di pesce",
  "Frutta fresca",
  "Frutta disidratata",
  "Frutta essiccata",
  "Caramelle e gomme da masticare",
  "Appetizers dolci",
  "Appetizers salati",
  "Latte",
  "Yogurt",
  "Derivati del latte",
  "Smoothies e centrifugati",
  "Succhi di frutta freschi",
  "Cereali",
  "Farine",
  "Legumi",
  "Conserve vegetali",
  "Sottaceti vegetali",
  "Sottoli vegetali",
  "Sughi vegetali",
  "Burro e creme di latte",
  "Formaggi e latticini freschi",
  "Formaggi e latticini stagionati",
  "Panna",
  "Preparati da gastronomia",
  "Primi piatti pronti",
  "Salse fredde",
  "Sughi pronti freschi",
  "Bresaola",
  "Coppa",
  "Mortadella",
  "Pancetta",
  "Porchetta",
  "Prosciutto San Daniele",
  "Prosciutto di Parma",
  "Prosciutto cotto",
  "Prosciutto crudo",
  "Salame",
  "Salumi tipici regionali",
  "Speck",
  "Verdura fresca",
  "Verdura disidratata",
  "Verdura essiccata",
  "Bollicine",
  "Vino",
  "Bevande analcoliche",
  "Baby food",
  "Alghe",
  "Erbe aromatiche",
  "Fiori",
  "Semi",
  "Crostacei",
  "Frutti di mare",
  "Pesce",
  "Prodotti ittici",
  "Birra",
  "Altri fermentati",
  "Editoria specializzata",
]

const BATCH = 40

export default async function seedProductTypesCatalog({
  container,
}: ExecArgs): Promise<void> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const productModule = container.resolve(Modules.PRODUCT)

  const [existing] = await productModule.listAndCountProductTypes(
    {},
    { take: 50_000 }
  )
  const existingValues = new Set(
    existing.map((t) => String(t.value ?? "").trim()).filter(Boolean)
  )

  const toCreate = PRODUCT_TYPE_VALUES.map((v) => v.trim()).filter(
    (v) => v.length > 0 && !existingValues.has(v)
  )

  if (toCreate.length === 0) {
    logger.info(
      `Product types: nessuno da creare (${PRODUCT_TYPE_VALUES.length} voci già coperte).`
    )
    return
  }

  logger.info(
    `Product types: creazione di ${toCreate.length} nuovi tipi (${existingValues.size} già nel DB)...`
  )

  for (let i = 0; i < toCreate.length; i += BATCH) {
    const slice = toCreate.slice(i, i + BATCH)
    await createProductTypesWorkflow(container).run({
      input: {
        product_types: slice.map((value) => ({ value })),
      },
    })
    logger.info(
      `Product types: batch ${Math.floor(i / BATCH) + 1} — +${slice.length}`
    )
  }

  logger.info(`Product types: completato (${toCreate.length} creati).`)
}
