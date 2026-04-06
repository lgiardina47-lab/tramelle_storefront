import { HttpTypes } from "@medusajs/types"

import { CartDropdown, MobileNavbar, Navbar } from "@/components/cells"
import { HeaderSearch } from "@/components/molecules/HeaderSearch/HeaderSearch"
import { HeaderUtilityBar } from "@/components/molecules/HeaderUtilityBar/HeaderUtilityBar"
import { HeartIcon } from "@/icons"
import { Wishlist } from "@/types/wishlist"
import { Badge } from "@/components/atoms"
import CountrySelector from "@/components/molecules/CountrySelector/CountrySelector"
import LocalizedClientLink from "@/components/molecules/LocalizedLink/LocalizedLink"
import { listCategories } from "@/lib/data/categories"
import { getProducersByParentId } from "@/lib/data/nav-producers"
import { listRegions } from "@/lib/data/regions"
import { getUserWishlists } from "@/lib/data/wishlist"
import { retrieveCustomer } from "@/lib/data/customer"

export const Header = async ({ locale }: { locale: string }) => {
  const user = await retrieveCustomer().catch(() => null)
  const isLoggedIn = Boolean(user)

  let wishlist: Wishlist = { products: [] }
  if (user) {
    wishlist = await getUserWishlists({ countryCode: locale })
  }

  const regions = await listRegions()

  const wishlistCount = wishlist?.products.length || 0

  const { categories, parentCategories } = (await listCategories({
    query: { include_ancestors_tree: true },
  })) as {
    categories: HttpTypes.StoreProductCategory[]
    parentCategories: HttpTypes.StoreProductCategory[]
  }

  const userEmail =
    user && "email" in user ? (user as { email?: string }).email : undefined

  const producersByParentId = await getProducersByParentId(
    parentCategories,
    locale
  )

  return (
    <header
      data-testid="header"
      className="z-50 border-b border-neutral-100 bg-white shadow-sm"
    >
      <HeaderUtilityBar
        isLoggedIn={isLoggedIn}
        userEmail={userEmail}
        locale={locale}
      />

      <div className="w-full px-4 py-3 md:px-6 lg:px-8">
        <div className="flex flex-col gap-3 lg:hidden">
          <div
            className="flex items-center justify-between gap-2"
            data-testid="header-top"
          >
            <div className="flex shrink-0 items-center">
              <MobileNavbar
                parentCategories={parentCategories}
                categories={categories}
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
                  alt="Tramelle - Gourmet Marketplace"
                  className="h-8 w-auto max-h-9"
                  decoding="async"
                  fetchPriority="high"
                />
              </LocalizedClientLink>
            </div>
            <div
              className="flex shrink-0 items-center justify-end gap-2"
              data-testid="header-actions"
            >
              <LocalizedClientLink
                href={isLoggedIn ? "/user/wishlist" : "/login"}
                className="relative flex items-center gap-1 text-cortilia"
                aria-label="Preferiti"
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
              <CartDropdown />
            </div>
          </div>
          <CountrySelector regions={regions} variant="deliveryPill" />
          <HeaderSearch />
        </div>

        <div
          className="hidden items-center gap-4 lg:flex lg:justify-between"
          data-testid="header-desktop"
        >
          <div className="flex min-w-0 flex-1 items-center gap-5">
            <LocalizedClientLink
              href="/"
              className="inline-flex shrink-0 items-center"
              data-testid="header-logo-link-desktop"
            >
              <img
                src="/tramelle.svg"
                width={200}
                height={40}
                alt="Tramelle - Gourmet Marketplace"
                className="h-10 w-auto max-h-[44px]"
                decoding="async"
                fetchPriority="high"
              />
            </LocalizedClientLink>
            <CountrySelector regions={regions} variant="deliveryPill" />
            <HeaderSearch className="max-w-xl flex-1" />
          </div>
          <div
            className="flex shrink-0 items-center gap-5"
            data-testid="header-actions-desktop"
          >
            <LocalizedClientLink
              href={isLoggedIn ? "/user/wishlist" : "/login"}
              className="relative hidden items-center gap-2 text-sm font-semibold text-cortilia xl:flex"
            >
              <HeartIcon size={22} color="#000000" />
              <span>Preferiti</span>
              {Boolean(wishlistCount) && (
                <Badge
                  className="absolute -top-3 left-3 h-4 min-w-4 p-0 text-[10px]"
                  data-testid="wishlist-count-badge-desktop"
                >
                  {wishlistCount}
                </Badge>
              )}
            </LocalizedClientLink>
            <LocalizedClientLink
              href={isLoggedIn ? "/user/wishlist" : "/login"}
              className="relative flex items-center text-cortilia xl:hidden"
              aria-label="Preferiti"
            >
              <HeartIcon size={22} color="#000000" />
              {Boolean(wishlistCount) && (
                <Badge className="absolute -top-2 -right-2 h-4 min-w-4 p-0 text-[10px]">
                  {wishlistCount}
                </Badge>
              )}
            </LocalizedClientLink>
            <CartDropdown />
          </div>
        </div>
      </div>

      <Navbar
        categories={categories}
        parentCategories={parentCategories}
        producersByParentId={producersByParentId}
      />
    </header>
  )
}
