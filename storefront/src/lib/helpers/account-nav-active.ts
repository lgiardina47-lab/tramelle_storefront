/**
 * `usePathname()` in locale App Router = `/it/user/orders`; link href = `/user/orders`.
 */
export function isAccountPathActive(
  fullPath: string,
  href: string,
  locale: string
): boolean {
  if (!fullPath || !locale) {
    return false
  }
  return fullPath === `/${locale}${href}`
}
