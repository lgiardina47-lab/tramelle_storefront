"use client"

import { usePathname, useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import type { LanguageSwitcherOption } from "@/lib/helpers/language-switcher-options"
import { TRAMELLE_PREFERRED_COUNTRY_COOKIE } from "@/lib/constants/locale-preference"
import { cn } from "@/lib/utils"

type Props = {
  locale: string
  options: LanguageSwitcherOption[]
  className?: string
  /** Chiamato prima del cambio paese (es. chiudere megamenu). */
  onBeforeSwitch?: () => void
  /**
   * `menu`: trigger + dropdown (click), stile Faire.
   * `inline`: lista in riquadro (drawer mobile).
   */
  presentation?: "menu" | "inline"
}

const triggerCls =
  "font-tramelle flex cursor-pointer items-center gap-[5px] border-none bg-transparent py-1 text-left text-xs font-medium text-[#8A8580] transition-colors hover:text-[#0F0E0B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F0E0B]/20"

const panelCls =
  "absolute right-0 top-full z-[90] mt-1 min-w-[11rem] overflow-hidden rounded-[12px] border border-[#E8E4DE] bg-white py-2 shadow-[0_8px_24px_rgba(15,14,11,0.08)]"

const itemCls =
  "w-full px-4 py-2 text-left text-xs font-normal normal-case tracking-normal text-[#8A8580] transition-colors hover:bg-[#F7F6F3] hover:text-[#0F0E0B]"

const itemActiveCls =
  "font-medium normal-case tracking-normal text-[#0F0E0B]"

function LanguageGlobeIcon() {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      className="shrink-0"
      aria-hidden
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="#8A8580"
        strokeWidth={1.5}
      />
      <path
        d="M2 12h20"
        stroke="#8A8580"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <path
        d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"
        stroke="#8A8580"
        strokeWidth={1.5}
      />
    </svg>
  )
}

function LanguageChevronIcon() {
  return (
    <svg
      width={8}
      height={8}
      viewBox="0 0 10 6"
      fill="none"
      className="shrink-0"
      aria-hidden
    >
      <path
        d="M1 1l4 4 4-4"
        stroke="#B5B0A8"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </svg>
  )
}

export function LanguageSwitcher({
  locale,
  options,
  className,
  onBeforeSwitch,
  presentation = "menu",
}: Props) {
  const t = useTranslations("Nav")
  const pathname = usePathname() || "/"
  const router = useRouter()
  const current = locale.toLowerCase()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const pathWithoutCountry = useMemo(() => {
    const parts = pathname.split("/").filter(Boolean)
    if (parts.length === 0) {
      return ""
    }
    if (/^[a-z]{2}$/i.test(parts[0] || "")) {
      return parts.slice(1).join("/")
    }
    return parts.join("/")
  }, [pathname])

  const setPreferenceCookie = useCallback((country: string) => {
    document.cookie = `${TRAMELLE_PREFERRED_COUNTRY_COOKIE}=${country};path=/;max-age=31536000;samesite=lax`
  }, [])

  const switchTo = useCallback(
    (country: string) => {
      const c = country.toLowerCase()
      if (c === current) {
        return
      }
      onBeforeSwitch?.()
      setPreferenceCookie(c)
      const suffix = pathWithoutCountry ? `/${pathWithoutCountry}` : ""
      router.push(`/${c}${suffix}`)
    },
    [current, onBeforeSwitch, pathWithoutCountry, router, setPreferenceCookie]
  )

  useEffect(() => {
    if (!open || presentation !== "menu") return
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [open, presentation])

  useEffect(() => {
    if (!open || presentation !== "menu") return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, presentation])

  if (!options.length) {
    return null
  }

  const currentOption = options.find((o) => o.country.toLowerCase() === current)
  const currentLabel =
    currentOption?.displayLabel ?? currentOption?.label ?? locale.toUpperCase()

  const listItems = options.map((opt) => {
    const active = opt.country.toLowerCase() === current
    const label = opt.displayLabel ?? opt.label
    return (
      <li key={opt.country}>
        <button
          type="button"
          onClick={() => {
            switchTo(opt.country)
            setOpen(false)
          }}
          className={cn(itemCls, active && itemActiveCls)}
          aria-current={active ? "true" : undefined}
        >
          {label}
        </button>
      </li>
    )
  })

  const list = <ul className="m-0 list-none p-0">{listItems}</ul>

  if (presentation === "inline") {
    return (
      <div
        className={cn(
          "overflow-hidden rounded-[12px] border border-[#E8E4DE] bg-white py-2 shadow-[0_8px_24px_rgba(15,14,11,0.08)]",
          className
        )}
        role="navigation"
        aria-label={t("languageSwitcherAria")}
      >
        {list}
      </div>
    )
  }

  return (
    <div
      ref={rootRef}
      className={cn("relative shrink-0", className)}
      role="navigation"
      aria-label={t("languageSwitcherAria")}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={triggerCls}
      >
        <LanguageGlobeIcon />
        <span className="min-w-0 truncate normal-case tracking-normal">
          {currentLabel}
        </span>
        <LanguageChevronIcon />
      </button>
      {open ? <div className={panelCls}>{list}</div> : null}
    </div>
  )
}
