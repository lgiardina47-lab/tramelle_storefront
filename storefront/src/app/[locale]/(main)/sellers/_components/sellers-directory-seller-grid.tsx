import { SellerDirectoryCard } from "@/components/organisms/SellerDirectoryCard/SellerDirectoryCard"
import { SellerDirectoryImageLoadProvider } from "@/components/organisms/SellerDirectoryCard/SellerDirectoryImageLoadContext"
import { listStoreSellers } from "@/lib/data/seller"
import { countryCodeToStorefrontMessagesLocale } from "@/lib/i18n/storefront-messages-locale"
import { getTranslations } from "next-intl/server"
import Link from "next/link"
import {
  sellerDirectoryImageRowIndex,
  sellerDirectoryRowCardCounts,
} from "@/lib/helpers/seller-directory-grid-layout"
import {
  SELLERS_DIRECTORY_PAGE_SIZE,
  sellersDirectoryPageHref,
  type SellersDirectoryResolvedOk,
} from "./sellers-directory-shared"

/** Solo elenco + paginazione: streamabile in Suspense senza smontare i filtri. */
export async function SellersDirectorySellerGrid({
  locale,
  resolved: r,
}: {
  locale: string
  resolved: SellersDirectoryResolvedOk
}) {
  const { countryCode, region, page, categoryHandle } = r
  const ui = countryCodeToStorefrontMessagesLocale(locale)
  const t = await getTranslations({ locale: ui, namespace: "Sellers" })

  const listData = await listStoreSellers({
    limit: SELLERS_DIRECTORY_PAGE_SIZE,
    offset: r.offset,
    countryCode: r.countryCode,
    region: r.region,
    parentCategoryHandle: r.categoryHandle,
  })

  if (!listData) {
    return (
      <p className="text-md text-secondary py-8">{t("directoryLoadError")}</p>
    )
  }

  if (listData.sellers.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="heading-sm text-primary mb-2">
          {t("directoryGridEmptyTitle")}
        </p>
        <p className="text-md text-secondary">{t("directoryGridEmptyHint")}</p>
      </div>
    )
  }

  const total = listData.count ?? 0
  const totalPages = Math.max(1, Math.ceil(total / SELLERS_DIRECTORY_PAGE_SIZE))

  return (
    <>
      <SellerDirectoryImageLoadProvider
        key={`sellers-img-${countryCode ?? "all"}-${region ?? "all"}-${categoryHandle ?? "all"}-${page}`}
        rowCardCounts={sellerDirectoryRowCardCounts(listData.sellers.length)}
      >
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {listData.sellers.map((seller, index) => (
            <li key={seller.id} className="min-w-0">
              <SellerDirectoryCard
                seller={seller}
                urlLocale={locale}
                imageRowIndex={sellerDirectoryImageRowIndex(index)}
              />
            </li>
          ))}
        </ul>
      </SellerDirectoryImageLoadProvider>

      {totalPages > 1 ? (
        <nav
          className="mt-12 flex flex-wrap items-center justify-center gap-3"
          aria-label={t("directoryPaginationLabel")}
        >
          {page > 1 ? (
            <Link
              prefetch={true}
              href={sellersDirectoryPageHref(locale, {
                page: page > 2 ? page - 1 : undefined,
                country: countryCode,
                region,
                category: categoryHandle,
              })}
              className="rounded-md border border-neutral-200 px-5 py-2.5 text-sm font-medium text-primary transition-colors hover:border-primary hover:bg-neutral-50"
            >
              {t("directoryPrevPage")}
            </Link>
          ) : null}
          <span className="text-sm text-secondary px-2">
            {t("directoryPage")} {page} / {totalPages}
          </span>
          {page < totalPages ? (
            <Link
              prefetch={true}
              href={sellersDirectoryPageHref(locale, {
                page: page + 1,
                country: countryCode,
                region,
                category: categoryHandle,
              })}
              className="rounded-md border border-neutral-200 px-5 py-2.5 text-sm font-medium text-primary transition-colors hover:border-primary hover:bg-neutral-50"
            >
              {t("directoryNextPage")}
            </Link>
          ) : null}
        </nav>
      ) : null}
    </>
  )
}
