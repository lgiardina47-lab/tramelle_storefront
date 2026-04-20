"use client"

import Image from "next/image"
import { useCallback, useEffect, useState } from "react"

export type HeroCoverSlide = {
  src: string
  alt: string
}

/**
 * L'ordine delle slide deve coincidere tra SSR e primo paint client: niente shuffle
 * in `useState` (il lazy initializer gira di nuovo in idratazione → ordine diverso → hydration error).
 * Il mescolamento iniziale resta sul server in `buildHeroCoverSlides`.
 */
function nextRandomIndex(len: number, current: number): number {
  if (len <= 1) return 0
  let n = Math.floor(Math.random() * len)
  let guard = 0
  while (n === current && guard < 16) {
    n = Math.floor(Math.random() * len)
    guard++
  }
  return n
}

/**
 * Sfondo hero: cambia cover produttore a intervalli con indice casuale (non sequenza fissa).
 */
export function HomeCinematicHeroRotatingBackdrop({
  slides,
  intervalMs = 6500,
}: {
  slides: HeroCoverSlide[]
  intervalMs?: number
}) {
  const ordered = slides
  const [idx, setIdx] = useState(0)

  const advance = useCallback(() => {
    setIdx((i) => nextRandomIndex(ordered.length, i))
  }, [ordered.length])

  useEffect(() => {
    if (ordered.length <= 1) return
    const id = window.setInterval(advance, intervalMs)
    return () => window.clearInterval(id)
  }, [advance, ordered.length, intervalMs])

  if (!ordered.length) {
    return null
  }

  const current = ordered[idx]!
  const src = decodeURIComponent(current.src.trim())

  return (
    <div className="absolute inset-0 z-0">
      <Image
        key={src}
        src={src}
        alt={current.alt}
        fill
        sizes="100vw"
        quality={85}
        priority={idx === 0}
        fetchPriority={idx === 0 ? "high" : "low"}
        className="object-cover object-center"
      />
    </div>
  )
}
