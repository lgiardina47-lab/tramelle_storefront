import { ProductListingSkeleton } from "@/components/organisms/ProductListingSkeleton/ProductListingSkeleton"
import { getCategoryByPageParam, listCategories } from "@/lib/data/categories"
import {
  categoryHandleMatchesUrlSegment,
  categorySlugForStorefrontUrl,
  categoryPublicHref,
} from "@/lib/helpers/category-public-url"
import {
  collectCategorySubtreeIds,
  mergeChildrenFromFlat,
  primarySubcategoryNavItems,
} from "@/lib/helpers/category-mega-nav"
import { Suspense } from "react"

import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { Breadcrumbs } from "@/components/atoms"
import { SubcategoryRibbon } from "@/components/molecules/CategoryNavbar/components/SubcategoryRibbon"
import { CatalogSearchListing, ProductListing } from "@/components/sections"
import { CategoryMacroSeoFooter } from "@/components/sections/CategoryMacroSeoFooter/CategoryMacroSeoFooter"
import { notFound, redirect } from "next/navigation"
import isBot from "@/lib/helpers/isBot"
import { headers } from "next/headers"
import Script from "next/script"
import { getRegion, listRegions } from "@/lib/data/regions"
import { listProducts } from "@/lib/data/products"
import { toHreflang } from "@/lib/helpers/hreflang"
import {
  getIndexingRobots,
  preferBackendProductSearchListing,
  publicSiteOrigin,
  resolvedSiteName,
} from "@/lib/constants/site"
import { parseProductListingPage } from "@/lib/helpers/product-listing-page"
import { plainCategoryDescription } from "@/lib/helpers/category-seo"
export const revalidate = 60

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; locale: string }>
}): Promise<Metadata> {
  const { category: categoryParam, locale } = await params
  const baseUrl = publicSiteOrigin()

  const [cat, t] = await Promise.all([
    getCategoryByPageParam(categoryParam),
    getTranslations({ locale, namespace: "CategoryPage" }),
  ])
  if (!cat) {
    return {}
  }

  const publicSlug = categorySlugForStorefrontUrl(cat.handle)

  let languages: Record<string, string> = {}
  try {
    const regions = await listRegions()
    const locales = Array.from(
      new Set(
        (regions || []).flatMap((r) => r.countries?.map((c) => c.iso_2) || [])
      )
    ) as string[]
    languages = locales.reduce<Record<string, string>>((acc, code) => {
      acc[toHreflang(code)] = `${baseUrl}/${code}/categories/${publicSlug}`
      return acc
    }, {})
  } catch {
    languages = {
      [toHreflang(locale)]: `${baseUrl}/${locale}/categories/${publicSlug}`,
    }
  }

  const site = resolvedSiteName()
  const description =
    plainCategoryDescription(cat.description) ??
    t("metaDescriptionFallback", { site })
  const title = t("metaTitle", { name: cat.name, site })
  const canonical = `${baseUrl}/${locale}/categories/${publicSlug}`

  return {
    title,
    description,
    alternates: {
      canonical,
      languages: {
        ...languages,
        "x-default": `${baseUrl}/categories/${publicSlug}`,
      },
    },
    robots: getIndexingRobots(),
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: site,
      type: "website",
    },
  }
}

async function Category({
  params,
  searchParams,
}: {
  params: Promise<{
    category: string
    locale: string
  }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { category: categoryParam, locale } = await params
  const sp = await searchParams
  const listingPage = parseProductListingPage(sp)

  /**
   * `/categories/search` non è una categoria: spesso confuso con la ricerca.
   * La listing con filtri è `/categories?query=…`.
   */
  if (categoryParam.toLowerCase() === "search") {
    const raw = sp.query ?? sp.q
    const q = Array.isArray(raw) ? raw[0] : raw
    const qs =
      q && typeof q === "string" && q.trim()
        ? `?query=${encodeURIComponent(q.trim())}`
        : ""
    redirect(`/${locale}/categories${qs}`)
  }

  const category = await getCategoryByPageParam(categoryParam)

  if (!category) {
    return notFound()
  }

  const { allCategoriesFlat } = await listCategories({ query: { limit: 2000 } })
  const mergedForRibbon = mergeChildrenFromFlat(category, allCategoriesFlat)
  const listingCategoryIds = collectCategorySubtreeIds(mergedForRibbon)
  const ribbonSubcategories = primarySubcategoryNavItems(mergedForRibbon)
  const activeRibbonChildHandle = categoryHandleMatchesUrlSegment(
    mergedForRibbon.handle,
    category.handle
  )
    ? null
    : category.handle

  /** Blocco SEO a fondo pagina: solo sulla URL della macro (non sulle sottocategorie). */
  const isMacroCategoryPage = mergedForRibbon.id === category.id

  const categoryPath = categoryPublicHref(category.handle)
  const t = await getTranslations({ locale, namespace: "CategoryPage" })
  const region = await getRegion(locale)
  const currency_code = region?.currency_code || "usd"
  const region_id = region?.id
  const ua = (await headers()).get("user-agent") || ""
  const bot = isBot(ua)

  const breadcrumbsItems = [
    { path: "/", label: t("breadcrumbHome") },
    { path: categoryPath, label: category.name },
  ]

  // Small cached list for JSON-LD itemList
  const baseUrl = publicSiteOrigin()
  const {
    response: { products: jsonLdProducts },
  } = await listProducts({
    countryCode: locale,
    queryParams: { limit: 8, order: "created_at", fields: "id,title,handle" },
    category_ids: listingCategoryIds,
  })

  const itemList = jsonLdProducts.slice(0, 8).map((p, idx) => ({
    "@type": "ListItem",
    position: idx + 1,
    url: `${baseUrl}/${locale}/products/${p.handle}`,
    name: p.title,
  }))

  return (
    <main className="flex flex-col">
      <div className="container">
      <Script
        id="ld-breadcrumbs-category"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: t("breadcrumbHome"),
                item: `${baseUrl}/${locale}`,
              },
              {
                "@type": "ListItem",
                position: 2,
                name: category.name,
                item: `${baseUrl}/${locale}${categoryPath}`,
              },
            ],
          }),
        }}
      />
      <Script
        id="ld-itemlist-category"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            itemListElement: itemList,
          }),
        }}
      />
      <header className="flex flex-col items-center text-center">
        <div className="mb-2 flex w-full justify-center">
          <Breadcrumbs items={breadcrumbsItems} className="justify-center" />
        </div>

        <h1 id="category-heading" className="heading-xl uppercase">
          {category.name}
        </h1>

        {ribbonSubcategories.length > 0 ? (
          <div className="mb-4 mt-3 w-full max-w-4xl">
            <SubcategoryRibbon
              parentLabel={mergedForRibbon.name}
              parentHandle={mergedForRibbon.handle}
              subcategories={ribbonSubcategories}
              activeChildHandle={activeRibbonChildHandle}
              align="center"
              ribbonSubheading={t("ribbonSubheading")}
              overviewLinkLabel={t("overviewLink")}
            />
          </div>
        ) : null}
      </header>

      <section aria-labelledby="category-heading">
        <Suspense
          fallback={<div data-testid="category-page-loading"><ProductListingSkeleton /></div>}
        >
          {bot || !preferBackendProductSearchListing() ? (
            <ProductListing
              category_ids={listingCategoryIds}
              locale={locale}
              page={listingPage}
            />
          ) : (
            <CatalogSearchListing
              category_ids={listingCategoryIds}
              locale={locale}
              currency_code={currency_code}
              region_id={region_id}
            />
          )}
        </Suspense>
      </section>
      </div>

      {isMacroCategoryPage ? (
        <CategoryMacroSeoFooter
          metadata={mergedForRibbon.metadata}
          locale={locale}
        />
      ) : null}
    </main>
  )
}

export default Category
