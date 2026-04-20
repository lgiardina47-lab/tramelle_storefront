import { unstable_cache } from "next/cache"
import type { HttpTypes } from "@medusajs/types"

import { buildMegaNavCategories } from "@/lib/helpers/category-mega-nav"
import type { MegaNavCategory } from "@/lib/helpers/category-mega-nav"
import {
  buildLanguageSwitcherOptions,
  type LanguageSwitcherOption,
} from "@/lib/helpers/language-switcher-options"
import { listCategoriesForHeaderNav } from "@/lib/data/categories"
import { listCollections } from "@/lib/data/collections"
import { getProducersByParentId, type NavProducer } from "@/lib/data/nav-producers"
import { getRegion, listRegions } from "@/lib/data/regions"

export type HeaderCatalogBundle = {
  categories: HttpTypes.StoreProductCategory[]
  parentCategories: HttpTypes.StoreProductCategory[]
  allCategoriesFlat: HttpTypes.StoreProductCategory[]
  producersByParentId: Record<string, NavProducer[]>
  storeCollections: HttpTypes.StoreCollection[]
  megaNavCategories: MegaNavCategory[]
  headerCurrency: string
  languageOptions: LanguageSwitcherOption[]
}

async function computeHeaderCatalogBundle(
  localeSeg: string
): Promise<HeaderCatalogBundle> {
  const [regions, categoriesData, region] = await Promise.all([
    listRegions(),
    listCategoriesForHeaderNav() as Promise<{
      categories: HttpTypes.StoreProductCategory[]
      parentCategories: HttpTypes.StoreProductCategory[]
      allCategoriesFlat: HttpTypes.StoreProductCategory[]
    }>,
    getRegion(localeSeg),
  ])

  const { categories, parentCategories, allCategoriesFlat } = categoriesData

  const [producersByParentId, storeCollectionsResult] = await Promise.all([
    getProducersByParentId(parentCategories, localeSeg, allCategoriesFlat),
    listCollections({ limit: "100", offset: "0" }).catch(() => ({
      collections: [] as HttpTypes.StoreCollection[],
      count: 0,
    })),
  ])

  const storeCollections = storeCollectionsResult.collections ?? []
  const megaNavCategories = buildMegaNavCategories(
    parentCategories,
    producersByParentId,
    allCategoriesFlat,
    storeCollections
  )

  return {
    categories,
    parentCategories,
    allCategoriesFlat,
    producersByParentId,
    storeCollections,
    megaNavCategories,
    headerCurrency: region?.currency_code || "usd",
    languageOptions: buildLanguageSwitcherOptions(regions),
  }
}

/**
 * Mega-menu / categorie header: cache process-wide 15 min per `locale` URL.
 * Dopo il primo hit le navigazioni non rifanno decine di chiamate Medusa per il chrome.
 */
export async function getHeaderCatalogBundle(
  locale: string
): Promise<HeaderCatalogBundle> {
  const lc = locale.toLowerCase()
  return unstable_cache(
    () => computeHeaderCatalogBundle(lc),
    ["tramelle-header-catalog-bundle", lc],
    { revalidate: 900, tags: ["header-catalog-bundle"] }
  )()
}
