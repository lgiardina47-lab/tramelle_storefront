'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/atoms';
import { Input } from '@/components/atoms/Input/Input';
import { login } from '@/lib/data/customer';

export function CheckoutInlineLogin() {
  const t = useTranslations('Checkout');
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="mt-3 grid gap-3 sm:grid-cols-2"
      data-testid="checkout-inline-login"
      onSubmit={e => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        setError(null);
        startTransition(async () => {
          const res = await login(fd);
          if (res && typeof res === 'object' && 'success' in res && res.success) {
            router.refresh();
            form.reset();
            return;
          }
          const msg =
            res &&
            typeof res === 'object' &&
            'message' in res &&
            typeof (res as { message?: string }).message === 'string'
              ? (res as { message: string }).message
              : t('genericError');
          setError(msg);
        });
      }}
    >
      <Input
        name="email"
        type="email"
        autoComplete="email"
        required
        label={t('inlineLoginEmail')}
        disabled={pending}
        data-testid="checkout-inline-login-email"
      />
      <Input
        name="password"
        type="password"
        autoComplete="current-password"
        required
        label={t('inlineLoginPassword')}
        disabled={pending}
        data-testid="checkout-inline-login-password"
      />
      <div className="flex flex-col gap-2 sm:col-span-2">
        {error ? (
          <p className="text-small-regular text-rose-600" role="alert">
            {error}
          </p>
        ) : null}
        <Button
          type="submit"
          variant="filled"
          className="w-full rounded-md !bg-[#1773b0] hover:!bg-[#135d91] !text-white sm:w-auto"
          disabled={pending}
          data-testid="checkout-inline-login-submit"
        >
          {pending ? t('loading') : t('inlineLoginSubmit')}
        </Button>
      </div>
    </form>
  );
}
