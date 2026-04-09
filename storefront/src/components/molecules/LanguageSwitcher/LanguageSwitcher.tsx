'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo } from 'react';

import type { LanguageSwitcherOption } from '@/lib/helpers/language-switcher-options';
import { TRAMELLE_PREFERRED_COUNTRY_COOKIE } from '@/lib/constants/locale-preference';

type Props = {
  locale: string;
  options: LanguageSwitcherOption[];
  className?: string;
};

export function LanguageSwitcher({ locale, options, className }: Props) {
  const t = useTranslations('Nav');
  const pathname = usePathname() || '/';
  const router = useRouter();
  const current = locale.toLowerCase();

  const pathWithoutCountry = useMemo(() => {
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length === 0) {
      return '';
    }
    if (/^[a-z]{2}$/i.test(parts[0] || '')) {
      return parts.slice(1).join('/');
    }
    return parts.join('/');
  }, [pathname]);

  const setPreferenceCookie = useCallback((country: string) => {
    document.cookie = `${TRAMELLE_PREFERRED_COUNTRY_COOKIE}=${country};path=/;max-age=31536000;samesite=lax`;
  }, []);

  const switchTo = useCallback(
    (country: string) => {
      const c = country.toLowerCase();
      if (c === current) {
        return;
      }
      setPreferenceCookie(c);
      const suffix = pathWithoutCountry ? `/${pathWithoutCountry}` : '';
      router.push(`/${c}${suffix}`);
    },
    [current, pathWithoutCountry, router, setPreferenceCookie]
  );

  if (!options.length) {
    return null;
  }

  return (
    <div
      className={['flex shrink-0 flex-wrap items-center justify-end gap-1', className].filter(Boolean).join(' ')}
      role="navigation"
      aria-label={t('languageSwitcherAria')}
    >
      {options.map((opt) => {
      const active = opt.country.toLowerCase() === current;
      return (
        <button
          key={opt.country}
          type="button"
          onClick={() => switchTo(opt.country)}
          className={[
            'rounded-full border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide transition-colors',
            active
              ? 'border-cortilia bg-neutral-900 text-white'
              : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400'
          ].join(' ')}
          aria-current={active ? 'true' : undefined}
        >
          {opt.label}
        </button>
      );
    })}
    </div>
  );
}
