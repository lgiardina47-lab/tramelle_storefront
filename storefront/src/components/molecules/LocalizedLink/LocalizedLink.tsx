"use client"

import Link from "next/link"
import { useParams, usePathname } from "next/navigation"
import React, { MouseEventHandler } from "react"

type LocalizedClientLinkProps = Omit<
  React.ComponentProps<typeof Link>,
  "href" | "prefetch"
> & {
  children?: React.ReactNode
  href: string
  /** Se passato (es. dalla Server Component Header), evita mismatch idratazione su locale. */
  locale?: string
  className?: string
  onClick?: MouseEventHandler<HTMLAnchorElement> | undefined
}

/**
 * Link localizzato (`/${locale}/…`). **Prefetch sempre attivo** per navigazione App Router più fluida.
 */
const LocalizedClientLink = ({
  children,
  href,
  locale: localeProp,
  ...rest
}: LocalizedClientLinkProps) => {
  const params = useParams()
  const pathname = usePathname()

  const locale =
    localeProp?.trim() ||
    (typeof params?.locale === "string" ? params.locale : "") ||
    pathname?.split("/")[1] ||
    "en"

  return (
    <Link href={`/${locale}${href}`} prefetch={true} {...rest}>
      {children}
    </Link>
  )
}

export default LocalizedClientLink
