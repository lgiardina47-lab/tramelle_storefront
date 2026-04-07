import { ProductListingSkeleton } from "@/components/organisms/ProductListingSkeleton/ProductListingSkeleton"
import { getCategoryByHandle } from "@/lib/data/categories"
import { Suspense } from "react"

import type { Metadata } from "next"
import { Breadcrumbs } from "@/components/atoms"
import { SubcategoryRibbon } from "@/components/molecules/CategoryNavbar/components/SubcategoryRibbon"
import { CategoryBanner } from "@/components/molecules/CategoryBanner/CategoryBanner"
import { AlgoliaProductsListing, ProductListing } from "@/components/sections"
import { notFound } from "next/navigation"
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

export const revalidate = 60

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; locale: string }>
}): Promise<Metadata> {
  const { category: categoryHandle, locale } = await params
  const baseUrl = publicSiteOrigin()

  const cat = await getCategoryByHandle(categoryHandle)
  if (!cat) {
    return {}
  }

  let languages: Record<string, string> = {}
  try {
    const regions = await listRegions()
    const locales = Array.from(
      new Set(
        (regions || []).flatMap((r) => r.countries?.map((c) => c.iso_2) || [])
      )
    ) as string[]
    languages = locales.reduce<Record<string, string>>((acc, code) => {
      acc[toHreflang(code)] = `${baseUrl}/${code}/categories/${categoryHandle}`
      return acc
    }, {})
  } catch {
    languages = {
      [toHreflang(locale)]: `${baseUrl}/${locale}/categories/${categoryHandle}`,
    }
  }

  const title = `${cat.name} Category`
  const description = `${cat.name} Category - ${resolvedSiteName()}`
  const canonical = `${baseUrl}/${locale}/categories/${categoryHandle}`

  return {
    title,
    description,
    alternates: {
      canonical,
      languages: {
        ...languages,
        "x-default": `${baseUrl}/categories/${categoryHandle}`,
      },
    },
    robots: getIndexingRobots(),
    openGraph: {
      title: `${title} | ${resolvedSiteName()}`,
      description,
      url: canonical,
      siteName: resolvedSiteName(),
      type: "website",
    },
  }
}

async function Category({
  params,
}: {
  params: Promise<{
    category: string
    locale: string
  }>
}) {
  const { category: categoryHandle, locale } = await params

  const category = await getCategoryByHandle(categoryHandle)

  if (!category) {
    return notFound()
  }
  const region = await getRegion(locale)
  const currency_code = region?.currency_code || "usd"
  const region_id = region?.id
  const ua = (await headers()).get("user-agent") || ""
  const bot = isBot(ua)

  const breadcrumbsItems = [
    {
      path: categoryHandle,
      label: category.name,
    },
  ]

  // Small cached list for JSON-LD itemList
  const baseUrl = publicSiteOrigin()
  const {
    response: { products: jsonLdProducts },
  } = await listProducts({
    countryCode: locale,
    queryParams: { limit: 8, order: "created_at", fields: "id,title,handle" },
    category_id: category.id,
  })

  const itemList = jsonLdProducts.slice(0, 8).map((p, idx) => ({
    "@type": "ListItem",
    position: idx + 1,
    url: `${baseUrl}/${locale}/products/${p.handle}`,
    name: p.title,
  }))

  return (
    <main className="container">
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
                name: category.name,
                item: `${baseUrl}/${locale}/categories/${categoryHandle}`,
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
      <div className="hidden md:block mb-2">
        <Breadcrumbs items={breadcrumbsItems} />
      </div>

      <h1 className="heading-xl uppercase">{category.name}</h1>

      <CategoryBanner
        name={category.name}
        handle={category.handle}
        imageUrl={
          category.metadata &&
          typeof (category.metadata as { image_url?: unknown }).image_url ===
            "string"
            ? (category.metadata as { image_url: string }).image_url
            : null
        }
      />

      {category.category_children && category.category_children.length > 0 ? (
        <div className="mb-4 mt-1 lg:hidden">
          <SubcategoryRibbon
            parentLabel={category.name}
            parentHandle={category.handle}
            subcategories={category.category_children}
            activeChildHandle={null}
          />
        </div>
      ) : null}

      <Suspense fallback={<div data-testid="category-page-loading"><ProductListingSkeleton /></div>}>
        {bot || !preferBackendProductSearchListing() ? (
          <ProductListing category_id={category.id} locale={locale} />
        ) : (
          <AlgoliaProductsListing
            category_id={category.id}
            locale={locale}
            currency_code={currency_code}
            region_id={region_id}
          />
        )}
      </Suspense>
    </main>
  )
}

export default Category
