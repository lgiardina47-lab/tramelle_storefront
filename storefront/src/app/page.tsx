import { redirect } from "next/navigation"
/**
 * La root `/` non è sotto `[locale]`: senza questa pagina Next risponde 404.
 * Reindirizza alla home catalogo in `/{locale}` (es. `/it`).
 */
export default function RootPage() {
  const locale =
    process.env.NEXT_PUBLIC_DEFAULT_REGION?.trim().toLowerCase() || "it"
  redirect(`/${locale}`)
}
