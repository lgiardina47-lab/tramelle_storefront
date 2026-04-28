import type { HttpTypes } from '@medusajs/types';

import { TRAMELLE_MIN_ORDER_CENTS } from '@/lib/constants/seller-cart-policy';
import { medusaStoreAmountAsMajor } from '@/lib/helpers/money';

/** Salvato in `seller_listing_profile.metadata` (centesimi, es. 3500 = 35 €). */
export const TRAMELLE_MINIMUM_ORDER_MINOR_KEY = 'tramelle_minimum_order_minor';

export type MinimumOrderViolation = {
  sellerId: string;
  sellerName: string;
  currentMinor: number;
  requiredMinor: number;
};

function lineSubtotalCentsEur(item: HttpTypes.StoreCartLineItem): number {
  const raw = item.subtotal ?? item.total;
  if (raw == null || !Number.isFinite(Number(raw))) return 0;
  const major = medusaStoreAmountAsMajor(typeof raw === 'number' ? raw : Number(raw));
  return Math.max(0, Math.round(major * 100));
}

function lineSellerIdOrFleek(
  item: HttpTypes.StoreCartLineItem
): { id: string; name: string } {
  const p = item.product as
    | { seller?: { id?: string; name?: string } }
    | undefined;
  if (p?.seller?.id && typeof p.seller.id === 'string') {
    return {
      id: p.seller.id,
      name: typeof p.seller.name === 'string' ? p.seller.name : 'Producer',
    };
  }
  return { id: 'fleek', name: 'Tramelle' };
}

function parseMinCentsFromMetadata(meta: Record<string, unknown> | null | undefined): number | null {
  const v = meta?.[TRAMELLE_MINIMUM_ORDER_MINOR_KEY];
  if (typeof v === 'number' && Number.isFinite(v) && v > 0) {
    return Math.floor(v);
  }
  if (typeof v === 'string' && v.trim()) {
    const n = Math.floor(Number(v));
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

/**
 * Sottototali in **centesimi** (EUR) per venditore.
 * @deprecated Usare `subtotalsCentsBySellerId`
 */
export function subtotalsMinorBySellerId(
  cart: HttpTypes.StoreCart
): Map<string, { name: string; sum: number }> {
  return subtotalsCentsBySellerId(cart);
}

export function subtotalsCentsBySellerId(
  cart: HttpTypes.StoreCart
): Map<string, { name: string; sum: number }> {
  const map = new Map<string, { name: string; sum: number }>();
  for (const item of cart.items ?? []) {
    const se = lineSellerIdOrFleek(item);
    const add = lineSubtotalCentsEur(item);
    const prev = map.get(se.id);
    if (prev) {
      map.set(se.id, { name: se.name, sum: prev.sum + add });
    } else {
      map.set(se.id, { name: se.name, sum: add });
    }
  }
  return map;
}

function requiredCentsForSeller(cart: HttpTypes.StoreCart, sellerId: string): number {
  for (const it of cart.items ?? []) {
    if (lineSellerIdOrFleek(it).id !== sellerId) continue;
    const p = it.product as { seller?: { metadata?: Record<string, unknown> } } | undefined;
    const parsed = parseMinCentsFromMetadata(p?.seller?.metadata);
    if (parsed != null) return parsed;
  }
  return TRAMELLE_MIN_ORDER_CENTS;
}

/**
 * Minimo ordine **35 €** per blocco venditore (override opzionale da metadata seller sui prodotti).
 */
export function getCartMinimumOrderViolations(
  cart: HttpTypes.StoreCart
): MinimumOrderViolation[] {
  if (!cart?.items?.length) return [];
  if ((cart.currency_code || '').toLowerCase() !== 'eur') return [];

  const bySeller = subtotalsCentsBySellerId(cart);
  if (bySeller.size === 0) return [];

  const violations: MinimumOrderViolation[] = [];
  for (const [sellerId, { name, sum }] of bySeller) {
    const requiredCents = requiredCentsForSeller(cart, sellerId);
    if (sum < requiredCents) {
      violations.push({
        sellerId,
        sellerName: name,
        currentMinor: sum,
        requiredMinor: requiredCents,
      });
    }
  }
  return violations;
}
