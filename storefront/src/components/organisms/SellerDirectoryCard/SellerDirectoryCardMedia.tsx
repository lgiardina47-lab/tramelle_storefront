"use client"

import { useCallback, useState } from "react"

type Props = {
  heroCandidates: string[]
  logoCandidates: string[]
  name: string
  initials: string
  /** Es. "IT · Toscana" in basso a destra del gradiente */
  locationLine: string
}

/**
 * `<img>` + fallback a catena: evita limiti `next/image` su domini non in allowlist
 * e gestisce URL relativi al backend già normalizzati lato server.
 */
export function SellerDirectoryCardMedia({
  heroCandidates,
  logoCandidates,
  name,
  initials,
  locationLine,
}: Props) {
  const [heroAttempt, setHeroAttempt] = useState(0)
  const [heroDead, setHeroDead] = useState(false)
  const [logoAttempt, setLogoAttempt] = useState(0)
  const [logoDead, setLogoDead] = useState(false)

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

  const onLogoError = useCallback(() => {
    setLogoAttempt((a) => {
      const next = a + 1
      if (next >= logoCandidates.length) {
        setLogoDead(true)
        return next
      }
      return next
    })
  }, [logoCandidates.length])

  const heroSrc =
    !heroDead &&
    heroCandidates.length > 0 &&
    heroAttempt < heroCandidates.length
      ? heroCandidates[heroAttempt]!
      : null

  const logoSrc =
    !logoDead &&
    logoCandidates.length > 0 &&
    logoAttempt < logoCandidates.length
      ? logoCandidates[logoAttempt]!
      : null

  const showHeroPlaceholder = !heroSrc

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden bg-neutral-100">
      {showHeroPlaceholder ? (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-neutral-200 to-neutral-100">
          <span className="text-4xl font-semibold tracking-tight text-neutral-400">
            {initials}
          </span>
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- domini CDN variabili, niente optimizer
        <img
          src={heroSrc}
          alt={name}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          onError={onHeroError}
        />
      )}

      {/* Velo scuro sull’immagine per far risaltare il testo bianco */}
      <div
        className="pointer-events-none absolute inset-0 bg-black/45"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/70"
        aria-hidden
      />

      {/* Nome grande, bianco, allineato a sinistra */}
      <h2
        className="pointer-events-none absolute left-3 right-10 top-1/2 z-[1] -translate-y-1/2 text-left text-[clamp(1.2rem,3.6vw,2rem)] font-light uppercase leading-[1.08] tracking-[0.12em] text-white [text-shadow:0_2px_16px_rgba(0,0,0,0.85),0_1px_3px_rgba(0,0,0,0.9)] line-clamp-4 sm:left-4 sm:right-12"
        style={{ wordBreak: "break-word" }}
      >
        {name}
      </h2>

      <span className="absolute left-3 top-3 z-[2] rounded-full bg-white/90 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-800 backdrop-blur-sm sm:left-4">
        Produttore
      </span>

      {logoSrc ? (
        <div className="absolute bottom-3 left-3 z-[2] flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-white shadow-md ring-1 ring-black/5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoSrc}
            alt=""
            className="max-h-11 max-w-11 object-contain"
            onError={onLogoError}
          />
        </div>
      ) : null}

      <div
        className={
          logoSrc
            ? "absolute bottom-0 left-[4.5rem] right-0 z-[2] p-3 pt-6 text-left"
            : "absolute bottom-0 left-0 right-0 z-[2] p-3 pt-6 pl-3 text-left sm:pl-4"
        }
      >
        {locationLine ? (
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-white [text-shadow:0_1px_8px_rgba(0,0,0,0.9)]">
            {locationLine}
          </p>
        ) : null}
      </div>
    </div>
  )
}
