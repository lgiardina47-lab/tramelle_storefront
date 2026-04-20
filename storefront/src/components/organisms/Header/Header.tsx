import Image from "next/image"
import { tramelleDesignSystemFontVariables } from "@/lib/fonts/tramelle-ds"
import { getTranslations } from "next-intl/server"
import { Suspense } from "react"

import { CartDropdown, MobileNavbar } from "@/components/cells"
import { UserDropdown } from "@/components/cells/UserDropdown/UserDropdown"
import { HeaderSearch } from "@/components/molecules/HeaderSearch/HeaderSearch"
import { LanguageSwitcher } from "@/components/molecules/LanguageSwitcher/LanguageSwitcher"
import LocalizedClientLink from "@/components/molecules/LocalizedLink/LocalizedLink"
import { WishlistNavLink } from "@/components/molecules/WishlistNavLink/WishlistNavLink"
import { getHeaderCatalogBundle } from "@/lib/data/header-catalog-bundle"
import { retrieveCustomer } from "@/lib/data/customer"
import { tramelleHeaderAccountRole } from "@/lib/tramelle-header-account-role"

import { TramelleGourmetHeader } from "./TramelleGourmetHeader"

export const Header = async ({ locale }: { locale: string }) => {
  const [t, catalog, user] = await Promise.all([
    getTranslations("Header"),
    getHeaderCatalogBundle(locale),
    retrieveCustomer().catch(() => null),
  ])

  const isLoggedIn = Boolean(user)

  const {
    categories,
    parentCategories,
    megaNavCategories,
    headerCurrency,
    languageOptions,
  } = catalog

  const userEmail =
    user && "email" in user ? (user as { email?: string }).email : undefined
  const accountRole = tramelleHeaderAccountRole(user)

  return (
    <header
      data-testid="header"
      className="sticky top-0 z-50 overflow-visible border-b border-neutral-100 bg-white shadow-sm md:static md:border-b-0 md:shadow-none"
    >
      <div className="md:hidden">
        <div className="w-full overflow-visible px-4 pb-3 pt-3 md:px-6 lg:px-8">
          <div className="flex flex-col gap-2.5 overflow-visible md:hidden">
            <div
              className="flex items-center justify-between gap-3"
              data-testid="header-top"
            >
              <LocalizedClientLink
                href="/"
                locale={locale}
                className="logo inline-flex min-w-0 max-w-[55%] shrink items-center"
                data-testid="header-logo-link"
                aria-label={t("logoAlt")}
              >
                <Image
                  src="/tramelle.svg"
                  width={260}
                  height={52}
                  alt={t("logoAlt")}
                  className="h-auto w-full max-h-11 object-contain object-left sm:max-h-[52px]"
                  priority
                  unoptimized
                />
              </LocalizedClientLink>
              <div
                className="flex shrink-0 flex-nowrap items-center justify-end gap-3 [&>*]:shrink-0"
                data-testid="header-actions"
              >
                <UserDropdown
                  isLoggedIn={isLoggedIn}
                  compactEmail={userEmail}
                  locale={locale}
                  presentation="gourmet"
                  accountRole={accountRole}
                  showGourmetRegisterLink={false}
                />
                <LanguageSwitcher locale={locale} options={languageOptions} />
                <WishlistNavLink
                  locale={locale}
                  isLoggedIn={isLoggedIn}
                  heartSize={22}
                  className="relative flex h-[22px] w-[22px] cursor-pointer items-center justify-center text-[#8A8580] transition-colors hover:text-[#0F0E0B]"
                  heartColor="#8A8580"
                />
                <CartDropdown variant="gourmet" />
              </div>
            </div>
            <div className="relative z-[70] flex min-w-0 items-center gap-2 overflow-visible">
              <MobileNavbar
                parentCategories={parentCategories}
                categories={categories}
              />
              <Suspense
                fallback={
                  <div
                    className="h-12 min-w-0 flex-1 rounded-full border border-[#E8E4DE] bg-neutral-50"
                    aria-hidden
                  />
                }
              >
                <div className="min-w-0 flex-1 rounded-full border border-[#E8E4DE] bg-white px-3 py-1 shadow-none transition-[border-color,box-shadow] focus-within:border-[#0F0E0B] focus-within:shadow-[0_2px_8px_rgba(15,14,11,0.12)]">
                  <HeaderSearch
                    locale={locale}
                    currency_code={headerCurrency}
                    variant="gourmet"
                    submitAlign="end"
                    placeholder={t("gourmet.mobileSearchPlaceholder")}
                    className="max-w-none"
                  />
                </div>
              </Suspense>
            </div>
          </div>
        </div>
      </div>

      <TramelleGourmetHeader
        locale={locale}
        currencyCode={headerCurrency}
        megaCategories={megaNavCategories}
        isLoggedIn={isLoggedIn}
        userEmail={userEmail}
        accountRole={accountRole}
        languageOptions={languageOptions}
        fontVariables={tramelleDesignSystemFontVariables}
      />
    </header>
  )
}
