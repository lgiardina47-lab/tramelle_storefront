/** Skeleton route: mostrato subito in navigazione client mentre arriva il RSC della pagina. */
export default function MainSegmentLoading() {
  return (
    <div className="container animate-pulse py-8 md:py-12" aria-busy="true">
      <div className="h-9 w-56 max-w-full rounded bg-neutral-100 md:h-10" />
      <div className="mt-4 h-4 max-w-2xl rounded bg-neutral-50" />
      <div className="mt-3 h-4 max-w-xl rounded bg-neutral-50" />
      <div className="mt-10 grid grid-cols-2 gap-5 md:grid-cols-5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="aspect-[4/3] rounded-sm bg-neutral-100"
          />
        ))}
      </div>
    </div>
  )
}
