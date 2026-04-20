import { publicSiteOrigin } from "./site-url"

/**
 * Domini pubblici per cui la home è la splash “Coming Soon” (finché non si imposta
 * `NEXT_PUBLIC_COMING_SOON_HOME=false`). Un solo elenco: aggiungere qui eventuali alias
 * (es. altro TLD) invece di stringhe sparse nel codice.
 */
export const TRAMELLE_COMING_SOON_CANONICAL_HOSTS = [
  "tramelle.com",
  "www.tramelle.com",
] as const

function hostWithoutPort(hostHeader: string): string {
  const h = hostHeader.trim().toLowerCase()
  if (h.startsWith("[")) {
    const end = h.indexOf("]")
    if (end !== -1) return h.slice(1, end)
  }
  return h.split(":")[0] ?? h
}

function isLocalLoopbackOrBindHost(hostHeader: string | null | undefined): boolean {
  if (!hostHeader?.trim()) return false
  const h = hostWithoutPort(hostHeader)
  return (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h === "::1" ||
    h === "0.0.0.0"
  )
}

function isIPv4LiteralHost(hostname: string): boolean {
  const h = hostWithoutPort(hostname)
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(h)
}

function isPrivateIPv4Host(hostname: string): boolean {
  const h = hostWithoutPort(hostname)
  if (!isIPv4LiteralHost(hostname)) return false
  if (h.startsWith("10.")) return true
  if (h.startsWith("192.168.")) return true
  const m = /^172\.(\d+)\./.exec(h)
  if (m) {
    const n = Number(m[1])
    return n >= 16 && n <= 31
  }
  return false
}

function originNeedsCanonicalPublicHost(hostname: string | null | undefined): boolean {
  if (!hostname?.trim()) return true
  if (isLocalLoopbackOrBindHost(hostname)) return true
  if (isPrivateIPv4Host(hostname)) return true
  if (isIPv4LiteralHost(hostname)) return true
  return false
}

function firstCsvHeader(value: string | null | undefined): string | undefined {
  const v = value?.trim()
  if (!v) return undefined
  const first = v.split(",")[0]?.trim()
  return first || undefined
}

function parseForwardedHost(
  forwarded: string | null | undefined
): string | undefined {
  if (!forwarded?.trim()) return undefined
  for (const part of forwarded.split(",")) {
    const m = /(?:^|;)\s*host=([^;]+)/i.exec(part.trim())
    if (m) {
      const v = m[1].trim().replace(/^"([^"]*)"$/, "$1")
      if (v) return hostWithoutPort(v)
    }
  }
  return undefined
}

function productionComingSoonNotDisabled(): boolean {
  return process.env.NEXT_PUBLIC_COMING_SOON_HOME !== "false"
}

function isTramelleMarketingHost(hostname: string): boolean {
  const h = hostWithoutPort(hostname)
  return (TRAMELLE_COMING_SOON_CANONICAL_HOSTS as readonly string[]).includes(h)
}

/**
 * Host pubblico usato per la decisione splash: proxy, Cloudflare, IP del box, ecc.
 */
export function effectiveRequestHostFromHeaders(
  getHeader: (name: string) => string | null | undefined
): string | null | undefined {
  const rawHost = getHeader("host")

  if (!originNeedsCanonicalPublicHost(rawHost)) {
    return rawHost
  }

  const fromProxy =
    firstCsvHeader(getHeader("x-forwarded-host")) ??
    firstCsvHeader(getHeader("cf-connecting-host")) ??
    firstCsvHeader(getHeader("x-original-host")) ??
    parseForwardedHost(getHeader("forwarded"))

  if (fromProxy) return fromProxy

  if (
    process.env.NODE_ENV === "production" &&
    productionComingSoonNotDisabled()
  ) {
    try {
      const pub = new URL(publicSiteOrigin()).hostname.toLowerCase()
      if (pub) return pub
    } catch {
      /* ignore */
    }
  }

  return rawHost
}

/**
 * In produzione (`NEXT_PUBLIC_COMING_SOON_HOME=false`) evita `headers()` su home/layout
 * per non forzare work extra e consentire caching/streaming più aggressivo.
 */
export function comingSoonHomeDisabledByEnv(): boolean {
  return process.env.NEXT_PUBLIC_COMING_SOON_HOME === "false"
}

export function shouldUseProductionComingSoonHome(
  hostHeader: string | null | undefined
): boolean {
  if (process.env.NEXT_PUBLIC_COMING_SOON_HOME === "false") return false

  const comingSoonOn =
    process.env.NEXT_PUBLIC_COMING_SOON_HOME === "true" ||
    process.env.NEXT_PUBLIC_COMING_SOON_HOME === "1"

  const devPreview =
    process.env.NEXT_PUBLIC_COMING_SOON_DEV_PREVIEW === "true" ||
    process.env.NEXT_PUBLIC_COMING_SOON_DEV_PREVIEW === "1"

  if (process.env.NODE_ENV !== "production") {
    const hostEarly = hostHeader?.trim() ? hostWithoutPort(hostHeader) : ""
    if (isTramelleMarketingHost(hostEarly) && productionComingSoonNotDisabled()) {
      return true
    }
    if (devPreview && comingSoonOn) {
      return true
    }
    return false
  }

  if (!hostHeader?.trim()) return false

  const host = hostWithoutPort(hostHeader)
  if (!host) return false

  if (host === "localhost" || host === "127.0.0.1" || host === "::1") {
    return false
  }

  if (comingSoonOn) return true

  return isTramelleMarketingHost(host)
}

/**
 * **Unico punto d’ingresso** per layout e home: risolve sempre host effettivo + regole env.
 * Non chiamare `shouldUseProductionComingSoonHome` / `effectiveRequestHostFromHeaders` direttamente
 * da route o middleware (il build fallisce — vedi `scripts/verify-coming-soon-invariants.cjs`).
 */
export function requestShowsComingSoonHome(
  getHeader: (name: string) => string | null | undefined
): boolean {
  return shouldUseProductionComingSoonHome(
    effectiveRequestHostFromHeaders(getHeader)
  )
}
