"use client"

import Link from "next/link"
import { useParams, usePathname } from "next/navigation"
import React, { MouseEventHandler } from "react"

/**
 * Use this component to create a Next.js `<LocalizedClientLink />` that persists the current country code in the url,
 * without having to explicitly pass it as a prop.
 */
const LocalizedClientLink = ({
  children,
  href,
  locale: localeProp,
  ...props
}: {
  children?: React.ReactNode
  href: string
  /** Se passato (es. dalla Server Component Header), evita mismatch idratazione su locale. */
  locale?: string
  className?: string
  onClick?: MouseEventHandler<HTMLAnchorElement> | undefined
  passHref?: true
  [x: string]: any
}) => {
  const params = useParams()
  const pathname = usePathname()

  const locale =
    localeProp?.trim() ||
    (typeof params?.locale === "string" ? params.locale : "") ||
    pathname?.split("/")[1] ||
    "en"

  return (
    <Link href={`/${locale}${href}`} {...props}>
      {children}
    </Link>
  )
}

export default LocalizedClientLink
