"use client"

import { sdk } from "@/lib/config"
import { useParams } from "next/navigation"
import { useCallback, useState } from "react"

const STORAGE_LOCALE = "tramelle_oauth_locale"
const STORAGE_RETURN = "tramelle_oauth_return"

function googleSvg() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      className="h-5 w-5 shrink-0"
      aria-hidden
    >
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  )
}

type Props = {
  /** Path dopo login, es. `/it/user` (deve iniziare con `/` e includere locale). */
  returnPath: string
  label?: string
}

export function GoogleContinueButton({
  returnPath,
  label = "Continua con Google",
}: Props) {
  const params = useParams()
  const locale =
    typeof params?.locale === "string" ? params.locale : "it"
  const [pending, setPending] = useState(false)

  const startGoogle = useCallback(async () => {
    setPending(true)
    try {
      if (typeof window !== "undefined") {
        sessionStorage.setItem(STORAGE_LOCALE, locale)
        sessionStorage.setItem(STORAGE_RETURN, returnPath)
      }
      const origin =
        process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") ||
        (typeof window !== "undefined" ? window.location.origin : "")
      const callback_url = `${origin}/auth/google/callback`

      const result = await sdk.auth.login("customer", "google", {
        callback_url,
      })

      if (result && typeof result === "object" && "location" in result) {
        const loc = (result as { location?: string }).location
        if (loc) {
          window.location.href = loc
          return
        }
      }

      if (typeof result === "string" && result.length > 0) {
        window.location.href = returnPath.startsWith("/")
          ? returnPath
          : `/${locale}${returnPath}`
        return
      }

      throw new Error("Risposta Google non valida")
    } catch {
      setPending(false)
      window.location.href = `/${locale}/login?google_error=failed`
    }
  }, [locale, returnPath])

  return (
    <button
      type="button"
      onClick={() => void startGoogle()}
      disabled={pending}
      className="label-md flex w-full items-center justify-center gap-3 border border-black bg-white px-4 py-3 uppercase tracking-normal text-primary disabled:opacity-60"
      data-testid="google-continue-button"
    >
      {googleSvg()}
      {pending ? "Reindirizzamento…" : label}
    </button>
  )
}

export function GoogleOAuthDivider() {
  return (
    <div
      className="flex items-center gap-3 py-2"
      role="separator"
      aria-label="oppure"
    >
      <span className="h-px flex-1 bg-primary/20" />
      <span className="text-sm uppercase text-secondary">oppure</span>
      <span className="h-px flex-1 bg-primary/20" />
    </div>
  )
}
