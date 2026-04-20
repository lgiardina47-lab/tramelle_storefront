import LocalizedClientLink from "@/components/molecules/LocalizedLink/LocalizedLink"
import { categoryPublicHref } from "@/lib/helpers/category-public-url"
import Image from "next/image"

/** Colori tono-su-tono per ogni macro-categoria gourmet. */
const CATEGORY_GRADIENTS: Record<string, string> = {
  "la-norcineria":    "from-[#2a1a0e] to-[#5c3317]",
  "le-carni":         "from-[#3b1a1a] to-[#7a3030]",
  "il-caseificio":    "from-[#1a2a1a] to-[#3a5c3a]",
  "l-oleario":        "from-[#1a2610] to-[#3d5c18]",
  "l-arte-bianca":    "from-[#1a1a2a] to-[#3a3a7a]",
  "l-alta-pasticceria": "from-[#2a1a25] to-[#6b3060]",
  "il-mare":          "from-[#0e1a2a] to-[#1a4060]",
  "la-dispensa":      "from-[#1a1a10] to-[#4a4a20]",
  "il-bosco":         "from-[#0e1a10] to-[#1a3a20]",
  "l-orto":           "from-[#101a0e] to-[#2a4a18]",
  "la-cantina":       "from-[#1a0e1a] to-[#4a1a4a]",
  "il-birrificio":    "from-[#1a1500] to-[#4a3a00]",
  "la-distilleria":   "from-[#150e1a] to-[#3a2a4a]",
  "la-torrefazione":  "from-[#1a0e00] to-[#4a2a00]",
  "la-sorgente":      "from-[#001a20] to-[#004a60]",
  "l-alveare":        "from-[#1a1400] to-[#503d00]",
}

const DEFAULT_GRADIENT = "from-neutral-800 to-neutral-600"

export function CategoryCard({
  category,
}: {
  category: { name: string; handle: string; imageSrc?: string }
}) {
  const imgSrc = category.imageSrc?.includes("placeholder")
    ? null
    : (category.imageSrc ?? null)

  const photoSrc = imgSrc ?? `/images/categories/${category.handle}.png`
  const gradient = CATEGORY_GRADIENTS[category.handle] ?? DEFAULT_GRADIENT

  const initial = (category.name || "")
    .replace(/^(La |Le |Il |L'|Lo |Gli |I |Un |Una )/, "")
    .charAt(0)
    .toUpperCase()

  return (
    <LocalizedClientLink
      href={categoryPublicHref(category.handle)}
      className="group relative flex flex-col items-center overflow-hidden rounded-[18px] border border-[#E8E4DE] transition-colors hover:border-[#CCC8C0] w-[180px] sm:w-[200px]"
    >
      <div
        className={`relative w-full aspect-square bg-gradient-to-br ${gradient} flex items-center justify-center overflow-hidden`}
      >
        {!imgSrc ? (
          <span className="text-[3.5rem] font-medium text-white/25 select-none leading-none">
            {initial}
          </span>
        ) : (
          <Image
            loading="lazy"
            src={photoSrc}
            alt={category.name}
            fill
            sizes="(min-width: 1024px) 200px, 50vw"
            className="object-cover"
          />
        )}
        <div className="pointer-events-none absolute inset-0 bg-black/0 group-hover:bg-black/[0.06]" />
      </div>
      <div className="w-full bg-white px-2 py-2.5 border-t">
        <h3 className="w-full text-center label-md text-primary leading-tight">
          {category.name}
        </h3>
      </div>
    </LocalizedClientLink>
  )
}
