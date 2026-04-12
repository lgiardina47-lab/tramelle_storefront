import { HttpTypes } from "@medusajs/types"
import { Playfair_Display, Plus_Jakarta_Sans } from "next/font/google"
import { getTranslations } from "next-intl/server"
import { Suspense } from "react"

import { CartDropdown, MobileNavbar, Navbar } from "@/components/cells"
import { HeaderSearch } from "@/components/molecules/HeaderSearch/HeaderSearch"
import { HeaderUtilityBar } from "@/components/molecules/HeaderUtilityBar/HeaderUtilityBar"
import { HeartIcon } from "@/icons"
import { Wishlist } from "@/types/wishlist"
import { Badge } from "@/components/atoms"
import { LanguageSwitcher } from "@/components/molecules/LanguageSwitcher/LanguageSwitcher"
import LocalizedClientLink from "@/components/molecules/LocalizedLink/LocalizedLink"
import { buildLanguageSwitcherOptions } from "@/lib/helpers/language-switcher-options"
import { buildMegaNavCategories } from "@/lib/helpers/category-mega-nav"
import { listCategories } from "@/lib/data/categories"
import { listCollections } from "@/lib/data/collections"
import { getProducersByParentId } from "@/lib/data/nav-producers"
import { getRegion, listRegions } from "@/lib/data/regions"
import { getUserWishlists } from "@/lib/data/wishlist"
import { retrieveCustomer } from "@/lib/data/customer"

import { TramelleGourmetHeader } from "./TramelleGourmetHeader"

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-tramelle-playfair",
})

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-tramelle-jakarta",
})

const gourmetFontVariables = `${playfair.variable} ${jakarta.variable}`

export const Header = async ({ locale }: { locale: string }) => {
  const t = await getTranslations("Header")
  const user = await retrieveCustomer().catch(() => null)
  const isLoggedIn = Boolean(user)

  let wishlist: Wishlist = { products: [] }
  if (user) {
    wishlist = await getUserWishlists({ countryCode: locale })
  }

  const regions = await listRegions()
  const languageOptions = buildLanguageSwitcherOptions(regions)

  const wishlistCount = wishlist?.products.length || 0

  const { categories, parentCategories, allCategoriesFlat } =
    (await listCategories({
      query: {
        include_ancestors_tree: true,
        limit: 2000,
      },
    })) as {
      categories: HttpTypes.StoreProductCategory[]
      parentCategories: HttpTypes.StoreProductCategory[]
      allCategoriesFlat: HttpTypes.StoreProductCategory[]
    }

  const userEmail =
    user && "email" in user ? (user as { email?: string }).email : undefined

  const [producersByParentId, storeCollectionsResult] = await Promise.all([
    getProducersByParentId(parentCategories, locale, allCategoriesFlat),
    listCollections({ limit: "100", offset: "0" }).catch(() => ({
      collections: [] as HttpTypes.StoreCollection[],
      count: 0,
    })),
  ])

  const storeCollections = storeCollectionsResult.collections

  const megaNavCategories = buildMegaNavCategories(
    parentCategories,
    producersByParentId,
    allCategoriesFlat,
    storeCollections
  )

  const region = await getRegion(locale)
  const headerCurrency = region?.currency_code || "usd"

  return (
    <header
      data-testid="header"
      className="z-50 overflow-visible border-b border-neutral-100 bg-white shadow-sm lg:border-b-0 lg:shadow-none"
    >
      <div className="lg:hidden">
        <HeaderUtilityBar
          isLoggedIn={isLoggedIn}
          userEmail={userEmail}
          locale={locale}
        />

        <div className="w-full overflow-visible px-4 py-3 md:px-6 lg:px-8">
          <div className="flex flex-col gap-3 overflow-visible lg:hidden">
            <div
              className="flex items-center justify-between gap-2"
              data-testid="header-top"
            >
              <div className="flex shrink-0 items-center">
                <MobileNavbar
                  parentCategories={parentCategories}
                  categories={categories}
                  locale={locale}
                  languageOptions={languageOptions}
                />
              </div>
              <div className="flex min-w-0 flex-1 justify-center px-2">
                <LocalizedClientLink
                  href="/"
                  locale={locale}
                  className="inline-flex shrink-0 items-center"
                  data-testid="header-logo-link"
                >
                  <img
                    src="/tramelle.svg"
                    width={200}
                    height={40}
                    alt={t("logoAlt")}
                    className="h-8 w-auto max-h-9"
                    decoding="async"
                    fetchPriority="high"
                  />
                </LocalizedClientLink>
              </div>
              <div
                className="flex min-w-0 max-w-full shrink-0 flex-wrap items-center justify-end gap-1 sm:gap-2 md:max-w-[min(100%,36rem)] lg:max-w-none"
                data-testid="header-actions"
              >
                <LocalizedClientLink
                  href={isLoggedIn ? "/user/wishlist" : "/login"}
                  className="relative flex items-center gap-1 text-cortilia"
                  aria-label={t("wishlistAria")}
                >
                  <HeartIcon size={20} color="#000000" />
                  {Boolean(wishlistCount) && (
                    <Badge
                      className="absolute -top-2 -right-2 flex h-4 min-w-4 items-center justify-center p-0 text-[10px]"
                      data-testid="wishlist-count-badge"
                    >
                      {wishlistCount}
                    </Badge>
                  )}
                </LocalizedClientLink>
                <LanguageSwitcher locale={locale} options={languageOptions} />
                <CartDropdown />
              </div>
            </div>
            <div className="relative z-[70] min-w-0 overflow-visible">
              <Suspense
                fallback={
                  <div
                    className="h-11 w-full max-w-xl rounded-full bg-neutral-100"
                    aria-hidden
                  />
                }
              >
                <HeaderSearch
                  locale={locale}
                  currency_code={headerCurrency}
                />
              </Suspense>
            </div>
          </div>
        </div>

        <div className="border-t border-neutral-100 bg-white px-4 pb-2 pt-1 md:px-6 lg:px-8">
          <Navbar
            categories={categories}
            parentCategories={parentCategories}
            producersByParentId={producersByParentId}
          />
        </div>
      </div>

      <TramelleGourmetHeader
        locale={locale}
        currencyCode={headerCurrency}
        megaCategories={megaNavCategories}
        isLoggedIn={isLoggedIn}
        userEmail={userEmail}
        wishlistCount={wishlistCount}
        languageOptions={languageOptions}
        fontVariables={gourmetFontVariables}
      />
    </header>
  )
}
