import type { HttpTypes } from '@medusajs/types';

import {
  TRAMELLE_FREE_SHIP_EU_EUR,
  TRAMELLE_FREE_SHIP_IT_EUR,
  TRAMELLE_SHIP_FLAT_EU_EUR,
  TRAMELLE_SHIP_FLAT_IT_EUR,
} from '@/lib/constants/seller-cart-policy';
import { medusaStoreAmountAsMajor } from '@/lib/helpers/money';

const IT_CODES = new Set(['it', 'sm', 'va']);

export type TramelleShipDisplayZone = 'it' | 'non_it';

/**
 * Somma sottotale (€) delle righe carrello per un blocco venditore.
 */
export function sumLineSubtotalsEurForItems(
  items: HttpTypes.StoreCartLineItem[] | undefined
): number {
  if (!items?.length) return 0;
  let s = 0;
  for (const it of items) {
    const raw = it.subtotal ?? it.total;
    s += medusaStoreAmountAsMajor(
      raw == null ? 0 : typeof raw === 'number' ? raw : Number(raw)
    );
  }
  return Math.round(s * 100) / 100;
}

/**
 * Italia (incl. SM, VA): gratis ≥ 65 €; altrimenti 6,50 €.
 * Non-Italia: gratis ≥ 95 €; altrimenti 12,50 € (residuo mondo con stessa banda “non IT” del carrello).
 */
export function tramelleDisplayShippingEurForSellerBlock(
  subtotalEur: number,
  countryCode: string | undefined
): {
  amountMajor: number;
  isFree: boolean;
  zone: TramelleShipDisplayZone;
} {
  const it = IT_CODES.has((countryCode || 'it').toLowerCase());
  if (it) {
    if (subtotalEur + 1e-9 >= TRAMELLE_FREE_SHIP_IT_EUR) {
      return { amountMajor: 0, isFree: true, zone: 'it' };
    }
    return {
      amountMajor: TRAMELLE_SHIP_FLAT_IT_EUR,
      isFree: false,
      zone: 'it',
    };
  }
  if (subtotalEur + 1e-9 >= TRAMELLE_FREE_SHIP_EU_EUR) {
    return { amountMajor: 0, isFree: true, zone: 'non_it' };
  }
  return {
    amountMajor: TRAMELLE_SHIP_FLAT_EU_EUR,
    isFree: false,
    zone: 'non_it',
  };
}

/**
 * Spedizione totale mostrata in carrello (somma per blocco venditore, policy Tramelle).
 * Solo valuta EUR; altrimenti 0 (il riepilogo usa i totali Medusa lato colonna destra se serve).
 */
export function tramelleDisplayTotalShippingEur(
  cart: HttpTypes.StoreCart,
  countryCode: string | undefined
): number {
  if ((cart.currency_code || '').toLowerCase() !== 'eur') {
    return 0;
  }
  const buckets = new Map<string, HttpTypes.StoreCartLineItem[]>();
  for (const item of cart.items ?? []) {
    const p = item.product as { seller?: { id?: string } } | undefined;
    const k = p?.seller?.id && typeof p.seller.id === 'string' ? p.seller.id : 'fleek';
    const cur = buckets.get(k) ?? [];
    cur.push(item);
    buckets.set(k, cur);
  }
  let total = 0;
  for (const items of buckets.values()) {
    const sub = sumLineSubtotalsEurForItems(items);
    total += tramelleDisplayShippingEurForSellerBlock(sub, countryCode).amountMajor;
  }
  return Math.round(total * 100) / 100;
}

/**
 * Righe del carrello per il `seller_id` usato dalle `shipping_options` (Mercur),
 * o `__default__` per articoli senza produttore (come in checkout).
 */
/**
 * Venditori distinti dalle righe (chiave allineata alle shipping_options: `fleek` nelle somme, qui `__default__` come in checkout).
 */
export function distinctShippingSellerKeysFromLineItems(
  cart: HttpTypes.StoreCart
): string[] {
  const s = new Set<string>();
  for (const item of cart.items ?? []) {
    const p = item.product as { seller?: { id?: string } } | undefined;
    const k =
      p?.seller?.id && typeof p.seller.id === 'string'
        ? p.seller.id
        : '__default__';
    s.add(k);
  }
  return [...s];
}

/**
 * N° metodi di spedizione attesi nel carrello (uno per ogni blocco venditore). Mercur / marketplace.
 */
export function requiredShippingMethodCountForCart(
  cart: HttpTypes.StoreCart
): number {
  return distinctShippingSellerKeysFromLineItems(cart).length;
}

/**
 * CTA pagamento: basta almeno un `shipping_method` (Mercur possono
 * unificare più venditori in una riga, o l’inverso). Richiedere
 * `len(methods) ===` numero venditori lasciava il bottone grigio anche con
 * spedizione e totale coerenti.
 */
export function isCartShippingReadyForPay(
  cart: HttpTypes.StoreCart | null | undefined
): boolean {
  if (!cart?.items?.length) {
    return false;
  }
  const withGift =
    (cart as { gift_cards?: unknown[] }).gift_cards &&
    (cart as { gift_cards?: unknown[] }).gift_cards!?.length > 0 &&
    (cart.total === 0 || cart.total == null);
  if (withGift) {
    return true;
  }
  return (cart.shipping_methods?.length ?? 0) > 0;
}

export function lineItemsForShippingSellerKey(
  cart: HttpTypes.StoreCart,
  shippingSellerKey: string
): HttpTypes.StoreCartLineItem[] {
  const items = cart.items ?? [];
  if (shippingSellerKey === '__default__') {
    return items.filter(
      i => !(i.product as { seller?: { id?: string } } | undefined)?.seller?.id
    );
  }
  return items.filter(
    i =>
      (i.product as { seller?: { id?: string } } | undefined)?.seller?.id ===
      shippingSellerKey
  );
}
