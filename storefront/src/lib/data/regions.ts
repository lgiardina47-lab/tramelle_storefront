'use server';

import { HttpTypes } from '@medusajs/types';

import { sdk } from '../config';
import { getCacheOptions } from './cookies';

/**
 * Non lancia: se l'API non risponde (backend spento, URL errato) resta [] così
 * layout/header non vanno in 500.
 */
export const listRegions = async (): Promise<HttpTypes.StoreRegion[]> => {
  const next = {
    ...(await getCacheOptions('regions')),
    revalidate: 3600
  };

  return sdk.client
    .fetch<{ regions: HttpTypes.StoreRegion[] }>(`/store/regions`, {
      method: 'GET',
      next,
      cache: 'force-cache'
    })
    .then(({ regions }) => regions ?? [])
    .catch(() => [] as HttpTypes.StoreRegion[]);
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
    if (regionMap.has(countryCode)) {
      return regionMap.get(countryCode);
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

    const region = countryCode ? regionMap.get(countryCode) : regionMap.get('us');

    return region;
  } catch {
    return null;
  }
};
