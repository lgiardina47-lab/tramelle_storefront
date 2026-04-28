import LocalizedClientLink from "@/components/molecules/LocalizedLink/LocalizedLink"
import {
  FOOTER_NAV_SECTIONS,
  FOOTER_SOCIAL,
  readSocialUrl,
} from "@/data/footerNav"
import { getTranslations } from "next-intl/server"

export async function Footer() {
  const t = await getTranslations("Footer")
  const year = new Date().getFullYear()

  return (
    <footer className="bg-primary container" data-testid="footer">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {FOOTER_NAV_SECTIONS.map((section) => (
          <div
            key={section.id}
            className="p-6 border rounded-sm"
            data-testid={`footer-section-${section.id}`}
          >
            <h2 className="heading-sm text-primary mb-3 uppercase">
              {t(`sections.${section.id}`)}
            </h2>
            <nav
              className="space-y-3"
              aria-label={t(`aria.${section.id}`)}
            >
              {section.links.map((item) =>
                item.kind === "internal" ? (
                  <LocalizedClientLink
                    key={item.href + item.labelKey}
                    href={item.href}
                    className="block label-md"
                    data-testid={`footer-link-${item.labelKey}`}
                  >
                    {t(`links.${item.labelKey}`)}
                  </LocalizedClientLink>
                ) : (
                  <a
                    key={item.href + item.labelKey}
                    href={item.href}
                    className="block label-md"
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid={`footer-link-${item.labelKey}`}
                  >
                    {t(`links.${item.labelKey}`)}
                  </a>
                )
              )}
            </nav>
          </div>
        ))}

        <div
          className="p-6 border rounded-sm"
          data-testid="footer-follow"
        >
          <h2 className="heading-sm text-primary mb-3 uppercase">
            {t("sections.follow")}
          </h2>
          <nav className="space-y-3" aria-label={t("aria.follow")}>
            {FOOTER_SOCIAL.map(({ key, envVar }) => {
              const href = readSocialUrl(envVar)
              const openInNewTab = href !== "#"
              return (
                <a
                  key={key}
                  href={href}
                  className="block label-md uppercase"
                  {...(openInNewTab
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                  aria-label={t(`social.${key}Aria`)}
                  data-testid={`footer-social-${key}`}
                >
                  {t(`social.${key}`)}
                </a>
              )
            })}
          </nav>
        </div>
      </div>

      <div className="py-6" data-testid="footer-copyright">
        <p className="text-md text-secondary text-center">
          {t("copyright", { year })}
        </p>
        <p className="mt-3 text-center text-sm text-secondary">
          <a
            href="https://yondist.com"
            target="_blank"
            rel="noopener noreferrer"
            className="lowercase tracking-normal hover:text-primary hover:underline"
            data-testid="footer-credit-yondist"
          >
            {t("creditByYondist")}
          </a>
        </p>
      </div>
    </footer>
  )
}
