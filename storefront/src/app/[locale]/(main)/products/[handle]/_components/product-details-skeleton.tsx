import { cn } from "@/lib/utils"

function PulseBar({ className }: { className?: string }) {
  return (
    <div
      className={cn("rounded-sm bg-neutral-200 animate-pulse", className)}
      aria-hidden
    />
  )
}

/**
 * Layout allineato a `ProductDetailsPage`: galleria (metà) + colonna dettagli + fascia “altri prodotti”.
 */
export function ProductDetailsPageSkeleton() {
  return (
    <>
      <div
        className="flex flex-col md:flex-row lg:gap-12"
        data-testid="product-details-page-skeleton"
      >
        <div className="md:w-1/2 md:px-2">
          <div className="border border-neutral-200 w-full p-1 rounded-sm bg-white">
            <div className="relative overflow-hidden rounded-xs bg-neutral-100">
              <PulseBar className="aspect-square max-h-[700px] w-full rounded-none min-h-[280px] lg:min-h-[400px]" />
              <div className="pointer-events-none absolute bottom-3 left-3 right-3 lg:left-auto lg:right-auto lg:top-3 lg:h-[2px] lg:w-[calc(100%-24px)]">
                <PulseBar className="h-2 w-20 rounded-full lg:hidden mx-auto" />
                <div className="hidden lg:flex flex-col gap-3 absolute left-0 top-0">
                  {Array.from({ length: 4 }, (_, i) => (
                    <PulseBar key={i} className="h-16 w-16 rounded-sm shrink-0" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="md:w-1/2 md:px-2 mt-6 md:mt-0 space-y-5">
          <div className="space-y-3">
            <PulseBar className="h-8 w-4/5 max-w-xl" />
            <PulseBar className="h-4 w-32" />
            <PulseBar className="h-6 w-40" />
          </div>
          <div className="space-y-2 pt-2">
            <PulseBar className="h-3 w-full max-w-2xl" />
            <PulseBar className="h-3 w-full max-w-2xl" />
            <PulseBar className="h-3 w-5/6 max-w-xl" />
          </div>
          <div className="flex gap-3 pt-4">
            <PulseBar className="h-11 flex-1 max-w-[200px] rounded-sm" />
            <PulseBar className="h-11 w-11 rounded-sm shrink-0" />
          </div>
          <div className="space-y-2 pt-6 border-t border-neutral-100">
            <PulseBar className="h-3 w-40" />
            <PulseBar className="h-20 w-full rounded-sm" />
          </div>
        </div>
      </div>
      <div className="my-8 border-t border-neutral-100 pt-8">
        <PulseBar className="h-6 w-56 mb-6" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {Array.from({ length: 5 }, (_, i) => (
            <div
              key={i}
              className="min-w-0 border border-neutral-200 rounded-sm p-2 bg-white"
            >
              <PulseBar className="aspect-square w-full rounded-sm" />
              <div className="px-3 pt-3 space-y-2">
                <PulseBar className="h-4 w-3/4" />
                <PulseBar className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
