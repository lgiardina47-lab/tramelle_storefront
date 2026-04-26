"use client"
import {
  Badge,
  Card,
  Divider,
  LogoutButton,
  NavigationItem,
} from "@/components/atoms"
import { useUnreads } from "@talkjs/react"
import { useParams, usePathname } from "next/navigation"
import { useTranslations } from "next-intl"

const navigationItems = [
  { labelKey: "orders" as const, href: "/user/orders" },
  { labelKey: "messages" as const, href: "/user/messages" },
  { labelKey: "returns" as const, href: "/user/returns" },
  { labelKey: "addresses" as const, href: "/user/addresses" },
  { labelKey: "reviews" as const, href: "/user/reviews" },
  { labelKey: "wishlist" as const, href: "/user/wishlist" },
]

function isNavActive(
  fullPath: string,
  href: string,
  locale: string
): boolean {
  if (!fullPath) return false
  const prefix = `/${locale}${href}`
  return fullPath === prefix
}

function UserNavigationInner({ showUnreadBadge }: { showUnreadBadge: boolean }) {
  const t = useTranslations("Account")
  const unreads = useUnreads()
  const path = usePathname()
  const params = useParams()
  const locale = typeof params?.locale === "string" ? params.locale : "it"

  return (
    <Card className="h-min">
      {navigationItems.map((item) => (
        <NavigationItem
          key={item.href}
          href={item.href}
          active={isNavActive(path, item.href, locale)}
          className="relative"
        >
          {t(item.labelKey)}
          {showUnreadBadge &&
            item.href === "/user/messages" &&
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
        active={isNavActive(path, "/user/settings", locale)}
      >
        {t("settings")}
      </NavigationItem>
      <LogoutButton className="w-full text-left">{t("logout")}</LogoutButton>
    </Card>
  )
}

function UserNavigationNoTalk() {
  const t = useTranslations("Account")
  const path = usePathname()
  const params = useParams()
  const locale = typeof params?.locale === "string" ? params.locale : "it"

  return (
    <Card className="h-min">
      {navigationItems.map((item) => (
        <NavigationItem
          key={item.href}
          href={item.href}
          active={isNavActive(path, item.href, locale)}
          className="relative"
        >
          {t(item.labelKey)}
        </NavigationItem>
      ))}
      <Divider className="my-2" />
      <NavigationItem
        href={"/user/settings"}
        active={isNavActive(path, "/user/settings", locale)}
      >
        {t("settings")}
      </NavigationItem>
      <LogoutButton className="w-full text-left">{t("logout")}</LogoutButton>
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
