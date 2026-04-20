"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"

import { Badge } from "@/components/atoms"
import LocalizedClientLink from "@/components/molecules/LocalizedLink/LocalizedLink"
import { HeartIcon } from "@/icons"

type Props = {
  locale: string
  isLoggedIn: boolean
  className?: string
  /** Posizione badge: mobile header vs desktop gourmet usano offset diversi */
  badgeClassName?: string
  onNavigate?: () => void
  heartSize?: number
  heartColor?: string
}

export function WishlistNavLink({
  locale,
  isLoggedIn,
  className,
  badgeClassName = "absolute -top-2 -right-2 flex h-4 min-w-4 items-center justify-center p-0 text-[10px]",
  onNavigate,
  heartSize = 20,
  heartColor = "currentColor",
}: Props) {
  const t = useTranslations("Header")
  const [count, setCount] = useState<number | null>(isLoggedIn ? null : 0)

  useEffect(() => {
    if (!isLoggedIn) {
      setCount(0)
      return
    }
    let cancelled = false
    fetch(`/api/wishlist-count?locale=${encodeURIComponent(locale)}`, {
      credentials: "same-origin",
    })
      .then((r) => r.json())
      .then((d: { count?: unknown }) => {
        if (cancelled) return
        const n = typeof d.count === "number" ? d.count : 0
        setCount(n)
      })
      .catch(() => {
        if (!cancelled) setCount(0)
      })
    return () => {
      cancelled = true
    }
  }, [locale, isLoggedIn])

  const showBadge = isLoggedIn && count !== null && count > 0

  return (
    <LocalizedClientLink
      href={isLoggedIn ? "/user/wishlist" : "/login"}
      locale={locale}
      className={className}
      aria-label={t("wishlistAria")}
      onClick={onNavigate}
    >
      <HeartIcon size={heartSize} color={heartColor} />
      {showBadge ? (
        <Badge className={badgeClassName} data-testid="wishlist-count-badge">
          {count}
        </Badge>
      ) : null}
    </LocalizedClientLink>
  )
}
