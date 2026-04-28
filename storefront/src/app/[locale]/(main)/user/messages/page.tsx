import { LoginForm } from "@/components/molecules/LoginForm/LoginForm"
import { UserNavigation } from "@/components/molecules/UserNavigation/UserNavigation"
import { UserMessagesSection } from "@/components/sections/UserMessagesSection/UserMessagesSection"
import { countryCodeToStorefrontMessagesLocale } from "@/lib/i18n/storefront-messages-locale"
import { retrieveCustomer } from "@/lib/data/customer"
import { getTranslations, setRequestLocale } from "next-intl/server"

export default async function MessagesPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const messagesLocale = countryCodeToStorefrontMessagesLocale(locale)
  setRequestLocale(messagesLocale)
  const t = await getTranslations({ locale: messagesLocale, namespace: "Account" })
  const user = await retrieveCustomer()

  if (!user) return <LoginForm />

  return (
    <main className="container">
      <div className="grid grid-cols-1 md:grid-cols-4 mt-6 gap-5 md:gap-8">
        <UserNavigation />
        <div className="md:col-span-3 space-y-8">
          <h1 className="heading-md uppercase">{t("messages")}</h1>
          <UserMessagesSection />
        </div>
      </div>
    </main>
  )
}
