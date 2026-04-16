"use client"

import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import { useTranslations } from "next-intl"

import { CartDropdown } from "@/components/cells/CartDropdown/CartDropdown"
import { UserDropdown } from "@/components/cells/UserDropdown/UserDropdown"
import { HeaderSearch } from "@/components/molecules/HeaderSearch/HeaderSearch"
import { LanguageSwitcher } from "@/components/molecules/LanguageSwitcher/LanguageSwitcher"
import LocalizedClientLink from "@/components/molecules/LocalizedLink/LocalizedLink"
import { MessageButton } from "@/components/molecules/MessageButton/MessageButton"
import { Badge } from "@/components/atoms"
import { HeartIcon } from "@/icons"
import { useCartContext } from "@/components/providers"
import { cn } from "@/lib/utils"
import type { MegaNavCategory } from "@/lib/helpers/category-mega-nav"
import { categoryPublicHref } from "@/lib/helpers/category-public-url"
import type { LanguageSwitcherOption } from "@/lib/helpers/language-switcher-options"

/** Overlay mega: barra utility 2rem + header 4rem + nav categorie 3.5rem */
const BACKDROP_TOP = "9.5rem"

/** Testo API spesso in MAIUSCOLO: titolo per parole se tutto upper, altrimenti lascia. */
function formatProducerLine(s: string | undefined): string {
  const t = (s ?? "").trim()
  if (!t) return t
  if (t !== t.toUpperCase()) return t
  if (!/[A-Z]/.test(t)) return t
  return t
    .toLowerCase()
    .split(/(\s+)/)
    .map((part) => {
      if (/^\s+$/.test(part)) return part
      if (part.length === 0) return part
      return part.charAt(0).toUpperCase() + part.slice(1)
    })
    .join("")
}

function producerInitials(name: string): string {
  const d = formatProducerLine(name)
  const parts = d.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0]!.charAt(0) + parts[1]!.charAt(0)).toUpperCase()
  }
  return d.slice(0, 2).toUpperCase() || "?"
}

/** Località: città/provincia in title case; codice paese ISO a 2 lettere in MAIUSCOLO (IT). */
function formatProducerRegion(s: string | undefined): string {
  const t = (s ?? "").trim()
  if (!t) return t
  return t
    .split(" · ")
    .map((seg) => {
      const part = seg.trim()
      if (/^[A-Za-z]{2}$/.test(part)) return part.toUpperCase()
      return formatProducerLine(part)
    })
    .join(" · ")
}

type MegaOriginSeller = {
  handle: string
  name: string
  paese: string
  photo: string | null
}

type Props = {
  locale: string
  currencyCode: string
  megaCategories: MegaNavCategory[]
  isLoggedIn: boolean
  userEmail?: string
  wishlistCount: number
  languageOptions: LanguageSwitcherOption[]
  /** classi font (Playfair + Jakarta) dal layout server */
  fontVariables: string
}

export function TramelleGourmetHeader({
  locale,
  currencyCode,
  megaCategories,
  isLoggedIn,
  userEmail,
  wishlistCount,
  languageOptions,
  fontVariables,
}: Props) {
  const t = useTranslations("Header")
  const tNav = useTranslations("Nav")
  const { wholesaleBuyer } = useCartContext()

  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [scrolled, setScrolled] = useState(false)
  const navScrollRef = useRef<HTMLDivElement>(null)
  const [canL, setCanL] = useState(false)
  const [canR, setCanR] = useState(true)
  const [originSellers, setOriginSellers] = useState<MegaOriginSeller[]>([])
  const [originLoading, setOriginLoading] = useState(false)

  const closeMenu = useCallback(() => {
    setActiveIndex(null)
  }, [])

  const toggleMenu = useCallback((i: number) => {
    setActiveIndex((prev) => (prev === i ? null : i))
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [closeMenu])

  const updateArrows = useCallback(() => {
    const b = navScrollRef.current
    if (!b) return
    setCanL(b.scrollLeft > 2)
    setCanR(b.scrollLeft < b.scrollWidth - b.clientWidth - 2)
  }, [])

  useEffect(() => {
    updateArrows()
    const onResize = () => updateArrows()
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [updateArrows, megaCategories.length])

  const scrollNav = (d: number) => {
    navScrollRef.current?.scrollBy({ left: d * 260, behavior: "smooth" })
    setTimeout(updateArrows, 320)
  }

  const active = activeIndex !== null ? megaCategories[activeIndex] : null

  useEffect(() => {
    if (activeIndex === null) {
      setOriginSellers([])
      return
    }
    let cancelled = false
    setOriginLoading(true)
    fetch("/api/tramelle/mega-random-sellers", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status))
        return res.json() as Promise<{ sellers?: MegaOriginSeller[] }>
      })
      .then((data) => {
        if (!cancelled) setOriginSellers(data.sellers ?? [])
      })
      .catch(() => {
        if (!cancelled) setOriginSellers([])
      })
      .finally(() => {
        if (!cancelled) setOriginLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [activeIndex])

  return (
    <div
      className={cn(
        "hidden font-tramelle antialiased lg:block",
        fontVariables
      )}
      data-testid="tramelle-gourmet-header"
    >
      {activeIndex !== null && (
        <button
          type="button"
          aria-label="Chiudi menu"
          className="fixed inset-x-0 bottom-0 bg-black/[0.06] backdrop-blur-[2px] transition-opacity motion-reduce:transition-none"
          style={{ top: BACKDROP_TOP, zIndex: 35 }}
          onClick={closeMenu}
        />
      )}

      <div
        className="sticky top-0 z-[60] flex h-8 items-center justify-between border-b border-gray-100 bg-white px-8"
        data-testid="gourmet-top-bar"
        aria-hidden
      >
        <div className="flex items-center gap-6">
          <LocalizedClientLink
            href="/sellers"
            locale={locale}
            className="whitespace-nowrap text-[0.58rem] font-medium uppercase tracking-[0.2em] text-gray-500 transition-colors hover:text-gray-900"
          >
            {tNav("producers")}
          </LocalizedClientLink>
          <span className="text-xs text-gray-200">·</span>
          <LocalizedClientLink
            href="/categories"
            locale={locale}
            className="whitespace-nowrap text-[0.58rem] font-medium uppercase tracking-[0.2em] text-gray-500 transition-colors hover:text-gray-900"
          >
            {t("gourmet.news")}
          </LocalizedClientLink>
          <span className="text-xs text-gray-200">·</span>
          <LocalizedClientLink
            href="/categories"
            locale={locale}
            className="whitespace-nowrap text-[0.58rem] font-medium uppercase tracking-[0.2em] text-gray-500 transition-colors hover:text-gray-900"
          >
            {tNav("giftCards")}
          </LocalizedClientLink>
        </div>
        <div className="flex items-center gap-6">
          <LocalizedClientLink
            href="/categories"
            locale={locale}
            className="whitespace-nowrap text-[0.58rem] font-medium uppercase tracking-[0.2em] text-gray-500 transition-colors hover:text-gray-900"
          >
            {tNav("howItWorks")}
          </LocalizedClientLink>
          <span className="text-xs text-gray-200">·</span>
          <LocalizedClientLink
            href="/sellers"
            locale={locale}
            className="whitespace-nowrap text-[0.58rem] font-medium uppercase tracking-[0.2em] text-gray-500 transition-colors hover:text-gray-900"
          >
            {t("gourmet.becomeProducer")}
          </LocalizedClientLink>
          <span className="text-xs text-gray-200">·</span>
          <span className="whitespace-nowrap text-[0.58rem] font-medium text-gray-400">
            {t("gourmet.shippingEu")}
          </span>
        </div>
      </div>

      <header
        className={cn(
          "sticky z-[65] border-b border-gray-100/90 bg-white transition-shadow duration-200 ease-out motion-reduce:transition-none",
          scrolled && "shadow-[0_1px_0_rgba(0,0,0,0.06),0_4px_14px_rgba(0,0,0,0.04)]"
        )}
        style={{ top: "2rem" }}
      >
        <div className="flex h-16 min-h-[4rem] items-center justify-between gap-4 px-6 sm:gap-6 lg:px-8">
          <LocalizedClientLink
            href="/"
            locale={locale}
            className="flex-shrink-0 rounded-sm outline-none ring-offset-2 transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-gray-900/25"
            data-testid="header-logo-link-desktop"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- asset statico brand in /public */}
            <img
              src="/tramelle.svg"
              width={200}
              height={40}
              alt={t("logoAlt")}
              className="h-9 w-auto max-h-10 sm:h-10 sm:max-h-[44px]"
              decoding="async"
              fetchPriority="high"
            />
          </LocalizedClientLink>

          <div className="mx-4 hidden min-h-0 min-w-0 max-w-2xl flex-1 items-center rounded-full border border-gray-200 bg-white px-3 py-1.5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-shadow focus-within:border-gray-200 focus-within:shadow-[0_2px_8px_rgba(0,0,0,0.08)] focus-within:ring-2 focus-within:ring-gray-900/15 sm:mx-6 md:flex">
            <Suspense
              fallback={
                <div className="h-8 w-full rounded-full bg-gray-100" aria-hidden />
              }
            >
              <HeaderSearch
                variant="gourmet"
                className="w-full max-w-none"
                locale={locale}
                currency_code={currencyCode}
                placeholder={t("gourmet.searchPlaceholder")}
              />
            </Suspense>
          </div>

          <div className="flex min-w-0 flex-shrink-0 items-center gap-2 sm:gap-3">
            <div
              className="hidden cursor-default select-none items-center gap-2 sm:flex"
              role="group"
              aria-label={
                wholesaleBuyer
                  ? t("gourmet.chefProHint")
                  : t("gourmet.consumerHint")
              }
            >
              <span
                className={cn(
                  "text-[0.58rem] font-semibold uppercase tracking-widest transition-colors",
                  !wholesaleBuyer ? "text-gray-900" : "text-gray-300"
                )}
              >
                {t("gourmet.consumer")}
              </span>
              <div
                className={cn(
                  "flex h-5 w-9 items-center rounded-full px-0.5 transition-colors",
                  wholesaleBuyer ? "bg-gray-900" : "bg-gray-200"
                )}
              >
                <div
                  className={cn(
                    "h-4 w-4 rounded-full bg-white shadow transition-transform",
                    wholesaleBuyer ? "translate-x-4" : "translate-x-0"
                  )}
                />
              </div>
              <span
                className={cn(
                  "text-[0.58rem] font-semibold uppercase tracking-widest transition-colors",
                  wholesaleBuyer ? "text-gray-900" : "text-gray-300"
                )}
              >
                {t("gourmet.chefPro")}
              </span>
            </div>

            {isLoggedIn && <MessageButton locale={locale} />}
            <LocalizedClientLink
              href={isLoggedIn ? "/user/wishlist" : "/login"}
              locale={locale}
              className="relative hidden min-h-[44px] min-w-[44px] items-center justify-center rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20 sm:inline-flex"
              aria-label={t("wishlistAria")}
            >
              <HeartIcon size={20} color="currentColor" />
              {wishlistCount > 0 ? (
                <Badge className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center p-0 text-[10px]">
                  {wishlistCount}
                </Badge>
              ) : null}
            </LocalizedClientLink>
            <UserDropdown
              isLoggedIn={isLoggedIn}
              compactEmail={userEmail}
              locale={locale}
            />
            <LanguageSwitcher locale={locale} options={languageOptions} />
            <CartDropdown />
          </div>
        </div>
      </header>

      <div
        className="sticky z-[60] border-b border-gray-100 bg-white"
        style={{ top: "6rem" }}
      >
        <div className="relative">
          <div className="flex h-14 min-h-[3.5rem] items-stretch">
            <button
              type="button"
              onClick={() => scrollNav(-1)}
              className={cn(
                "mx-0.5 flex h-full min-h-[44px] min-w-[44px] flex-shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20",
                !canL && "pointer-events-none opacity-0"
              )}
              aria-label="Scorri a sinistra"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 8 14">
                <title>←</title>
                <path
                  d="M7 1L1 7l6 6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            <nav
              ref={navScrollRef}
              onScroll={updateArrows}
              className="tramelle-gourmet-nav-scroll flex flex-1 items-center gap-1 overflow-x-auto px-0.5"
              aria-label={t("gourmet.categoryNavAria")}
            >
              {megaCategories.map((cat, i) => (
                <div
                  key={cat.id}
                  role="button"
                  tabIndex={0}
                  aria-expanded={activeIndex === i}
                  aria-haspopup="true"
                  aria-label={cat.name}
                  className={cn(
                    "flex min-h-[2.5rem] flex-shrink-0 cursor-pointer items-center rounded-xl px-3 transition-colors duration-200 sm:px-4",
                    activeIndex === i
                      ? "bg-gray-100 text-gray-900 shadow-sm ring-1 ring-gray-200/80"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-800 hover:ring-1 hover:ring-gray-200/60"
                  )}
                  onClick={() => toggleMenu(i)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      toggleMenu(i)
                    }
                  }}
                >
                  <span className="whitespace-nowrap text-[0.75rem] font-semibold tracking-tight">
                    {cat.name}
                  </span>
                </div>
              ))}
            </nav>

            <button
              type="button"
              onClick={() => scrollNav(1)}
              className={cn(
                "mx-0.5 flex h-full min-h-[44px] min-w-[44px] flex-shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20",
                !canR && "pointer-events-none opacity-0"
              )}
              aria-label="Scorri a destra"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 8 14">
                <title>→</title>
                <path
                  d="M1 1l6 6-6 6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>

          {active && (
            <div
              className="absolute left-0 right-0 top-full z-[60] rounded-b-2xl border border-t-0 border-gray-100/80 bg-white font-tramelle shadow-[0_12px_40px_-12px_rgba(0,0,0,0.12)] ring-1 ring-black/[0.04]"
              data-testid="gourmet-mega-panel"
              role="region"
              aria-label={active.name}
            >
              <div className="flex items-start gap-2 pb-5 pt-4">
                <div
                  className="relative ml-4 flex flex-shrink-0 self-start overflow-hidden rounded-2xl sm:ml-6"
                  style={{
                    width: "10rem",
                    height: "13rem",
                    minWidth: "10rem",
                    minHeight: "13rem",
                  }}
                >
                  {active.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={active.imageUrl}
                      alt={active.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-b from-gray-100 to-gray-50 px-3 text-center text-[14px] font-medium leading-snug text-gray-600">
                      {active.name}
                    </div>
                  )}
                  <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-t from-black/60 to-transparent" />
                </div>

                <div className="grid min-w-0 flex-1 grid-cols-3 divide-x divide-gray-100/90 px-2 py-4 sm:py-5">
                  <div className="flex min-w-0 flex-col overflow-hidden px-4 sm:px-5">
                    <div
                      className="mb-3 flex flex-shrink-0 items-center justify-between"
                      style={{ height: "1.75rem" }}
                    >
                      <span className="text-[0.58rem] font-bold uppercase tracking-[0.36em] text-gray-900">
                        {t("gourmet.categoriesHeading")}
                      </span>
                      <LocalizedClientLink
                        href={categoryPublicHref(active.handle)}
                        locale={locale}
                        onClick={closeMenu}
                        className="shrink-0 rounded-sm text-[0.55rem] font-semibold uppercase tracking-wide text-gray-400 transition-colors hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20"
                      >
                        {t("gourmet.seeAll")} →
                      </LocalizedClientLink>
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 content-start">
                      {active.subs.length > 0 ? (
                        active.subs.map((s) => (
                          <LocalizedClientLink
                            key={s.handle}
                            href={categoryPublicHref(s.handle)}
                            locale={locale}
                            onClick={closeMenu}
                            className="block min-h-[2.25rem] rounded-lg px-2 py-1 text-left text-[14px] font-semibold leading-snug text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15"
                          >
                            {s.name}
                          </LocalizedClientLink>
                        ))
                      ) : (
                        <LocalizedClientLink
                          href={categoryPublicHref(active.handle)}
                          locale={locale}
                          onClick={closeMenu}
                          className="col-span-2 block min-h-[2.25rem] rounded-lg px-2 py-1 text-left text-[14px] font-semibold text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15"
                        >
                          {t("gourmet.seeAll")}
                        </LocalizedClientLink>
                      )}
                    </div>
                  </div>

                  <div className="flex min-w-0 flex-col overflow-hidden px-4 sm:px-5">
                    <div
                      className="mb-3 flex flex-shrink-0 items-center"
                      style={{ height: "1.75rem" }}
                    >
                      <span className="text-[0.58rem] font-bold uppercase tracking-[0.36em] text-gray-900">
                        {t("gourmet.characteristicsHeading")}
                      </span>
                    </div>
                    <div className="max-h-[min(22rem,55vh)] min-h-[6rem] overflow-y-auto rounded-lg border border-dashed border-gray-200/90 bg-gray-50/40 px-3 py-4">
                      <p className="text-center text-[13px] font-medium leading-snug text-gray-400">
                        {t("gourmet.characteristicsPlaceholder")}
                      </p>
                    </div>
                  </div>

                  <div className="flex min-w-0 flex-col overflow-hidden px-4 sm:px-5">
                    <div
                      className="mb-3 flex flex-shrink-0 items-center justify-between"
                      style={{ height: "1.75rem" }}
                    >
                      <span className="text-[0.58rem] font-bold uppercase tracking-[0.36em] text-gray-900">
                        {t("gourmet.originHeading")}
                      </span>
                      <LocalizedClientLink
                        href="/sellers"
                        locale={locale}
                        onClick={closeMenu}
                        className="shrink-0 rounded-sm text-[0.55rem] font-semibold uppercase tracking-wide text-gray-400 transition-colors hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20"
                      >
                        {t("gourmet.seeAllProducers")} →
                      </LocalizedClientLink>
                    </div>
                    <div className="max-h-[min(22rem,55vh)] overflow-y-auto pr-1">
                      {originLoading ? (
                        <p className="px-1 py-3 text-[13px] text-gray-400">
                          {t("gourmet.originLoading")}
                        </p>
                      ) : originSellers.length === 0 ? (
                        <p className="px-1 py-3 text-[13px] text-gray-400">
                          {t("gourmet.originEmpty")}
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 gap-1 content-start sm:grid-cols-2">
                          {originSellers.map((p) => (
                            <LocalizedClientLink
                              key={p.handle}
                              href={`/sellers/${p.handle}`}
                              locale={locale}
                              onClick={closeMenu}
                              className="group flex min-h-[2.75rem] items-center gap-2 rounded-xl px-1.5 py-1.5 transition-colors duration-200 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/10"
                            >
                              <div
                                className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] ring-1 ring-inset ring-gray-200/90"
                                aria-hidden
                              >
                                {p.photo ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={p.photo}
                                    alt=""
                                    className="h-full w-full object-cover"
                                    loading="lazy"
                                    decoding="async"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center bg-gray-50 text-[10px] font-semibold text-gray-600">
                                    {producerInitials(p.name)}
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1 py-0.5">
                                <div className="line-clamp-2 text-left text-[13px] font-bold leading-tight text-gray-900 normal-case">
                                  {formatProducerLine(p.name)}
                                </div>
                                {p.paese ? (
                                  <div className="mt-0.5 line-clamp-1 text-left text-[11px] font-medium leading-tight text-gray-400 normal-case">
                                    {formatProducerLine(p.paese)}
                                  </div>
                                ) : null}
                              </div>
                            </LocalizedClientLink>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
