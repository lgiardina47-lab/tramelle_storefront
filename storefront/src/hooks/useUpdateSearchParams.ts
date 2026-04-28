import { usePathname, useRouter, useSearchParams } from "next/navigation"

const useUpdateSearchParams = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  const updateSearchParams = (field: string, value: string | null) => {
    // Barra d’indirizzo è spesso più aggiornata di `useSearchParams` tra un replace e il prossimo render.
    const liveQs =
      typeof window !== "undefined" && window.location.search.length > 1
        ? window.location.search.slice(1)
        : searchParams.toString()
    const updatedSearchParams = new URLSearchParams(liveQs)
    if (!value) {
      updatedSearchParams.delete(field)
    } else {
      updatedSearchParams.set(field, value)
    }

    const qs = updatedSearchParams.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, {
      scroll: false,
    })
  }

  return updateSearchParams
}

export default useUpdateSearchParams
