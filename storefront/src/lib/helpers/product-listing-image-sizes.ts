import { HIDE_LISTING_FILTERS } from "@/const"

/**
 * Larghezza resa (CSS px) approssimata delle card prodotto nel listing.
 *
 * Layout riferimento `ProductsList` / `ProductListingProductsView`:
 * - `<768px` (max-md): `grid-cols-2`, `gap-3` (0.75rem)
 * - `≥768px` (md+): `md:grid-cols-5`, stesso gap
 * Contenitore pagina: `.container` in `globals.css` → `px-4`, `md:px-5`, `lg:px-8`
 * Listing con filtri: `CatalogSearchListing` → flex, sidebar fissa 280px, `gap-4` (1rem) tra colonna e griglia
 *
 * Coefficienti in rem (16px = 1rem per coerenza con Tailwind):
 * - Mobile: due colonne → `(100vw - 2*1rem - 0.75rem) / 2` = `(100vw - 2.75rem) / 2`
 * - Con sidebar: `(100vw - padding_h - 17.5rem - 1rem - 3rem) / 5` dove 17.5rem=280px, 1rem=gap flex, 3rem=4× gap griglia, padding_h=2.5rem (md) o 4rem (lg)
 * - Senza sidebar: `(100vw - padding_h - 3rem) / 5`
 */

const MD_MAX = "63.9375rem" // < 64rem = < 1024px (sotto `lg` per allineo a `lg:px-8`)
const MAX_MD = "47.9375rem" // < 48rem = < 768px

/** Larghezze (px) per `srcset` / varianti flessibili: coprono ~1x–2× rispetto alla card, evitando step fino a 1920 su tile ~300px. */
export const DEFAULT_PRODUCT_LISTING_CARD_SRC_WIDTHS: readonly number[] = [
  96, 120, 160, 200, 240, 280, 320, 400, 480, 560, 640, 800, 960,
] as const

/**
 * `sizes` per `<TramelleProductImage preset="listing-card" />` (griglia catalogo con card default).
 */
export function productListingCardImageSizesAttribute(): string {
  if (HIDE_LISTING_FILTERS) {
    return [
      `(max-width: ${MAX_MD}) calc((100vw - 2.75rem) / 2)`,
      `(min-width: 48rem) and (max-width: ${MD_MAX}) ` +
        "calc((100vw - 5.5rem) / 5)",
      `(min-width: 64rem) calc((100vw - 7rem) / 5)`,
    ].join(", ")
  }

  return [
    `(max-width: ${MAX_MD}) calc((100vw - 2.75rem) / 2)`,
    `(min-width: 48rem) and (max-width: ${MD_MAX}) ` +
      "calc((100vw - 24rem) / 5)",
    `(min-width: 64rem) calc((100vw - 25.5rem) / 5)`,
  ].join(", ")
}

/**
 * Carosello home (`layoutVariant="homeRail"`): traccia stretta, overflow Embla.
 */
export const productListingHomeRailImageSizesAttribute =
  "(min-width: 1280px) 220px, (min-width: 1024px) 18vw, " +
  "(min-width: 640px) 30vw, 45vw"

export const DEFAULT_HOME_RAIL_SRC_WIDTHS: readonly number[] = [
  200, 240, 280, 360, 440, 520, 640,
] as const
