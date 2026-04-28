'use client';

import { HttpTypes } from '@medusajs/types';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

import { TramelleProductImage } from '@/components/atoms';
import LocalizedClientLink from '@/components/molecules/LocalizedLink/LocalizedLink';
import { filterValidCartItems } from '@/lib/helpers/filter-valid-cart-items';
import { resolveLineItemThumbnailSrc } from '@/lib/helpers/get-image-url';
import { convertToLocale } from '@/lib/helpers/money';

type VariantOptionRow = {
  option?: { title?: string | null } | null;
  value?: string | null;
};

function compactVariantLabel(
  options: VariantOptionRow[] | undefined
): string | null {
  if (!options?.length) return null;
  const parts = options
    .slice(0, 4)
    .map(o => o.value)
    .filter((v): v is string => Boolean(v && String(v).trim()));
  if (!parts.length) return null;
  return parts.join(' · ');
}

export function CheckoutSummaryLineItems({
  cart,
}: {
  cart: HttpTypes.StoreCart;
}) {
  const tCart = useTranslations('Cart');
  const tCheckout = useTranslations('Checkout');
  const valid = filterValidCartItems(cart.items);

  if (!valid.length) return null;

  return (
    <ul className="space-y-4" data-testid="checkout-summary-line-items">
      {valid.map(line => {
        const thumb = resolveLineItemThumbnailSrc(line);
        const total = convertToLocale({
          amount: line.subtotal ?? 0,
          currency_code: cart.currency_code,
        });
        const rawOpts = line.variant?.options as VariantOptionRow[] | undefined;
        const variantLabel = compactVariantLabel(rawOpts);
        const title =
          [line.product_title, line.subtitle].filter(Boolean).join(' — ') ||
          line.title ||
          '';

        return (
          <li key={line.id} className="flex gap-3">
            <LocalizedClientLink
              href={`/products/${line.product_handle}`}
              className="relative shrink-0"
            >
              <span
                className="absolute -right-1.5 -top-1.5 z-[1] flex h-5 min-w-5 items-center justify-center rounded-full bg-[#202223] px-1 text-[10px] font-semibold leading-none text-white shadow-sm"
                aria-label={`${tCheckout('qtyInOrder')}: ${line.quantity}`}
              >
                {line.quantity}
              </span>
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-md border border-[#e8e8e8] bg-white">
                {thumb ? (
                  <TramelleProductImage
                    layout="intrinsic"
                    src={thumb}
                    alt={tCart('productThumbnailAlt')}
                    width={64}
                    height={64}
                    preset="cart-line"
                    quality={82}
                    className="h-16 w-16 object-contain"
                  />
                ) : (
                  <Image
                    src="/images/placeholder.svg"
                    alt=""
                    width={32}
                    height={32}
                    className="opacity-30"
                  />
                )}
              </div>
            </LocalizedClientLink>
            <div className="min-w-0 flex-1">
              <div className="flex gap-3">
                <div className="min-w-0 flex-1">
                  <LocalizedClientLink href={`/products/${line.product_handle}`}>
                    <p
                      className="line-clamp-2 text-sm font-medium leading-snug text-[#202223]"
                      title={title}
                      data-testid="checkout-summary-line-title"
                    >
                      {title}
                    </p>
                  </LocalizedClientLink>
                  {variantLabel ? (
                    <p className="mt-1 line-clamp-1 text-xs text-[#6d7175]">
                      {variantLabel}
                    </p>
                  ) : null}
                </div>
                <p
                  className="shrink-0 text-sm font-semibold tabular-nums text-[#202223]"
                  data-testid="checkout-summary-line-price"
                >
                  {total}
                </p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
