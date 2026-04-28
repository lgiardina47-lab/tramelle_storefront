/**
 * Verifica build filtri catalogo ↔ URL (multiselect / deselect).
 * Esecuzione: da `storefront/`, `npx --yes tsx scripts/test-build-catalog-request.ts`
 */
import { buildCatalogRequestFromQueryString } from "../src/lib/helpers/build-catalog-request"

function assert(cond: boolean, message: string): void {
  if (!cond) {
    throw new Error(`Assertion failed: ${message}`)
  }
}

const ctx = {
  locale: "it",
  currency_code: "eur",
  category_ids: [] as string[],
}

let r = buildCatalogRequestFromQueryString("", ctx)
assert(r.page === 1, "page default 1")
assert(r.query === "", "empty query")
assert(r.filters.includes("supported_countries"), "base filter present")

r = buildCatalogRequestFromQueryString("page=3", ctx)
assert(r.page === 3, "page from qs")

r = buildCatalogRequestFromQueryString("query=pasta", ctx)
assert(r.query === "pasta", "query echo")

r = buildCatalogRequestFromQueryString("tags_value=olio", ctx)
assert(
  r.filters.includes('tags.value:"olio"'),
  "single facet value in Meili string"
)

r = buildCatalogRequestFromQueryString("tags_value=olio%2Caceto", ctx)
assert(r.filters.includes(" OR "), "multi value OR within same facet")
assert(
  r.filters.includes('tags.value:"olio"') && r.filters.includes('tags.value:"aceto"'),
  "both tags in filter"
)

r = buildCatalogRequestFromQueryString("provenance_country=IT", ctx)
assert(r.filters.includes('provenance_country:"IT"'), "provenance ISO")

// Parametro unico con virgola = multiselect reale
r = buildCatalogRequestFromQueryString("provenance_country=IT%2CFR", ctx)
assert(
  r.filters.includes(" OR ") && r.filters.includes("provenance_country"),
  "multiselect country OR"
)

r = buildCatalogRequestFromQueryString("tags_value=olio", ctx)
assert(
  r.filters.includes("tags.value"),
  "select tag before deselect"
)
r = buildCatalogRequestFromQueryString("", ctx)
assert(
  !r.filters.includes("tags.value"),
  "deselect: assenza param → nessun filtro tag"
)

console.log("build-catalog-request assertions: ok")
