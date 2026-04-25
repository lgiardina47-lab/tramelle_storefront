import { getMeilisearchIndexName } from "./env"

type MultiSearchResult = {
  results: Array<{
    facetDistribution?: Record<string, Record<string, number> | undefined>
  }>
}

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
    multiSearch: (params: {
      queries: Array<Record<string, unknown>>
    }) => Promise<MultiSearchResult>
  }
}

/** Una sola istanza per processo: meno overhead TCP/handshake verso Meili sul server. */
let singletonClient: ReturnType<typeof createMeilisearchClient> | null = null

export function getSingletonMeilisearchClient(): ReturnType<
  typeof createMeilisearchClient
> {
  if (!singletonClient) {
    singletonClient = createMeilisearchClient()
  }
  return singletonClient
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
