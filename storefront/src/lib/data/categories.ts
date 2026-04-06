import { HttpTypes } from '@medusajs/types';

import { sdk } from '@/lib/config';

interface CategoriesProps {
  query?: Record<string, unknown>;
}

function sortByRank(
  items: HttpTypes.StoreProductCategory[]
): HttpTypes.StoreProductCategory[] {
  return [...items].sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
}

/**
 * Ricostruisce l'albero categorie dal backend (lista piatta + parent_category_id).
 * Non ci si affida al nesting eventualmente incompleto della risposta API.
 */
function buildCategoryTreeFromFlat(
  flat: HttpTypes.StoreProductCategory[]
): HttpTypes.StoreProductCategory[] {
  const byParent = new Map<string | null, HttpTypes.StoreProductCategory[]>();

  for (const cat of flat) {
    const pid =
      cat.parent_category_id === null || cat.parent_category_id === undefined
        ? null
        : cat.parent_category_id;
    if (!byParent.has(pid)) {
      byParent.set(pid, []);
    }
    byParent.get(pid)!.push(cat);
  }

  for (const list of byParent.values()) {
    sortByRank(list);
  }

  const attach = (parentId: string | null): HttpTypes.StoreProductCategory[] => {
    const list = byParent.get(parentId) || [];
    return list.map((node) => ({
      ...node,
      category_children: attach(node.id),
    }));
  };

  return attach(null);
}

export const listCategories = async ({ query }: Partial<CategoriesProps> = {}) => {
  const limit = query?.limit || 100;

  let allCategories: HttpTypes.StoreProductCategory[] = [];
  try {
    allCategories = await sdk.client
      .fetch<{
        product_categories: HttpTypes.StoreProductCategory[];
      }>('/store/product-categories', {
        query: {
          fields:
            'id,handle,name,rank,metadata,parent_category_id,description,*category_children',
          include_descendants_tree: true,
          include_ancestors_tree: true,
          limit,
          ...query
        },
        cache: 'force-cache',
        next: { revalidate: 3600 }
      })
      .then(({ product_categories }) => product_categories ?? []);
  } catch {
    allCategories = [];
  }

  const parentCategories = buildCategoryTreeFromFlat(allCategories);

  const categories = parentCategories.flatMap(
    (parent) => parent.category_children || []
  );

  return {
    parentCategories,
    categories
  };
};

export const getCategoryByHandle = async (categoryHandle: string) => {
  return sdk.client
    .fetch<HttpTypes.StoreProductCategoryListResponse>(`/store/product-categories`, {
      query: {
        fields: '*category_children',
        handle: categoryHandle
      },
      cache: 'force-cache',
      next: { revalidate: 300 }
    })
    .then(({ product_categories }) => product_categories[0])
    .catch(() => undefined);
};
