"use client"

import Image from "next/image"
import clsx from "clsx"
import { useCallback, useState } from "react"

/** Cover orizzontale a tutta larghezza (solo immagine, senza overlay testo/logo). */
export function SellerPageCoverBanner({
  coverCandidates,
  name,
  className,
}: {
  coverCandidates: string[]
  name: string
  className?: string
}) {
  const [attempt, setAttempt] = useState(0)
  const [dead, setDead] = useState(false)

  const onError = useCallback(() => {
    setAttempt((a) => {
      const next = a + 1
      if (next >= coverCandidates.length) {
        setDead(true)
        return next
      }
      return next
    })
  }, [coverCandidates.length])

  const src =
    !dead &&
    coverCandidates.length > 0 &&
    attempt < coverCandidates.length
      ? coverCandidates[attempt]!
      : null

  return (
    <div className={clsx("w-full bg-neutral-100", className)}>
      <div
        className={clsx(
          "relative w-full overflow-hidden",
          "min-h-[220px] h-[36vw] max-h-[520px] md:min-h-[280px]"
        )}
      >
        {src ? (
          <Image
            src={src}
            alt={`${name} — cover`}
            fill
            sizes="100vw"
            priority
            unoptimized
            className="object-cover object-center"
            onError={onError}
          />
        ) : (
          <div className="flex h-full min-h-[220px] w-full items-center justify-center bg-gradient-to-br from-neutral-200 to-neutral-100 md:min-h-[280px]" />
        )}
      </div>
    </div>
  )
}
