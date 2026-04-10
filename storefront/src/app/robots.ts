import { MetadataRoute } from "next"

import { allowSearchIndexing, publicSiteOrigin } from "@/lib/constants/site"

export const runtime = 'edge';

export default function robots(): MetadataRoute.Robots {
  if (!allowSearchIndexing()) {
    return {
      rules: [{ userAgent: "*", disallow: ["/"] }],
    }
  }

  const base = publicSiteOrigin()
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: `${base}/sitemap.xml`,
  }
}
