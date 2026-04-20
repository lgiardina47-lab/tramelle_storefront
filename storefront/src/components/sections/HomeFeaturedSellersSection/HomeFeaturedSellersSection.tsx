import { listStoreSellers } from "@/lib/data/seller"
import {
  sellerDirectoryHeroImageCandidates,
  sellerDirectoryLogoImageCandidates,
} from "@/lib/helpers/seller-media-url"
import { sellerListingRegionLabel } from "@/lib/helpers/seller-listing-region"
import { countryCodeToStorefrontMessagesLocale } from "@/lib/i18n/storefront-messages-locale"
import LocalizedClientLink from "@/components/molecules/LocalizedLink/LocalizedLink"
import { SellerDirectoryCardMedia } from "@/components/organisms/SellerDirectoryCard/SellerDirectoryCardMedia"
import { sellerDirectoryImageRowIndex } from "@/lib/helpers/seller-directory-grid-layout"
import type { StoreSellerListItem } from "@/types/seller"
import { getTranslations } from "next-intl/server"

function SellerFeaturedCard({
  seller,
  locale,
  listIndex,
  visitShopLabel,
}: {
  seller: StoreSellerListItem
  locale: string
  listIndex: number
  visitShopLabel: string
}) {
  const country = seller.country_code?.trim().toUpperCase() || ""
  const region = sellerListingRegionLabel(seller)
  const locationLine =
    country && region
      ? `${country} · ${region}`
      : country || region || ""
  const initials = (seller.name || seller.handle).slice(0, 2).toUpperCase()

  return (
    <LocalizedClientLink
      href={`/sellers/${seller.handle}`}
      locale={locale}
      className="group flex flex-col overflow-hidden rounded-2xl border border-[#E8E4DE] bg-white hover:border-[#CCC8C0]"
    >
      <SellerDirectoryCardMedia
        heroCandidates={sellerDirectoryHeroImageCandidates(seller)}
        logoCandidates={sellerDirectoryLogoImageCandidates(seller)}
        name={seller.name}
        initials={initials}
        locationLine={locationLine}
        imageRowIndex={sellerDirectoryImageRowIndex(listIndex)}
      />
      <div className="px-4 py-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-secondary">
          {visitShopLabel}
        </span>
        <span aria-hidden className="text-sm text-[#B5B0A8]">
          →
        </span>
      </div>
    </LocalizedClientLink>
  )
}

export async function HomeFeaturedSellersSection({ locale }: { locale: string }) {
  const ui = countryCodeToStorefrontMessagesLocale(locale)
  const t = await getTranslations({ locale: ui, namespace: "Sellers" })
  const data = await listStoreSellers({ limit: 8, contentLocale: locale })
  const sellers = data?.sellers ?? []

  if (!sellers.length) return null

  return (
    <section className="w-full px-4 lg:px-8 py-8">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h2 className="heading-lg uppercase tracking-tight text-primary">
            {t("directoryPageTitle")}
          </h2>
          <p className="mt-1 text-md text-secondary">
            {t("homeFeaturedSubtitle")}
          </p>
        </div>
        <LocalizedClientLink
          href="/sellers"
          locale={locale}
          className="text-xs font-semibold uppercase tracking-[0.14em] text-primary hover:underline underline-offset-4 shrink-0 ml-4 mb-1"
        >
          {t("directorySeeAll")} →
        </LocalizedClientLink>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {sellers.slice(0, 8).map((seller, index) => (
          <SellerFeaturedCard
            key={seller.id}
            seller={seller}
            locale={locale}
            listIndex={index}
            visitShopLabel={t("directoryGoToShop")}
          />
        ))}
      </div>
    </section>
  )
}
