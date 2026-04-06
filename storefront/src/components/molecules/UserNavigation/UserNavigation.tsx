"use client"
import {
  Badge,
  Card,
  Divider,
  LogoutButton,
  NavigationItem,
} from "@/components/atoms"
import { useUnreads } from "@talkjs/react"
import { usePathname } from "next/navigation"

const navigationItems = [
  { label: "Orders", href: "/user/orders" },
  { label: "Messages", href: "/user/messages" },
  { label: "Returns", href: "/user/returns" },
  { label: "Addresses", href: "/user/addresses" },
  { label: "Reviews", href: "/user/reviews" },
  { label: "Wishlist", href: "/user/wishlist" },
]

function UserNavigationInner({ showUnreadBadge }: { showUnreadBadge: boolean }) {
  const unreads = useUnreads()
  const path = usePathname()

  return (
    <Card className="h-min">
      {navigationItems.map((item) => (
        <NavigationItem
          key={item.label}
          href={item.href}
          active={path === item.href}
          className="relative"
        >
          {item.label}
          {showUnreadBadge &&
            item.label === "Messages" &&
            Boolean(unreads?.length) && (
              <Badge className="absolute top-3 left-24 w-4 h-4 p-0">
                {unreads?.length}
              </Badge>
            )}
        </NavigationItem>
      ))}
      <Divider className="my-2" />
      <NavigationItem
        href={"/user/settings"}
        active={path === "/user/settings"}
      >
        Settings
      </NavigationItem>
      <LogoutButton className="w-full text-left" />
    </Card>
  )
}

function UserNavigationNoTalk() {
  const path = usePathname()

  return (
    <Card className="h-min">
      {navigationItems.map((item) => (
        <NavigationItem
          key={item.label}
          href={item.href}
          active={path === item.href}
          className="relative"
        >
          {item.label}
        </NavigationItem>
      ))}
      <Divider className="my-2" />
      <NavigationItem
        href={"/user/settings"}
        active={path === "/user/settings"}
      >
        Settings
      </NavigationItem>
      <LogoutButton className="w-full text-left" />
    </Card>
  )
}

export const UserNavigation = () => {
  const appId = process.env.NEXT_PUBLIC_TALKJS_APP_ID
  if (!appId?.trim()) {
    return <UserNavigationNoTalk />
  }
  return <UserNavigationInner showUnreadBadge />
}
