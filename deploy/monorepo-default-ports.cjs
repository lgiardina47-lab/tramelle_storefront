/**
 * Porte fisse del monorepo marketplace (allineate a package.json / vite.config).
 * Usate da ecosystem PM2 e documentate per nginx Plesk (apply-plesk-tramelle-proxy.sh).
 */
module.exports = {
  /** tramelle.com — Next.js storefront */
  STOREFRONT: 3000,
  /** api.tramelle.com — Medusa */
  BACKEND: 9000,
  /** manage.tramelle.com — admin Vite */
  ADMIN: 7000,
  /** vendor.tramelle.com — vendor Vite */
  VENDOR: 5173,
}
