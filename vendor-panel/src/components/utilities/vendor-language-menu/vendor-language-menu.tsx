import { ChevronUpDown } from "@medusajs/icons"
import { Button, DropdownMenu, Text, clx, toast } from "@medusajs/ui"
import { useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { useUserMe } from "../../../hooks/api/users"
import { fetchQuery } from "../../../lib/client"
import { languages } from "../../../i18n/languages"
import { TRAMELLE_VENDOR_LOCALES } from "../../../i18n/tramelle-locales"
import { TeamMemberProps } from "../../../types/user"

const USERS_ME_QUERY_KEY = ["users", "user", "me"] as const

const menuLanguages = TRAMELLE_VENDOR_LOCALES.map((code) =>
  languages.find((l) => l.code === code)
).filter((l): l is (typeof languages)[number] => Boolean(l))

export const VendorLanguageMenu = () => {
  const { i18n, t } = useTranslation()
  const queryClient = useQueryClient()
  const { member } = useUserMe() as {
    member?: TeamMemberProps
  }

  if (menuLanguages.length <= 1) {
    return null
  }

  const current =
    menuLanguages.find((l) => l.code === i18n.resolvedLanguage) ||
    menuLanguages.find((l) => i18n.language?.startsWith(l.code)) ||
    menuLanguages[0]

  const setLang = async (code: string) => {
    await i18n.changeLanguage(code)
    try {
      document.cookie = `lng=${code};path=/;max-age=31536000;samesite=lax`
    } catch {
      /* ignore */
    }

    const m = member
    if (!m?.id) {
      return
    }

    const prevMeta =
      m.metadata &&
      typeof m.metadata === "object" &&
      !Array.isArray(m.metadata)
        ? { ...(m.metadata as Record<string, unknown>) }
        : {}

    try {
      await fetchQuery(`/vendor/members/${m.id}`, {
        method: "POST",
        body: {
          language: code,
          metadata: {
            ...prevMeta,
            ui_locale: code,
          },
        },
      })
      await queryClient.invalidateQueries({ queryKey: [...USERS_ME_QUERY_KEY] })
      toast.success(
        t("app.languageMenu.savedToast", "Lingua salvata nel profilo.")
      )
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed")
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenu.Trigger asChild>
        <Button
          variant="transparent"
          size="small"
          className="h-8 gap-x-1.5 px-2 text-ui-fg-subtle"
          data-testid="vendor-language-menu-trigger"
        >
          <Text size="small" weight="plus" className="uppercase tabular-nums">
            {current.code}
          </Text>
          <ChevronUpDown className="text-ui-fg-muted" />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content className="min-w-[200px]" align="end">
        <DropdownMenu.Label className="txt-compact-xsmall text-ui-fg-muted">
          {t("app.languageMenu.label", "Lingua pannello")}
        </DropdownMenu.Label>
        {menuLanguages.map((lan) => (
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
