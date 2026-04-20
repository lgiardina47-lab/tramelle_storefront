"use client"

import Image from "next/image"
import {
  cloudflareProductImagePresetConfig,
  cloudflareProductImageResponsive,
  type CloudflareProductImagePreset,
} from "@/lib/helpers/cloudflare-images"
import { cn } from "@/lib/utils"
import { useLayoutEffect, useRef } from "react"

export type TramelleProductImageProps = {
  src: string
  alt: string
  preset: CloudflareProductImagePreset
  /** `fill`: genitore `position: relative` e area definita (es. aspect-square). */
  layout: "fill" | "intrinsic"
  className?: string
  priority?: boolean
  /** Listing con coordinator: evita `lazy` che non sblocca la riga sotto piega. */
  forceEager?: boolean
  width?: number
  height?: number
  /** Solo fallback `next/image` se l’URL non è Cloudflare flexible. */
  quality?: number
  onLoad?: () => void
  onError?: () => void
  "data-testid"?: string
}

/**
 * Immagini prodotto: con flexible CF attivo → `<img srcset>` con `w=`, `quality`, `sharpen`;
 * altrimenti `next/image` come prima.
 */
export function TramelleProductImage({
  src,
  alt,
  preset,
  layout,
  className,
  priority = false,
  forceEager = false,
  width,
  height,
  quality = 100,
  onLoad,
  onError,
  "data-testid": dataTestId,
}: TramelleProductImageProps) {
  const cfg = cloudflareProductImagePresetConfig(preset)
  const r = cloudflareProductImageResponsive(src, preset)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const eager = priority || forceEager
  const loading = eager ? "eager" : "lazy"

  useLayoutEffect(() => {
    if (!r || !onLoad) return
    const el = imgRef.current
    if (el?.complete && el.naturalWidth > 0) {
      onLoad()
    }
  }, [r?.src, r?.srcSet, onLoad, r])

  if (r) {
    const common = {
      src: r.src,
      srcSet: r.srcSet,
      sizes: r.sizes,
      alt,
      fetchPriority: eager ? ("high" as const) : undefined,
      loading: loading as "eager" | "lazy",
      decoding: "async" as const,
      onLoad,
      onError,
      "data-testid": dataTestId,
    }
    if (layout === "fill") {
      return (
        // eslint-disable-next-line @next/next/no-img-element -- srcset verso Cloudflare
        <img
          ref={imgRef}
          key={src}
          {...common}
          className={cn("absolute inset-0 h-full w-full", className)}
        />
      )
    }
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        ref={imgRef}
        key={src}
        {...common}
        width={width}
        height={height}
        className={className}
      />
    )
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill={layout === "fill"}
      width={layout === "intrinsic" ? width : undefined}
      height={layout === "intrinsic" ? height : undefined}
      sizes={cfg.sizes}
      priority={priority || forceEager}
      fetchPriority={eager ? "high" : undefined}
      quality={quality}
      className={className}
      data-testid={dataTestId}
      onLoad={onLoad}
      onError={onError}
    />
  )
}
