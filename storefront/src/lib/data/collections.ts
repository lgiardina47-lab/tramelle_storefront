"use server"

import { HttpTypes } from "@medusajs/types"
import { cache } from "react"

import { getCacheOptions } from "./cookies"
import { sdk } from "../config"

export const retrieveCollection = async (id: string) => {
  const next = {
    ...(await getCacheOptions("collections")),
  }

  return sdk.client
    .fetch<{ collection: HttpTypes.StoreCollection }>(
      `/store/collections/${id}`,
      {
        next,
        cache: "force-cache",
      }
    )
    .then(({ collection }) => collection)
}

/** Una richiesta Medusa per coppia limit/offset per RSC (header + sezioni home in parallelo). */
const listCollectionsCached = cache(
  async (
    limit: string,
    offset: string
  ): Promise<{ collections: HttpTypes.StoreCollection[]; count: number }> => {
    const next = {
      ...(await getCacheOptions("collections")),
    }

    return sdk.client
      .fetch<{ collections: HttpTypes.StoreCollection[]; count: number }>(
        "/store/collections",
        {
          query: { limit, offset },
          next,
          cache: "force-cache",
        }
      )
      .then(({ collections }) => ({ collections, count: collections.length }))
  }
)

export async function listCollections(
  queryParams: Record<string, string> = {}
): Promise<{ collections: HttpTypes.StoreCollection[]; count: number }> {
  const limit = queryParams.limit || "100"
  const offset = queryParams.offset || "0"
  return listCollectionsCached(limit, offset)
}

export const getCollectionByHandle = async (
  handle: string
): Promise<HttpTypes.StoreCollection> => {
  const next = {
    ...(await getCacheOptions("collections")),
  }

  return sdk.client
    .fetch<HttpTypes.StoreCollectionListResponse>(`/store/collections`, {
      query: { handle, fields: "*products" },
      next,
      cache: "force-cache",
    })
    .then(({ collections }) => collections[0])
}
