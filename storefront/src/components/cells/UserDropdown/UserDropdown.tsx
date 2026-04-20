"use client"

import {
  Badge,
  Divider,
  LogoutButton,
  NavigationItem,
} from "@/components/atoms"
import { Dropdown } from "@/components/molecules"
import LocalizedClientLink from "@/components/molecules/LocalizedLink/LocalizedLink"
import { cn } from "@/lib/utils"
import { ArrowDownIcon, ProfileIcon } from "@/icons"
import type { TramelleHeaderAccountRole } from "@/lib/tramelle-header-account-role"
import { useUnreads } from "@talkjs/react"
import { useTranslations } from "next-intl"
import { useState } from "react"

function AccountMenuLoggedIn({
  unreadsCount,
  showUnreadBadge,
  locale,
  onNavigate,
}: {
  unreadsCount: number | undefined
  showUnreadBadge: boolean
  locale?: string
  onNavigate?: () => void
}) {
  const t = useTranslations("Account")
  return (
    <div className="p-1">
      <div className="lg:w-[200px]">
        <h3 className="uppercase heading-xs border-b p-4">{t("sectionTitle")}</h3>
      </div>
      <NavigationItem href="/user/orders" locale={locale} onClick={onNavigate}>
        {t("orders")}
      </NavigationItem>
      <NavigationItem
        href="/user/messages"
        className="relative"
        locale={locale}
        onClick={onNavigate}
      >
        {t("messages")}
        {showUnreadBadge && Boolean(unreadsCount) && (
          <Badge className="absolute top-3 left-24 w-4 h-4 p-0">
            {unreadsCount}
          </Badge>
        )}
      </NavigationItem>
      <NavigationItem href="/user/returns" locale={locale} onClick={onNavigate}>
        {t("returns")}
      </NavigationItem>
      <NavigationItem href="/user/addresses" locale={locale} onClick={onNavigate}>
        {t("addresses")}
      </NavigationItem>
      <NavigationItem href="/user/reviews" locale={locale} onClick={onNavigate}>
        {t("reviews")}
      </NavigationItem>
      <NavigationItem href="/user/wishlist" locale={locale} onClick={onNavigate}>
        {t("wishlist")}
      </NavigationItem>
      <Divider />
      <NavigationItem href="/user/settings" locale={locale} onClick={onNavigate}>
        {t("settings")}
      </NavigationItem>
      <LogoutButton>{t("logout")}</LogoutButton>
    </div>
  )
}

function AccountMenuGuest({
  locale,
  onNavigate,
}: {
  locale?: string
  onNavigate?: () => void
}) {
  const t = useTranslations("Account")
  return (
    <div className="p-1">
      <NavigationItem href="/accedi" locale={locale} onClick={onNavigate}>
        {t("login")}
      </NavigationItem>
      <NavigationItem href="/registrati" locale={locale} onClick={onNavigate}>
        {t("register")}
      </NavigationItem>
    </div>
  )
}

function UserDropdownLoggedInWithTalk({
  compactEmail,
  locale,
  onNavigate,
}: {
  compactEmail?: string | null
  locale?: string
  onNavigate?: () => void
}) {
  const [open, setOpen] = useState(false)
  const unreads = useUnreads()
  const t = useTranslations("Account")

  return (
    <div
      className="relative"
      onMouseOver={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
    >
      <LocalizedClientLink
        href="/user"
        locale={locale}
        className={cn(
          "relative flex max-w-[16rem] items-center gap-2 text-cortilia",
          compactEmail ? "text-xs" : ""
        )}
        aria-label={t("profileLinkAria")}
        onClick={onNavigate}
      >
        <ProfileIcon size={20} color="currentColor" className="shrink-0 text-cortilia" />
        {compactEmail ? (
          <>
            <span className="hidden min-w-0 flex-1 truncate font-normal text-cortilia lg:inline">
              {compactEmail}
            </span>
            <ArrowDownIcon
              size={14}
              color="currentColor"
              className="hidden shrink-0 text-cortilia lg:inline"
            />
          </>
        ) : null}
      </LocalizedClientLink>
      <Dropdown show={open}>
        <AccountMenuLoggedIn
          unreadsCount={unreads?.length}
          showUnreadBadge
          locale={locale}
          onNavigate={onNavigate}
        />
      </Dropdown>
    </div>
  )
}

function UserDropdownLoggedInNoTalk({
  compactEmail,
  locale,
  onNavigate,
}: {
  compactEmail?: string | null
  locale?: string
  onNavigate?: () => void
}) {
  const [open, setOpen] = useState(false)
  const t = useTranslations("Account")

  return (
    <div
      className="relative"
      onMouseOver={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
    >
      <LocalizedClientLink
        href="/user"
        locale={locale}
        className={cn(
          "relative flex max-w-[16rem] items-center gap-2 text-cortilia",
          compactEmail ? "text-xs" : ""
        )}
        aria-label={t("profileLinkAria")}
        onClick={onNavigate}
      >
        <ProfileIcon size={20} color="currentColor" className="shrink-0 text-cortilia" />
        {compactEmail ? (
          <>
            <span className="hidden min-w-0 flex-1 truncate font-normal text-cortilia lg:inline">
              {compactEmail}
            </span>
            <ArrowDownIcon
              size={14}
              color="currentColor"
              className="hidden shrink-0 text-cortilia lg:inline"
            />
          </>
        ) : null}
      </LocalizedClientLink>
      <Dropdown show={open}>
        <AccountMenuLoggedIn
          unreadsCount={undefined}
          showUnreadBadge={false}
          locale={locale}
          onNavigate={onNavigate}
        />
      </Dropdown>
    </div>
  )
}

function UserDropdownGourmetGuest({
  locale,
  onNavigate,
  showRegisterLink = true,
}: {
  locale?: string
  onNavigate?: () => void
  /** Header mobile compatto: solo «Accedi» come nei layout tipo marketplace. */
  showRegisterLink?: boolean
}) {
  const t = useTranslations("Account")
  return (
    <div
      className="flex flex-shrink-0 items-center gap-2 sm:gap-4"
      data-testid="header-auth-gourmet-guest"
    >
      <LocalizedClientLink
        href="/accedi"
        locale={locale}
        className="font-tramelle cursor-pointer whitespace-nowrap border-none bg-transparent text-xs font-medium normal-case tracking-normal text-[#8A8580] transition-colors hover:text-[#0F0E0B]"
        onClick={onNavigate}
      >
        {t("headerAccedi")}
      </LocalizedClientLink>
      {showRegisterLink ? (
        <LocalizedClientLink
          href="/registrati"
          locale={locale}
          className="font-tramelle cursor-pointer whitespace-nowrap rounded-full border-none bg-[#0F0E0B] px-[14px] py-[7px] text-[11px] font-normal normal-case tracking-normal text-white transition-opacity hover:opacity-[0.85]"
          onClick={onNavigate}
        >
          {t("headerRegistrati")}
        </LocalizedClientLink>
      ) : null}
    </div>
  )
}

function UserDropdownGuest({
  compactEmail,
  locale,
  onNavigate,
}: {
  compactEmail?: string | null
  locale?: string
  onNavigate?: () => void
}) {
  const [open, setOpen] = useState(false)
  const t = useTranslations("Account")

  return (
    <div
      className="relative"
      onMouseOver={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
    >
      <LocalizedClientLink
        href="/accedi"
        locale={locale}
        className={cn(
          "relative flex max-w-[16rem] items-center gap-2 text-cortilia",
          compactEmail ? "text-xs" : ""
        )}
        aria-label={t("profileLinkAria")}
        onClick={onNavigate}
      >
        <ProfileIcon size={20} color="currentColor" className="shrink-0 text-cortilia" />
        {compactEmail ? (
          <>
            <span className="hidden min-w-0 flex-1 truncate font-normal text-cortilia lg:inline">
              {compactEmail}
            </span>
            <ArrowDownIcon
              size={14}
              color="currentColor"
              className="hidden shrink-0 text-cortilia lg:inline"
            />
          </>
        ) : null}
      </LocalizedClientLink>
      <Dropdown show={open}>
        <AccountMenuGuest locale={locale} onNavigate={onNavigate} />
      </Dropdown>
    </div>
  )
}

function gourmetAccountBadgeLabel(
  role: TramelleHeaderAccountRole,
  t: (k: string) => string
): string | null {
  if (role === "b2b") return t("badgeB2b")
  if (role === "producer") return t("badgeProducer")
  return null
}

function UserDropdownGourmetLoggedInWithTalk({
  compactEmail,
  locale,
  onNavigate,
  accountRole,
}: {
  compactEmail?: string | null
  locale?: string
  onNavigate?: () => void
  accountRole: TramelleHeaderAccountRole
}) {
  const [open, setOpen] = useState(false)
  const unreads = useUnreads()
  const t = useTranslations("Account")
  const badge = gourmetAccountBadgeLabel(accountRole, t)

  return (
    <div
      className="relative"
      onMouseOver={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
    >
      <LocalizedClientLink
        href="/user"
        locale={locale}
        className="relative flex max-w-[22rem] items-center gap-2 text-gray-900"
        aria-label={t("profileLinkAria")}
        onClick={onNavigate}
      >
        <ProfileIcon size={20} color="currentColor" className="shrink-0 text-gray-700" />
        {badge ? (
          <span className="rounded-full bg-gray-900 px-2 py-0.5 text-[9px] font-semibold normal-case tracking-normal text-white">
            {badge}
          </span>
        ) : null}
        <span className="hidden min-w-0 flex-1 truncate text-xs font-medium normal-case tracking-normal lg:inline">
          {t("headerMyAccount")}
        </span>
        {compactEmail ? (
          <span className="hidden max-w-[8rem] truncate text-xs font-normal text-gray-500 xl:inline">
            {compactEmail}
          </span>
        ) : null}
        <ArrowDownIcon
          size={14}
          color="currentColor"
          className="hidden shrink-0 text-gray-600 lg:inline"
        />
      </LocalizedClientLink>
      <Dropdown show={open}>
        <AccountMenuLoggedIn
          unreadsCount={unreads?.length}
          showUnreadBadge
          locale={locale}
          onNavigate={onNavigate}
        />
      </Dropdown>
    </div>
  )
}

function UserDropdownGourmetLoggedInNoTalk({
  compactEmail,
  locale,
  onNavigate,
  accountRole,
}: {
  compactEmail?: string | null
  locale?: string
  onNavigate?: () => void
  accountRole: TramelleHeaderAccountRole
}) {
  const [open, setOpen] = useState(false)
  const t = useTranslations("Account")
  const badge = gourmetAccountBadgeLabel(accountRole, t)

  return (
    <div
      className="relative"
      onMouseOver={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
    >
      <LocalizedClientLink
        href="/user"
        locale={locale}
        className="relative flex max-w-[22rem] items-center gap-2 text-gray-900"
        aria-label={t("profileLinkAria")}
        onClick={onNavigate}
      >
        <ProfileIcon size={20} color="currentColor" className="shrink-0 text-gray-700" />
        {badge ? (
          <span className="rounded-full bg-gray-900 px-2 py-0.5 text-[9px] font-semibold normal-case tracking-normal text-white">
            {badge}
          </span>
        ) : null}
        <span className="hidden min-w-0 flex-1 truncate text-xs font-medium normal-case tracking-normal lg:inline">
          {t("headerMyAccount")}
        </span>
        {compactEmail ? (
          <span className="hidden max-w-[8rem] truncate text-xs font-normal text-gray-500 xl:inline">
            {compactEmail}
          </span>
        ) : null}
        <ArrowDownIcon
          size={14}
          color="currentColor"
          className="hidden shrink-0 text-gray-600 lg:inline"
        />
      </LocalizedClientLink>
      <Dropdown show={open}>
        <AccountMenuLoggedIn
          unreadsCount={undefined}
          showUnreadBadge={false}
          locale={locale}
          onNavigate={onNavigate}
        />
      </Dropdown>
    </div>
  )
}

export const UserDropdown = ({
  isLoggedIn,
  compactEmail,
  locale,
  onNavigate,
  presentation = "icon",
  accountRole = "consumer",
  showGourmetRegisterLink = true,
}: {
  isLoggedIn: boolean
  compactEmail?: string | null
  locale?: string
  onNavigate?: () => void
  /** Header gourmet: link testuali Accedi / Registrati (ospiti) e badge account (loggati). */
  presentation?: "icon" | "gourmet"
  accountRole?: TramelleHeaderAccountRole
  /** Solo header mobile compatto: nasconde «Registrati». */
  showGourmetRegisterLink?: boolean
}) => {
  if (presentation === "gourmet" && !isLoggedIn) {
    return (
      <UserDropdownGourmetGuest
        locale={locale}
        onNavigate={onNavigate}
        showRegisterLink={showGourmetRegisterLink}
      />
    )
  }
  if (presentation === "gourmet" && isLoggedIn) {
    const appId = process.env.NEXT_PUBLIC_TALKJS_APP_ID
    if (!appId?.trim()) {
      return (
        <UserDropdownGourmetLoggedInNoTalk
          compactEmail={compactEmail}
          locale={locale}
          onNavigate={onNavigate}
          accountRole={accountRole}
        />
      )
    }
    return (
      <UserDropdownGourmetLoggedInWithTalk
        compactEmail={compactEmail}
        locale={locale}
        onNavigate={onNavigate}
        accountRole={accountRole}
      />
    )
  }
  if (!isLoggedIn) {
    return (
      <UserDropdownGuest
        compactEmail={compactEmail}
        locale={locale}
        onNavigate={onNavigate}
      />
    )
  }
  const appId = process.env.NEXT_PUBLIC_TALKJS_APP_ID
  if (!appId?.trim()) {
    return (
      <UserDropdownLoggedInNoTalk
        compactEmail={compactEmail}
        locale={locale}
        onNavigate={onNavigate}
      />
    )
  }
  return (
    <UserDropdownLoggedInWithTalk
      compactEmail={compactEmail}
      locale={locale}
      onNavigate={onNavigate}
    />
  )
}
