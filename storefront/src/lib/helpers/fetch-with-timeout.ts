/**
 * Default per tutte le fetch verso Medusa, API interne e client, così un backend
 * lento o bloccato non lascia il browser in attesa indefinita.
 */
export const DEFAULT_FETCH_TIMEOUT_MS = 5000

/**
 * `fetch` con `AbortController`: compatibile con Edge e browser (niente
 * `AbortSignal.timeout` su runtime vecchi se evitiamo e usiamo solo questa form).
 */
export function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  timeoutMs: number = DEFAULT_FETCH_TIMEOUT_MS
): Promise<Response> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  return fetch(input, { ...init, signal: init?.signal ?? ctrl.signal })
    .finally(() => clearTimeout(t))
}
