import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { storefrontSearchFiltersToMeilisearch } from "../../../../lib/meilisearch/storefront-search-filters-to-meili"
import {
  getProductsIndex,
  getSingletonMeilisearchClient,
} from "../../../../lib/meilisearch/client"
import {
  getMeilisearchIndexName,
  isMeilisearchConfigured,
} from "../../../../lib/meilisearch/env"
import { meiliHitsToListingProducts } from "../../../../lib/meilisearch/meili-hit-to-listing-product"
import {
  normalizeMercurFilterWhitespace,
  stripMercurFacetAttribute,
} from "../../../../lib/meilisearch/strip-mercur-facet-filter"

type SearchBody = {
  query?: string
  page?: number
  hitsPerPage?: number
  filters?: string
  facets?: string[]
  /** Ignorato: Meilisearch ≥1.11 non accetta `maxValuesPerFacet` nel body di `/indexes/:uid/search` (solo impostazioni indice). */
  maxValuesPerFacet?: number
  currency_code?: string
  region_id?: string
  customer_id?: string
  customer_group_id?: string[]
}

export async function POST(req: MedusaRequest<SearchBody>, res: MedusaResponse) {
  if (!isMeilisearchConfigured()) {
    return res.status(503).json({
      message:
        "Ricerca prodotti non configurata: imposta MEILISEARCH_HOST e MEILI_MASTER_KEY nel backend e sincronizza l’indice (yarn meilisearch:sync).",
    })
  }

  return postMeilisearchSearch(req, res)
}

async function postMeilisearchSearch(
  req: MedusaRequest<SearchBody>,
  res: MedusaResponse
) {
  const {
    query: searchQuery,
    page = 0,
    hitsPerPage = 12,
    filters,
    facets,
    currency_code,
  } = req.validatedBody as SearchBody

  const meiliFilter = storefrontSearchFiltersToMeilisearch(filters)
  const meili = getSingletonMeilisearchClient()
  const index = getProductsIndex(meili)

  const offset = page * hitsPerPage
  const started = Date.now()
  const profile =
    process.env.CATALOG_SEARCH_PROFILE === "true" ||
    process.env.CATALOG_SEARCH_PROFILE === "1"

  const tMain0 = Date.now()
  const searchResult = await index.search(searchQuery ?? "", {
    filter: meiliFilter,
    facets: facets?.length ? facets : undefined,
    limit: hitsPerPage,
    offset,
  })
  const meiliMainMs = Date.now() - tMain0

  const productIds = searchResult.hits.map((hit) => String((hit as { id: unknown }).id))
  const nbHits = searchResult.estimatedTotalHits ?? 0
  const nbPages = Math.max(1, Math.ceil(nbHits / hitsPerPage))
  let facetBuckets = (searchResult.facetDistribution ?? {}) as Record<
    string,
    Record<string, number> | undefined
  >

  const rawFilterNorm = normalizeMercurFilterWhitespace(filters ?? "")
  let meiliDisjunctiveMs = 0
  let meiliDisjunctiveQueries = 0

  const indexUid = getMeilisearchIndexName()
  const disjunctiveSpecs: { facetAttr: string; relaxed: string }[] = []
  if (rawFilterNorm.length && facets?.length) {
    for (const facetAttr of facets) {
      const stripped = normalizeMercurFilterWhitespace(
        stripMercurFacetAttribute(rawFilterNorm, facetAttr)
      )
      if (!stripped.length || stripped === rawFilterNorm) {
        continue
      }
      const relaxed = storefrontSearchFiltersToMeilisearch(stripped)
      if (!relaxed?.length) {
        continue
      }
      disjunctiveSpecs.push({ facetAttr, relaxed })
    }
  }
  meiliDisjunctiveQueries = disjunctiveSpecs.length

  const applyDisjunctive = async (): Promise<void> => {
    if (disjunctiveSpecs.length === 0) {
      return
    }
    const tDisj0 = Date.now()
    const { results } = await meili.multiSearch({
      queries: disjunctiveSpecs.map((spec) => ({
        indexUid,
        q: searchQuery ?? "",
        filter: spec.relaxed,
        facets: [spec.facetAttr],
        limit: 0,
        offset: 0,
      })),
    })
    meiliDisjunctiveMs = Date.now() - tDisj0
    facetBuckets = { ...facetBuckets }
    for (let i = 0; i < disjunctiveSpecs.length; i++) {
      const spec = disjunctiveSpecs[i]!
      const sub = results[i] as {
        facetDistribution?: Record<string, Record<string, number> | undefined>
      }
      const dist = sub.facetDistribution?.[spec.facetAttr] as
        | Record<string, number>
        | undefined
      if (dist && typeof dist === "object" && !Array.isArray(dist)) {
        facetBuckets[spec.facetAttr] = dist
      }
    }
  }

  const emptyPayload = (extra: Record<string, unknown> = {}) => ({
    products: [] as unknown[],
    nbHits,
    page,
    nbPages,
    hitsPerPage,
    facets: facetBuckets,
    facets_stats: {},
    processingTimeMS: Date.now() - started,
    query: searchQuery ?? "",
    ...extra,
  })

  if (productIds.length === 0) {
    await applyDisjunctive()
    return res.json({
      ...emptyPayload(),
      ...(profile
        ? {
            searchTimings: {
              meiliMainMs,
              meiliDisjunctiveMs,
              meiliDisjunctiveQueries,
              graphMs: 0,
            },
          }
        : {}),
    })
  }

  await applyDisjunctive()

  const mapMs0 = Date.now()
  const orderedProducts = meiliHitsToListingProducts(
    searchResult.hits as Record<string, unknown>[],
    currency_code
  )
  const mapMs = Date.now() - mapMs0

  return res.json({
    products: orderedProducts,
    nbHits,
    page,
    nbPages,
    hitsPerPage,
    facets: facetBuckets,
    facets_stats: {},
    processingTimeMS: Date.now() - started,
    query: searchQuery ?? "",
    ...(profile
      ? {
          searchTimings: {
            meiliMainMs,
            meiliDisjunctiveMs,
            meiliDisjunctiveQueries,
            graphMs: mapMs,
          },
        }
      : {}),
  })
}
