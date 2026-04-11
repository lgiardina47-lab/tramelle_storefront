/**
 * Cloudflare Images: riferimenti compatti nel DB (`cfimg:<image_id>`) → URL di delivery.
 * Hash e variant non sono segreti (compaiono in ogni URL pubblica); il token API resta solo nel backend.
 *
 * Nota formato: se l’`image_id` termina in `.jpg` è solo la chiave caricata su Cloudflare, non il tipo MIME
 * della risposta. Il default è la variante **`tramelle`**: tetto 12000×12000 con `scale-down` (risoluzione = sorgente
 * se più piccola; niente upscale). Formato di uscita: **AVIF/WebP** secondo `Accept` (negoziazione Cloudflare).
 * Flexible variants restano disattivate: niente path parametrici, solo varianti nominate.
 * Override: env `…_VARIANT=public` (1366×768) o altro. Per `.webp` nel path dell’id: upload `--cf-id-extension .webp`.
 */

const DEFAULT_HOST = "imagedelivery.net"

/**
 * Flexible variant (richiede “Flexible variants” attivo in Cloudflare Images → Delivery).
 * Allineare eventuali override env tra storefront, backend e pannelli.
 */
const DEFAULT_CLOUDFLARE_IMAGES_VARIANT = "tramelle"

function deliveryHost(): string {
  return (
    process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_DELIVERY_HOST?.trim() ||
    process.env.CLOUDFLARE_IMAGES_DELIVERY_HOST?.trim() ||
    DEFAULT_HOST
  ).replace(/\/$/, "")
}

function cloudflareAccountHash(): string {
  return (
    process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_ACCOUNT_HASH?.trim() ||
    process.env.CLOUDFLARE_IMAGES_ACCOUNT_HASH?.trim() ||
    ""
  )
}

function cloudflareVariant(): string {
  return (
    process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_VARIANT?.trim() ||
    process.env.CLOUDFLARE_IMAGES_VARIANT?.trim() ||
    DEFAULT_CLOUDFLARE_IMAGES_VARIANT
  )
}

/** Custom image id può contenere `/` (es. `partner/slug/logo.jpg`); codifica ogni segmento. */
function encodeCfImageIdPath(imageId: string): string {
  return imageId
    .split("/")
    .map((s) => encodeURIComponent(s))
    .join("/")
}

/** Su `imagedelivery.net` il path è `/<hash>/<id>/<variant>`. Su dominio proprio: `/cdn-cgi/imagedelivery/<hash>/<id>/<variant>`. */
function isDefaultImagedeliveryHost(host: string): boolean {
  return host.toLowerCase() === "imagedelivery.net"
}

export function cloudflareImagesDeliveryUrl(imageId: string): string | null {
  const id = imageId.trim()
  const hash = cloudflareAccountHash()
  const variant = cloudflareVariant()
  if (!hash || !id) {
    return null
  }
  const host = deliveryHost()
  const idPath = encodeCfImageIdPath(id)
  if (isDefaultImagedeliveryHost(host)) {
    return `https://${host}/${hash}/${idPath}/${variant}`
  }
  return `https://${host}/cdn-cgi/imagedelivery/${hash}/${idPath}/${variant}`
}

/** Solo stringhe `cfimg:<id>`; altrimenti `null`. */
export function maybeExpandCfImgRef(value: string): string | null {
  const v = value.trim()
  if (!v.toLowerCase().startsWith("cfimg:")) {
    return null
  }
  const id = v.slice("cfimg:".length).trim()
  if (!id) {
    return null
  }
  return cloudflareImagesDeliveryUrl(id)
}
