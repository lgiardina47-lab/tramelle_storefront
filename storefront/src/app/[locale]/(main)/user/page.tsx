import { UserNavigation } from "@/components/molecules"
import { countryCodeToStorefrontMessagesLocale } from "@/lib/i18n/storefront-messages-locale"
import { retrieveCustomer } from "@/lib/data/customer"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { redirect } from "next/navigation"

export default async function UserPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const messagesLocale = countryCodeToStorefrontMessagesLocale(locale)
  setRequestLocale(messagesLocale)
  const t = await getTranslations({ locale: messagesLocale, namespace: "Account" })
  const user = await retrieveCustomer()

  if (!user) {
    redirect(`/${locale}/login`)
  }

  return (
    <main className="container">
      <div className="grid grid-cols-1 md:grid-cols-4 mt-6 gap-5 md:gap-8">
        <UserNavigation />
        <div className="md:col-span-3">
          <h1 className="heading-xl uppercase">
            {user.first_name?.trim()
              ? t("accountWelcome", { name: user.first_name })
              : t("accountWelcomeGeneric")}
          </h1>
          <p className="label-md">{t("accountReady")}</p>
        </div>
      </div>
    </main>
  )
}
