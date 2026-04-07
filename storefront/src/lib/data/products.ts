'use server';

import { HttpTypes } from '@medusajs/types';

import { sortProducts } from '@/lib/helpers/sort-products';
import { SortOptions } from '@/types/product';
import { SellerProps } from '@/types/seller';

import { sdk } from '../config';
import { ALGOLIA_LISTING_FACET_ATTRIBUTES } from '../helpers/algolia-facets';
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
  collection_id,
  forceCache = false
}: {
  pageParam?: number;
  queryParams?: HttpTypes.FindParams &
    HttpTypes.StoreProductParams & {
      handle?: string[];
    };
  category_id?: string;
  collection_id?: string;
  countryCode?: string;
  regionId?: string;
  forceCache?: boolean;
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

  const headers = {
    ...(await getAuthHeaders())
  };

  const listingFields = storefrontListingProductFields();

  const useCached = forceCache || (limit <= 8 && !category_id && !collection_id);

  return sdk.client
    .fetch<{
      products: (HttpTypes.StoreProduct & { seller?: SellerProps })[];
      count: number;
    }>(`/store/products`, {
      method: 'GET',
      query: {
        country_code: medusaCountryCode ?? countryCode,
        category_id,
        collection_id,
        limit,
        offset,
        region_id: region?.id,
        ...queryParams,
        fields: listingFields
      },
      headers,
      next: useCached ? { revalidate: 60 } : undefined,
      cache: useCached ? 'force-cache' : 'no-cache'
    })
    .then(({ products: productsRaw, count }) => {
      const products = productsRaw.filter(product => product.seller?.store_status !== 'SUSPENDED');

      const nextPage = count > offset + limit ? pageParam + 1 : null;

      const response = products.filter(prod => {
        // @ts-ignore Property 'seller' exists but TypeScript doesn't recognize it
        const reviews = prod.seller?.reviews.filter(item => !!item) ?? [];
        return (
          // @ts-ignore Property 'seller' exists but TypeScript doesn't recognize it
          prod?.seller && {
            ...prod,
            seller: {
              // @ts-ignore Property 'seller' exists but TypeScript doesn't recognize it
              ...prod.seller,
              reviews
            }
          }
        );
      });

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
  seller_id,
  collection_id
}: {
  page?: number;
  queryParams?: HttpTypes.FindParams & HttpTypes.StoreProductParams;
  sortBy?: SortOptions;
  countryCode: string;
  category_id?: string;
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
        cache: 'no-store'
      })
      .catch(() => ({ products: [] as (HttpTypes.StoreProduct & { seller?: SellerProps })[], count: 0 }));

    products = pageResult.products || [];
    storeCount = pageResult.count ?? 0;
  } else {
    const { response } = await listProducts({
      pageParam: Math.max(page, 1),
      queryParams: {
        ...queryParams,
        limit: batchLimit
      },
      category_id,
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
    facets = [...ALGOLIA_LISTING_FACET_ATTRIBUTES];
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

/** Fallback catalogo (client listing) con cookie di sessione e campi coerenti con listProducts. */
export async function fetchMedusaCatalogFallback(params: {
  countryCode: string;
  category_id?: string;
  collection_id?: string;
  region_id?: string;
  limit: number;
  offset: number;
}): Promise<{
  products: (HttpTypes.StoreProduct & { seller?: SellerProps })[];
  count: number;
}> {
  const headers = {
    ...(await getAuthHeaders())
  };
  const fields = storefrontListingProductFields();
  const medusaCc = await resolveStorefrontLocaleToMedusaCountry(
    params.countryCode
  );

  const medusa = await sdk.client.fetch<{
    products: (HttpTypes.StoreProduct & { seller?: SellerProps })[];
    count: number;
  }>(`/store/products`, {
    method: 'GET',
    query: {
      country_code: medusaCc,
      ...(params.category_id ? { category_id: params.category_id } : {}),
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
