import { Container, Heading, Text } from "@medusajs/ui"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import { StoreVendor } from "../../../../../types/user"
import { ActionMenu } from "../../../../../components/common/action-menu"
import { Pencil } from "@medusajs/icons"
import {
  getSellerHeroDisplayUrl,
  getSellerLogoDisplayUrl,
  getSellerStorytellingGalleryUrls,
} from "../../../../../utils/tramelle-partner-media"
import {
  DESCRIPTION_I18N_TAB_LABELS,
  defaultDescriptionI18nFormValues,
  TRAMELLE_DESCRIPTION_I18N_LOCALES,
  type TramelleDescriptionI18nLocale,
} from "../../../../../utils/tramelle-seller-description-i18n"
import imagesConverter from "../../../../../utils/images-conventer"

function BannerPreview({ url }: { url: string | null }) {
  const [broken, setBroken] = useState(false)
  if (!url || broken) {
    return (
      <div className="flex flex-col gap-1 max-w-lg">
        <Text size="small" leading="compact">
          —
        </Text>
        {url && broken ? (
          <Text size="xsmall" className="text-ui-fg-muted break-all">
            Immagine non raggiungibile. Carica i file su CDN (rsync da
            partner_media_out/partner) oppure verifica l&apos;URL: {url}
          </Text>
        ) : null}
      </div>
    )
  }
  return (
    <div className="max-w-md overflow-hidden rounded-md border border-ui-border-base">
      <img
        src={url}
        alt=""
        className="h-32 w-full object-cover"
        onError={() => setBroken(true)}
      />
    </div>
  )
}

function StoreLogoWithFallback({ seller }: { seller: StoreVendor }) {
  const initial = getSellerLogoDisplayUrl(seller)
  const [src, setSrc] = useState(
    initial ? imagesConverter(initial) : "/logo.svg"
  )

  if (!initial) {
    return (
      <Text size="small" leading="compact">
        —
      </Text>
    )
  }

  return (
    <img
      src={src}
      alt="Store logo"
      className="w-20 h-20 border rounded-full object-cover"
      onError={() => {
        if (/\.jpe?g$/i.test(src)) {
          setSrc(src.replace(/\.jpe?g$/i, ".png"))
          return
        }
        setSrc("/logo.svg")
      }}
    />
  )
}

function SellerDescriptionReadonly({
  seller,
}: {
  seller: StoreVendor
}) {
  const base = defaultDescriptionI18nFormValues(
    seller.metadata,
    seller.description
  )
  const desc = (seller.description || "").trim()
  const display: typeof base =
    !(base.it || "").trim() && desc
      ? { ...base, it: seller.description ?? "" }
      : base

  const [tab, setTab] = useState<TramelleDescriptionI18nLocale>("it")
  const body = (display[tab] || "").trim()

  return (
    <div className="flex max-w-prose flex-col gap-2">
      <div className="flex flex-wrap gap-1">
        {TRAMELLE_DESCRIPTION_I18N_LOCALES.map((loc) => (
          <button
            key={loc}
            type="button"
            className={`text-xs font-medium rounded border px-2 py-0.5 transition-colors ${
              tab === loc
                ? "border-ui-border-interactive bg-ui-bg-interactive text-ui-fg-on-color"
                : "border-ui-border-base bg-ui-bg-subtle text-ui-fg-subtle hover:bg-ui-bg-subtle-hover"
            }`}
            onClick={() => setTab(loc)}
          >
            {DESCRIPTION_I18N_TAB_LABELS[loc]}
          </button>
        ))}
      </div>
      <Text
        size="small"
        leading="compact"
        className={body ? "whitespace-pre-wrap" : "text-ui-fg-muted"}
      >
        {body || "—"}
      </Text>
    </div>
  )
}

function GalleryStrip({ urls }: { urls: string[] }) {
  const [broken, setBroken] = useState(() => new Set<number>())

  if (!urls.length) {
    return (
      <Text size="small" leading="compact">
        —
      </Text>
    )
  }

  const visible = urls
    .map((u, i) => ({ u, i }))
    .filter(({ i }) => !broken.has(i))

  if (!visible.length) {
    return (
      <Text size="small" leading="compact">
        —
      </Text>
    )
  }

  return (
    <div className="flex flex-wrap gap-2 max-w-lg">
      {urls.map((u, i) =>
        broken.has(i) ? null : (
          <a
            key={`${u}-${i}`}
            href={u}
            target="_blank"
            rel="noopener noreferrer"
            className="block h-16 w-16 overflow-hidden rounded border border-ui-border-base bg-ui-bg-subtle shrink-0"
          >
            <img
              src={u}
              alt=""
              className="h-full w-full object-cover"
              onError={() =>
                setBroken((prev) => new Set(prev).add(i))
              }
            />
          </a>
        )
      )}
    </div>
  )
}

export const StoreGeneralSection = ({ seller }: { seller: StoreVendor }) => {
  const { t } = useTranslation()
  const heroDisplayUrl = getSellerHeroDisplayUrl(seller)
  const galleryUrls = getSellerStorytellingGalleryUrls(seller)

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading>{t("store.domain")}</Heading>
        </div>
        <ActionMenu
          groups={[
            {
              actions: [
                {
                  icon: <Pencil />,
                  label: "Edit",
                  to: "edit",
                },
              ],
            },
          ]}
        />
      </div>
      <div className="text-ui-fg-subtle grid grid-cols-2 px-6 py-4 items-center">
        <Text size="small" leading="compact" weight="plus">
          Logo
        </Text>
        <StoreLogoWithFallback seller={seller} />
      </div>
      <div className="text-ui-fg-subtle grid grid-cols-2 px-6 py-4">
        <Text size="small" leading="compact" weight="plus">
          {t("fields.name")}
        </Text>
        <Text size="small" leading="compact">
          {seller.name}
        </Text>
      </div>
      <div className="text-ui-fg-subtle grid grid-cols-2 px-6 py-4">
        <Text size="small" leading="compact" weight="plus">
          {t("fields.email")}
        </Text>
        <Text size="small" leading="compact">
          {seller.email}
        </Text>
      </div>
      <div className="text-ui-fg-subtle grid grid-cols-2 px-6 py-4">
        <Text size="small" leading="compact" weight="plus">
          {t("fields.phone")}
        </Text>
        <Text size="small" leading="compact">
          {seller.phone}
        </Text>
      </div>
      <div className="text-ui-fg-subtle grid grid-cols-2 px-6 py-4 items-start">
        <Text size="small" leading="compact" weight="plus">
          Description
        </Text>
        <SellerDescriptionReadonly seller={seller} />
      </div>
      <div className="text-ui-fg-subtle grid grid-cols-2 px-6 py-4 items-start gap-y-2">
        <Text size="small" leading="compact" weight="plus">
          Banner
        </Text>
        <BannerPreview url={heroDisplayUrl} />
      </div>
      <div className="text-ui-fg-subtle grid grid-cols-2 px-6 py-4 items-start gap-y-2">
        <Text size="small" leading="compact" weight="plus">
          Gallery (storytelling)
        </Text>
        <GalleryStrip urls={galleryUrls} />
      </div>
    </Container>
  )
}
