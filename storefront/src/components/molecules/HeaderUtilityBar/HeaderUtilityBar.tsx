"use client"

import LocalizedClientLink from "@/components/molecules/LocalizedLink/LocalizedLink"
import { MessageButton } from "@/components/molecules/MessageButton/MessageButton"
import { UserDropdown } from "@/components/cells/UserDropdown/UserDropdown"
import type { TramelleHeaderAccountRole } from "@/lib/tramelle-header-account-role"
import { useTranslations } from "next-intl"

type Props = {
  isLoggedIn: boolean
  userEmail?: string | null
  locale: string
  presentation?: "icon" | "gourmet"
  accountRole?: TramelleHeaderAccountRole
}

const linkClass =
  "text-xs font-medium text-cortilia transition-opacity hover:opacity-75 whitespace-nowrap"

export function HeaderUtilityBar({
  isLoggedIn,
  userEmail,
  locale,
  presentation = "icon",
  accountRole = "consumer",
}: Props) {
  const t = useTranslations("Nav")
  const tHead = useTranslations("Header")

  if (presentation === "gourmet") {
    const barTextClass =
      "font-tramelle text-[11px] font-normal leading-tight text-[#8A8580] sm:text-xs sm:leading-snug"
    return (
      <div
        className="flex w-full shrink-0 flex-col items-stretch gap-y-0.5 border-b border-[#E8E4DE] bg-[#F5F3F0] px-4 py-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-x-3 sm:gap-y-0 sm:px-6 sm:py-1 lg:px-7"
        data-testid="header-utility-bar"
      >
        <p
          className={`min-w-0 shrink-0 text-balance text-left ${barTextClass}`}
          data-testid="header-topbar-demo"
        >
          {tHead("gourmet.topBarDemo")}
        </p>
        <p
          className={`min-w-0 max-w-full text-balance text-right sm:max-w-[60%] lg:max-w-[55%] ${barTextClass}`}
          data-testid="header-topbar-producer-cta"
        >
          <span>{tHead("gourmet.topBarProducerQuestion")}</span>{" "}
          <LocalizedClientLink
            href="/registrati"
            locale={locale}
            className="inline font-medium normal-case tracking-normal text-[#0F0E0B] underline decoration-[#0F0E0B]/35 underline-offset-[3px] transition-opacity hover:opacity-90"
          >
            {tHead("gourmet.topBarRegister")}
          </LocalizedClientLink>
          <span aria-hidden="true">.</span>
        </p>
      </div>
    )
  }

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
        </nav>

        <div className="flex items-center justify-end gap-3 sm:ml-auto">
          {isLoggedIn && <MessageButton locale={locale} />}
          <UserDropdown
            isLoggedIn={isLoggedIn}
            compactEmail={userEmail}
            locale={locale}
            presentation={presentation}
            accountRole={accountRole}
          />
        </div>
      </div>
    </div>
  )
}
