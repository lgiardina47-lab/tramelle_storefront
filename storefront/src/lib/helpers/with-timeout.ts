/**
 * Evita attese infinite su fetch RSC/client (facets, listing) se l'API non risponde.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const id = setTimeout(() => resolve(fallback), ms)
    promise
      .then((v) => {
        clearTimeout(id)
        resolve(v)
      })
      .catch(() => {
        clearTimeout(id)
        resolve(fallback)
      })
  })
}
