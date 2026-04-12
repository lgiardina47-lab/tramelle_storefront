import { redirect } from "next/navigation"

/**
 * URL comune da motori o bookmark: `/it/search?q=…`.
 * La ricerca prodotto è sulla listing `/it/categories?query=…`.
 */
export default async function SearchAliasPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { locale } = await params
  const sp = await searchParams
  const raw = sp.query ?? sp.q
  const q = Array.isArray(raw) ? raw[0] : raw
  const qs =
    q && typeof q === "string" && q.trim()
      ? `?query=${encodeURIComponent(q.trim())}`
      : ""
  redirect(`/${locale}/categories${qs}`)
}
