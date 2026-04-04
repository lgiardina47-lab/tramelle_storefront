import {
  QueryKey,
  UseQueryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { sdk } from "../../lib/client";
import { queryKeysFactory } from "../../lib/query-key-factory";
import { VendorSeller } from "../../types";
import { AdminCustomerGroup, AdminOrder, AdminProduct } from "@medusajs/types";
import { OrderSet } from "../../types/order/common";

export const sellerQueryKeys = queryKeysFactory("seller");

/**
 * Mercur default per GET /admin/sellers/:id è solo id,name,handle,description,photo.
 * Senza questo elenco, metadata (website, categorie Taste, listing_region) e contatti non tornano al client.
 */
export const SELLER_ADMIN_DETAIL_FIELDS =
  "id,name,handle,description,photo,email,phone,store_status,address_line,city,state,postal_code,country_code,tax_id,+metadata,created_at,updated_at,*members";

type SortableOrderFields = "display_id" | "created_at" | "updated_at";
type SortableProductFields = "title" | "created_at" | "updated_at";
type SortableCustomerGroupFields = "name" | "created_at" | "updated_at";

const sortOrders = (orders: any[], order: string) => {
  const field = order.startsWith("-")
    ? (order.slice(1) as SortableOrderFields)
    : (order as SortableOrderFields);
  const isDesc = order.startsWith("-");

  return [...orders].sort((a, b) => {
    let aValue: string | number | null | undefined = a[field];
    let bValue: string | number | null | undefined = b[field];

    // Handle null/undefined values
    if (!aValue && aValue !== "") return isDesc ? -1 : 1;
    if (!bValue && bValue !== "") return isDesc ? 1 : -1;

    // Special handling for dates
    if (field === "created_at" || field === "updated_at") {
      const aDate = new Date(String(aValue)).getTime();
      const bDate = new Date(String(bValue)).getTime();
      return isDesc ? bDate - aDate : aDate - bDate;
    }

    // Handle display_id as number
    if (field === "display_id") {
      const aNum = Number(aValue);
      const bNum = Number(bValue);
      return isDesc ? bNum - aNum : aNum - bNum;
    }

    // Handle string comparison
    const aString = String(aValue).toLowerCase();
    const bString = String(bValue).toLowerCase();

    if (aString < bString) return isDesc ? 1 : -1;
    if (aString > bString) return isDesc ? -1 : 1;
    return 0;
  });
};

const sortProducts = (products: any[], order: string) => {
  const field = order.startsWith("-")
    ? (order.slice(1) as SortableProductFields)
    : (order as SortableProductFields);
  const isDesc = order.startsWith("-");

  return [...products].sort((a, b) => {
    let aValue: string | number | null | undefined = a[field];
    let bValue: string | number | null | undefined = b[field];

    // Handle null/undefined values
    if (!aValue && aValue !== "") return isDesc ? -1 : 1;
    if (!bValue && bValue !== "") return isDesc ? 1 : -1;

    // Special handling for dates
    if (field === "created_at" || field === "updated_at") {
      const aDate = new Date(String(aValue)).getTime();
      const bDate = new Date(String(bValue)).getTime();
      return isDesc ? bDate - aDate : aDate - bDate;
    }

    // Handle string comparison
    const aString = String(aValue).toLowerCase();
    const bString = String(bValue).toLowerCase();

    if (aString < bString) return isDesc ? 1 : -1;
    if (aString > bString) return isDesc ? -1 : 1;
    return 0;
  });
};

const ADMIN_SELLERS_FETCH_PAGE = 500

async function fetchAllAdminSellersBatched(
  base: Record<string, string | number | undefined>
): Promise<{ sellers: VendorSeller[]; total: number }> {
  const merged: VendorSeller[] = []
  let offset = 0
  let total = 0
  for (;;) {
    const res = await sdk.client.fetch<{
      sellers: VendorSeller[]
      count?: number
    }>("/admin/sellers", {
      method: "GET",
      query: { ...base, limit: ADMIN_SELLERS_FETCH_PAGE, offset },
    })
    const batch = res.sellers ?? []
    total = res.count ?? 0
    merged.push(...batch)
    if (
      batch.length < ADMIN_SELLERS_FETCH_PAGE ||
      merged.length >= total
    ) {
      break
    }
    offset += ADMIN_SELLERS_FETCH_PAGE
  }
  return { sellers: merged, total }
}

function sellerMatchesSearchQ(seller: VendorSeller, q: string): boolean {
  const t = q.trim().toLowerCase()
  if (!t) {
    return true
  }
  return (
    (seller.name?.toLowerCase().includes(t) ?? false) ||
    (seller.email?.toLowerCase().includes(t) ?? false) ||
    (seller.handle?.toLowerCase().includes(t) ?? false)
  )
}

function sellerMatchesCreatedAt(
  seller: VendorSeller,
  filter: Record<string, unknown>
): boolean {
  if (!seller.created_at) {
    return false
  }
  const t = new Date(seller.created_at).getTime()
  if (filter.$gte) {
    const g = new Date(String(filter.$gte)).getTime()
    if (!Number.isNaN(g) && t < g) {
      return false
    }
  }
  if (filter.$lte) {
    const l = new Date(String(filter.$lte)).getTime()
    if (!Number.isNaN(l) && t > l) {
      return false
    }
  }
  return true
}

function pickAdminSellerServerQuery(
  query: Record<string, string | number | string[] | undefined> | undefined,
  withPagination: boolean
): Record<string, string | number | undefined> {
  const out: Record<string, string | number | undefined> = {}
  if (!query) {
    return out
  }
  if (query.fields != null && query.fields !== "") {
    out.fields = query.fields as string
  }
  if (query.order != null && query.order !== "") {
    out.order = query.order as string
  }
  if (query.with_deleted != null && query.with_deleted !== "") {
    out.with_deleted = query.with_deleted as string | number
  }
  if (withPagination) {
    if (query.offset != null && query.offset !== "") {
      out.offset = Number(query.offset)
    }
    if (query.limit != null && query.limit !== "") {
      out.limit = Number(query.limit)
    }
  }
  return out
}

const sortCustomerGroups = (customerGroups: any[], order: string) => {
  const field = order.startsWith("-")
    ? (order.slice(1) as SortableCustomerGroupFields)
    : (order as SortableCustomerGroupFields);
  const isDesc = order.startsWith("-");

  return [...customerGroups].sort((a, b) => {
    let aValue: string | number | null | undefined = a[field];
    let bValue: string | number | null | undefined = b[field];

    // Handle null/undefined values
    if (!aValue && aValue !== "") return isDesc ? -1 : 1;
    if (!bValue && bValue !== "") return isDesc ? 1 : -1;

    // Special handling for dates
    if (field === "created_at" || field === "updated_at") {
      const aDate = new Date(String(aValue)).getTime();
      const bDate = new Date(String(bValue)).getTime();
      return isDesc ? bDate - aDate : aDate - bDate;
    }

    // Handle string comparison
    const aString = String(aValue).toLowerCase();
    const bString = String(bValue).toLowerCase();

    if (aString < bString) return isDesc ? 1 : -1;
    if (aString > bString) return isDesc ? -1 : 1;
    return 0;
  });
};

export const useSellers = (
  query?: Record<string, string | number | string[] | undefined>,
  options?: Omit<
    UseQueryOptions<
      { sellers: VendorSeller[]; count?: number },
      Error,
      { sellers: VendorSeller[]; count?: number },
      QueryKey
    >,
    "queryFn" | "queryKey"
  >
) => {
  const searchQ =
    query?.q != null && String(query.q).trim() !== ""
      ? String(query.q).trim()
      : undefined

  let createdAtFilter: Record<string, unknown> | undefined
  if (
    query?.created_at != null &&
    typeof query.created_at === "object" &&
    !Array.isArray(query.created_at)
  ) {
    createdAtFilter = query.created_at as Record<string, unknown>
  }

  const storeStatusFilter = Array.isArray(query?.store_status)
    ? (query!.store_status!.filter(Boolean) as string[])
    : undefined

  const hasClientFilter = Boolean(
    searchQ ||
      (createdAtFilter && Object.keys(createdAtFilter).length > 0) ||
      (storeStatusFilter && storeStatusFilter.length > 0)
  )

  const tableOffset = Number(query?.offset) || 0
  const tableLimit = Math.max(1, Number(query?.limit) || 20)

  const { data, ...other } = useQuery<
    { sellers: VendorSeller[]; count?: number },
    Error,
    { sellers: VendorSeller[]; count?: number }
  >({
    queryKey: sellerQueryKeys.list(query),
    queryFn: async () => {
      if (!hasClientFilter) {
        const serverQuery = pickAdminSellerServerQuery(query, true)
        return sdk.client.fetch("/admin/sellers", {
          method: "GET",
          query: serverQuery,
        })
      }

      const base = pickAdminSellerServerQuery(query, false)
      const { sellers: allRows } = await fetchAllAdminSellersBatched(base)

      let rows = allRows
      if (searchQ) {
        rows = rows.filter((s) => sellerMatchesSearchQ(s, searchQ))
      }
      if (storeStatusFilter?.length) {
        rows = rows.filter((s) =>
          storeStatusFilter.includes(String(s.store_status))
        )
      }
      if (createdAtFilter && Object.keys(createdAtFilter).length > 0) {
        rows = rows.filter((s) => sellerMatchesCreatedAt(s, createdAtFilter!))
      }

      return {
        sellers: rows.slice(tableOffset, tableOffset + tableLimit),
        count: rows.length,
      }
    },
    ...options,
  })

  return {
    sellers: data?.sellers,
    count: data?.count,
    ...other,
  };
};

export const useSeller = (id: string) => {
  return useQuery<{ seller: VendorSeller }, Error, { seller: VendorSeller }>({
    queryKey: sellerQueryKeys.detail(id),
    queryFn: () =>
      sdk.client.fetch(`/admin/sellers/${id}`, {
        method: "GET",
        query: { fields: SELLER_ADMIN_DETAIL_FIELDS },
      }),
  });
};

export const useSellerOrders = (
  id: string,
  query?: Record<string, string | number>,
  filters?: any
) => {
  const { data, isLoading } = useQuery({
    queryKey: ["seller-orders", id, query],
    queryFn: () =>
      sdk.client.fetch<{ orders: AdminOrder[] }>(
        `/admin/sellers/${id}/orders`,
        {
          method: "GET",
          query,
        }
      ),
  });

  if (!data?.orders) {
    return { data, isLoading };
  }

  let processedOrders = [...data.orders];

  // Apply search filter if present
  if (filters?.q) {
    const searchTerm = String(filters.q).toLowerCase();
    processedOrders = processedOrders.filter(
      (order) =>
        order.customer?.first_name?.toLowerCase().includes(searchTerm) ||
        order.customer?.last_name?.toLowerCase().includes(searchTerm) ||
        order.customer?.email?.toLowerCase().includes(searchTerm)
    );
  }

  // Filter by region_id
  if (filters?.region_id && Array.isArray(filters.region_id)) {
    processedOrders = processedOrders.filter(
      (order) => order.region_id && filters.region_id.includes(order.region_id)
    );
  }

  // Filter by sales_channel_id
  if (filters?.sales_channel_id && Array.isArray(filters.sales_channel_id)) {
    processedOrders = processedOrders.filter(
      (order) =>
        order.sales_channel_id &&
        filters.sales_channel_id.includes(order.sales_channel_id)
    );
  }

  // Filter by created_at date ranges
  if (filters?.created_at) {
    const dateFilter = filters.created_at as any;
    if (dateFilter.$gte) {
      const filterDate = new Date(dateFilter.$gte);
      processedOrders = processedOrders.filter((order) => {
        const orderCreatedAt = new Date(order.created_at || "");
        return orderCreatedAt >= filterDate;
      });
    }
    if (dateFilter.$lte) {
      const filterDate = new Date(dateFilter.$lte);
      processedOrders = processedOrders.filter((order) => {
        const orderCreatedAt = new Date(order.created_at || "");
        return orderCreatedAt <= filterDate;
      });
    }
  }

  // Filter by updated_at date ranges
  if (filters?.updated_at) {
    const dateFilter = filters.updated_at as any;

    if (dateFilter.$gte) {
      const filterDate = new Date(dateFilter.$gte);
      processedOrders = processedOrders.filter((order) => {
        const orderUpdatedAt = new Date(order.updated_at || "");
        return orderUpdatedAt >= filterDate;
      });
    }
    if (dateFilter.$lte) {
      const filterDate = new Date(dateFilter.$lte);
      processedOrders = processedOrders.filter((order) => {
        const orderUpdatedAt = new Date(order.updated_at || "");
        return orderUpdatedAt <= filterDate;
      });
    }
  }

  // Apply sorting if present
  if (filters?.order) {
    const order = String(filters.order);
    const validOrders = [
      "display_id",
      "-display_id",
      "created_at",
      "-created_at",
      "updated_at",
      "-updated_at",
    ] as const;

    if (validOrders.includes(order as (typeof validOrders)[number])) {
      processedOrders = sortOrders(processedOrders, order);
    }
  }

  const offset = Number(filters.offset) || 0;
  const limit = Number(filters.limit) || 10;

  return {
    data: {
      ...data,
      orders: processedOrders.slice(offset, offset + limit),
      count: processedOrders.length,
    },
    isLoading,
  };
};

export const useUpdateSeller = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      sdk.client.fetch(`/admin/sellers/${id}`, { method: "POST", body: data }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: sellerQueryKeys.list() });
      queryClient.invalidateQueries({ queryKey: sellerQueryKeys.detail(id) });
    },
  });
};

export const useSellerProducts = (
  id: string,
  query?: Record<string, string | number>,
  filters?: any
) => {
  const { data, isLoading, refetch } = useQuery<
    { products: AdminProduct[] },
    Error,
    { products: AdminProduct[] }
  >({
    queryKey: ["seller-products", id, query],
    queryFn: () =>
      sdk.client.fetch(`/admin/sellers/${id}/products`, {
        method: "GET",
        query,
      }),
  });

  if (!data?.products) {
    return { data, isLoading, refetch };
  }

  let processedProducts = [...data.products];

  // Apply search filter if present
  if (filters?.q) {
    const searchTerm = String(filters.q).toLowerCase();
    processedProducts = processedProducts.filter((product) =>
      product.title?.toLowerCase().includes(searchTerm)
    );
  }

  // Filter by tag_id
  if (filters?.tag_id && Array.isArray(filters.tag_id)) {
    processedProducts = processedProducts.filter((product) =>
      product.tags?.some((tag: any) => filters.tag_id.includes(tag.id))
    );
  }

  // Filter by type_id
  if (filters?.type_id && Array.isArray(filters.type_id)) {
    processedProducts = processedProducts.filter((product) =>
      filters.type_id.includes(product.type_id)
    );
  }

  // Filter by sales_channel_id
  if (filters?.sales_channel_id && Array.isArray(filters.sales_channel_id)) {
    processedProducts = processedProducts.filter((product) =>
      product.sales_channels?.some((channel: any) =>
        filters.sales_channel_id.includes(channel.id)
      )
    );
  }

  // Filter by status
  if (filters?.status && Array.isArray(filters.status)) {
    processedProducts = processedProducts.filter((product) =>
      filters.status.includes(product.status)
    );
  }

  // Filter by created_at date ranges
  if (filters?.created_at) {
    const dateFilter = filters.created_at as any;
    if (dateFilter.$gte) {
      const filterDate = new Date(dateFilter.$gte);
      processedProducts = processedProducts.filter((product) => {
        const productCreatedAt = new Date(product.created_at || "");
        return productCreatedAt >= filterDate;
      });
    }
    if (dateFilter.$lte) {
      const filterDate = new Date(dateFilter.$lte);
      processedProducts = processedProducts.filter((product) => {
        const productCreatedAt = new Date(product.created_at || "");
        return productCreatedAt <= filterDate;
      });
    }
  }

  // Filter by updated_at date ranges
  if (filters?.updated_at) {
    const dateFilter = filters.updated_at as any;
    if (dateFilter.$gte) {
      const filterDate = new Date(dateFilter.$gte);
      processedProducts = processedProducts.filter((product) => {
        const productUpdatedAt = new Date(product.updated_at || "");
        return productUpdatedAt >= filterDate;
      });
    }
    if (dateFilter.$lte) {
      const filterDate = new Date(dateFilter.$lte);
      processedProducts = processedProducts.filter((product) => {
        const productUpdatedAt = new Date(product.updated_at || "");
        return productUpdatedAt <= filterDate;
      });
    }
  }

  // Apply sorting if present
  if (filters?.order) {
    const order = String(filters.order);
    const validOrders = [
      "title",
      "-title",
      "created_at",
      "-created_at",
      "updated_at",
      "-updated_at",
    ] as const;

    if (validOrders.includes(order as (typeof validOrders)[number])) {
      processedProducts = sortProducts(processedProducts, order);
    }
  }

  // Apply pagination
  const offset = Number(filters?.offset) || 0;
  const limit = Number(filters?.limit) || 10;

  return {
    data: {
      ...data,
      products: processedProducts.slice(offset, offset + limit),
      count: processedProducts.length,
    },
    isLoading,
    refetch,
  };
};

export const useSellerCustomerGroups = (
  id: string,
  query?: Record<string, string | number>,
  filters?: Record<string, string | number>
) => {
  const { data, isLoading, refetch } = useQuery<
    { customer_groups: AdminCustomerGroup[] },
    Error,
    { customer_groups: AdminCustomerGroup[] }
  >({
    queryKey: ["seller-customer-groups", id, query],
    queryFn: () =>
      sdk.client.fetch(`/admin/sellers/${id}/customer-groups`, {
        method: "GET",
        query,
      }),
  });

  if (!data?.customer_groups) {
    return {
      data,
      isLoading,
      refetch,
    };
  }

  let processedCustomerGroups = [
    ...data.customer_groups.filter((group: any) => !!group),
  ];

  // Apply search filter if present
  if (filters?.q) {
    const searchTerm = String(filters.q).toLowerCase();
    processedCustomerGroups = processedCustomerGroups.filter((group) =>
      group.name?.toLowerCase().includes(searchTerm)
    );
  }

  // Filter by created_at date ranges
  if (filters?.created_at) {
    const dateFilter = filters.created_at as any;
    if (dateFilter.$gte) {
      const filterDate = new Date(dateFilter.$gte);
      processedCustomerGroups = processedCustomerGroups.filter((group) => {
        const groupCreatedAt = new Date(group.created_at || "");
        return groupCreatedAt >= filterDate;
      });
    }
    if (dateFilter.$lte) {
      const filterDate = new Date(dateFilter.$lte);
      processedCustomerGroups = processedCustomerGroups.filter((group) => {
        const groupCreatedAt = new Date(group.created_at || "");
        return groupCreatedAt <= filterDate;
      });
    }
  }

  // Filter by updated_at date ranges
  if (filters?.updated_at) {
    const dateFilter = filters.updated_at as any;
    if (dateFilter.$gte) {
      const filterDate = new Date(dateFilter.$gte);
      processedCustomerGroups = processedCustomerGroups.filter((group) => {
        const groupUpdatedAt = new Date(group.updated_at || "");
        return groupUpdatedAt >= filterDate;
      });
    }
    if (dateFilter.$lte) {
      const filterDate = new Date(dateFilter.$lte);
      processedCustomerGroups = processedCustomerGroups.filter((group) => {
        const groupUpdatedAt = new Date(group.updated_at || "");
        return groupUpdatedAt <= filterDate;
      });
    }
  }

  // Apply sorting if present
  if (filters?.order) {
    const order = String(filters.order);
    const validOrders = [
      "name",
      "-name",
      "created_at",
      "-created_at",
      "updated_at",
      "-updated_at",
    ] as const;

    if (validOrders.includes(order as (typeof validOrders)[number])) {
      processedCustomerGroups = sortCustomerGroups(
        processedCustomerGroups,
        order
      );
    }
  }

  const offset = Number(filters?.offset) || 0;
  const limit = Number(filters?.limit) || 10;

  return {
    data: {
      ...data,
      customer_groups: processedCustomerGroups.slice(offset, offset + limit),
      count: processedCustomerGroups.length,
    },
    count: processedCustomerGroups.length,
    isLoading,
    refetch,
  };
};

export const useInviteSeller = () => {
  return useMutation({
    mutationFn: ({
      email,
      registration_url = undefined,
    }: {
      email: string;
      registration_url?: string;
    }) =>
      sdk.client.fetch("/admin/sellers/invite", {
        method: "POST",
        body: { email, registration_url },
      }),
  });
};

export const useOrderSet = (id: string) => {
  return useQuery<
    { order_sets: OrderSet[] },
    Error,
    { order_sets: OrderSet[] }
  >({
    queryKey: ["order-set", id],
    queryFn: () =>
      sdk.client.fetch(`/admin/order-sets?order_id=${id}`, {
        method: "GET",
      }),
  });
};
