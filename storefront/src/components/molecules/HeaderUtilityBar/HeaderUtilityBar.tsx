"use client"

import LocalizedClientLink from "@/components/molecules/LocalizedLink/LocalizedLink"
import { MessageButton } from "@/components/molecules/MessageButton/MessageButton"
import { UserDropdown } from "@/components/cells/UserDropdown/UserDropdown"
import { useTranslations } from "next-intl"

type Props = {
  isLoggedIn: boolean
  userEmail?: string | null
  locale: string
}

const linkClass =
  "text-xs font-medium text-cortilia transition-opacity hover:opacity-75 whitespace-nowrap"

export function HeaderUtilityBar({
  isLoggedIn,
  userEmail,
  locale,
}: Props) {
  const t = useTranslations("Nav")

  return (
    <div
      className="border-b border-neutral-100 bg-neutral-50/90"
      data-testid="header-utility-bar"
    >
      <div className="flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2 md:px-6 lg:px-8">
        <nav
          className="hidden items-center gap-4 sm:flex"
          aria-label={t("utilityAria")}
        >
          <LocalizedClientLink href="/sellers" locale={locale} className={linkClass}>
            {t("producers")}
          </LocalizedClientLink>
          <LocalizedClientLink href="/categories" locale={locale} className={linkClass}>
            {t("recipes")}
          </LocalizedClientLink>
          <LocalizedClientLink href="/categories" locale={locale} className={linkClass}>
            {t("giftCards")}
          </LocalizedClientLink>
          <LocalizedClientLink href="/categories" locale={locale} className={linkClass}>
            {t("b2bServices")}
          </LocalizedClientLink>
        </nav>

        <div className="flex items-center justify-end gap-3 sm:ml-auto">
          {isLoggedIn && <MessageButton locale={locale} />}
          <UserDropdown
            isLoggedIn={isLoggedIn}
            compactEmail={userEmail}
            locale={locale}
          />
        </div>
      </div>
    </div>
  )
}
