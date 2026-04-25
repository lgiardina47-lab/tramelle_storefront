import { ProductDetailsPage } from "@/components/sections"
import { buildProductStaticParamList } from "@/lib/data/build-static-paths"
import {
  getCachedPdpBundle,
  getCachedProductByHandle,
} from "@/lib/data/product-by-handle-cached"
import { generateProductMetadata as buildProductMetadata } from "@/lib/helpers/seo"
import { resolvedSiteName } from "@/lib/constants/site"
import { notFound } from "next/navigation"
import type { Metadata } from "next"

/**
 * `getCachedPdpBundle` (una richiesta) deduplica con `getCachedProductByHandle` in fallback.
 */
export const dynamic = "force-dynamic"
export const dynamicParams = true

export async function generateStaticParams() {
  try {
    return await buildProductStaticParamList()
  } catch {
    return []
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string; locale: string }>
}): Promise<Metadata> {
  const { handle, locale } = await params
  const bundle = await getCachedPdpBundle(handle, locale)
  const prod =
    bundle?.product ?? (await getCachedProductByHandle(handle, locale))
  if (!prod) {
    return { title: `Prodotto | ${resolvedSiteName()}` }
  }
  return buildProductMetadata(prod, locale)
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ handle: string; locale: string }>
}) {
  const { handle, locale } = await params
  const bundle = await getCachedPdpBundle(handle, locale)
  const prod =
    bundle?.product ?? (await getCachedProductByHandle(handle, locale))
  if (!prod) {
    notFound()
  }
  if (prod.seller?.store_status === "SUSPENDED") {
    notFound()
  }

  return (
    <main className="container py-4 md:py-6">
      <ProductDetailsPage
        product={prod}
        locale={locale}
        moreFromSeller={bundle?.moreFromSeller}
      />
    </main>
  )
}
