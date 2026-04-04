"use client"

import Image from "next/image"
import { useMemo, useState } from "react"

export const SellerStorytellingGallery = ({
  name,
  urls,
}: {
  name: string
  urls: string[]
}) => {
  const [broken, setBroken] = useState(() => new Set<number>())

  const visible = useMemo(
    () => urls.map((src, i) => ({ src, i })).filter(({ i }) => !broken.has(i)),
    [urls, broken]
  )

  if (!urls.length || !visible.length) {
    return null
  }

  return (
    <div className="mt-6">
      <h3 className="label-md uppercase mb-3">Gallery</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {urls.map((src, i) =>
          broken.has(i) ? null : (
            <a
              key={`${src}-${i}`}
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              className="block overflow-hidden rounded-sm border bg-ui-bg-subtle aspect-[4/3]"
            >
              <Image
                src={src}
                alt={`${name} — ${i + 1}`}
                width={800}
                height={600}
                className="h-full w-full object-cover transition-opacity hover:opacity-95"
                sizes="(max-width: 768px) 50vw, 33vw"
                onError={() =>
                  setBroken((prev) => new Set(prev).add(i))
                }
              />
            </a>
          )
        )}
      </div>
    </div>
  )
}
