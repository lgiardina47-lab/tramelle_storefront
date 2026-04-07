"use client"

import Image from "next/image"
import { useState } from "react"

type Phase = "meta" | "static" | "gradient"

type Props = {
  name: string
  handle: string
  imageUrl?: string | null
}

/**
 * Striscia hero sopra la griglia: `metadata.image_url` (admin), poi `/public/images/categories/{handle}.png`,
 * altrimenti fallback grafico (stesso spirito di FeaturedCategory).
 */
export function CategoryBanner({ name, handle, imageUrl }: Props) {
  const meta = imageUrl?.trim() ?? ""
  const [phase, setPhase] = useState<Phase>(meta ? "meta" : "static")

  const shell =
    "relative mb-8 w-full aspect-[2.2/1] max-h-[min(42vh,440px)] overflow-hidden rounded-lg bg-primary/5"

  if (phase === "meta" && meta) {
    return (
      <div className={shell}>
        <Image
          src={meta}
          alt={name}
          fill
          className="object-cover object-center"
          sizes="(max-width: 768px) 100vw, min(1200px, 92vw)"
          priority
          onError={() => setPhase("static")}
        />
      </div>
    )
  }

  if (phase === "static") {
    return (
      <div className={shell}>
        {/* Fallback file statico: niente ottimizzazione Next per gestire 404 senza build error */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/images/categories/${handle}.png`}
          alt={name}
          className="h-full w-full object-cover object-center"
          onError={() => setPhase("gradient")}
        />
      </div>
    )
  }

  return (
    <div
      className="mb-8 flex aspect-[2.2/1] max-h-[min(42vh,440px)] w-full items-center justify-center rounded-lg border border-neutral-100 bg-gradient-to-br from-sky-100/90 via-sky-50 to-white px-6 text-center"
      aria-hidden
    >
      <p className="heading-md uppercase text-primary">{name}</p>
    </div>
  )
}
