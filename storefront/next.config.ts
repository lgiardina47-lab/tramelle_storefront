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

const allowSearchIndexing =
  process.env.NEXT_PUBLIC_ALLOW_SEARCH_INDEXING === 'true';

const nextConfig: NextConfig = {
  /** Dev: HMR quando si apre il sito da 127.0.0.1 (non solo localhost). */
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
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
