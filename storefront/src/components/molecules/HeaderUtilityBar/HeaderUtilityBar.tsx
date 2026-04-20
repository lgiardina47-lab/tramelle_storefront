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
    return (
      <div
        className="flex w-full shrink-0 items-center justify-center border-b border-[#E8E4DE] bg-[#F5F3F0] px-5 py-0.5 sm:px-7 sm:py-1"
        data-testid="header-utility-bar"
      >
        <div className="mx-auto w-full max-w-4xl text-center">
          <p className="font-tramelle text-balance text-[11px] font-normal leading-tight text-[#8A8580] sm:text-xs sm:leading-snug">
            <span>{tHead("gourmet.topBarLead")}</span>{" "}
            <LocalizedClientLink
              href="/registrati"
              locale={locale}
              className="inline font-medium normal-case tracking-normal text-[#0F0E0B] underline decoration-[#0F0E0B]/35 underline-offset-[3px] transition-opacity hover:opacity-90"
            >
              {tHead("gourmet.topBarRegister")}
            </LocalizedClientLink>
          </p>
        </div>
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
