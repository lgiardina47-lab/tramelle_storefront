import { HttpTypes } from '@medusajs/types';
import { NextRequest, NextResponse } from 'next/server';

import { PROTECTED_ROUTES } from './lib/constants';
import { TRAMELLE_PREFERRED_COUNTRY_COOKIE } from './lib/constants/locale-preference';
import { isTokenExpired } from './lib/helpers/token';
import {
  MEDUSA_EN_COUNTRY_FALLBACK_ORDER,
  STOREFRONT_EN_URL_SEGMENT,
  isStorefrontPermissiveLocalePath,
} from './lib/i18n/storefront-path-locale';
import { requestShowsComingSoonHome } from './lib/constants/coming-soon-public-home';
import { MEDUSA_BACKEND_URL } from './lib/medusa-backend-url';
import { TRAMELLE_CATEGORY_HANDLE_PREFIX } from './lib/helpers/category-public-url';

const BACKEND_URL = MEDUSA_BACKEND_URL;
const PUBLISHABLE_API_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY;
const DEFAULT_REGION = process.env.NEXT_PUBLIC_DEFAULT_REGION || 'us';

const makeAuthRedirect = (
  req: NextRequest,
  locale: string,
  reason: 'sessionRequired' | 'sessionExpired'
) => {
  const redirectUrl = new URL(`/${locale}/login`, req.url);

  redirectUrl.searchParams.set(reason, 'true');

  const response = NextResponse.redirect(redirectUrl);

  if (reason === 'sessionExpired') {
    response.cookies.delete('_medusa_jwt');
  }

  return response;
};

const regionMapCache: {
  regionMap: Map<string, HttpTypes.StoreRegion>;
  regionMapUpdated: number;
  /** ISO paese Medusa che corrisponde al segmento URL `en`. */
  englishMarketMedusaIso?: string;
} = {
  regionMap: new Map<string, HttpTypes.StoreRegion>(),
  regionMapUpdated: Date.now(),
};

async function getRegionMap(_cacheId: string) {
  const { regionMap, regionMapUpdated } = regionMapCache;

  if (!regionMap.keys().next().value || regionMapUpdated < Date.now() - 3600 * 1000) {
    if (!PUBLISHABLE_API_KEY) {
      throw new Error(
        'Middleware: set NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY (publishable key from Medusa admin).'
      );
    }

    // Fetch regions from the commerce backend. Edge middleware cannot use the JS SDK (Node-only).
    // Edge middleware: avoid Next.js fetch cache options here — they can break or behave inconsistently on the Edge runtime.
    const regionsUrl = `${BACKEND_URL.replace(/\/$/, '')}/store/regions`;
    const { regions } = await fetch(regionsUrl, {
      headers: {
        'x-publishable-api-key': PUBLISHABLE_API_KEY
      }
    }).then(async response => {
      const text = await response.text();
      const trimmed = text.trimStart();
      if (trimmed.startsWith('<')) {
        throw new Error(
          `Middleware: ${regionsUrl} returned HTML, not JSON. MEDUSA_BACKEND_URL must be the Medusa API base (e.g. http://127.0.0.1:9000 for local "yarn dev" in backend/), not the storefront or a generic site URL. Current MEDUSA_BACKEND_URL: ${BACKEND_URL}`
        );
      }

      let json: { regions?: HttpTypes.StoreRegion[]; message?: string };
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error(
          `Middleware: invalid JSON from ${regionsUrl} (first 120 chars): ${text.slice(0, 120)}`
        );
      }

      if (!response.ok) {
        throw new Error(json.message ?? response.statusText);
      }

      return json;
    });

    if (!regions?.length) {
      throw new Error('No regions found. Please set up regions in Tramelle admin.');
    }

    // Create a map of country codes to regions.
    regions.forEach((region: HttpTypes.StoreRegion) => {
      region.countries?.forEach(c => {
        regionMapCache.regionMap.set(c.iso_2 ?? '', region);
      });
    });

    regionMapCache.englishMarketMedusaIso = undefined;
    for (const iso of MEDUSA_EN_COUNTRY_FALLBACK_ORDER) {
      const r = regionMapCache.regionMap.get(iso);
      if (r) {
        regionMapCache.englishMarketMedusaIso = iso;
        regionMapCache.regionMap.set(STOREFRONT_EN_URL_SEGMENT, r);
        break;
      }
    }

    regionMapCache.regionMapUpdated = Date.now();
  }

  return regionMapCache.regionMap;
}

async function getCountryCode(
  request: NextRequest,
  regionMap: Map<string, HttpTypes.StoreRegion | number>
) {
  try {
    let countryCode;

    const vercelCountryCode = request.headers.get('x-vercel-ip-country')?.toLowerCase();

    const urlCountryCode = request.nextUrl.pathname.split('/')[1]?.toLowerCase();

    if (
      urlCountryCode &&
      (regionMap.has(urlCountryCode) ||
        isStorefrontPermissiveLocalePath(urlCountryCode))
    ) {
      countryCode = urlCountryCode;
    } else {
      const prefCookie = request.cookies
        .get(TRAMELLE_PREFERRED_COUNTRY_COOKIE)
        ?.value?.toLowerCase();
      if (
        prefCookie &&
        (regionMap.has(prefCookie) ||
          isStorefrontPermissiveLocalePath(prefCookie))
      ) {
        countryCode = prefCookie;
      }
    }
    if (!countryCode && vercelCountryCode && regionMap.has(vercelCountryCode)) {
      countryCode = vercelCountryCode;
    }
    if (!countryCode && regionMap.has(DEFAULT_REGION)) {
      countryCode = DEFAULT_REGION;
    } else if (!countryCode) {
      const first = regionMap.keys().next().value;
      if (first) {
        countryCode = first as string;
      }
    }

    return countryCode;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error(
        'Middleware.ts: Error getting the country code. Did you set up regions in Tramelle admin and define a MEDUSA_BACKEND_URL environment variable? Note that the variable is no longer named NEXT_PUBLIC_MEDUSA_BACKEND_URL.'
      );
    }
  }
}

const MINIMAL_HOME_HEADER = 'x-tramelle-minimal-home';

function isLocaleOnlyHomePath(pathname: string): boolean {
  const trimmed = pathname.replace(/\/$/, '') || '/';
  const segments = trimmed.split('/').filter(Boolean);
  return segments.length === 1 && /^[a-z]{2}$/i.test(segments[0]!);
}

/**
 * Home `/[locale]`: header per layout senza Header/Footer solo dove vale la splash (vedi {@link requestShowsComingSoonHome}).
 */
function withProdMinimalHomeHeader(
  request: NextRequest,
  response: NextResponse
): NextResponse {
  if (
    !isLocaleOnlyHomePath(request.nextUrl.pathname) ||
    !requestShowsComingSoonHome((name) => request.headers.get(name))
  ) {
    return response;
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(MINIMAL_HOME_HEADER, '1');

  const out = NextResponse.next({
    request: { headers: requestHeaders }
  });

  response.cookies.getAll().forEach(c => {
    out.cookies.set(c.name, c.value);
  });

  return out;
}

export async function middleware(request: NextRequest) {
  // Short-circuit static assets
  if (request.nextUrl.pathname.includes('.')) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  /** SEO / bookmark: URL legacy con prefisso handle Medusa → slug pubblico. */
  const catSegs = pathname.split('/').filter(Boolean);
  if (
    catSegs.length >= 3 &&
    catSegs[1] === 'categories' &&
    catSegs[2]!.toLowerCase().startsWith(TRAMELLE_CATEGORY_HANDLE_PREFIX)
  ) {
    const short = catSegs[2]!.slice(TRAMELLE_CATEGORY_HANDLE_PREFIX.length);
    if (short) {
      catSegs[2] = short;
      const dest = `/${catSegs.join('/')}${request.nextUrl.search}`;
      return NextResponse.redirect(new URL(dest, request.url), 301);
    }
  }
  const cacheIdCookie = request.cookies.get('_medusa_cache_id');
  const cacheId = cacheIdCookie?.value || crypto.randomUUID();

  const urlSegment = pathname.split('/')[1];
  const looksLikeLocale = /^[a-z]{2}$/i.test(urlSegment || '');

  const pathnameWithoutLocale = looksLikeLocale ? pathname.replace(/^\/[^/]+/, '') : pathname;

  const isProtectedRoute = PROTECTED_ROUTES.some(route => pathnameWithoutLocale.startsWith(route));

  if (isProtectedRoute) {
    const jwtCookie = request.cookies.get('_medusa_jwt');
    const token = jwtCookie?.value;

    const locale = looksLikeLocale ? urlSegment : DEFAULT_REGION;

    // Not logged in before
    if (!jwtCookie) {
      return makeAuthRedirect(request, locale, 'sessionRequired');
    }

    // Token exists but expired
    if (token && isTokenExpired(token)) {
      return makeAuthRedirect(request, locale, 'sessionExpired');
    }
  }

  // Fast path: URL already has a locale segment and cache cookie exists
  if (looksLikeLocale && cacheIdCookie) {
    return withProdMinimalHomeHeader(request, NextResponse.next());
  }

  let response = NextResponse.next();

  // Ensure cache id cookie exists (set without redirect)
  if (!cacheIdCookie) {
    response.cookies.set('_medusa_cache_id', cacheId, {
      maxAge: 60 * 60 * 24
    });
  }

  try {
    const regionMap = await getRegionMap(cacheId);

    const pathSegUrl = pathname.split('/')[1]?.toLowerCase();
    if (
      pathSegUrl === 'gb' &&
      regionMapCache.englishMarketMedusaIso === 'gb'
    ) {
      const suffix = pathname.slice(3);
      const q = request.nextUrl.search || '';
      return NextResponse.redirect(
        new URL(`/${STOREFRONT_EN_URL_SEGMENT}${suffix}${q}`, request.url),
        307
      );
    }

    const countryCode = regionMap && (await getCountryCode(request, regionMap));
    const urlFirst = pathname.split('/')[1]?.toLowerCase();
    const urlHasCountryCode = Boolean(countryCode) && (
      urlFirst === String(countryCode).toLowerCase() ||
      (regionMapCache.englishMarketMedusaIso &&
        String(countryCode).toLowerCase() ===
          regionMapCache.englishMarketMedusaIso &&
        urlFirst === STOREFRONT_EN_URL_SEGMENT)
    );

    /** Già `/ja`, `/es`, `/en`, `/it`, …: non anteporre il country risolto (es. evita `/it/ja`). */
    const urlAlreadyLocalePrefixed =
      Boolean(urlFirst) &&
      (regionMap.has(urlFirst) ||
        isStorefrontPermissiveLocalePath(urlFirst) ||
        urlFirst === STOREFRONT_EN_URL_SEGMENT);

    // If no country code in URL but we can resolve one, redirect to locale-prefixed path
    if (!urlHasCountryCode && countryCode && !urlAlreadyLocalePrefixed) {
      const redirectPath = pathname === '/' ? '' : pathname;
      const queryString = request.nextUrl.search ? request.nextUrl.search : '';
      const pathSeg =
        regionMapCache.englishMarketMedusaIso &&
        String(countryCode).toLowerCase() === regionMapCache.englishMarketMedusaIso
          ? STOREFRONT_EN_URL_SEGMENT
          : String(countryCode);
      const redirectUrl = `${request.nextUrl.origin}/${pathSeg}${redirectPath}${queryString}`;
      return NextResponse.redirect(redirectUrl, 307);
    }
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[middleware] region map / locale redirect skipped:', err);
    }
  }

  return withProdMinimalHomeHeader(request, response);
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|images|assets|png|svg|jpg|jpeg|gif|webp).*)'
  ]
};
