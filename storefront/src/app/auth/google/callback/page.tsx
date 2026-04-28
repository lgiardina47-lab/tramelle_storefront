"use client"

import { sdk } from "@/lib/config"
import {
  inferGoogleOAuthErrorCodeFromMessage,
  messageForGoogleOAuthErrorCode,
} from "@/lib/auth/google-oauth-messages"
import {
  linkGoogleSessionToExistingCustomer,
  shouldAttemptGoogleEmailpassLink,
} from "@/lib/auth/google-link-existing-customer"
import { persistCustomerSessionFromOAuth } from "@/lib/data/customer"
import { jwtDecode } from "jwt-decode"
import { useEffect, useState } from "react"

const STORAGE_LOCALE = "tramelle_oauth_locale"
const STORAGE_RETURN = "tramelle_oauth_return"

type JwtShape = {
  actor_id?: string | null
  user_metadata?: {
    email?: string
    given_name?: string
    family_name?: string
    name?: string
  }
}

function needsNewCustomer(payload: JwtShape): boolean {
  const a = payload.actor_id
  if (a === undefined || a === null) return true
  if (typeof a === "string" && a.trim() === "") return true
  return false
}

export default function GoogleOAuthCallbackPage() {
  const [hint, setHint] = useState("Accesso in corso…")

  useEffect(() => {
    const run = async () => {
      const locale =
        sessionStorage.getItem(STORAGE_LOCALE) || "it"
      const returnPath =
        sessionStorage.getItem(STORAGE_RETURN) || `/${locale}/user`

      const redirectLogin = (code: string) => {
        const msg = messageForGoogleOAuthErrorCode(code)
        if (msg) setHint(msg)
        const u = new URL(`/${locale}/login`, window.location.origin)
        u.searchParams.set("google_error", code)
        window.location.replace(u.toString())
      }

      try {
        const params = new URLSearchParams(window.location.search)
        const gErr = params.get("error")
        if (gErr === "access_denied") {
          redirectLogin("denied")
          return
        }
        if (gErr) {
          redirectLogin("failed")
          return
        }

        if (!params.get("code")) {
          redirectLogin("failed")
          return
        }

        const query = Object.fromEntries(params.entries())
        let token: string
        try {
          token = await sdk.auth.callback("customer", "google", query)
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e)
          redirectLogin(inferGoogleOAuthErrorCodeFromMessage(msg))
          return
        }

        let decoded: JwtShape
        try {
          decoded = jwtDecode<JwtShape>(token)
        } catch {
          redirectLogin("failed")
          return
        }

        if (needsNewCustomer(decoded)) {
          const email = decoded.user_metadata?.email?.trim()
          if (!email) {
            redirectLogin("no_email")
            return
          }
          const given = decoded.user_metadata?.given_name?.trim()
          const family = decoded.user_metadata?.family_name?.trim()
          const fullName = decoded.user_metadata?.name?.trim()
          const first_name =
            given ||
            (fullName ? fullName.split(/\s+/)[0] : "") ||
            email.split("@")[0] ||
            "—"
          const last_name =
            family ||
            (fullName
              ? fullName.split(/\s+/).slice(1).join(" ") || "—"
              : "—")

          try {
            await sdk.store.customer.create({
              email,
              first_name: first_name.slice(0, 100),
              last_name: last_name.slice(0, 100),
            })
          } catch (ce: unknown) {
            const msg = ce instanceof Error ? ce.message : String(ce)
            if (shouldAttemptGoogleEmailpassLink(msg)) {
              const link = await linkGoogleSessionToExistingCustomer(token)
              if (!link.ok) {
                redirectLogin(
                  inferGoogleOAuthErrorCodeFromMessage(link.message || msg)
                )
                return
              }
            } else {
              redirectLogin(inferGoogleOAuthErrorCodeFromMessage(msg))
              return
            }
          }

          try {
            token = await sdk.auth.refresh()
          } catch {
            redirectLogin("failed")
            return
          }
        }

        const persisted = await persistCustomerSessionFromOAuth(token)
        if (!persisted.success) {
          redirectLogin(
            inferGoogleOAuthErrorCodeFromMessage(persisted.message || "")
          )
          return
        }

        sessionStorage.removeItem(STORAGE_LOCALE)
        sessionStorage.removeItem(STORAGE_RETURN)

        const dest = returnPath.startsWith("/") ? returnPath : `/${locale}/user`
        window.location.replace(dest)
      } catch {
        const loc = sessionStorage.getItem(STORAGE_LOCALE) || "it"
        window.location.replace(`/${loc}/login?google_error=generic`)
      }
    }

    void run()
  }, [])

  return (
    <main className="container flex min-h-[40vh] flex-col items-center justify-center py-12">
      <p className="label-md uppercase text-primary">{hint}</p>
    </main>
  )
}
