import { redirect } from "next/navigation"
/**
 * La root `/` non è sotto `[locale]`: senza questa pagina Next risponde 404.
 * La splash "Coming Soon" è su `/{locale}` (es. `/it`) quando l'host è tramelle.com.
 */
export default function RootPage() {
  const locale =
    process.env.NEXT_PUBLIC_DEFAULT_REGION?.trim().toLowerCase() || "it"
  redirect(`/${locale}`)
}
