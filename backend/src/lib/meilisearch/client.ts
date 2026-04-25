import { getMeilisearchIndexName } from "./env"

export function createMeilisearchClient() {
  const host = process.env.MEILISEARCH_HOST?.trim()
  const apiKey = process.env.MEILI_MASTER_KEY?.trim()
  if (!host || !apiKey) {
    throw new Error("MEILISEARCH_HOST and MEILI_MASTER_KEY are required")
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { MeiliSearch } = require("meilisearch")
  return new MeiliSearch({ host, apiKey }) as {
    index: (uid: string) => unknown
    waitForTask: (taskUid: number) => Promise<unknown>
  }
}

export function getProductsIndex(client: {
  index: (uid: string) => unknown
}) {
  return client.index(getMeilisearchIndexName()) as {
    search: (
      q: string,
      opts?: Record<string, unknown>
    ) => Promise<{
      hits: Record<string, unknown>[]
      estimatedTotalHits?: number
      facetDistribution?: Record<string, Record<string, number>>
    }>
    updateSettings: (s: Record<string, unknown>) => Promise<{ taskUid: number }>
    deleteAllDocuments: () => Promise<{ taskUid: number }>
    deleteDocument: (documentId: string) => Promise<{ taskUid: number }>
    addDocuments: (
      docs: Record<string, unknown>[],
      opts?: { primaryKey?: string }
    ) => Promise<{ taskUid: number }>
  }
}
