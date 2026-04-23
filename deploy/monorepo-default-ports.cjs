/**
 * Porte fisse del monorepo marketplace (allineate a package.json / vite.config).
 * Usate da ecosystem PM2 e documentate per nginx Plesk (apply-plesk-tramelle-proxy.sh).
 */
module.exports = {
  /** Storefront **dev** (Docker `storefront` / `yarn dev` / HMR) */
  STOREFRONT: 3000,
  /** Storefront **produzione** standalone (Docker `storefront-production`; nginx tramelle.com → questa porta). Dev su 3000; evitare 3010 se occupata da altri servizi sul server. */
  STOREFRONT_PRODUCTION: 3020,
  /** api.tramelle.com — Medusa */
  BACKEND: 9000,
  /** manage.tramelle.com — admin Vite */
  ADMIN: 7000,
  /** vendor.tramelle.com — vendor Vite */
  VENDOR: 5173,
}
