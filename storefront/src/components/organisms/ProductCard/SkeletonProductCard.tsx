import { cn } from "@/lib/utils"

function PulseBar({ className }: { className?: string }) {
  return (
    <div
      className={cn("rounded-sm bg-neutral-200 animate-pulse", className)}
      aria-hidden
    />
  )
}

/** Allineato a `ProductCard` v2: seller strip + 4/3 + body. */
export const SkeletonProductCard = () => {
  return (
    <div
      className="relative flex max-w-full min-w-0 w-full flex-col overflow-hidden rounded-[18px] border border-[#E8E4DE] lg:w-[calc(25%-1rem)] min-w-[250px] bg-white"
      data-testid="skeleton-product-card"
    >
      <div className="flex items-center gap-2 border-b border-[#E8E4DE] bg-[#FAFAF8] px-3 py-2">
        <PulseBar className="h-[22px] w-[22px] shrink-0 rounded-md" />
        <div className="min-w-0 flex-1 space-y-1">
          <PulseBar className="h-3 w-24 max-w-full" />
          <PulseBar className="h-2.5 w-16 max-w-full opacity-80" />
        </div>
      </div>
      <div className="relative w-full aspect-[4/3] overflow-hidden bg-[#F7F6F3]">
        <PulseBar className="pointer-events-none absolute inset-0 rounded-none" />
      </div>
      <div className="flex flex-1 flex-col px-[13px] pb-2 pt-[11px]">
        <div className="w-full space-y-2">
          <PulseBar className="h-3.5 w-3/4 max-w-[12rem]" />
          <div className="flex items-baseline gap-2">
            <PulseBar className="h-6 w-20" />
            <PulseBar className="h-3 w-12 opacity-70" />
          </div>
        </div>
        <PulseBar className="mt-3 h-11 w-full rounded-[999px]" />
      </div>
    </div>
  )
}
