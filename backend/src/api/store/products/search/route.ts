import {
  ContainerRegistrationKeys,
  QueryContext,
} from "@medusajs/framework/utils"
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { storefrontSearchFiltersToMeilisearch } from "../../../../lib/meilisearch/storefront-search-filters-to-meili"
import { createMeilisearchClient, getProductsIndex } from "../../../../lib/meilisearch/client"
import { isMeilisearchConfigured } from "../../../../lib/meilisearch/env"
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
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const {
    query: searchQuery,
    page = 0,
    hitsPerPage = 12,
    filters,
    facets,
    currency_code,
    region_id,
    customer_id,
    customer_group_id,
  } = req.validatedBody as SearchBody

  const meiliFilter = storefrontSearchFiltersToMeilisearch(filters)
  const client = createMeilisearchClient()
  const index = getProductsIndex(client)

  const offset = page * hitsPerPage
  const started = Date.now()

  const searchResult = await index.search(searchQuery ?? "", {
    filter: meiliFilter,
    facets: facets?.length ? facets : undefined,
    limit: hitsPerPage,
    offset,
  })

  const productIds = searchResult.hits.map((hit) => String((hit as { id: unknown }).id))
  const nbHits = searchResult.estimatedTotalHits ?? 0
  const nbPages = Math.max(1, Math.ceil(nbHits / hitsPerPage))
  let facetBuckets = (searchResult.facetDistribution ?? {}) as Record<
    string,
    Record<string, number> | undefined
  >

  const rawFilterNorm = normalizeMercurFilterWhitespace(filters ?? "")
  if (rawFilterNorm.length && facets?.length) {
    const disjunctiveTasks = facets.map(async (facetAttr) => {
      const stripped = normalizeMercurFilterWhitespace(
        stripMercurFacetAttribute(rawFilterNorm, facetAttr)
      )
      if (!stripped.length || stripped === rawFilterNorm) {
        return null
      }
      const relaxed = storefrontSearchFiltersToMeilisearch(stripped)
      const sub = await index.search(searchQuery ?? "", {
        filter: relaxed,
        facets: [facetAttr],
        limit: 0,
        offset: 0,
      })
      const dist = sub.facetDistribution?.[facetAttr] as
        | Record<string, number>
        | undefined
      if (dist && typeof dist === "object" && !Array.isArray(dist)) {
        return { facetAttr, dist }
      }
      return null
    })
    const merged = await Promise.all(disjunctiveTasks)
    facetBuckets = { ...facetBuckets }
    for (const m of merged) {
      if (m) {
        facetBuckets[m.facetAttr] = m.dist
      }
    }
  }

  if (productIds.length === 0) {
    return res.json({
      products: [],
      nbHits,
      page,
      nbPages,
      hitsPerPage,
      facets: facetBuckets,
      facets_stats: {},
      processingTimeMS: Date.now() - started,
      query: searchQuery ?? "",
    })
  }

  const hasPricingContext = Boolean(
    currency_code || region_id || customer_id || customer_group_id
  )
  const contextParams: Record<string, unknown> = {}
  if (hasPricingContext) {
    contextParams.variants = {
      calculated_price: QueryContext({
        ...(currency_code && { currency_code }),
        ...(region_id && { region_id }),
        ...(customer_id && { customer_id }),
        ...(customer_group_id && { customer_group_id }),
      }),
    }
  }

  const { data: products } = await query.graph({
    entity: "product",
    fields: [
      "*",
      "images.*",
      "options.*",
      "options.values.*",
      "variants.*",
      "variants.options.*",
      "variants.prices.*",
      ...(hasPricingContext ? ["variants.calculated_price.*"] : []),
      "categories.*",
      "collection.*",
      "type.*",
      "tags.*",
      "seller.*",
    ],
    filters: { id: productIds },
    ...(Object.keys(contextParams).length > 0 && { context: contextParams }),
  })

  const productMap = new Map(products.map((p) => [p.id, p]))
  const orderedProducts = productIds
    .map((id) => productMap.get(id))
    .filter(Boolean)

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
  })
}
