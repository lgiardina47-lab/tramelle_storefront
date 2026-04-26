import type { ImageLoaderProps } from "next/image"
import {
  cloudflareFlexibleSharpen,
  cloudflareFlexibleVariantsEnabled,
  isCloudflareImagesDeliveryAbsoluteUrl,
  rewriteCfImagesDeliveryVariant,
} from "./cloudflare-images"

/**
 * Immagini già su Cloudflare Images → con flexible attivo, ultimo segmento `w=…,fit=scale-down,…`
 * così `next/image` passa davvero la larghezza richiesta (altrimenti stesso URL enorme per ogni `srcset`).
 * Altre sorgenti → `/_next/image`.
 */
export default function tramelleImageLoader({
  src,
  width,
  quality,
}: ImageLoaderProps): string {
  if (isCloudflareImagesDeliveryAbsoluteUrl(src)) {
    if (cloudflareFlexibleVariantsEnabled()) {
      const q = Math.min(100, Math.max(1, quality ?? 80))
      const sh = cloudflareFlexibleSharpen()
      const variant = `w=${width},fit=scale-down,quality=${q},sharpen=${sh}`
      return rewriteCfImagesDeliveryVariant(src, variant)
    }
    return src
  }
  const q = quality ?? 75
  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${q}`
}
