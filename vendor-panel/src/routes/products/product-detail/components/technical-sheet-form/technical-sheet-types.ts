/** Struttura salvata in `product.metadata.technical_sheet` (JSON-serializzabile). */
export type TechnicalSheetNutrition = {
  kj?: number
  kcal?: number
  fat_g?: number
  saturated_fat_g?: number
  carbs_g?: number
  sugars_g?: number
  protein_g?: number
  salt_g?: number
}

export type TechnicalSheetPairings = {
  description?: string
  /** Valori: pasta | vino | formaggio | pane */
  icons?: string[]
}

export type TechnicalSheetOrganoleptic = {
  aromatic_notes?: string
  color?: string
  taste_notes?: string
}

export type TechnicalSheetLogistics = {
  format?: string
  shelf_life?: string
}

export type ProductTechnicalSheet = {
  ingredients?: string
  nutrition?: TechnicalSheetNutrition
  pairings?: TechnicalSheetPairings
  organoleptic?: TechnicalSheetOrganoleptic
  logistics?: TechnicalSheetLogistics
}

export const PAIRING_ICON_OPTIONS = [
  { value: "pasta", label: "Pasta" },
  { value: "vino", label: "Vino" },
  { value: "formaggio", label: "Formaggio" },
  { value: "pane", label: "Pane" },
] as const

export function parseTechnicalSheet(
  metadata: Record<string, unknown> | null | undefined
): ProductTechnicalSheet {
  if (!metadata || typeof metadata !== "object") {
    return {}
  }
  const raw = metadata.technical_sheet
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {}
  }
  return raw as ProductTechnicalSheet
}

function numOrUndef(v: unknown): number | undefined {
  if (v === "" || v === null || v === undefined) {
    return undefined
  }
  const n = typeof v === "number" ? v : Number(v)
  return Number.isFinite(n) ? n : undefined
}

export type TechnicalSheetFormValues = {
  ingredients: string
  nutrition_kj: string
  nutrition_kcal: string
  nutrition_fat_g: string
  nutrition_saturated_fat_g: string
  nutrition_carbs_g: string
  nutrition_sugars_g: string
  nutrition_protein_g: string
  nutrition_salt_g: string
  pairings_description: string
  pairing_icons: string[]
  organoleptic_aromatic: string
  organoleptic_color: string
  organoleptic_taste: string
  logistics_format: string
  logistics_shelf_life: string
}

export function sheetToFormValues(sheet: ProductTechnicalSheet): TechnicalSheetFormValues {
  const n = sheet.nutrition ?? {}
  const str = (x: number | undefined) =>
    x !== undefined && Number.isFinite(x) ? String(x) : ""

  return {
    ingredients: sheet.ingredients ?? "",
    nutrition_kj: str(n.kj),
    nutrition_kcal: str(n.kcal),
    nutrition_fat_g: str(n.fat_g),
    nutrition_saturated_fat_g: str(n.saturated_fat_g),
    nutrition_carbs_g: str(n.carbs_g),
    nutrition_sugars_g: str(n.sugars_g),
    nutrition_protein_g: str(n.protein_g),
    nutrition_salt_g: str(n.salt_g),
    pairings_description: sheet.pairings?.description ?? "",
    pairing_icons: [...(sheet.pairings?.icons ?? [])],
    organoleptic_aromatic: sheet.organoleptic?.aromatic_notes ?? "",
    organoleptic_color: sheet.organoleptic?.color ?? "",
    organoleptic_taste: sheet.organoleptic?.taste_notes ?? "",
    logistics_format: sheet.logistics?.format ?? "",
    logistics_shelf_life: sheet.logistics?.shelf_life ?? "",
  }
}

export function formValuesToTechnicalSheet(
  v: TechnicalSheetFormValues
): ProductTechnicalSheet {
  const nutrition: TechnicalSheetNutrition = {}
  const kj = numOrUndef(v.nutrition_kj)
  const kcal = numOrUndef(v.nutrition_kcal)
  const fat = numOrUndef(v.nutrition_fat_g)
  const sat = numOrUndef(v.nutrition_saturated_fat_g)
  const carbs = numOrUndef(v.nutrition_carbs_g)
  const sugars = numOrUndef(v.nutrition_sugars_g)
  const protein = numOrUndef(v.nutrition_protein_g)
  const salt = numOrUndef(v.nutrition_salt_g)
  if (kj !== undefined) nutrition.kj = kj
  if (kcal !== undefined) nutrition.kcal = kcal
  if (fat !== undefined) nutrition.fat_g = fat
  if (sat !== undefined) nutrition.saturated_fat_g = sat
  if (carbs !== undefined) nutrition.carbs_g = carbs
  if (sugars !== undefined) nutrition.sugars_g = sugars
  if (protein !== undefined) nutrition.protein_g = protein
  if (salt !== undefined) nutrition.salt_g = salt

  const pairings: TechnicalSheetPairings = {}
  if (v.pairings_description.trim()) {
    pairings.description = v.pairings_description.trim()
  }
  if (v.pairing_icons.length) {
    pairings.icons = [...v.pairing_icons]
  }

  const organoleptic: TechnicalSheetOrganoleptic = {}
  if (v.organoleptic_aromatic.trim()) {
    organoleptic.aromatic_notes = v.organoleptic_aromatic.trim()
  }
  if (v.organoleptic_color.trim()) {
    organoleptic.color = v.organoleptic_color.trim()
  }
  if (v.organoleptic_taste.trim()) {
    organoleptic.taste_notes = v.organoleptic_taste.trim()
  }

  const logistics: TechnicalSheetLogistics = {}
  if (v.logistics_format.trim()) {
    logistics.format = v.logistics_format.trim()
  }
  if (v.logistics_shelf_life.trim()) {
    logistics.shelf_life = v.logistics_shelf_life.trim()
  }

  const out: ProductTechnicalSheet = {}
  if (v.ingredients.trim()) {
    out.ingredients = v.ingredients.trim()
  }
  if (Object.keys(nutrition).length) {
    out.nutrition = nutrition
  }
  if (Object.keys(pairings).length) {
    out.pairings = pairings
  }
  if (Object.keys(organoleptic).length) {
    out.organoleptic = organoleptic
  }
  if (Object.keys(logistics).length) {
    out.logistics = logistics
  }

  return out
}
