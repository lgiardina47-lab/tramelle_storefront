"use client"

import { useCallback, useState } from "react"
import clsx from "clsx"

type Props = {
  heroCandidates: string[]
  /** Alt text (nome venditore) */
  name: string
  /** In dev: mostra URL immagine hero effettivamente caricata */
  showDebugUrls?: boolean
  className?: string
}

/**
 * Hero full-bleed in cima alla pagina venditore (cover ampia, stile directory).
 */
export function SellerPageHeroCover({
  heroCandidates,
  name,
  showDebugUrls = false,
  className,
}: Props) {
  const [heroAttempt, setHeroAttempt] = useState(0)
  const [heroDead, setHeroDead] = useState(false)

  const onHeroError = useCallback(() => {
    setHeroAttempt((a) => {
      const next = a + 1
      if (next >= heroCandidates.length) {
        setHeroDead(true)
        return next
      }
      return next
    })
  }, [heroCandidates.length])

  const heroSrc =
    !heroDead &&
    heroCandidates.length > 0 &&
    heroAttempt < heroCandidates.length
      ? heroCandidates[heroAttempt]!
      : null

  if (!heroCandidates.length) {
    return null
  }

  return (
    <div className={clsx("w-full", className)}>
      <div
        className={clsx(
          "relative w-full overflow-hidden bg-neutral-100",
          "h-[clamp(280px,48vh,620px)]"
        )}
      >
        {heroSrc ? (
          // eslint-disable-next-line @next/next/no-img-element -- CDN variabili
          <img
            src={heroSrc}
            alt={name}
            title={showDebugUrls ? heroSrc : undefined}
            className="absolute inset-0 h-full w-full object-cover object-center"
            onError={onHeroError}
          />
        ) : (
          <div className="flex h-full min-h-[280px] w-full items-center justify-center bg-gradient-to-br from-neutral-200 to-neutral-100">
            <span className="text-sm text-neutral-500">Immagine non disponibile</span>
          </div>
        )}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/20"
          aria-hidden
        />
      </div>
      {showDebugUrls && heroSrc ? (
        <p className="mt-2 break-all px-1 font-mono text-[11px] leading-snug text-secondary">
          <span className="font-semibold text-primary">Hero (attiva): </span>
          {heroSrc}
        </p>
      ) : null}
    </div>
  )
}
