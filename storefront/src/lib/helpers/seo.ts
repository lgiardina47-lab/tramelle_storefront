import { HttpTypes } from "@medusajs/types"
import {
  getIndexingRobots,
  publicSiteOrigin,
  resolvedSiteName,
} from "@/lib/constants/site"
import { Metadata } from "next"

const siteLabel = () => resolvedSiteName()

export const generateProductMetadata = async (
  product: HttpTypes.StoreProduct
): Promise<Metadata> => {
  const base = publicSiteOrigin()
  const name = siteLabel()

  return {
    title: product?.title,
    description: `${product?.title} - ${name}`,
    robots: getIndexingRobots(),
    metadataBase: new URL(`${base}/products/${product?.handle}`),

    openGraph: {
      title: product?.title,
      description: `${product?.title} - ${name}`,
      url: `${base}/products/${product?.handle}`,
      siteName: name,
      images: [
        {
          url:
            product?.thumbnail ||
            `${base}/images/placeholder.svg`,
          width: 1200,
          height: 630,
          alt: product?.title,
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: product?.title,
      description: `${product?.title} - ${name}`,
      images: [
        product?.thumbnail || `${base}/images/placeholder.svg`,
      ],
    },
  }
}

export const generateCategoryMetadata = async (
  category: HttpTypes.StoreProductCategory
) => {
  const base = publicSiteOrigin()
  const name = siteLabel()

  return {
    robots: getIndexingRobots(),
    metadataBase: new URL(`${base}/categories/${category.handle}`),
    title: `${category.name} Category`,
    description: `${category.name} Category - ${name}`,

    openGraph: {
      title: category.name,
      description: `${category.name} Category - ${name}`,
      url: `${base}/categories/${category.handle}`,
      siteName: name,
      images: [
        {
          url:
            `${base}/images/categories/${category.handle}.png` ||
            `${base}/images/placeholder.svg`,
          width: 1200,
          height: 630,
          alt: category.name,
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: category.name,
      description: `${category.name} Category - ${name}`,
      images: [
        `${base}/images/categories/${category.handle}.png` ||
          `${base}/images/placeholder.svg`,
      ],
    },
  }
}
