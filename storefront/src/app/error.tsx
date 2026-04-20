"use client"

/**
 * Boundary richiesta da Next (App Router) per gestire errori runtime nei segmenti figli del root layout.
 * Senza questo file, in dev compare spesso: «missing required error components, refreshing...».
 */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="container flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="heading-lg text-primary">Qualcosa è andato storto</h1>
      <p className="max-w-md text-sm text-neutral-600">
        {process.env.NODE_ENV === "development" && error.message
          ? error.message
          : "Si è verificato un errore imprevisto. Puoi riprovare."}
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-neutral-50"
      >
        Riprova
      </button>
    </div>
  )
}
