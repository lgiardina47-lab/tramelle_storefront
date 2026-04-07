import { HttpTypes } from "@medusajs/types"
import {
  getIndexingRobots,
  publicSiteOrigin,
  resolvedSiteName,
} from "@/lib/constants/site"
import { getLocalizedProductContentForCountry } from "@/lib/helpers/tramelle-product-content"
import { Metadata } from "next"

const siteLabel = () => resolvedSiteName()

export const generateProductMetadata = async (
  product: HttpTypes.StoreProduct,
  countryCode: string
): Promise<Metadata> => {
  const base = publicSiteOrigin().replace(/\/$/, "")
  const name = siteLabel()
  const handle = product?.handle || ""
  const path = `/${countryCode.toLowerCase()}/products/${handle}`

  const href = (cc: string) => `${base}/${cc}/products/${handle}`

  const localized = product
    ? getLocalizedProductContentForCountry(product, countryCode)
    : null
  const metaTitle = localized?.title || product?.title || ""
  const metaDescription =
    (localized?.description?.trim() && localized.description) ||
    `${metaTitle} - ${name}`

  return {
    title: metaTitle,
    description: metaDescription,
    robots: getIndexingRobots(),
    metadataBase: new URL(base),
    alternates: {
      canonical: `${base}${path}`,
      languages: {
        "it-IT": href("it"),
        "en-GB": href("gb"),
        "fr-FR": href("fr"),
        "de-DE": href("de"),
        "es-ES": href("es"),
        "nl-NL": href("nl"),
        "x-default": href("it"),
      },
    },

    openGraph: {
      title: metaTitle,
      description: metaDescription,
      url: `${base}${path}`,
      siteName: name,
      images: [
        {
          url:
            product?.thumbnail ||
            `${base}/images/placeholder.svg`,
          width: 1200,
          height: 630,
          alt: metaTitle,
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: metaTitle,
      description: metaDescription,
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
