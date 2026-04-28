import { fetchWithTimeout } from "@/lib/helpers/fetch-with-timeout"
import { MEDUSA_BACKEND_URL } from "@/lib/medusa-backend-url"

/**
 * Collega la sessione OAuth Google corrente a un customer già registrato con email/password
 * (stessa email verificata da Google). Backend: `POST /store/tramelle/google-link-existing`.
 */
export async function linkGoogleSessionToExistingCustomer(
  accessToken: string
): Promise<{ ok: boolean; status: number; message?: string }> {
  const token = accessToken?.trim()
  const pk = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY?.trim()
  if (!token || !pk) {
    return { ok: false, status: 0, message: "Missing token or publishable key" }
  }

  const base = MEDUSA_BACKEND_URL.replace(/\/$/, "")
  const res = await fetchWithTimeout(`${base}/store/tramelle/google-link-existing`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "x-publishable-api-key": pk,
    },
  })

  if (res.ok) {
    return { ok: true, status: res.status }
  }

  let message = res.statusText || "Link failed"
  try {
    const body = (await res.json()) as { message?: string }
    if (body?.message) message = body.message
  } catch {
    /* ignore */
  }
  return { ok: false, status: res.status, message }
}

export function shouldAttemptGoogleEmailpassLink(message: string): boolean {
  const m = message.toLowerCase()
  return (
    m.includes("already has an account") ||
    m.includes("customer with this email already") ||
    m.includes("duplicate_error") ||
    (m.includes("already") && m.includes("account"))
  )
}
