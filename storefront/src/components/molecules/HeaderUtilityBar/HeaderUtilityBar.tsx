"use client"

import LocalizedClientLink from "@/components/molecules/LocalizedLink/LocalizedLink"
import { MessageButton } from "@/components/molecules/MessageButton/MessageButton"
import { UserDropdown } from "@/components/cells/UserDropdown/UserDropdown"

type Props = {
  isLoggedIn: boolean
  userEmail?: string | null
  locale: string
}

const linkClass =
  "text-xs font-medium text-cortilia transition-opacity hover:opacity-75 whitespace-nowrap"

export function HeaderUtilityBar({
  isLoggedIn,
  userEmail,
  locale,
}: Props) {
  return (
    <div
      className="border-b border-neutral-100 bg-neutral-50/90"
      data-testid="header-utility-bar"
    >
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2 md:px-6 lg:px-8">
        <nav
          className="hidden items-center gap-4 sm:flex"
          aria-label="Link utili"
        >
          <LocalizedClientLink href="/categories" locale={locale} className={linkClass}>
            Produttori
          </LocalizedClientLink>
          <LocalizedClientLink href="/categories" locale={locale} className={linkClass}>
            Ricette
          </LocalizedClientLink>
          <LocalizedClientLink href="/categories" locale={locale} className={linkClass}>
            Buoni regalo
          </LocalizedClientLink>
          <LocalizedClientLink href="/categories" locale={locale} className={linkClass}>
            Servizi per le aziende
          </LocalizedClientLink>
        </nav>

        <div className="hidden flex-1 justify-center md:flex">
          <span className="flex items-center gap-1 text-xs text-cortilia">
            <LocalizedClientLink href="/categories" locale={locale} className={linkClass}>
              Come funziona
            </LocalizedClientLink>
            <span className="text-neutral-300" aria-hidden>
              |
            </span>
            <LocalizedClientLink href="/categories" locale={locale} className={linkClass}>
              Contattaci
            </LocalizedClientLink>
          </span>
        </div>

        <div className="flex items-center justify-end gap-3 sm:ml-auto">
          {isLoggedIn && <MessageButton locale={locale} />}
          <UserDropdown
            isLoggedIn={isLoggedIn}
            compactEmail={userEmail}
            locale={locale}
          />
        </div>
      </div>
    </div>
  )
}
