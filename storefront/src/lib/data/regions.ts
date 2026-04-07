'use server';

import { HttpTypes } from '@medusajs/types';

import {
  MEDUSA_EN_COUNTRY_FALLBACK_ORDER,
  STOREFRONT_EN_URL_SEGMENT,
} from '@/lib/i18n/storefront-path-locale';

import { sdk } from '../config';
import { getCacheOptions } from './cookies';

/** Segmento URL `en` → ISO paese Medusa usato dall’API (primo tra gb/us/ie disponibile). */
export async function resolveStorefrontLocaleToMedusaCountry(
  code: string
): Promise<string> {
  const c = code.toLowerCase();
  if (c !== STOREFRONT_EN_URL_SEGMENT) return c;

  const regions = await listRegions();
  const avail = new Set(
    regions.flatMap(
      r =>
        r.countries
          ?.map(co => co.iso_2?.toLowerCase())
          .filter((x): x is string => Boolean(x)) ?? []
    )
  );
  for (const iso of MEDUSA_EN_COUNTRY_FALLBACK_ORDER) {
    if (avail.has(iso)) return iso;
  }
  return (
    process.env.NEXT_PUBLIC_EN_MARKET_COUNTRY || 'gb'
  ).toLowerCase();
}

export async function medusaCountryToStorefrontPathSegment(
  medusaIso: string
): Promise<string> {
  const canonicalEn = await resolveStorefrontLocaleToMedusaCountry(
    STOREFRONT_EN_URL_SEGMENT
  );
  const m = medusaIso.toLowerCase();
  return m === canonicalEn ? STOREFRONT_EN_URL_SEGMENT : m;
}

/**
 * Non lancia: se l'API non risponde (backend spento, URL errato) resta [] così
 * layout/header non vanno in 500.
 */
export const listRegions = async (): Promise<HttpTypes.StoreRegion[]> => {
  try {
    const next = {
      ...(await getCacheOptions('regions')),
      // In dev le regioni cambiano spesso (nuovi paesi): evita switcher lingua incompleto per cache vecchia.
      revalidate: process.env.NODE_ENV === 'development' ? 60 : 3600
    };

    return await sdk.client
      .fetch<{ regions: HttpTypes.StoreRegion[] }>(`/store/regions`, {
        method: 'GET',
        next,
        cache:
          process.env.NODE_ENV === 'development' ? 'no-store' : 'force-cache'
      })
      .then(({ regions }) => regions ?? [])
      .catch(() => [] as HttpTypes.StoreRegion[]);
  } catch {
    return [] as HttpTypes.StoreRegion[];
  }
};

export const retrieveRegion = async (
  id: string
): Promise<HttpTypes.StoreRegion | null> => {
  const next = {
    ...(await getCacheOptions(['regions', id].join('-'))),
    revalidate: 3600
  };

  return sdk.client
    .fetch<{ region: HttpTypes.StoreRegion }>(`/store/regions/${id}`, {
      method: 'GET',
      next,
      cache: 'force-cache'
    })
    .then(({ region }) => region ?? null)
    .catch(() => null);
};

const regionMap = new Map<string, HttpTypes.StoreRegion>();

export const getRegion = async (countryCode: string) => {
  try {
    const code = await resolveStorefrontLocaleToMedusaCountry(countryCode);

    if (regionMap.has(code)) {
      return regionMap.get(code);
    }

    const regions = await listRegions();

    if (!regions?.length) {
      return null;
    }

    regions.forEach(region => {
      region.countries?.forEach(c => {
        regionMap.set(c?.iso_2 ?? '', region);
      });
    });

    const region = code ? regionMap.get(code) : regionMap.get('us');

    return region;
  } catch {
    return null;
  }
};
