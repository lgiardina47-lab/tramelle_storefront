'use client';

import {
  TRAMELLE_FREE_SHIP_EU_EUR,
  TRAMELLE_FREE_SHIP_IT_EUR,
  TRAMELLE_MIN_ORDER_EUR,
  TRAMELLE_SHIP_FLAT_EU_EUR,
  TRAMELLE_SHIP_FLAT_IT_EUR,
} from '@/lib/constants/seller-cart-policy';
import { convertToLocale } from '@/lib/helpers/money';
import { useTranslations } from 'next-intl';

/**
 * Soglie commerciali ufficiali (stesso testo per ogni produttore in carrello).
 */
export function SellerCartPolicyBlock({ currencyCode }: { currencyCode: string }) {
  const t = useTranslations('Cart');
  const c = (amount: number) =>
    convertToLocale({ amount, currency_code: currencyCode || 'eur' });
  return (
    <ul
      className="mb-3 list-none space-y-1 rounded-sm bg-[#f5f2eb] px-3 py-2.5 text-xs leading-snug text-[#3d3a36]"
      data-testid="seller-cart-policy"
    >
      <li>• {t('sellerPolicyMin', { amount: c(TRAMELLE_MIN_ORDER_EUR) })}</li>
      <li>
        •{' '}
        {t('sellerPolicyItDetail', {
          freeAt: c(TRAMELLE_FREE_SHIP_IT_EUR),
          flat: c(TRAMELLE_SHIP_FLAT_IT_EUR),
        })}
      </li>
      <li>
        •{' '}
        {t('sellerPolicyEuDetail', {
          freeAt: c(TRAMELLE_FREE_SHIP_EU_EUR),
          flat: c(TRAMELLE_SHIP_FLAT_EU_EUR),
        })}
      </li>
    </ul>
  );
}
