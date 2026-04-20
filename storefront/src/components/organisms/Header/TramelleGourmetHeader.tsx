"use client"

import Image from "next/image"
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { useTranslations } from "next-intl"

import { CartDropdown } from "@/components/cells/CartDropdown/CartDropdown"
import { UserDropdown } from "@/components/cells/UserDropdown/UserDropdown"
import { HeaderUtilityBar } from "@/components/molecules/HeaderUtilityBar/HeaderUtilityBar"
import { HeaderSearch } from "@/components/molecules/HeaderSearch/HeaderSearch"
import { LanguageSwitcher } from "@/components/molecules/LanguageSwitcher/LanguageSwitcher"
import LocalizedClientLink from "@/components/molecules/LocalizedLink/LocalizedLink"
import { WishlistNavLink } from "@/components/molecules/WishlistNavLink/WishlistNavLink"
import { cn } from "@/lib/utils"
import type { MegaNavCategory } from "@/lib/helpers/category-mega-nav"
import { categoryPublicHref } from "@/lib/helpers/category-public-url"
import type { LanguageSwitcherOption } from "@/lib/helpers/language-switcher-options"
import { countryCodeToStorefrontMessagesLocale } from "@/lib/i18n/storefront-messages-locale"
import type { TramelleHeaderAccountRole } from "@/lib/tramelle-header-account-role"

/** Fascia promo compatta (~1.5rem) + header 4rem + nav 3.5rem — overlay mega-menu. */
const STICKY_CATEGORY_TOP = "5.5rem"
const BACKDROP_TOP = "9rem"

/** Testo API spesso in MAIUSCOLO: titolo per parole se tutto upper, altrimenti lascia. */
function formatOriginLabel(s: string | undefined): string {
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

type MegaOriginPlace = {
  nation: string
  region: string | null
}

type MegaOriginByNation = {
  nation: string
  regions: string[]
}

/** Una nazione compare una sola volta; sotto, tutte le regioni distinte (IT, FR, DE, …). */
function groupOriginsByNation(places: MegaOriginPlace[]): MegaOriginByNation[] {
  const map = new Map<
    string,
    { displayNation: string; regions: Map<string, string> }
  >()

  for (const p of places) {
    const nationRaw = p.nation.trim()
    if (!nationRaw) continue
    const nationKey = nationRaw.toLowerCase()
    let bucket = map.get(nationKey)
    if (!bucket) {
      bucket = { displayNation: nationRaw, regions: new Map() }
      map.set(nationKey, bucket)
    }
    const reg = p.region?.trim()
    if (reg) {
      const rk = reg.toLowerCase()
      if (!bucket.regions.has(rk)) bucket.regions.set(rk, reg)
    }
  }

  const rows = [...map.values()].map((b) => ({
    nation: b.displayNation,
    regions: [...b.regions.values()].sort((a, c) =>
      a.localeCompare(c, "it", { sensitivity: "base" })
    ),
  }))

  rows.sort((a, b) =>
    a.nation.localeCompare(b.nation, "it", { sensitivity: "base" })
  )

  return rows
}

/** Paesi (etichetta legacy `paese` = nome paese, non regione italiana). */
const LEGACY_PAESI_NAZIONE: Record<string, string> = {
  croazia: "Croazia",
  francia: "Francia",
  germania: "Germania",
  spagna: "Spagna",
  portogallo: "Portogallo",
  grecia: "Grecia",
  austria: "Austria",
  belgio: "Belgio",
  "regno unito": "Regno Unito",
  svizzera: "Svizzera",
  olanda: "Paesi Bassi",
  "paesi bassi": "Paesi Bassi",
  slovenia: "Slovenia",
  romania: "Romania",
  polonia: "Polonia",
  ungheria: "Ungheria",
  bulgaria: "Bulgaria",
  portugal: "Portogallo",
  france: "Francia",
  germany: "Germania",
  spain: "Spagna",
}

/**
 * Vecchia API: `{ sellers, paese }` con `paese` = regione/stato (MAIUSCOLO), non paese ISO.
 * Senza questo, ogni regione diventava una “nazione” e non compariva un solo “Italia”.
 */
function legacySellerPaeseToOrigin(
  paese: string,
  intlLocales: readonly string[]
): MegaOriginPlace {
  const p = paese.trim()
  if (!p) return { nation: "", region: null }
  if (/^[A-Za-z]{2}$/.test(p)) {
    const cc = p.toUpperCase()
    try {
      const name =
        new Intl.DisplayNames([...intlLocales], { type: "region" }).of(cc) ??
        cc
      return { nation: name, region: null }
    } catch {
      return { nation: cc, region: null }
    }
  }
  const nationFromTable = LEGACY_PAESI_NAZIONE[p.toLowerCase()]
  if (nationFromTable) {
    return { nation: nationFromTable, region: null }
  }
  return { nation: "Italia", region: p }
}

/** Compat: risposta `{ origins }` oppure legacy `{ sellers, paese }`. */
function parseMegaOriginsPayload(
  raw: unknown,
  storefrontCountryCode: string
): MegaOriginPlace[] {
  if (!raw || typeof raw !== "object") return []
  const d = raw as {
    origins?: MegaOriginPlace[]
    sellers?: Array<{ paese?: string }>
  }
  const ui = countryCodeToStorefrontMessagesLocale(storefrontCountryCode)
  const intlLocales = [ui, "it"] as const

  if (Array.isArray(d.origins) && d.origins.length > 0) {
    return d.origins.filter(
      (o): o is MegaOriginPlace =>
        Boolean(o && typeof o.nation === "string" && o.nation.trim().length > 0)
    )
  }
  if (Array.isArray(d.sellers) && d.sellers.length > 0) {
    const out: MegaOriginPlace[] = []
    for (const s of d.sellers) {
      const paese = typeof s.paese === "string" ? s.paese.trim() : ""
      if (!paese) continue
      out.push(legacySellerPaeseToOrigin(paese, intlLocales))
    }
    return out.filter((o) => o.nation.length > 0)
  }
  return []
}

type Props = {
  locale: string
  currencyCode: string
  megaCategories: MegaNavCategory[]
  isLoggedIn: boolean
  userEmail?: string
  accountRole: TramelleHeaderAccountRole
  languageOptions: LanguageSwitcherOption[]
  /** Variabili CSS font design system (DM Sans, Cormorant, Oswald) — vedi `lib/fonts/tramelle-ds.ts` */
  fontVariables: string
}

export function TramelleGourmetHeader({
  locale,
  currencyCode,
  megaCategories,
  isLoggedIn,
  userEmail,
  accountRole,
  languageOptions,
  fontVariables,
}: Props) {
  const tHead = useTranslations("Header")
  const tGourmet = useTranslations("Header.gourmet")
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [scrolled, setScrolled] = useState(false)
  const navScrollRef = useRef<HTMLDivElement>(null)
  const [canL, setCanL] = useState(false)
  const [canR, setCanR] = useState(true)
  const [originPlaces, setOriginPlaces] = useState<MegaOriginPlace[]>([])
  const [originLoading, setOriginLoading] = useState(false)

  const originsByNation = useMemo(
    () => groupOriginsByNation(originPlaces),
    [originPlaces]
  )

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
    const maxScroll = Math.max(0, b.scrollWidth - b.clientWidth)
    const sl = b.scrollLeft
    const eps = 8
    setCanL(sl > eps)
    setCanR(sl < maxScroll - eps)
  }, [])

  /** Centra la tab nel viewport orizzontale così non resta sotto le frecce / tagliata. */
  const scrollTabIntoView = useCallback(
    (index: number) => {
      const nav = navScrollRef.current
      if (!nav) return
      const el = nav.children[index] as HTMLElement | undefined
      if (!el) return
      el.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      })
      window.setTimeout(updateArrows, 450)
    },
    [updateArrows]
  )

  useEffect(() => {
    updateArrows()
    const onResize = () => updateArrows()
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [updateArrows, megaCategories.length])

  const scrollNav = (d: number) => {
    const el = navScrollRef.current
    if (!el) return
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth)
    const step = Math.max(180, Math.round(el.clientWidth * 0.45))
    let next = el.scrollLeft + d * step
    if (d > 0) next = Math.min(next, maxScroll)
    else next = Math.max(next, 0)
    el.scrollTo({ left: next, behavior: "smooth" })
    window.setTimeout(updateArrows, 400)
  }

  const active = activeIndex !== null ? megaCategories[activeIndex] : null
  const parentHandleForOrigins =
    activeIndex !== null
      ? megaCategories[activeIndex]?.handle?.trim() ?? ""
      : ""

  useEffect(() => {
    if (activeIndex === null) {
      setOriginPlaces([])
      return
    }
    if (!parentHandleForOrigins) {
      setOriginPlaces([])
      return
    }
    let cancelled = false
    setOriginLoading(true)
    const url = new URL(
      "/api/tramelle/mega-random-sellers",
      window.location.origin
    )
    url.searchParams.set("parent_category_handle", parentHandleForOrigins)
    fetch(url.toString(), { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status))
        return res.json() as Promise<{ origins?: MegaOriginPlace[] }>
      })
      .then((data: unknown) => {
        if (!cancelled)
          setOriginPlaces(parseMegaOriginsPayload(data, locale))
      })
      .catch(() => {
        if (!cancelled) setOriginPlaces([])
      })
      .finally(() => {
        if (!cancelled) setOriginLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [activeIndex, parentHandleForOrigins, locale])

  return (
    <div
      className={cn(
        "hidden font-tramelle antialiased md:block",
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

      <div className="sticky top-0 z-[65]">
        <HeaderUtilityBar
          isLoggedIn={isLoggedIn}
          userEmail={userEmail}
          locale={locale}
          presentation="gourmet"
          accountRole={accountRole}
        />
        <header
        className={cn(
          "border-b border-gray-100/90 bg-white transition-shadow duration-200 ease-out motion-reduce:transition-none",
          scrolled && "shadow-[0_1px_0_rgba(0,0,0,0.06),0_4px_14px_rgba(0,0,0,0.04)]"
        )}
      >
        <div className="flex h-16 min-h-[4rem] items-center justify-between gap-3 px-4 sm:gap-5 sm:px-6 lg:px-7">
          <LocalizedClientLink
            href="/"
            locale={locale}
            onClick={closeMenu}
            className="logo flex-shrink-0 rounded-sm outline-none ring-offset-2 transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-gray-900/25"
            data-testid="header-logo-link-desktop"
            aria-label={tHead("logoAlt")}
          >
            <Image
              src="/tramelle.svg"
              width={280}
              height={56}
              alt={tHead("logoAlt")}
              className="h-auto max-h-[52px] w-auto max-w-[min(280px,42vw)] sm:max-h-[56px]"
              priority
              unoptimized
            />
          </LocalizedClientLink>

          <div className="mx-1.5 hidden min-h-0 min-w-0 flex-1 basis-0 items-center rounded-full border border-[#E8E4DE] bg-white px-[18px] py-[10px] shadow-none transition-[border-color,box-shadow] focus-within:border-[#0F0E0B] focus-within:shadow-[0_2px_8px_rgba(15,14,11,0.12)] sm:mx-2 md:mx-3 md:flex">
            <Suspense
              fallback={
                <div className="h-10 w-full rounded-full bg-gray-100" aria-hidden />
              }
            >
              <HeaderSearch
                variant="gourmet"
                className="w-full max-w-none"
                locale={locale}
                currency_code={currencyCode}
                placeholder={tGourmet("searchPlaceholder")}
              />
            </Suspense>
          </div>

          <div className="flex min-w-0 flex-shrink-0 items-center gap-3 sm:gap-4 lg:gap-5 [&>*]:shrink-0">
            <WishlistNavLink
              locale={locale}
              isLoggedIn={isLoggedIn}
              onNavigate={closeMenu}
              heartSize={22}
              badgeClassName="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center p-0 text-[10px]"
              className="relative hidden h-[22px] w-[22px] cursor-pointer items-center justify-center text-[#8A8580] transition-colors hover:text-[#0F0E0B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20 sm:inline-flex"
            />
            <UserDropdown
              isLoggedIn={isLoggedIn}
              compactEmail={userEmail}
              locale={locale}
              onNavigate={closeMenu}
              presentation="gourmet"
              accountRole={accountRole}
            />
            <LanguageSwitcher
              locale={locale}
              options={languageOptions}
              onBeforeSwitch={closeMenu}
            />
            <CartDropdown variant="gourmet" onNavigate={closeMenu} />
          </div>
        </div>
      </header>
      </div>

      <div
        className="sticky z-[60] overflow-visible border-b border-gray-100 bg-white"
        style={{ top: STICKY_CATEGORY_TOP }}
      >
        <div className="relative overflow-visible">
          <div className="relative z-[70] flex h-14 min-h-[3.5rem] items-stretch bg-white">
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
              className="tramelle-gourmet-nav-scroll flex flex-1 items-center gap-1 overflow-x-auto px-0.5 scroll-px-2"
              aria-label={tGourmet("categoryNavAria")}
            >
              {megaCategories.map((cat, i) => (
                <button
                  key={cat.id}
                  type="button"
                  aria-expanded={activeIndex === i}
                  aria-haspopup="true"
                  aria-controls={
                    activeIndex === i ? "gourmet-mega-panel" : undefined
                  }
                  aria-label={cat.name}
                  className={cn(
                    "flex min-h-[2.5rem] flex-shrink-0 items-center rounded-xl border-0 bg-transparent px-3 transition-colors duration-200 sm:px-4",
                    activeIndex === i
                      ? "bg-gray-100 text-gray-900 shadow-sm ring-1 ring-gray-200/80"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-800 hover:ring-1 hover:ring-gray-200/60"
                  )}
                  onClick={() => {
                    toggleMenu(i)
                    requestAnimationFrame(() => scrollTabIntoView(i))
                  }}
                >
                  <span className="whitespace-nowrap text-[0.75rem] font-semibold tracking-tight">
                    {cat.name}
                  </span>
                </button>
              ))}
              {/* Spazio a fine riga: ultima categoria può scrollare al centro senza restare “incollata” alla freccia */}
              <span aria-hidden className="inline-block w-3 shrink-0 sm:w-4" />
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
              id="gourmet-mega-panel"
              className="absolute left-0 right-0 top-full z-[100] rounded-b-2xl border border-t-0 border-gray-100/80 bg-white font-tramelle shadow-[0_12px_40px_-12px_rgba(0,0,0,0.12)] ring-1 ring-black/[0.04]"
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

                <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(11rem,1fr)] divide-x divide-gray-100/90 px-2 py-4 sm:py-5">
                  <div className="flex min-w-0 flex-col overflow-hidden px-4 sm:px-5">
                    <div
                      className="mb-3 flex flex-shrink-0 items-center justify-between"
                      style={{ height: "1.75rem" }}
                    >
                      <span className="text-xs font-bold normal-case tracking-normal text-gray-900">
                        {tGourmet("categoriesHeading")}
                      </span>
                      <LocalizedClientLink
                        href={categoryPublicHref(active.handle)}
                        locale={locale}
                        onClick={closeMenu}
                        className="shrink-0 rounded-sm text-xs font-semibold normal-case tracking-normal text-gray-400 transition-colors hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20"
                      >
                        {tGourmet("seeAll")} →
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
                          {tGourmet("seeAll")}
                        </LocalizedClientLink>
                      )}
                    </div>
                  </div>

                  <div className="flex min-w-0 flex-col overflow-hidden px-4 sm:px-5">
                    <div
                      className="mb-3 flex flex-shrink-0 items-center"
                      style={{ height: "1.75rem" }}
                    >
                      <span className="text-xs font-bold normal-case tracking-normal text-gray-900">
                        {tGourmet("characteristicsHeading")}
                      </span>
                    </div>
                    <div className="max-h-[min(22rem,55vh)] min-h-[6rem] overflow-y-auto rounded-lg border border-dashed border-gray-200/90 bg-gray-50/40 px-3 py-4">
                      <p className="text-center text-[13px] font-medium leading-snug text-gray-400">
                        {tGourmet("characteristicsPlaceholder")}
                      </p>
                    </div>
                  </div>

                  <div className="flex min-h-0 min-w-0 flex-col overflow-hidden px-4 sm:px-5">
                    <div
                      className="mb-3 flex flex-shrink-0 items-center justify-between"
                      style={{ height: "1.75rem" }}
                    >
                      <span className="text-xs font-bold normal-case tracking-normal text-gray-900">
                        {tGourmet("originHeading")}
                      </span>
                      <LocalizedClientLink
                        href="/sellers"
                        locale={locale}
                        onClick={closeMenu}
                        className="shrink-0 rounded-sm text-xs font-semibold normal-case tracking-normal text-gray-400 transition-colors hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20"
                      >
                        {tGourmet("seeAllProducers")} →
                      </LocalizedClientLink>
                    </div>
                    <div className="min-h-[10rem] max-h-[min(24rem,60vh)] overflow-y-auto overflow-x-hidden pr-1">
                      {originLoading ? (
                        <p className="px-1 py-3 text-sm text-gray-600">
                          {tGourmet("originLoading")}
                        </p>
                      ) : originsByNation.length === 0 ? (
                        <p className="px-1 py-3 text-sm text-gray-600">
                          {tGourmet("originEmpty")}
                        </p>
                      ) : (
                        <div className="flex flex-col gap-6">
                          {originsByNation.map((block, nationIdx) => (
                            <section
                              key={block.nation.toLowerCase()}
                              className="flex w-full min-w-0 flex-col"
                              aria-labelledby={`gourmet-origin-nation-${nationIdx}`}
                            >
                              <h3
                                id={`gourmet-origin-nation-${nationIdx}`}
                                className="w-full border-b border-gray-200 pb-2 text-left text-sm font-bold leading-tight text-gray-900 normal-case"
                              >
                                {formatOriginLabel(block.nation)}
                              </h3>
                              {block.regions.length > 0 ? (
                                <ul className="mt-2.5 grid w-full min-w-0 list-none grid-cols-2 gap-x-3 gap-y-1.5 p-0">
                                  {block.regions.map((r) => (
                                    <li
                                      key={`${block.nation}-${r.toLowerCase()}`}
                                      className="min-w-0 text-left text-xs font-medium leading-snug text-gray-700 normal-case"
                                    >
                                      {formatOriginLabel(r)}
                                    </li>
                                  ))}
                                </ul>
                              ) : null}
                            </section>
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
