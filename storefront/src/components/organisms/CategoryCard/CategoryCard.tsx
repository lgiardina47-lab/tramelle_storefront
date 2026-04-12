import LocalizedClientLink from "@/components/molecules/LocalizedLink/LocalizedLink"
import { categoryPublicHref } from "@/lib/helpers/category-public-url"
import Image from "next/image"

export function CategoryCard({
  category,
}: {
  category: { name: string; handle: string; imageSrc?: string }
}) {
  const src =
    category.imageSrc ?? `/images/categories/${category.handle}.png`

  return (
    <LocalizedClientLink
      href={categoryPublicHref(category.handle)}
      className="relative flex flex-col items-center border rounded-sm bg-component transition-all hover:rounded-full w-[233px] aspect-square"
    >
      <div className="flex relative aspect-square overflow-hidden w-[200px]">
        <Image
          loading="lazy"
          src={src}
          alt={`category - ${category.name}`}
          width={200}
          height={200}
          sizes="(min-width: 1024px) 200px, 40vw"
          className="object-contain scale-90 rounded-full"
        />
      </div>
      <h3 className="w-full text-center label-lg text-primary">
        {category.name}
      </h3>
    </LocalizedClientLink>
  )
}
