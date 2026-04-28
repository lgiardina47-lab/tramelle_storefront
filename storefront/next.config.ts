// Test Deploy Automatico 1
import type { NextConfig } from 'next';
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
import createNextIntlPlugin from 'next-intl/plugin';

/**
 * `initOpenNextCloudflareForDev` monkey-patcha `vm` e può rompere `next dev` (500 su tutte le route).
 * Lo stack Docker (`docker-compose.yml`) imposta `DOCKER=1`: lì serve solo Medusa su HTTP, non Wrangler.
 * Per lavorare con preview Cloudflare in locale: avvia `next dev` senza `DOCKER=1` (o imposta `OPENNEXT_CLOUDFLARE_DEV=1`).
 */
const openNextCloudflareDev =
  process.env.NODE_ENV !== 'production' &&
  process.env.OPENNEXT_CLOUDFLARE_DEV === 'true';

if (openNextCloudflareDev) {
  void initOpenNextCloudflareForDev();
}

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** Host aggiuntivi per HMR (`next dev`): vedi `NEXT_DEV_ALLOWED_ORIGINS` in `.env.local.example`. */
const extraAllowedDevOrigins = (process.env.NEXT_DEV_ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((h) => h.trim())
  .filter(Boolean);

const allowSearchIndexing =
  process.env.NEXT_PUBLIC_ALLOW_SEARCH_INDEXING === 'true';

/**
 * Stesso `distDir` in tutta la pipeline: `docker-compose.storefront-production.yml` imposta
 * `TRAMELLE_NEXT_DIST_DIR=.next-production` (separato da `.next` usato da `next dev` sullo stesso mount).
 * Senza `distDir` qui, `yarn build` scrive sempre in `.next` mentre l'avvio punta a `.next-production/standalone` → moduli mancanti (ENOENT) in fase build/runtime.
 */
const distDir =
  process.env.TRAMELLE_NEXT_DIST_DIR?.trim() || '.next';

const nextConfig: NextConfig = {
  distDir,
  /**
   * HMR: su Docker bind mount / SSH / FS che non notificano, senza poll il dev server non vede i salvataggi.
   * Default in `next dev`: poll ogni ~1s (disattiva con `NEXT_DEV_POLLING_OFF=true` in `.env.local` su Mac veloce).
   */
  webpack: (config, { dev }) => {
    if (dev && process.env.NEXT_DEV_POLLING_OFF !== 'true') {
      const interval = Number(process.env.NEXT_DEV_POLL_INTERVAL_MS || 1000);
      config.watchOptions = {
        ...config.watchOptions,
        poll: Number.isFinite(interval) && interval > 0 ? interval : 1000,
        aggregateTimeout: 300,
      };
    }
    return config;
  },
  /**
   * Evita chunk server `vendor-chunks/@medusajs*.js` mancanti o path con `@` dopo rebuild/HMR tra ambienti diversi.
   * Il JS SDK viene risolto da `node_modules` a runtime (cfr. Next.js `serverExternalPackages`).
   */
  serverExternalPackages: ['@medusajs/js-sdk', '@medusajs/types'],
  /**
   * Next 15 di default usa `experimental.cssChunking: true`. In produzione (standalone dietro Cloudflare)
   * abbiamo riscontrato 400 su *un* solo file `/_next/static/css/<hash>.css` mentre gli altri chunk CSS
   * rispondono 200: il modulo `send` rifiuta il path (decode). Chunking disabilitato = meno edge case e
   * hash CSS stabili dopo ogni `yarn build`; dopo il deploy conviene purge cache HTML su CDN.
   */
  /**
   * `MEDUSA_BACKEND_URL_INTERNAL` in `.env` (vedi `.env.local.example`): le chiamate Medusa
   * dal data layer e dal middleware usano `medusa-backend-url.ts`, non un proxy qua. Next non
   * inoltra l’API store; imposta l’URL interno sull’host dove gira `next start` o Docker.
   */
  experimental: {
    cssChunking: false,
    /** Meno JS dai barrel `lodash` / `date-fns` senza refactor manuale ovunque. */
    optimizePackageImports: ['lodash', 'date-fns'],
  },
  /**
   * Dev: Next 15 accetta HMR/WebSocket solo da questi host.
   * Solo `localhost` / `127.0.0.1` → ok con tunnel SSH o browser sul server.
   * Se apri `http://IP_SERVER:3000` o un hostname diverso, aggiungilo in
   * `NEXT_DEV_ALLOWED_ORIGINS` (virgola-separato), poi riavvia `next dev`.
   */
  allowedDevOrigins: [
    '127.0.0.1',
    'localhost',
    ...extraAllowedDevOrigins,
  ],
  /** Spazio per alias next-intl se in futuro si torna a Turbopack in dev (cfr. issue next-intl / Next 16). */
  turbopack: {},
  /** Richiesto da PM2/Hetzner e da `@opennextjs/cloudflare` (build con `NEXT_PRIVATE_STANDALONE`). */
  output: 'standalone',
  trailingSlash: false,
  reactStrictMode: true,
  logging: {
    fetches: {
      fullUrl: process.env.NODE_ENV !== 'production',
    },
  },
  images: {
    /** Immagini Cloudflare Images → URL diretto (cache edge CF); altre → `/_next/image`. */
    loader: 'custom',
    loaderFile: './src/lib/helpers/tramelle-next-image-loader.ts',
    /** Cache CDN/browser per URL `/_next/image`: meno ricalcoli su navigazione ripetuta. */
    minimumCacheTTL: 604800,
    /** Next 15: solo questi valori sono ammessi su `/_next/image` (cfr. `quality` su `<Image />`). */
    qualities: [50, 70, 72, 75, 80, 85, 88, 92, 96, 100],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'medusa-public-images.s3.eu-west-1.amazonaws.com'
      },
      {
        protocol: 'https',
        hostname: 'mercur-connect.s3.eu-central-1.amazonaws.com'
      },
      {
        protocol: 'https',
        hostname: 'api.mercurjs.com'
      },
      {
        protocol: 'http',
        hostname: 'localhost'
      },
      // Dev: `.env` usa spesso 127.0.0.1:9000; `localhost` da solo non basta per `next/image`.
      {
        protocol: 'http',
        hostname: '127.0.0.1'
      },
      {
        protocol: 'https',
        hostname: 'api.tramelle.com'
      },
      /** CDN immagini siti WooCommerce (es. Alpe Magna). */
      {
        protocol: 'https',
        hostname: 'dgxea1iio7h1w.cloudfront.net'
      },
      {
        protocol: 'https',
        hostname: 'api-sandbox.mercurjs.com',
        pathname: '/static/**'
      },
      {
        protocol: 'https',
        hostname: 'i.imgur.com'
      },
      {
        protocol: 'https',
        hostname: 's3.eu-central-1.amazonaws.com'
      },
      {
        protocol: "https",
        hostname: "mercur-testing.up.railway.app",
      },
      {
        protocol: 'https',
        hostname: '**'
      }
    ]
  },
  typescript: {
    ignoreBuildErrors: true
  },
  async headers() {
    if (allowSearchIndexing) {
      return [];
    }
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
