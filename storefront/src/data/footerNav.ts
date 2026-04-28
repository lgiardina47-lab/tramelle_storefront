type InternalFooterLink = { kind: "internal"; href: string; labelKey: string }
type ExternalFooterLink = { kind: "external"; href: string; labelKey: string }

export type FooterNavLink = InternalFooterLink | ExternalFooterLink

export type FooterNavSection = {
  id: "buying" | "help" | "selling" | "about"
  links: FooterNavLink[]
}

export const FOOTER_NAV_SECTIONS: FooterNavSection[] = [
  {
    id: "buying",
    links: [
      { kind: "internal", href: "/sellers", labelKey: "producers" },
      { kind: "internal", href: "/info/how-it-works", labelKey: "howItWorks" },
      { kind: "internal", href: "/info/delivery", labelKey: "delivery" },
      { kind: "internal", href: "/info/returns", labelKey: "returns" },
      {
        kind: "internal",
        href: "/info/corporate-gifting",
        labelKey: "corporateGifting",
      },
      { kind: "internal", href: "/info/gift-vouchers", labelKey: "giftVouchers" },
    ],
  },
  {
    id: "help",
    links: [
      { kind: "internal", href: "/info/help-centre", labelKey: "helpCentre" },
      { kind: "internal", href: "/user/orders", labelKey: "trackMyOrder" },
      {
        kind: "internal",
        href: "/info/help-with-order",
        labelKey: "helpWithOrder",
      },
      { kind: "internal", href: "/user", labelKey: "myAccount" },
      {
        kind: "internal",
        href: "/info/my-subscriptions",
        labelKey: "mySubscriptions",
      },
      { kind: "internal", href: "/info/loyalty-faq", labelKey: "loyaltyFaq" },
      { kind: "internal", href: "/info/contact", labelKey: "contactUs" },
    ],
  },
  {
    id: "selling",
    links: [
      {
        kind: "internal",
        href: "/info/why-sell-with-us",
        labelKey: "whySellWithUs",
      },
      { kind: "internal", href: "/info/apply-to-sell", labelKey: "applyToSell" },
    ],
  },
  {
    id: "about",
    links: [
      { kind: "internal", href: "/info/why-tramelle", labelKey: "whyTramelle" },
      { kind: "internal", href: "/info/our-values", labelKey: "ourValues" },
      { kind: "internal", href: "/info/who-we-are", labelKey: "whoWeAre" },
      { kind: "internal", href: "/info/reviews", labelKey: "customerReviews" },
      { kind: "internal", href: "/blog", labelKey: "blog" },
      { kind: "internal", href: "/terms", labelKey: "terms" },
      { kind: "internal", href: "/privacy", labelKey: "privacy" },
      { kind: "internal", href: "/info/press", labelKey: "press" },
    ],
  },
]

export type FooterSocialKey =
  | "facebook"
  | "instagram"
  | "twitter"
  | "linkedin"

export const FOOTER_SOCIAL: { key: FooterSocialKey; envVar: string }[] = [
  { key: "facebook", envVar: "NEXT_PUBLIC_SOCIAL_FACEBOOK_URL" },
  { key: "instagram", envVar: "NEXT_PUBLIC_SOCIAL_INSTAGRAM_URL" },
  { key: "twitter", envVar: "NEXT_PUBLIC_SOCIAL_TWITTER_URL" },
  { key: "linkedin", envVar: "NEXT_PUBLIC_SOCIAL_LINKEDIN_URL" },
]

export function readSocialUrl(envVar: string): string {
  const v = process.env[envVar]?.trim()
  return v && v.length > 0 ? v : "#"
}
