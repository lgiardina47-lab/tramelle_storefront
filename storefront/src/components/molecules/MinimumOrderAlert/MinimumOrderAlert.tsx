'use client';

import type { MinimumOrderViolation } from '@/lib/data/seller-minimum-order';
import { convertToLocale, minorUnitsToMajor } from '@/lib/helpers/money';
import { useTranslations } from 'next-intl';

export function MinimumOrderAlert({
  violations,
  currencyCode
}: {
  violations: MinimumOrderViolation[];
  currencyCode: string;
}) {
  const t = useTranslations('Cart');
  if (!violations.length) return null;
  const code = (currencyCode || 'eur').toLowerCase();
  return (
    <div
      className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
      data-testid="minimum-order-alert"
      role="alert"
    >
      <p className="mb-2 font-medium">{t('minimumOrderTitle')}</p>
      <ul className="list-inside list-disc space-y-1 text-amber-900">
        {violations.map(v => (
          <li key={v.sellerId}>
            {t('minimumOrderLine', {
              seller: v.sellerName,
              min: convertToLocale({
                amount: minorUnitsToMajor(v.requiredMinor, code),
                currency_code: code
              }),
              current: convertToLocale({
                amount: minorUnitsToMajor(v.currentMinor, code),
                currency_code: code
              })
            })}
          </li>
        ))}
      </ul>
    </div>
  );
}
