import { Button } from "@/components/atoms/Button/Button"
import LocalizedClientLink from "@/components/molecules/LocalizedLink/LocalizedLink"
import { UserNavigation } from "@/components/molecules/UserNavigation/UserNavigation"
import { countryCodeToStorefrontMessagesLocale } from "@/lib/i18n/storefront-messages-locale"
import { getTranslations, setRequestLocale } from "next-intl/server"

export default async function RequestSuccessPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>
}) {
  const { id, locale } = await params
  const messagesLocale = countryCodeToStorefrontMessagesLocale(locale)
  setRequestLocale(messagesLocale)
  const t = await getTranslations({ locale: messagesLocale, namespace: "Account" })

  return (
    <main className="container">
      <div className="grid grid-cols-1 md:grid-cols-4 mt-6 gap-5 md:gap-8">
        <UserNavigation />
        <div className="md:col-span-3 text-center">
          <h1 className="heading-md uppercase">{t("returnRequestedTitle")}</h1>
          <p className="label-md text-secondary w-96 mx-auto my-8">
            {t("returnRequestedDescription")}
          </p>
          <LocalizedClientLink href={`/user/returns${id ? `?return=${id}` : ""}`}>
            <Button className="label-md uppercase px-12 py-3">
              {t("returnDetailsCta")}
            </Button>
          </LocalizedClientLink>
        </div>
      </div>
    </main>
  )
}
