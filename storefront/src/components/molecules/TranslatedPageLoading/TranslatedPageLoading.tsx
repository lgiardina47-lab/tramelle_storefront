"use client"

import { useTranslations } from "next-intl"

type Namespace = "Cart" | "Checkout"

export function TranslatedPageLoading({
  namespace,
  className = "container flex items-center justify-center",
  testId = "page-loading",
}: {
  namespace: Namespace
  className?: string
  testId?: string
}) {
  const t = useTranslations(namespace)
  return (
    <div className={className} data-testid={testId}>
      {t("loading")}
    </div>
  )
}
