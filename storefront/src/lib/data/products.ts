'use server';

import { HttpTypes } from '@medusajs/types';

import { sortProducts } from '@/lib/helpers/sort-products';
import { SortOptions } from '@/types/product';
import { SellerProps } from '@/types/seller';

import { sdk } from '../config';
import { LISTING_SEARCH_FACET_ATTRIBUTES } from '../helpers/search-listing-facets';
import { storefrontProductSearchFilters } from '../helpers/storefront-search-filters';
import { storefrontListingProductFields } from '../helpers/product-list-fields';
import { getAuthHeaders } from './cookies';
import { retrieveCustomer } from './customer';
import {
  getRegion,
  resolveStorefrontLocaleToMedusaCountry,
  retrieveRegion
} from './regions';

export const listProducts = async ({
  pageParam = 1,
  queryParams,
  countryCode,
  regionId,
  category_id,
  category_ids,
  collection_id,
  forceCache = false,
  productFields
}: {
  pageParam?: number;
  queryParams?: HttpTypes.FindParams &
    HttpTypes.StoreProductParams & {
      handle?: string[];
    };
  category_id?: string;
  /** Più id → GET `/store/products` con `category_id` array (comportamento nativo Medusa v2). */
  category_ids?: string[];
  collection_id?: string;
  countryCode?: string;
  regionId?: string;
  forceCache?: boolean;
  /** Override campi Medusa (es. carosello home leggero). */
  productFields?: string;
}): Promise<{
  response: {
    products: (HttpTypes.StoreProduct & { seller?: SellerProps })[];
    count: number;
  };
  nextPage: number | null;
  queryParams?: HttpTypes.FindParams & HttpTypes.StoreProductParams;
}> => {
  if (!countryCode && !regionId) {
    throw new Error('Country code or region ID is required');
  }

  const limit = queryParams?.limit || 12;
  const _pageParam = Math.max(pageParam, 1);
  const offset = (_pageParam - 1) * limit;

  let region: HttpTypes.StoreRegion | undefined | null;
  let medusaCountryCode: string | undefined;

  if (countryCode) {
    medusaCountryCode = await resolveStorefrontLocaleToMedusaCountry(countryCode);
    region = await getRegion(medusaCountryCode);
  } else {
    region = await retrieveRegion(regionId!);
  }

  if (!region) {
    return {
      response: { products: [], count: 0 },
      nextPage: null
    };
  }

  const mergedCategoryIds = [
    ...new Set(
      [...(category_ids ?? []), ...(category_id ? [category_id] : [])]
        .map((id) => (typeof id === 'string' ? id.trim() : ''))
        .filter(Boolean)
    )
  ] as string[];

  /**
   * Medusa `StoreGetProductParams`: `category_id` è string | string[].
   * Con più id il modulo risolve prodotti in **qualsiasi** di quelle categorie (macro + foglie).
   */
  const category_id_for_query:
    | string
    | string[]
    | undefined =
    mergedCategoryIds.length > 1
      ? mergedCategoryIds
      : mergedCategoryIds.length === 1
        ? mergedCategoryIds[0]
        : undefined;

  const headers = {
    ...(await getAuthHeaders())
  };

  const listingFields = productFields ?? storefrontListingProductFields();

  const useCached =
    forceCache ||
    (limit <= 8 && !category_id_for_query && !collection_id);

  return sdk.client
    .fetch<{
      products: (HttpTypes.StoreProduct & { seller?: SellerProps })[];
      count: number;
    }>(`/store/products`, {
      method: 'GET',
      query: {
        country_code: medusaCountryCode ?? countryCode,
        ...(category_id_for_query != null
          ? { category_id: category_id_for_query }
          : {}),
        collection_id,
        limit,
        offset,
        region_id: region?.id,
        ...queryParams,
        fields: listingFields
      },
      headers,
      next: useCached ? { revalidate: 120 } : undefined,
      cache: useCached ? 'force-cache' : 'no-cache'
    })
    .then(({ products: productsRaw, count }) => {
      const products = productsRaw.filter(product => product.seller?.store_status !== 'SUSPENDED');

      const nextPage = count > offset + limit ? pageParam + 1 : null;

      /** Scheda prodotto: GET con handle + limit 1. Senza seller in payload il vecchio filtro svuotava l’array → 404. */
      const isSingleProductByHandle =
        limit === 1 &&
        Array.isArray(queryParams?.handle) &&
        queryParams.handle.length === 1 &&
        Boolean(queryParams.handle[0]);

      const normalized = products.map(prod => {
        // @ts-ignore Property 'seller' exists but TypeScript doesn't recognize it
        const reviews = prod.seller?.reviews?.filter(item => !!item) ?? [];
        if (prod?.seller) {
          return {
            ...prod,
            seller: {
              // @ts-ignore Property 'seller' exists but TypeScript doesn't recognize it
              ...prod.seller,
              reviews
            }
          };
        }
        return prod;
      });

      const response = isSingleProductByHandle
        ? normalized
        : normalized.filter(prod => Boolean(prod?.seller));

      return {
        response: {
          products: response,
          count
        },
        nextPage: nextPage,
        queryParams
      };
    })
    .catch(() => {
      return {
        response: {
          products: [],
          count: 0
        },
        nextPage: 0,
        queryParams
      };
    });
};

/**
 * This will fetch 100 products to the Next.js cache and sort them based on the sortBy parameter.
 * It will then return the paginated products based on the page and limit parameters.
 */
export const listProductsWithSort = async ({
  page = 1,
  queryParams,
  sortBy = 'created_at',
  countryCode,
  category_id,
  category_ids,
  seller_id,
  collection_id
}: {
  page?: number;
  queryParams?: HttpTypes.FindParams & HttpTypes.StoreProductParams;
  sortBy?: SortOptions;
  countryCode: string;
  category_id?: string;
  category_ids?: string[];
  seller_id?: string;
  collection_id?: string;
}): Promise<{
  response: {
    products: HttpTypes.StoreProduct[];
    count: number;
  };
  nextPage: number | null;
  queryParams?: HttpTypes.FindParams & HttpTypes.StoreProductParams;
}> => {
  const limit = queryParams?.limit || 12;
  const batchLimit = 100;

  let products: (HttpTypes.StoreProduct & { seller?: SellerProps })[] = [];
  let storeCount = 0;

  if (seller_id) {
    /**
     * La lista globale GET /store/products non espande `seller` su ogni riga; il filtro
     * in listProducts() elimina tutto. Usiamo GET /store/sellers/:id/products che
     * risolve i product_id dal link Mercur e ricarica ogni SKU come /store/products?id=.
     */
    const offset = (page - 1) * limit;
    const headers = {
      ...(await getAuthHeaders())
    };
    const medusaCc = await resolveStorefrontLocaleToMedusaCountry(countryCode);
    const pageResult = await sdk.client
      .fetch<{
        products: (HttpTypes.StoreProduct & { seller?: SellerProps })[];
        count: number;
      }>(`/store/sellers/${encodeURIComponent(seller_id)}/products`, {
        method: 'GET',
        query: {
          limit,
          offset,
          country_code: medusaCc
        },
        headers,
        cache: process.env.NODE_ENV === 'development' ? 'no-store' : 'force-cache',
        next: process.env.NODE_ENV === 'development' ? undefined : { revalidate: 60 }
      })
      .catch(() => ({ products: [] as (HttpTypes.StoreProduct & { seller?: SellerProps })[], count: 0 }));

    products = pageResult.products || [];
    storeCount = pageResult.count ?? 0;
  } else {
    const mergedCat = [
      ...new Set(
        [...(category_ids ?? []), ...(category_id ? [category_id] : [])]
          .map((id) => (typeof id === 'string' ? id.trim() : ''))
          .filter(Boolean)
      )
    ] as string[];

    if (mergedCat.length > 1) {
      const { response, nextPage: np } = await listProducts({
        pageParam: Math.max(page, 1),
        queryParams: {
          ...queryParams,
          limit
        },
        category_ids: mergedCat,
        collection_id,
        countryCode
      });
      const pricedProducts = response.products.filter((prod) =>
        prod.variants?.some((variant) => variant.calculated_price !== null)
      );
      const sortedProducts = sortProducts(pricedProducts, sortBy);
      return {
        response: {
          products: sortedProducts,
          count: response.count
        },
        nextPage: np,
        queryParams
      };
    }

    const { response } = await listProducts({
      pageParam: Math.max(page, 1),
      queryParams: {
        ...queryParams,
        limit: batchLimit
      },
      category_id: mergedCat.length === 1 ? mergedCat[0] : category_id,
      collection_id,
      countryCode
    });
    products = response.products;
    storeCount = response.count;
  }

  const pricedProducts = products.filter(prod =>
    prod.variants?.some(variant => variant.calculated_price !== null)
  );

  const sortedProducts = sortProducts(pricedProducts, sortBy);

  const pageParam = (page - 1) * limit;
  const sellerTotal = storeCount;
  const paginatedProducts = seller_id
    ? sortedProducts
    : sortedProducts.slice(pageParam, pageParam + limit);

  const nextPage =
    seller_id != null
      ? pageParam + limit < sellerTotal
        ? page + 1
        : null
      : storeCount > pageParam + limit
        ? page + 1
        : null;

  return {
    response: {
      products: paginatedProducts,
      count: seller_id != null ? sellerTotal : storeCount
    },
    nextPage,
    queryParams
  };
};

export const searchProducts = async (params: {
  query?: string;
  page?: number;
  hitsPerPage?: number;
  filters?: string;
  facets?: string[];
  maxValuesPerFacet?: number;
  currency_code?: string;
  countryCode?: string;
  region_id?: string;
  customer_id?: string;
  customer_group_id?: string[];
}): Promise<{
  products: (HttpTypes.StoreProduct & { seller?: SellerProps })[];
  nbHits: number;
  page: number;
  nbPages: number;
  hitsPerPage: number;
  facets: Record<string, any>;
  processingTimeMS: number;
}> => {
  if (!params.countryCode && !params.region_id) {
    throw new Error('Country code or region ID is required');
  }

  let region_id = params.region_id;

  if (!region_id && params.countryCode) {
    const region = await getRegion(params.countryCode);
    if (!region) {
      throw new Error(`Region not found for country code: ${params.countryCode}`);
    }
    region_id = region.id;
  }

  const headers = {
    ...(await getAuthHeaders())
  };

  const loggedCustomer = await retrieveCustomer();

  let customer_id = params.customer_id;

  if (!customer_id) {
    if (loggedCustomer) {
      customer_id = loggedCustomer.id;
    }
  }

  let facets = params.facets;

  if (!facets) {
    facets = [...LISTING_SEARCH_FACET_ATTRIBUTES];
  }

  const { countryCode, ...bodyParams } = params;

  return sdk.client
    .fetch<{
      products: (HttpTypes.StoreProduct & { seller?: SellerProps })[];
      nbHits: number;
      page: number;
      nbPages: number;
      hitsPerPage: number;
      facets: Record<string, any>;
      processingTimeMS: number;
    }>(`/store/products/search`, {
      method: 'POST',
      body: {
        ...bodyParams,
        region_id,
        customer_id,
        facets,
        maxValuesPerFacet: 100
      },
      headers,
      cache: 'no-cache'
    })
    .then(response => {
      return {
        ...response,
        products: response.products ?? []
      };
    })
    .catch(() => {
      return {
        products: [],
        nbHits: 0,
        page: params.page || 0,
        nbPages: 0,
        hitsPerPage: params.hitsPerPage || 12,
        facets: {},
        processingTimeMS: 0
      };
    });
};

/**
 * Anteprima ricerca (header): pochi hit, senza facet, debounce lato client.
 */
export async function instantSearchProducts(params: {
  query: string;
  locale: string;
  currency_code: string;
}): Promise<{
  products: (HttpTypes.StoreProduct & { seller?: SellerProps })[];
}> {
  const q = params.query.trim();
  if (q.length < 2) {
    return { products: [] };
  }

  const region = await getRegion(params.locale);
  if (!region) {
    return { products: [] };
  }

  try {
    const result = await searchProducts({
      query: q,
      page: 0,
      hitsPerPage: 8,
      filters: storefrontProductSearchFilters(params.locale, params.currency_code),
      facets: [],
      maxValuesPerFacet: 1,
      currency_code: params.currency_code,
      countryCode: params.locale
    });
    return { products: result.products ?? [] };
  } catch {
    return { products: [] };
  }
}

/** Fallback catalogo (client listing) con cookie di sessione e campi coerenti con listProducts. */
export async function fetchMedusaCatalogFallback(params: {
  countryCode: string;
  category_id?: string;
  /** Stesso schema di `listProducts`: più id → array su `category_id` (Medusa store API). */
  category_ids?: string[];
  collection_id?: string;
  region_id?: string;
  /** Se valorizzato (scheda produttore), usa `/store/sellers/:id/products` invece del catalogo globale. */
  seller_id?: string;
  limit: number;
  offset: number;
}): Promise<{
  products: (HttpTypes.StoreProduct & { seller?: SellerProps })[];
  count: number;
}> {
  const headers = {
    ...(await getAuthHeaders())
  };
  const medusaCc = await resolveStorefrontLocaleToMedusaCountry(
    params.countryCode
  );

  const sid = params.seller_id?.trim();
  if (sid) {
    const medusa = await sdk.client.fetch<{
      products: (HttpTypes.StoreProduct & { seller?: SellerProps })[];
      count: number;
    }>(`/store/sellers/${encodeURIComponent(sid)}/products`, {
      method: 'GET',
      query: {
        country_code: medusaCc,
        limit: params.limit,
        offset: params.offset
      },
      headers,
      cache: 'no-store'
    });
    return { products: medusa.products ?? [], count: medusa.count ?? 0 };
  }

  const fields = storefrontListingProductFields();

  const mergedCat = [
    ...new Set(
      [...(params.category_ids ?? []), ...(params.category_id ? [params.category_id] : [])]
        .map((id) => (typeof id === 'string' ? id.trim() : ''))
        .filter(Boolean)
    )
  ] as string[];
  const categoryParam:
    | string
    | string[]
    | undefined =
    mergedCat.length > 1
      ? mergedCat
      : mergedCat.length === 1
        ? mergedCat[0]
        : undefined;

  const medusa = await sdk.client.fetch<{
    products: (HttpTypes.StoreProduct & { seller?: SellerProps })[];
    count: number;
  }>(`/store/products`, {
    method: 'GET',
    query: {
      country_code: medusaCc,
      ...(categoryParam != null ? { category_id: categoryParam } : {}),
      ...(params.collection_id ? { collection_id: params.collection_id } : {}),
      ...(params.region_id ? { region_id: params.region_id } : {}),
      limit: params.limit,
      offset: params.offset,
      fields,
      order: 'created_at'
    },
    headers,
    cache: 'no-store'
  });

  return { products: medusa.products ?? [], count: medusa.count ?? 0 };
}
