import Image from "next/image"
import LocalizedClientLink from "@/components/molecules/LocalizedLink/LocalizedLink"
import { ArrowRightIcon } from "@/icons"
import { listCollections } from "@/lib/data/collections"

export async function ShopByStyleSection() {
  const { collections } = await listCollections({ limit: "24", offset: "0" })
  if (!collections.length) {
    return null
  }

  return (
    <section className="bg-primary container">
      <h2 className="heading-lg text-primary mb-12 uppercase tracking-tight">Selezioni</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 items-center">
        <div className="py-[52px] px-[58px] h-full border rounded-sm">
          {collections.map((c) => (
            <LocalizedClientLink
              key={c.id}
              href={`/collections/${c.handle}`}
              className="group flex items-center gap-4 text-primary hover:text-action transition-colors border-b border-transparent hover:border-primary w-fit pb-2 mb-8"
            >
              <span className="heading-lg uppercase">
                {(c.title ?? c.handle).replace(/-/g, " ")}
              </span>
              <ArrowRightIcon className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
            </LocalizedClientLink>
          ))}
        </div>
        <div className="relative hidden lg:block">
          <Image
            loading="lazy"
            fetchPriority="high"
            src="/images/shop-by-styles/Image.jpg"
            alt=""
            width={700}
            height={600}
            className="object-cover rounded-sm w-full h-auto"
          />
        </div>
      </div>
    </section>
  )
}
