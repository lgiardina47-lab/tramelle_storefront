import type { Metadata } from "next"

export { DEFAULT_PUBLIC_SITE_ORIGIN, publicSiteOrigin } from "./site-url"

export {
  TRAMELLE_COMING_SOON_CANONICAL_HOSTS,
  effectiveRequestHostFromHeaders,
  requestShowsComingSoonHome,
  shouldUseProductionComingSoonHome,
} from "./coming-soon-public-home"

/** Default branding when env vars are unset (must match .env.local.example). */
export const DEFAULT_SITE_NAME = "Tramelle Source Gourmet"

export const DEFAULT_SITE_DESCRIPTION =
  "Tramelle Source Gourmet: specialità alimentari, produttori e gusti selezionati per te."

/** Valori tipici del template Mercur/Fleek ancora presenti in `.env` di produzione: usare branding Tramelle. */
const LEGACY_PLACEHOLDER_SITE_NAMES = new Set([
  "Mercur B2C Storefront",
  "Fleek Marketplace",
])

const LEGACY_PLACEHOLDER_DESCRIPTIONS = new Set([
  "Mercur Marketplace",
  "Fleek Markeplace",
  "Fleek Marketplace",
])

/** Nome sito per titoli e Open Graph: `NEXT_PUBLIC_SITE_NAME` se personalizzato, altrimenti default Tramelle. */
export function resolvedSiteName(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_NAME?.trim()
  if (!raw || LEGACY_PLACEHOLDER_SITE_NAMES.has(raw)) {
    return DEFAULT_SITE_NAME
  }
  return raw
}

export function resolvedSiteDescription(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_DESCRIPTION?.trim()
  if (!raw || LEGACY_PLACEHOLDER_DESCRIPTIONS.has(raw)) {
    return DEFAULT_SITE_DESCRIPTION
  }
  return raw
}

/** Set `NEXT_PUBLIC_ALLOW_SEARCH_INDEXING=true` to allow crawlers; default is blocked. */
export function allowSearchIndexing(): boolean {
  return process.env.NEXT_PUBLIC_ALLOW_SEARCH_INDEXING === "true"
}

/**
 * Listing prodotti con ricerca/facet: lo storefront usa `POST /store/products/search` sul Medusa (plugin Algolia).
 * Le credenziali Algolia restano nel backend (`ALGOLIA_APP_ID` / `ALGOLIA_API_KEY`); **non** servono
 * `NEXT_PUBLIC_ALGOLIA_ID` né `NEXT_PUBLIC_ALGOLIA_SEARCH_KEY` per abilitare questa UI.
 * Per forzare il catalogo statico Medusa (`ProductListing`), imposta `NEXT_PUBLIC_DISABLE_ALGOLIA_LISTING=true`.
 */
export function preferBackendProductSearchListing(): boolean {
  return process.env.NEXT_PUBLIC_DISABLE_ALGOLIA_LISTING !== "true"
}

export function getIndexingRobots(options?: {
  googleBotRich?: boolean
}): NonNullable<Metadata["robots"]> {
  if (!allowSearchIndexing()) {
    return {
      index: false,
      follow: false,
      googleBot: { index: false, follow: false },
    }
  }
  if (options?.googleBotRich) {
    return {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-video-preview": -1,
        "max-snippet": -1,
      },
    }
  }
  return { index: true, follow: true }
}
