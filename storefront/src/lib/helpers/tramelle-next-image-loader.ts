import type { ImageLoaderProps } from "next/image"
import { isCloudflareImagesDeliveryAbsoluteUrl } from "./cloudflare-images"

/**
 * Immagini già su Cloudflare Images → URL diretto (cache edge, varianti `w=` / nominate nel path).
 * Altre sorgenti → `/_next/image`.
 */
export default function tramelleImageLoader({
  src,
  width,
  quality,
}: ImageLoaderProps): string {
  if (isCloudflareImagesDeliveryAbsoluteUrl(src)) {
    return src
  }
  const q = quality ?? 75
  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${q}`
}
