import type { HttpTypes } from '@medusajs/types';
import { getTranslations } from 'next-intl/server';

import LocalizedClientLink from '@/components/molecules/LocalizedLink/LocalizedLink';

export async function CheckoutBreadcrumb({
  customer,
  locale,
}: {
  customer: HttpTypes.StoreCustomer | null;
  locale: string;
}) {
  const t = await getTranslations('Checkout');

  return (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-[#e8e8e8] pb-6">
      <nav
        className="text-xs text-[#6d7175] sm:text-sm"
        aria-label={t('breadcrumbAriaLabel')}
      >
        <ol className="flex flex-wrap items-center gap-x-1 gap-y-1">
          <li>
            <LocalizedClientLink
              href="/cart"
              locale={locale}
              className="font-normal text-[#1773b0] hover:underline"
            >
              {t('breadcrumbCart')}
            </LocalizedClientLink>
          </li>
          <li className="px-0.5 text-[#8c9196]" aria-hidden>
            ›
          </li>
          <li className="font-semibold text-[#202223]">
            {t('breadcrumbInformation')}
          </li>
          <li className="px-0.5 text-[#8c9196]" aria-hidden>
            ›
          </li>
          <li>{t('breadcrumbShipping')}</li>
          <li className="px-0.5 text-[#8c9196]" aria-hidden>
            ›
          </li>
          <li>{t('breadcrumbPayment')}</li>
        </ol>
      </nav>
      {!customer ? (
        <a
          href="#checkout-login-hint"
          className="text-sm font-semibold text-[#1773b0] hover:underline"
        >
          {t('loginCta')}
        </a>
      ) : null}
    </div>
  );
}
