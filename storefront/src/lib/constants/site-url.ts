/** Canonical / Open Graph / JSON-LD origin when `NEXT_PUBLIC_BASE_URL` is unset. */
export const DEFAULT_PUBLIC_SITE_ORIGIN = "https://tramelle.com"

/** Trimmed origin without trailing slash. Env wins; otherwise {@link DEFAULT_PUBLIC_SITE_ORIGIN}. */
export function publicSiteOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_BASE_URL?.trim()
  if (raw) return raw.replace(/\/$/, "")
  return DEFAULT_PUBLIC_SITE_ORIGIN
}
