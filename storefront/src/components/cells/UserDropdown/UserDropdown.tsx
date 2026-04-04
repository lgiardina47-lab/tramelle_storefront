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

export const UserDropdown = ({
  isLoggedIn,
  compactEmail,
}: {
  isLoggedIn: boolean
  /** Se impostato, mostra email accanto all’icona (barra superiore header marketplace). */
  compactEmail?: string | null
}) => {
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
        href={isLoggedIn ? "/user" : "/login"}
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
        {isLoggedIn ? (
          <div className="p-1">
            <div className="lg:w-[200px]">
              <h3 className="uppercase heading-xs border-b p-4">
                Your account
              </h3>
            </div>
            <NavigationItem href="/user/orders">Orders</NavigationItem>
            <NavigationItem href="/user/messages" className="relative">
              Messages
              {Boolean(unreads?.length) && (
                <Badge className="absolute top-3 left-24 w-4 h-4 p-0">
                  {unreads?.length}
                </Badge>
              )}
            </NavigationItem>
            <NavigationItem href="/user/returns">Returns</NavigationItem>
            <NavigationItem href="/user/addresses">Addresses</NavigationItem>
            <NavigationItem href="/user/reviews">Reviews</NavigationItem>
            <NavigationItem href="/user/wishlist">Wishlist</NavigationItem>
            <Divider />
            <NavigationItem href="/user/settings">Settings</NavigationItem>
            <LogoutButton />
          </div>
        ) : (
          <div className="p-1">
            <NavigationItem href="/login">Login</NavigationItem>
            <NavigationItem href="/register">Register</NavigationItem>
          </div>
        )}
      </Dropdown>
    </div>
  )
}
