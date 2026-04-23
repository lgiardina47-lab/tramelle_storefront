/**
 * PM2 — definizione app (porte: deploy/monorepo-default-ports.cjs).
 *
 * NON avviare tutto insieme: storefront + admin + vendor saturano il server (Hetzner).
 * Usa un solo front alla volta + backend se serve:
 *
 *   bash scripts/pm2-work-one.sh storefront   # solo shop (tramelle.com)
 *   bash scripts/pm2-work-one.sh admin        # solo manage
 *   bash scripts/pm2-work-one.sh vendor       # solo vendor
 *   bash scripts/pm2-work-one.sh backend      # solo API (ferma i tre front)
 *
 * Tutti i front + API insieme (server con RAM adeguata): `bash scripts/pm2-work-all-fronts.sh`
 * Oppure: `pm2 start ecosystem.config.cjs` (stesso effetto, senza attesa health API).
 */
const path = require('path')

const {
  STOREFRONT_PRODUCTION,
  BACKEND,
  ADMIN,
  VENDOR,
} = require('./deploy/monorepo-default-ports.cjs')

const root = __dirname

module.exports = {
  apps: [
    {
      name: 'mercur-backend',
      cwd: path.join(root, 'backend'),
      script: '/bin/bash',
      args: ['-c', 'exec yarn dev'],
      interpreter: 'none',
      env: {
        PORT: String(BACKEND),
      },
      autorestart: true,
      max_restarts: 30,
      min_uptime: '15s',
      exp_backoff_restart_delay: 3000,
    },
    {
      name: 'mercur-storefront',
      cwd: path.join(root, 'storefront'),
      script: path.join(root, 'storefront/start-production.sh'),
      interpreter: '/bin/bash',
      env: {
        PORT: String(STOREFRONT_PRODUCTION),
        HOSTNAME: '0.0.0.0',
        NODE_ENV: 'production',
        TRAMELLE_NEXT_DIST_DIR: '.next-production',
      },
      autorestart: true,
      max_restarts: 30,
      min_uptime: '15s',
      exp_backoff_restart_delay: 3000,
    },
    {
      name: 'mercur-admin',
      cwd: path.join(root, 'admin-panel'),
      script: '/bin/bash',
      args: ['-c', 'exec yarn dev'],
      interpreter: 'none',
      env: {
        PORT: String(ADMIN),
      },
      autorestart: true,
      max_restarts: 30,
      min_uptime: '15s',
      exp_backoff_restart_delay: 3000,
    },
    {
      name: 'mercur-vendor',
      cwd: path.join(root, 'vendor-panel'),
      script: '/bin/bash',
      args: ['-c', 'exec yarn dev'],
      interpreter: 'none',
      env: {
        PORT: String(VENDOR),
      },
      autorestart: true,
      max_restarts: 30,
      min_uptime: '15s',
      exp_backoff_restart_delay: 3000,
    },
  ],
}
