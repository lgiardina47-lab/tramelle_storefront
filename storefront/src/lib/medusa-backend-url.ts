/** Origine API Medusa per build di produzione (Pages / PM2) se `MEDUSA_BACKEND_URL` non è impostata. */
export const TRAMELLE_PRODUCTION_MEDUSA_ORIGIN = 'https://api.tramelle.com'

/**
 * Base URL server-side / middleware per chiamate a Medusa.
 * In produzione senza env esplicita → sempre `https://api.tramelle.com`.
 */
export const MEDUSA_BACKEND_URL =
  process.env.MEDUSA_BACKEND_URL?.trim() ||
  (process.env.NODE_ENV === 'production'
    ? TRAMELLE_PRODUCTION_MEDUSA_ORIGIN
    : 'http://localhost:9000')
