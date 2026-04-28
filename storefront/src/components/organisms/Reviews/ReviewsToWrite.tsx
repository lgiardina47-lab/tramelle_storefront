'use client';

import { useState } from 'react';

import { HttpTypes } from '@medusajs/types';
import { isEmpty } from 'lodash';
import { Card, NavigationItem } from '@/components/atoms';
import { Modal, ReviewForm } from '@/components/molecules';
import { isAccountPathActive } from '@/lib/helpers/account-nav-active';
import { Order } from '@/lib/data/reviews';
import { useParams, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { reviewSubNav } from './review-subnav';
import { OrderCard } from './OrderCard';

export const ReviewsToWrite = ({ orders }: { orders: Array<Order> }) => {
  const t = useTranslations('Account');
  const params = useParams();
  const locale = typeof params?.locale === 'string' ? params.locale : 'it';
  const pathname = usePathname();
  const [showForm, setShowForm] = useState<
    | (HttpTypes.StoreOrder & {
        seller: { id: string; name: string; reviews?: any[] };
        reviews: any[];
      })
    | null
  >(null);

  return (
    <>
      <div className="space-y-8 md:col-span-3" data-testid="reviews-to-write-container">
        <h1 className="heading-md uppercase" data-testid="reviews-to-write-heading">{t('reviews')}</h1>
        <div className="flex gap-4">
          {reviewSubNav.map(item => (
            <NavigationItem
              key={item.href}
              href={item.href}
              data-testid={`reviews-to-write-navigation-item-${item.labelKey}`}
              active={isAccountPathActive(pathname, item.href, locale)}
              className="px-0"
            >
              {t(item.labelKey)}
            </NavigationItem>
          ))}
        </div>
        {isEmpty(orders) ? (
          <Card data-testid="reviews-to-write-empty-state">
            <div className="py-6 text-center">
              <h3 className="heading-lg uppercase text-primary" data-testid="reviews-to-write-empty-heading">{t('reviewsToWriteEmptyTitle')}</h3>
              <p className="mt-2 text-lg text-secondary" data-testid="reviews-to-write-empty-description">{t('reviewsToWriteEmptyDescription')}</p>
            </div>
          </Card>
        ) : (
          orders.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              showForm={setShowForm}
              testIdPrefix={`order-card-${order.id}`}
            />
          ))
        )}
      </div>
      {showForm && (
        <Modal
          heading={t('reviewsWriteModalTitle')}
          onClose={() => setShowForm(null)}
        >
          <ReviewForm
            seller={showForm}
            handleClose={() => setShowForm(null)}
          />
        </Modal>
      )}
    </>
  );
};
