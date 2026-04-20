export const INFO_PAGE_SLUGS = [
  "how-it-works",
  "delivery",
  "returns",
  "corporate-gifting",
  "gift-vouchers",
  "help-centre",
  "help-with-order",
  "my-subscriptions",
  "loyalty-faq",
  "contact",
  "why-sell-with-us",
  "apply-to-sell",
  "why-tramelle",
  "our-values",
  "who-we-are",
  "reviews",
  "terms",
  "privacy",
  "press",
] as const

export type InfoPageSlug = (typeof INFO_PAGE_SLUGS)[number]

export function isInfoPageSlug(s: string): s is InfoPageSlug {
  return (INFO_PAGE_SLUGS as readonly string[]).includes(s)
}
