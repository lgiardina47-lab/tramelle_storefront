import { ChevronUpDown } from "@medusajs/icons"
import { Button, DropdownMenu, Text, clx } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

import { languages } from "../../../i18n/languages"
import { useDocumentDirection } from "../../../hooks/use-document-direction"

/** Solo italiano: menu lingua nascosto. */
const TRAMELLE_ADMIN_LOCALES = ["it"] as const

const adminLanguageOptions = TRAMELLE_ADMIN_LOCALES.map((code) =>
  languages.find((l) => l.code === code)
).filter((l): l is (typeof languages)[number] => Boolean(l))

export const AdminLanguageMenu = () => {
  const { i18n, t } = useTranslation()
  const direction = useDocumentDirection()

  if (adminLanguageOptions.length <= 1) {
    return null
  }

  const current =
    adminLanguageOptions.find((l) => l.code === i18n.resolvedLanguage) ||
    adminLanguageOptions.find((l) => i18n.language?.startsWith(l.code)) ||
    adminLanguageOptions[0]

  const setLang = async (code: string) => {
    await i18n.changeLanguage(code)
    try {
      document.cookie = `lng=${code};path=/;max-age=31536000;samesite=lax`
    } catch {
      /* ignore */
    }
  }

  return (
    <DropdownMenu dir={direction}>
      <DropdownMenu.Trigger asChild>
        <Button
          variant="transparent"
          size="small"
          className="h-8 gap-x-1.5 px-2 text-ui-fg-subtle"
          data-testid="admin-language-menu-trigger"
        >
          <Text size="small" weight="plus" className="uppercase tabular-nums">
            {current.code}
          </Text>
          <ChevronUpDown className="text-ui-fg-muted" />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content
        className="max-h-[min(360px,var(--radix-dropdown-menu-content-available-height))] min-w-[200px] overflow-y-auto"
        align="end"
      >
        <DropdownMenu.Label className="txt-compact-xsmall text-ui-fg-muted">
          {t("app.languageMenu.label", "Interfaccia e contenuti prodotto")}
        </DropdownMenu.Label>
        {adminLanguageOptions.map((lan) => (
          <DropdownMenu.Item
            key={lan.code}
            className={clx({
              "bg-ui-bg-component-hover": i18n.resolvedLanguage === lan.code,
            })}
            onClick={() => void setLang(lan.code)}
          >
            <span className="txt-compact-small">{lan.display_name}</span>
            <span className="text-ui-fg-muted txt-compact-xsmall ms-2 uppercase">
              {lan.code}
            </span>
          </DropdownMenu.Item>
        ))}
      </DropdownMenu.Content>
    </DropdownMenu>
  )
}
