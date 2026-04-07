import { zodResolver } from "@hookform/resolvers/zod"
import { Button, Input, Text, Textarea, toast } from "@medusajs/ui"
import { useFieldArray, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { Form } from "../../../../../components/common/form"

import { RouteDrawer, useRouteModal } from "../../../../../components/modals"
import { KeyboundForm } from "../../../../../components/utilities/keybound-form"
import { StoreVendor } from "../../../../../types/user"
import { useUpdateMe, usersQueryKeys } from "../../../../../hooks/api"
import { MediaSchema } from "../../../../products/product-create/constants"
import {
  FileType,
  FileUpload,
} from "../../../../../components/common/file-upload"
import { useCallback, useState } from "react"
import { fetchQuery, uploadFilesQuery } from "../../../../../lib/client"
import { queryClient } from "../../../../../lib/query-client"
import {
  getSellerHeroDisplayUrl,
  getSellerLogoDisplayUrl,
} from "../../../../../utils/tramelle-partner-media"
import {
  defaultDescriptionI18nFormValues,
  DESCRIPTION_I18N_TAB_LABELS,
  primarySellerDescriptionFromI18n,
  TRAMELLE_DESCRIPTION_I18N_LOCALES,
  TRAMELLE_SELLER_DESCRIPTION_I18N_KEY,
  type TramelleDescriptionI18n,
} from "../../../../../utils/tramelle-seller-description-i18n"
import { HttpTypes } from "@medusajs/types"

interface AdminFileResponse {
  files: HttpTypes.AdminFile[]
}


const descriptionI18nSchema = z.object({
  it: z.string().optional(),
  en: z.string().optional(),
  fr: z.string().optional(),
  de: z.string().optional(),
  es: z.string().optional(),
})

export const EditStoreSchema = z.object({
  name: z.string().min(1),
  description_i18n: descriptionI18nSchema,
  phone: z.string().optional(),
  email: z.string().optional(),
  media: z.array(MediaSchema).optional(),
  heroMedia: z.array(MediaSchema).optional(),
})

const SUPPORTED_FORMATS = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/heic",
  "image/svg+xml",
]

const SUPPORTED_FORMATS_FILE_EXTENSIONS = [
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".heic",
  ".svg",
]

export const EditStoreForm = ({ seller }: { seller: StoreVendor }) => {
  const { t } = useTranslation()
  const { handleSuccess } = useRouteModal()
  const [descriptionTab, setDescriptionTab] = useState<
    (typeof TRAMELLE_DESCRIPTION_I18N_LOCALES)[number]
  >("it")

  const existingHero = getSellerHeroDisplayUrl(seller) || ""
  const existingLogo = getSellerLogoDisplayUrl(seller) || ""

  const form = useForm<z.infer<typeof EditStoreSchema>>({
    defaultValues: {
      name: seller.name,
      description_i18n: defaultDescriptionI18nFormValues(
        seller.metadata,
        seller.description
      ),
      phone: seller.phone,
      email: seller.email,
      media: [],
      heroMedia: [],
    },
    resolver: zodResolver(EditStoreSchema),
  })

  const { fields } = useFieldArray({
    name: "media",
    control: form.control,
    keyName: "field_id",
  })

  const { fields: heroFields } = useFieldArray({
    name: "heroMedia",
    control: form.control,
    keyName: "field_id_hero",
  })

  const { mutateAsync, isPending } = useUpdateMe()

  const hasInvalidFiles = useCallback(
    (fileList: FileType[]) => {
      const invalidFile = fileList.find(
        (f) => !SUPPORTED_FORMATS.includes(f.file.type)
      )

      if (invalidFile) {
        form.setError("media", {
          type: "invalid_file",
          message: t("products.media.invalidFileType", {
            name: invalidFile.file.name,
            types: SUPPORTED_FORMATS_FILE_EXTENSIONS.join(", "),
          }),
        })

        return true
      }

      return false
    },
    [form, t]
  )

  const onUploaded = useCallback(
    (files: FileType[]) => {
      form.clearErrors("media")
      if (hasInvalidFiles(files)) {
        return
      }

      form.setValue("media", [{ ...files[0], isThumbnail: false }])
    },
    [form, hasInvalidFiles]
  )

  const onHeroUploaded = useCallback(
    (files: FileType[]) => {
      form.clearErrors("heroMedia")
      if (hasInvalidFiles(files)) {
        return
      }
      form.setValue("heroMedia", [{ ...files[0], isThumbnail: false }])
    },
    [form, hasInvalidFiles]
  )

  const handleSubmit = form.handleSubmit(async (values) => {
    let uploadedMedia: (HttpTypes.AdminFile & {
      isThumbnail: boolean
    })[] = []
    let uploadedHero: (HttpTypes.AdminFile & {
      isThumbnail: boolean
    })[] = []
    try {
      const tasks: Promise<
        (HttpTypes.AdminFile & { isThumbnail: boolean })[]
      >[] = []
      if (values.media?.length) {
        tasks.push(
          uploadFilesQuery(values.media).then((r: AdminFileResponse) =>
            r.files.map((f: HttpTypes.AdminFile) => ({
              ...f,
              isThumbnail: false,
            }))
          )
        )
      }
      if (values.heroMedia?.length) {
        tasks.push(
          uploadFilesQuery(values.heroMedia).then((r: AdminFileResponse) =>
            r.files.map((f: HttpTypes.AdminFile) => ({
              ...f,
              isThumbnail: false,
            }))
          )
        )
      }
      const parts = await Promise.all(tasks)
      if (values.media?.length) {
        uploadedMedia = parts[0] ?? []
      }
      if (values.heroMedia?.length) {
        uploadedHero = values.media?.length ? parts[1] ?? [] : parts[0] ?? []
      }
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      }
    }

    const baseMeta =
      seller.metadata &&
      typeof seller.metadata === "object" &&
      !Array.isArray(seller.metadata)
        ? { ...seller.metadata }
        : {}
    const heroUrl =
      uploadedHero[0]?.url ||
      (typeof baseMeta.hero_image_url === "string"
        ? baseMeta.hero_image_url
        : existingHero) ||
      undefined
    const i18nRecord: TramelleDescriptionI18n = {
      it: values.description_i18n.it ?? "",
      en: values.description_i18n.en ?? "",
      fr: values.description_i18n.fr ?? "",
      de: values.description_i18n.de ?? "",
      es: values.description_i18n.es ?? "",
    }

    const metaPatch: Record<string, unknown> = {
      ...baseMeta,
      ...(heroUrl ? { hero_image_url: heroUrl } : {}),
      [TRAMELLE_SELLER_DESCRIPTION_I18N_KEY]: i18nRecord,
    }

    const description = primarySellerDescriptionFromI18n(i18nRecord)

    try {
      await mutateAsync({
        name: values.name,
        email: values.email,
        phone: values.phone,
        description,
        photo: uploadedMedia[0]?.url || seller.photo || "",
      })
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Save failed")
      return
    }

    try {
      await fetchQuery("/vendor/sellers/me/listing-metadata", {
        method: "POST",
        body: { metadata: metaPatch },
      })
    } catch (error: unknown) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Errore salvataggio hero / descrizioni multilingua."
      )
      return
    }

    await queryClient.invalidateQueries({ queryKey: usersQueryKeys.me() })
    toast.success("Store updated")
    handleSuccess()
  })

  return (
    <RouteDrawer.Form form={form}>
      <KeyboundForm
        onSubmit={handleSubmit}
        className="flex flex-1 flex-col overflow-hidden"
      >
        <RouteDrawer.Body className="flex flex-1 flex-col gap-y-8 overflow-y-auto overflow-x-hidden">
          <div className="flex flex-col gap-y-8">
            <Form.Field
              name="media"
              control={form.control}
              render={() => {
                return (
                  <Form.Item>
                    <div className="flex flex-col gap-y-2">
                      <div className="flex flex-col gap-y-1">
                        <Form.Label optional>Logo</Form.Label>
                      </div>
                      <Form.Control>
                        <FileUpload
                          uploadedImage={fields[0]?.url || existingLogo || ""}
                          multiple={false}
                          label={t("products.media.uploadImagesLabel")}
                          hint={t("products.media.uploadImagesHint")}
                          hasError={!!form.formState.errors.media}
                          formats={SUPPORTED_FORMATS}
                          onUploaded={onUploaded}
                        />
                      </Form.Control>
                      <Form.ErrorMessage />
                    </div>
                  </Form.Item>
                )
              }}
            />
            <Form.Field
              name="heroMedia"
              control={form.control}
              render={() => (
                <Form.Item>
                  <div className="flex flex-col gap-y-2">
                    <div className="flex flex-col gap-y-1">
                      <Form.Label optional>
                        Hero / banner (immagine di copertina store)
                      </Form.Label>
                    </div>
                    <Form.Control>
                      <FileUpload
                        uploadedImage={
                          heroFields[0]?.url || existingHero || ""
                        }
                        multiple={false}
                        label={t("products.media.uploadImagesLabel")}
                        hint={t("products.media.uploadImagesHint")}
                        hasError={!!form.formState.errors.heroMedia}
                        formats={SUPPORTED_FORMATS}
                        onUploaded={onHeroUploaded}
                      />
                    </Form.Control>
                    <Form.ErrorMessage />
                  </div>
                </Form.Item>
              )}
            />
            <div className="flex flex-col gap-2">
              <Text size="small" weight="plus">
                Description
              </Text>
              <div className="flex flex-wrap gap-1">
                {TRAMELLE_DESCRIPTION_I18N_LOCALES.map((loc) => (
                  <button
                    key={loc}
                    type="button"
                    className={`text-xs font-medium rounded border px-2 py-0.5 transition-colors ${
                      descriptionTab === loc
                        ? "border-ui-border-interactive bg-ui-bg-interactive text-ui-fg-on-color"
                        : "border-ui-border-base bg-ui-bg-subtle text-ui-fg-subtle hover:bg-ui-bg-subtle-hover"
                    }`}
                    onClick={() => setDescriptionTab(loc)}
                  >
                    {DESCRIPTION_I18N_TAB_LABELS[loc]}
                  </button>
                ))}
              </div>
              {TRAMELLE_DESCRIPTION_I18N_LOCALES.map((loc) => (
                <Form.Field
                  key={loc}
                  name={`description_i18n.${loc}`}
                  control={form.control}
                  render={({ field }) => (
                    <Form.Item>
                      <Form.Control>
                        <div
                          className={
                            descriptionTab === loc ? "flex flex-col" : "hidden"
                          }
                        >
                          <Textarea
                            {...field}
                            value={field.value ?? ""}
                            rows={10}
                            className="min-h-[180px] resize-y"
                          />
                        </div>
                      </Form.Control>
                    </Form.Item>
                  )}
                />
              ))}
            </div>
            <Form.Field
              name="name"
              control={form.control}
              render={({ field }) => (
                <Form.Item>
                  <Form.Label>Name</Form.Label>
                  <Form.Control>
                    <Input {...field} />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />
            <Form.Field
              name="email"
              control={form.control}
              render={({ field }) => (
                <Form.Item>
                  <Form.Label>Email</Form.Label>
                  <Form.Control>
                    <Input {...field} />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />
            <Form.Field
              name="phone"
              control={form.control}
              render={({ field }) => (
                <Form.Item>
                  <Form.Label>Phone Number</Form.Label>
                  <Form.Control>
                    <Input {...field} />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />
          </div>
        </RouteDrawer.Body>
        <RouteDrawer.Footer>
          <div className="flex items-center justify-end gap-x-2">
            <RouteDrawer.Close asChild>
              <Button size="small" variant="secondary">
                {t("actions.cancel")}
              </Button>
            </RouteDrawer.Close>
            <Button size="small" isLoading={isPending} type="submit">
              {t("actions.save")}
            </Button>
          </div>
        </RouteDrawer.Footer>
      </KeyboundForm>
    </RouteDrawer.Form>
  )
}
