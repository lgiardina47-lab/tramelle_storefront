import type { HttpTypes } from '@medusajs/types';

import { minorUnitsToMajor } from '@/lib/helpers/money';

/** Opzione come restituita da GET /store/shipping-options (Mercur). */
export type CartShippingOptionLike = {
  id: string;
  name?: string | null;
  seller_id?: string | null;
  seller_name?: string | null;
  calculated_price?: { calculated_amount?: number | null };
  price_type?: string | null;
  amount?: number | null;
};

const RETURN_RULE = (o: { rules?: { attribute?: string; value?: string }[] }) =>
  o.rules?.find(r => r.attribute === 'is_return')?.value === 'true';

/**
 * Opzione mostrabile in checkout: esclude resi; accetta flat/calculated o,
 * se `price_type` manca in risposta API, basta un prezzo calcolato o `amount`.
 */
export function isUsableStoreShippingOption(
  o: CartShippingOptionLike & { rules?: { attribute?: string; value?: string }[] }
): boolean {
  if (RETURN_RULE(o)) {
    return false;
  }
  const pt = String(o.price_type ?? '').toLowerCase();
  if (pt === 'flat' || pt === 'calculated') {
    return true;
  }
  const calc = o.calculated_price?.calculated_amount;
  if (typeof calc === 'number' && Number.isFinite(calc)) {
    return true;
  }
  if (o.amount != null && Number.isFinite(Number(o.amount))) {
    return true;
  }
  return false;
}

export type SellerShippingRow = {
  sellerId: string;
  sellerName: string;
  /** Importo in unità principali (€) per la UI */
  amountMajor: number;
  /** true se preso da metodi applicati al carrello, false se stima da opzioni */
  isConfirmed: boolean;
};

/**
 * Collega `cart.shipping_methods` alle opzioni (per seller_id / nome) e,
 * se non ci sono metodi, stima una riga per venditore dalle opzioni GET.
 */
export function buildSellerShippingRows(
  cart: HttpTypes.StoreCart,
  options: CartShippingOptionLike[] | null | undefined
): { rows: SellerShippingRow[]; totalMajor: number } {
  const currency = cart.currency_code || 'eur';
  const optionById = new Map(
    (options ?? []).map(o => [o.id, o])
  );

  const rows: SellerShippingRow[] = [];
  const methods = cart.shipping_methods ?? [];

  if (methods.length > 0) {
    const byKey = new Map<string, { sellerId: string; sellerName: string; amountMajor: number }>();
    for (const m of methods) {
      const sm = m as HttpTypes.StoreCartShippingMethod & {
        shipping_option_id?: string;
        option_id?: string;
        seller_id?: string;
      };
      const optId = sm.shipping_option_id ?? sm.option_id;
      const opt = optId ? optionById.get(optId) : undefined;
      const rawSid =
        (opt?.seller_id as string | undefined) || sm.seller_id || null;
      const sellerName =
        (opt?.seller_name as string | undefined) ||
        (opt?.name as string | undefined) ||
        sm.name ||
        '—';
      const sellerId =
        rawSid != null && String(rawSid) !== '' ? String(rawSid) : 'fleek';
      const raw =
        typeof sm.total === 'number'
          ? sm.total
          : typeof sm.subtotal === 'number'
            ? sm.subtotal
            : typeof sm.amount === 'number'
              ? sm.amount
              : 0;
      const amountMajor = minorUnitsToMajor(raw, currency);
      const key = String(sellerId);
      const cur = byKey.get(key);
      if (cur) {
        cur.amountMajor += amountMajor;
      } else {
        byKey.set(key, {
          sellerId: key,
          sellerName: String(sellerName),
          amountMajor
        });
      }
    }
    for (const v of byKey.values()) {
      rows.push({ ...v, isConfirmed: true });
    }
    const totalMajor = rows.reduce((a, r) => a + r.amountMajor, 0);
    return { rows, totalMajor };
  }

  /** Stima: una opzione rappresentativa per seller dalle opzioni disponibili */
  if (options?.length) {
    const bySeller: Record<string, CartShippingOptionLike[]> = {};
    for (const o of options) {
      if (!isUsableStoreShippingOption(o)) {
        continue;
      }
      const sid = o.seller_id || '__default__';
      if (!bySeller[sid]) {
        bySeller[sid] = [];
      }
      bySeller[sid].push(o);
    }

    for (const [sid, opts] of Object.entries(bySeller)) {
      const withPrice = opts.find(
        o => typeof o.calculated_price?.calculated_amount === 'number'
      );
      const o = withPrice ?? opts[0];
      if (!o) {
        continue;
      }
      const calc = o.calculated_price?.calculated_amount;
      let amountMajor = 0;
      if (typeof calc === 'number' && Number.isFinite(calc)) {
        amountMajor = minorUnitsToMajor(calc, currency);
      } else if (o.amount != null) {
        amountMajor = minorUnitsToMajor(Number(o.amount), currency);
      } else {
        continue;
      }
      const sellerName =
        o.seller_name || o.name || (sid === '__default__' ? 'Tramelle' : '—');
      /** Stesso id che useremo nel gruppo carrello (fleek = senza seller) */
      const sellerId = sid === '__default__' ? 'fleek' : sid;
      rows.push({
        sellerId,
        sellerName: String(sellerName),
        amountMajor,
        isConfirmed: false
      });
    }

    const totalMajor = rows.reduce((a, r) => a + r.amountMajor, 0);
    return { rows, totalMajor };
  }

  return { rows: [], totalMajor: 0 };
}

/**
 * Mappa sellerId (chiave gruppo carrello) → riga consegna.
 * La chiave gruppo è `seller.id` tranne "fleek" per item senza seller.
 */
export function rowForCartSellerKey(
  rows: SellerShippingRow[],
  sellerId: string,
  sellerName: string
): SellerShippingRow | undefined {
  if (sellerId === 'fleek') {
    return (
      rows.find(r => r.sellerId === 'fleek' || r.sellerId === '__default__') ||
      rows.find(r => r.sellerName.toLowerCase() === (sellerName || '').toLowerCase())
    );
  }
  const byId = rows.find(r => r.sellerId === sellerId);
  if (byId) {
    return byId;
  }
  return rows.find(
    r =>
      r.sellerName.toLowerCase() === (sellerName || '').toLowerCase() ||
      sellerName.toLowerCase().includes(r.sellerName.toLowerCase()) ||
      r.sellerName.toLowerCase().includes(sellerName.toLowerCase())
  );
}
