import { redirect } from "next/navigation"

/**
 * La directory produttori vive sotto `/[locale]/sellers`. Link assoluti tipo `/sellers`
 * o hreflang `x-default` verso `/sellers` altrimenti darebbero 404.
 */
export default async function SellersUnprefixedRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const locale =
    process.env.NEXT_PUBLIC_DEFAULT_REGION?.trim().toLowerCase() || "it"
  const sp = await searchParams
  const qs = new URLSearchParams()
  for (const [key, raw] of Object.entries(sp)) {
    if (typeof raw === "string") {
      qs.set(key, raw)
    } else if (Array.isArray(raw) && raw[0]) {
      qs.set(key, raw[0])
    }
  }
  const tail = qs.toString()
  redirect(tail ? `/${locale}/sellers?${tail}` : `/${locale}/sellers`)
}
