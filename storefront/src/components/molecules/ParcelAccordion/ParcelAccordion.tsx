'use client';

import { Button } from '@/components/atoms';
import { formatDateSafe } from '@/lib/helpers/format-date-safe';
import LocalizedClientLink from '@/components/molecules/LocalizedLink/LocalizedLink';
import { convertToLocale } from '@/lib/helpers/money';
import { useTranslations } from 'next-intl';

import { ParcelAccordionItems } from './ParcelAccordionItems';

export const ParcelAccordion = ({
  orderId,
  orderSetDisplayId,
  createdAt,
  total,
  currency_code = 'eur',
  orders
}: {
  orderId: string;
  /** `order_set.display_id` (stesso valore nelle stringhe “Order set #{id}”). */
  orderSetDisplayId: string | number;
  createdAt: string | Date;
  total: number;
  currency_code?: string;
  orders: any[];
  defaultOpen?: boolean;
}) => {
  const t = useTranslations('Account');
  return (
  <>
    <div
      className="grid w-full grid-cols-2 rounded-sm border bg-component-secondary px-4 py-6 text-secondary sm:grid-cols-5"
      data-testid={`order-${orderId}`}
    >
      <div className="flex flex-col justify-between sm:col-span-4 sm:pr-10 lg:flex-row lg:items-center lg:gap-4">
        <h2
          className="heading-sm truncate"
          data-testid="order-display-id"
        >
          {t('orderSetTitle', { id: String(orderSetDisplayId) })}
        </h2>
        <h2
          className="label-md"
          data-testid="order-date"
        >
          {t('orderDateLabel')}:{' '}
          <span className="text-primary lg:block xl:inline-block">
            {formatDateSafe(createdAt, 'yyyy-MM-dd')}
          </span>
        </h2>
        <h2
          className="label-md"
          data-testid="order-total"
        >
          {t('orderTotalLabel')}:{' '}
          <span
            className="text-primary lg:block xl:inline-block"
            data-testid={`order-${orderId}-price`}
          >
            {convertToLocale({ amount: total, currency_code })}
          </span>
        </h2>
      </div>
      <div className="col-span-1 flex items-center justify-end gap-4">
        <LocalizedClientLink href={`/user/orders/${orderId}`}>
          <Button
            variant="tonal"
            data-testid="order-view-button"
          >
            <span className="label-md text-primary">{t('viewOrder')}</span>
          </Button>
        </LocalizedClientLink>
      </div>
    </div>
    <div className="mb-4">
      <ul
        className="w-full"
        data-testid="order-items-list"
      >
        {orders.map((order, index) => (
          <ParcelAccordionItems
            key={order.id}
            order={order}
            index={index + 1}
            currency_code={currency_code}
            shippingPriceTestId={`parcel-${order.id}-shipping-price`}
          />
        ))}
      </ul>
    </div>
  </>
  );
};
