"use client"

import LocalizedClientLink from "@/components/molecules/LocalizedLink/LocalizedLink"
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { useTranslations } from "next-intl"
import { useParams } from "next/navigation"

type B2BPricingModalContextValue = {
  open: () => void
  close: () => void
}

const B2BPricingModalContext = createContext<B2BPricingModalContextValue | null>(
  null
)

export function useB2BPricingModal() {
  const ctx = useContext(B2BPricingModalContext)
  if (!ctx) {
    throw new Error("useB2BPricingModal must be used within B2BPricingModalProvider")
  }
  return ctx
}

export function B2BPricingModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const t = useTranslations("Product")
  const params = useParams()
  const locale =
    typeof params?.locale === "string"
      ? params.locale
      : process.env.NEXT_PUBLIC_DEFAULT_REGION || "it"

  const close = useCallback(() => setOpen(false), [])
  const openModal = useCallback(() => setOpen(true), [])

  const value = useMemo(
    () => ({ open: openModal, close }),
    [openModal, close]
  )

  return (
    <B2BPricingModalContext.Provider value={value}>
      {children}
      {open ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-[rgba(15,14,11,0.3)] px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="b2b-pricing-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) close()
          }}
        >
          <div
            className="w-[90%] max-w-[360px] rounded-3xl border border-[#E8E4DE] bg-white p-8 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-3 text-[9px] font-normal uppercase tracking-[0.2em] text-[#8A8580]">
              {t("b2bModalEyebrow")}
            </p>
            <h3
              id="b2b-pricing-modal-title"
              className="mb-2 font-tramelle-display text-[26px] font-light leading-tight text-[#0F0E0B]"
            >
              {t("b2bModalTitle")}
            </h3>
            <p className="mb-[22px] text-[13px] leading-[1.7] text-[#8A8580]">
              {t("b2bModalBody")}
            </p>
            <LocalizedClientLink
              href="/registrati"
              locale={locale}
              onClick={close}
              className="mb-2 flex w-full items-center justify-center rounded-full bg-[#0F0E0B] px-4 py-[13px] text-center text-[10.5px] font-medium uppercase tracking-[0.13em] text-white"
            >
              {t("b2bModalRegisterCta")}
            </LocalizedClientLink>
            <LocalizedClientLink
              href="/login"
              locale={locale}
              onClick={close}
              className="flex w-full items-center justify-center rounded-full bg-[#F5F3F0] px-4 py-[13px] text-center text-[10.5px] font-medium uppercase tracking-[0.13em] text-[#8A8580]"
            >
              {t("b2bModalLoginCta")}
            </LocalizedClientLink>
          </div>
        </div>
      ) : null}
    </B2BPricingModalContext.Provider>
  )
}
