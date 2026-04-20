"use client"

import Image from "next/image"
import clsx from "clsx"
import { useCallback, useState } from "react"

type Props = {
  coverCandidates: string[]
  name: string
  logoUrl?: string | null
  regionLine?: string | null
  badges?: string[]
  className?: string
}

/** Banner cover a tutta larghezza (stile shop tipo marketplace). */
export function SellerPagePhotoMosaic({
  coverCandidates,
  name,
  logoUrl,
  regionLine,
  badges = [],
  className,
}: Props) {
  const [coverAttempt, setCoverAttempt] = useState(0)
  const [coverDead, setCoverDead] = useState(false)
  const [logoDead, setLogoDead] = useState(false)

  const onCoverError = useCallback(() => {
    setCoverAttempt((a) => {
      const next = a + 1
      if (next >= coverCandidates.length) {
        setCoverDead(true)
        return next
      }
      return next
    })
  }, [coverCandidates.length])

  const coverSrc =
    !coverDead &&
    coverCandidates.length > 0 &&
    coverAttempt < coverCandidates.length
      ? coverCandidates[coverAttempt]!
      : null

  const showLogo = Boolean(logoUrl?.trim()) && !logoDead

  if (!coverCandidates.length) {
    return null
  }

  return (
    <div className={clsx("w-full", className)}>
      <div
        className={clsx(
          "relative w-full overflow-hidden bg-neutral-100",
          "h-[200px] md:h-[280px] lg:h-[320px]"
        )}
      >
        {coverSrc ? (
          <Image
            src={coverSrc}
            alt={name}
            fill
            sizes="100vw"
            priority
            unoptimized
            className="object-cover object-top"
            onError={onCoverError}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-neutral-200 to-neutral-100">
            <span className="text-sm text-neutral-500">Immagine non disponibile</span>
          </div>
        )}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent to-[rgb(0_0_0/0.55)]"
          aria-hidden
        />

        {showLogo ? (
          <div className="absolute bottom-6 left-6 z-[1] h-24 w-24 rounded-full bg-white p-2.5 shadow-md sm:h-28 sm:w-28 sm:p-3">
            <div className="relative h-full w-full">
              <Image
                src={logoUrl!}
                alt={`Logo ${name}`}
                fill
                sizes="(max-width: 640px) 96px, 112px"
                unoptimized
                className="object-contain object-center"
                onError={() => setLogoDead(true)}
              />
            </div>
          </div>
        ) : null}

        <div className="absolute bottom-6 right-6 z-[1] max-w-[min(100%-9rem,70%)] text-right sm:max-w-[min(100%-10rem,70%)] md:max-w-[55%]">
          <h1 className="font-serif text-[28px] font-light tracking-[0.06em] text-white">
            {name}
          </h1>
          {regionLine ? (
            <p className="mt-1.5 text-[10px] uppercase tracking-[0.2em] text-white/60">
              {regionLine}
            </p>
          ) : null}
          {badges.length > 0 ? (
            <div className="mt-2.5 inline-flex flex-wrap justify-end gap-2">
              {badges.map((b) => (
                <span
                  key={b}
                  className="border border-[rgba(255,255,255,0.35)] px-2.5 py-1 text-[9px] uppercase text-white"
                >
                  {b}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
