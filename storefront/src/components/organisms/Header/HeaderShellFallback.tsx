/** Skeleton leggero: streaming dell’header reale non blocca il primo byte del contenuto sotto. */
export function HeaderShellFallback() {
  return (
    <header
      className="z-50 min-h-[7.5rem] animate-pulse border-b border-neutral-100 bg-white lg:min-h-[9.5rem]"
      aria-hidden
    >
      <div className="h-8 bg-neutral-50" />
      <div className="flex h-16 items-center gap-4 px-4 lg:px-8">
        <div className="h-9 w-40 rounded bg-neutral-100" />
        <div className="mx-auto hidden h-10 max-w-2xl flex-1 rounded-full bg-neutral-100 md:block" />
        <div className="ml-auto flex gap-2">
          <div className="h-10 w-10 rounded-full bg-neutral-100" />
          <div className="h-10 w-10 rounded-full bg-neutral-100" />
        </div>
      </div>
      <div className="h-14 border-t border-neutral-50 bg-white" />
    </header>
  )
}
