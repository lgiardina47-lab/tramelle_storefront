import { Carousel } from "@/components/cells"
import { CategoryCard } from "@/components/organisms"
import { listCategories } from "@/lib/data/categories"

export const HomeCategories = async ({ heading }: { heading: string }) => {
  const { parentCategories } = await listCategories({ query: { limit: 100 } })
  const sorted = [...parentCategories].sort(
    (a, b) => (a.rank ?? 0) - (b.rank ?? 0)
  )
  const items = sorted.slice(0, 12)

  if (!items.length) {
    return null
  }

  return (
    <section className="bg-primary py-8 w-full">
      <div className="mb-8">
        <h2 className="heading-lg text-primary uppercase tracking-tight">{heading}</h2>
      </div>
      <Carousel
        items={items.map((category) => (
          <CategoryCard
            key={category.id}
            category={{
              name: category.name,
              handle: category.handle,
            }}
          />
        ))}
      />
    </section>
  )
}
