import {
  format,
  formatDistanceToNow,
  isValid,
  parseISO,
} from "date-fns"
import type { FormatDistanceToNowOptions } from "date-fns"

/** Normalizza input API (stringa ISO, timestamp, Date) in un `Date` valido. */
export function toValidDate(value: unknown): Date | null {
  if (value == null || value === "") return null
  if (value instanceof Date) return isValid(value) ? value : null
  if (typeof value === "number" && Number.isFinite(value)) {
    const d = new Date(value)
    return isValid(d) ? d : null
  }
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) return null
    const iso = parseISO(trimmed)
    if (isValid(iso)) return iso
    const loose = new Date(trimmed)
    return isValid(loose) ? loose : null
  }
  return null
}

/**
 * Come `format` di date-fns, ma non lancia su date mancanti o non valide
 * (evita crash del root error boundary in produzione).
 */
export function formatDateSafe(
  value: unknown,
  dateFormat: string,
  fallback = "—"
): string {
  const d = toValidDate(value)
  if (!d) return fallback
  try {
    return format(d, dateFormat)
  } catch {
    return fallback
  }
}

/**
 * Come `formatDistanceToNow`, con fallback su input invalido.
 */
export function formatDistanceToNowSafe(
  value: unknown,
  options?: FormatDistanceToNowOptions,
  fallback = "—"
): string {
  const d = toValidDate(value)
  if (!d) return fallback
  try {
    return formatDistanceToNow(d, options)
  } catch {
    return fallback
  }
}
