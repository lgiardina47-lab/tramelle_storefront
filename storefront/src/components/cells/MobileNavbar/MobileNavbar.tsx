'use client';

import { useEffect, useState } from 'react';

import { HttpTypes } from '@medusajs/types';

import { HeaderCategoryNavbar } from '@/components/molecules';
import { LanguageSwitcher } from '@/components/molecules/LanguageSwitcher/LanguageSwitcher';
import type { LanguageSwitcherOption } from '@/lib/helpers/language-switcher-options';

import { MobileCategoryNavbar } from './components';

export const MobileNavbar = ({
  categories,
  parentCategories,
  locale,
  languageOptions
}: {
  categories: HttpTypes.StoreProductCategory[];
  parentCategories: HttpTypes.StoreProductCategory[];
  locale: string;
  languageOptions: LanguageSwitcherOption[];
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const closeMenuHandler = () => {
    setIsOpen(false);
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <div
      className="lg:hidden"
      data-testid="mobile-navbar"
    >
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        data-testid="mobile-menu-toggle"
        className="text-sm font-semibold uppercase text-cortilia underline-offset-2 hover:underline"
      >
        Menu
      </button>
      {isOpen && (
        <div
          className="fixed left-0 top-0 z-20 h-full w-full bg-primary"
          data-testid="mobile-menu-drawer"
        >
          <div
            className="flex items-center justify-between border-b p-4"
            data-testid="mobile-menu-header"
          >
            <h2 className="heading-md uppercase text-primary">Menu</h2>
            <button
              type="button"
              onClick={() => closeMenuHandler()}
              data-testid="mobile-menu-close-button"
              className="text-sm font-semibold uppercase text-primary underline-offset-2 hover:underline"
            >
              Chiudi
            </button>
          </div>
          <div className="">
            <HeaderCategoryNavbar
              onClose={closeMenuHandler}
              categories={categories}
              parentCategories={parentCategories}
            />
            <div className="p-4">
              <MobileCategoryNavbar
                onClose={closeMenuHandler}
                categories={categories}
                parentCategories={parentCategories}
              />
            </div>
            <div className="border-t border-primary/20 p-4">
              <p className="mb-2 text-xs font-semibold uppercase text-primary">
                Lingua / Paese
              </p>
              <LanguageSwitcher locale={locale} options={languageOptions} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
