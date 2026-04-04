/**
 * PM2 — definizione app (porte: deploy/monorepo-default-ports.cjs).
 *
 * NON avviare tutto insieme: storefront + admin + vendor saturano la VPS.
 * Usa un solo front alla volta + backend se serve:
 *
 *   bash scripts/pm2-work-one.sh storefront   # solo shop (tramelle.com)
 *   bash scripts/pm2-work-one.sh admin        # solo manage
 *   bash scripts/pm2-work-one.sh vendor       # solo vendor
 *   bash scripts/pm2-work-one.sh backend      # solo API (ferma i tre front)
 *
 * Solo se serve avviare tutto: `pm2 start ecosystem.config.cjs` (sconsigliato sulla VPS piccola).
 */
const path = require('path')

const { STOREFRONT, BACKEND, ADMIN, VENDOR } = require('./deploy/monorepo-default-ports.cjs')

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
        PORT: String(STOREFRONT),
        HOSTNAME: '0.0.0.0',
        NODE_ENV: 'production',
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
