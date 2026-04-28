/** Origine API Medusa per build di produzione (Pages / PM2) se `MEDUSA_BACKEND_URL` non è impostata. */
export const TRAMELLE_PRODUCTION_MEDUSA_ORIGIN = 'https://api.tramelle.com'

/**
 * Base URL per **Node / Edge** (layout, data layer, Route Handler, middleware).
 * `MEDUSA_BACKEND_URL_INTERNAL` (es. `http://backend:9000` o `http://127.0.0.1:9000` da Docker
 * sulla rete interna) evita un round-trip DNS/HTTPS verso l’host pubblico quando
 * Next e Medusa stanno sullo stesso host o sulla stessa rete.
 * Non usare `NEXT_PUBLIC_*` (non finisce nel client).
 */
export const MEDUSA_BACKEND_URL =
  process.env.MEDUSA_BACKEND_URL_INTERNAL?.trim() ||
  process.env.MEDUSA_BACKEND_URL?.trim() ||
  /** Esposto nel bundle client (`NEXT_PUBLIC_*`). Stesso host pubblico dell’API in browser. */
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL?.trim() ||
  (process.env.NODE_ENV === 'production'
    ? TRAMELLE_PRODUCTION_MEDUSA_ORIGIN
    : 'http://localhost:9000')
