export function isMeilisearchConfigured(): boolean {
  const host = process.env.MEILISEARCH_HOST?.trim()
  const key = process.env.MEILI_MASTER_KEY?.trim()
  return Boolean(host && key)
}

export function getMeilisearchIndexName(): string {
  return process.env.MEILISEARCH_INDEX?.trim() || "products"
}
