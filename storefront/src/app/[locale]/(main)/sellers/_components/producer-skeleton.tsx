import { cn } from "@/lib/utils"

/** Blocco grigio con `animate-pulse` (caricamento percepito lato browser, senza dipendere dalla CDN). */
export function PulseBlock({ className }: { className?: string }) {
  return <div className={cn("bg-neutral-200 animate-pulse", className)} />
}

/**
 * Segnaposto allineato a `SellerDirectoryCard` + `SellerDirectoryCardMedia`:
 * hero **aspect-[4/3]** come la card reale, pre-sizing fisso; `animate-pulse` sull’area immagine;
 * fascia bassa con logo 1:1, righe nome/località e footer link.
 */
export function ProducerSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm",
        className
      )}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-neutral-100">
        {/* Stesso box dell’hero reale: spazio riservato subito, pulse finché non c’è contenuto */}
        <PulseBlock className="pointer-events-none absolute inset-0 rounded-none" aria-hidden />

        <PulseBlock className="absolute left-3 top-3 z-[2] h-6 w-[5.25rem] rounded-full border border-neutral-200/80 sm:left-4" />

        <div className="absolute bottom-0 left-0 right-0 z-[2] flex items-center gap-3 border-t border-neutral-200/90 bg-white/95 px-3 py-2.5 backdrop-blur-sm sm:gap-3.5 sm:px-4">
          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-neutral-200 bg-white shadow-sm">
            <PulseBlock className="absolute inset-0 rounded-full" aria-hidden />
          </div>
          <div className="min-w-0 flex-1 text-left">
            {/* ~2 righe nome + riga località: stesso min-height della card reale */}
            <div className="min-h-[3rem] space-y-0">
              <PulseBlock className="h-3.5 w-[88%] max-w-full rounded-sm sm:h-4" />
              <PulseBlock className="mt-1 h-2.5 w-[58%] max-w-full rounded-sm" />
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-neutral-100">
        <div className="px-4 py-4">
          <PulseBlock className="h-3.5 w-36 rounded-sm sm:h-4" />
        </div>
      </div>
    </div>
  )
}

/** Skeleton filtri geografici (stesso ingombro del pannello `rounded-2xl` reale). */
export function SellerDirectoryFiltersSkeleton({
  className,
}: {
  className?: string
}) {
  return (
    <div
      className={cn(
        "mb-10 rounded-2xl border border-neutral-200/80 bg-white/90 p-4 shadow-sm backdrop-blur-sm sm:p-5",
        className
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="flex min-w-[12rem] flex-1 flex-col gap-2">
          <PulseBlock className="h-3 w-24 rounded" />
          <PulseBlock className="h-11 w-full rounded-xl" />
        </div>
        <div className="flex min-w-[12rem] flex-1 flex-col gap-2">
          <PulseBlock className="h-3 w-28 rounded" />
          <PulseBlock className="h-11 w-full rounded-xl" />
        </div>
      </div>
    </div>
  )
}

export function ProducerSkeletonGrid({
  count = 12,
  className,
}: {
  count?: number
  className?: string
}) {
  return (
    <ul
      className={cn(
        "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
        className
      )}
    >
      {Array.from({ length: count }, (_, i) => (
        <li key={i}>
          <ProducerSkeleton />
        </li>
      ))}
    </ul>
  )
}
