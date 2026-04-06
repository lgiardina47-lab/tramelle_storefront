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
import { useUnreads } from "@talkjs/react"
import { useState } from "react"

function accountMenuLoggedIn(
  unreadsCount: number | undefined,
  showUnreadBadge: boolean,
  locale?: string
) {
  return (
    <div className="p-1">
      <div className="lg:w-[200px]">
        <h3 className="uppercase heading-xs border-b p-4">Your account</h3>
      </div>
      <NavigationItem href="/user/orders" locale={locale}>
        Orders
      </NavigationItem>
      <NavigationItem href="/user/messages" className="relative" locale={locale}>
        Messages
        {showUnreadBadge && Boolean(unreadsCount) && (
          <Badge className="absolute top-3 left-24 w-4 h-4 p-0">
            {unreadsCount}
          </Badge>
        )}
      </NavigationItem>
      <NavigationItem href="/user/returns" locale={locale}>
        Returns
      </NavigationItem>
      <NavigationItem href="/user/addresses" locale={locale}>
        Addresses
      </NavigationItem>
      <NavigationItem href="/user/reviews" locale={locale}>
        Reviews
      </NavigationItem>
      <NavigationItem href="/user/wishlist" locale={locale}>
        Wishlist
      </NavigationItem>
      <Divider />
      <NavigationItem href="/user/settings" locale={locale}>
        Settings
      </NavigationItem>
      <LogoutButton />
    </div>
  )
}

function UserDropdownLoggedInWithTalk({
  compactEmail,
  locale,
}: {
  compactEmail?: string | null
  locale?: string
}) {
  const [open, setOpen] = useState(false)
  const unreads = useUnreads()

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
        aria-label="Go to user profile"
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
        {accountMenuLoggedIn(unreads?.length, true, locale)}
      </Dropdown>
    </div>
  )
}

function UserDropdownLoggedInNoTalk({
  compactEmail,
  locale,
}: {
  compactEmail?: string | null
  locale?: string
}) {
  const [open, setOpen] = useState(false)

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
        aria-label="Go to user profile"
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
      <Dropdown show={open}>{accountMenuLoggedIn(undefined, false, locale)}</Dropdown>
    </div>
  )
}

function UserDropdownGuest({
  compactEmail,
  locale,
}: {
  compactEmail?: string | null
  locale?: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <div
      className="relative"
      onMouseOver={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
    >
      <LocalizedClientLink
        href="/login"
        locale={locale}
        className={cn(
          "relative flex max-w-[16rem] items-center gap-2 text-cortilia",
          compactEmail ? "text-xs" : ""
        )}
        aria-label="Go to user profile"
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
        <div className="p-1">
          <NavigationItem href="/login" locale={locale}>
            Login
          </NavigationItem>
          <NavigationItem href="/register" locale={locale}>
            Register
          </NavigationItem>
        </div>
      </Dropdown>
    </div>
  )
}

export const UserDropdown = ({
  isLoggedIn,
  compactEmail,
  locale,
}: {
  isLoggedIn: boolean
  compactEmail?: string | null
  locale?: string
}) => {
  if (!isLoggedIn) {
    return <UserDropdownGuest compactEmail={compactEmail} locale={locale} />
  }
  const appId = process.env.NEXT_PUBLIC_TALKJS_APP_ID
  if (!appId?.trim()) {
    return <UserDropdownLoggedInNoTalk compactEmail={compactEmail} locale={locale} />
  }
  return <UserDropdownLoggedInWithTalk compactEmail={compactEmail} locale={locale} />
}
