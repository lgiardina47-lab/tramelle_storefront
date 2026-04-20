import {
  ProducerSkeletonGrid,
  PulseBlock,
  SellerDirectoryFiltersSkeleton,
} from "@/app/[locale]/(main)/sellers/_components/producer-skeleton"

/** Skeleton navigazione `/[locale]/sellers`: compare subito al cambio URL o primo caricamento. */
export default function SellersDirectoryLoading() {
  return (
    <main className="container py-10 md:py-16" aria-busy="true" role="status">
      <span className="sr-only">Loading producers…</span>

      <div className="mb-12 max-w-2xl">
        <PulseBlock className="h-8 w-48 rounded md:h-10" />
        <PulseBlock className="mt-4 h-4 max-w-xl rounded" />
        <PulseBlock className="mt-2 h-4 max-w-lg rounded" />
      </div>

      <SellerDirectoryFiltersSkeleton />
      <ProducerSkeletonGrid count={12} />
    </main>
  )
}
