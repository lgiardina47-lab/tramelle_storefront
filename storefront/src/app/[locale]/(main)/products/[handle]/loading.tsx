import { ProductDetailsPageSkeleton } from "./_components/product-details-skeleton"

/** Skeleton navigazione `/[locale]/products/[handle]` durante fetch prodotto. */
export default function ProductPageLoading() {
  return (
    <main className="container py-4 md:py-6" aria-busy="true" role="status">
      <span className="sr-only">Caricamento scheda prodotto…</span>
      <ProductDetailsPageSkeleton />
    </main>
  )
}
