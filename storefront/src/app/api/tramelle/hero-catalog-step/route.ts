import { NextRequest, NextResponse } from "next/server"

import { scanHeroCatalogStepOnServer } from "@/lib/hero/hero-catalog-step-server"
import { withTimeout } from "@/lib/helpers/with-timeout"
import { normalizeListingContentLocale } from "@/lib/i18n/listing-content-locale"

export const dynamic = "force-dynamic"
export const maxDuration = 60

type Body = {
  from0?: number
  total?: number
  step?: 1 | -1
  locale?: string
  contentLocale?: string | null
  /** Scope come hero pagina categoria (OR di handle radice). */
  parentCategoryHandles?: string[] | null
  /** Facet sottocategorie da prodotti reali (pagina categoria). */
  subcategoryPillScope?: {
    category_ids?: string[]
    currency_code?: string
  } | null
}

export async function POST(request: NextRequest) {
  let body: Body
  try {
    body = (await request.json()) as Body
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 })
  }

  const total = Math.max(0, Math.floor(Number(body.total ?? 0)))
  const from0 = Math.max(0, Math.floor(Number(body.from0 ?? 0)))
  const step: 1 | -1 = body.step === -1 ? -1 : 1
  const locale = (body.locale || "it").trim() || "it"
  const contentLocale = normalizeListingContentLocale(
    body.contentLocale?.trim() || undefined
  )
  const parentCategoryHandles = Array.isArray(body.parentCategoryHandles)
    ? body.parentCategoryHandles.filter(
        (h): h is string => typeof h === "string" && h.trim().length > 0
      )
    : undefined

  const rawScope = body.subcategoryPillScope
  const subcategoryPillScope =
    rawScope &&
    typeof rawScope === "object" &&
    Array.isArray(rawScope.category_ids) &&
    rawScope.category_ids.length > 0 &&
    typeof rawScope.currency_code === "string" &&
    rawScope.currency_code.trim()
      ? {
          category_ids: rawScope.category_ids.filter(
            (id): id is string => typeof id === "string" && id.trim().length > 0
          ),
          currency_code: rawScope.currency_code.trim().toLowerCase(),
        }
      : undefined

  if (total <= 0) {
    return NextResponse.json({ hit: null as null })
  }

  try {
    const hit = await withTimeout(
      scanHeroCatalogStepOnServer(
        from0,
        total,
        step,
        locale,
        contentLocale,
        parentCategoryHandles,
        subcategoryPillScope?.category_ids.length
          ? subcategoryPillScope
          : undefined
      ),
      50_000,
      null
    )
    if (!hit) {
      return NextResponse.json({ hit: null as null })
    }
    return NextResponse.json({ hit })
  } catch (e) {
    if (process.env.NODE_ENV === "development") {
      console.error("[hero-catalog-step]", e)
    }
    return NextResponse.json({ hit: null as null, error: "step_failed" })
  }
}
