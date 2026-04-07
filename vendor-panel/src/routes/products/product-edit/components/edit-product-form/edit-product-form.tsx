import { Button, Input, Select, Text, Textarea, toast } from "@medusajs/ui"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import * as zod from "zod"

import { ExtendedAdminProduct } from "../../../../../types/products"
import { Form } from "../../../../../components/common/form"
import { SwitchBox } from "../../../../../components/common/switch-box"
import { RouteDrawer, useRouteModal } from "../../../../../components/modals"
import { useExtendableForm } from "../../../../../extensions/forms/hooks"
import { useUpdateProduct } from "../../../../../hooks/api/products"

import { KeyboundForm } from "../../../../../components/utilities/keybound-form"
import { fetchQuery } from "../../../../../lib/client"
import {
  FormExtensionZone,
  useDashboardExtension,
} from "../../../../../extensions"

/** Lingue destinazione DeepL (sorgente fissata: IT). */
const DEEPL_TARGET_OPTIONS = [
  { value: "en", label: "English" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
  { value: "es", label: "Español" },
  { value: "nl", label: "Nederlands" },
] as const

type EditProductFormProps = {
  product: ExtendedAdminProduct
}

const EditProductSchema = zod.object({
  title: zod.string().min(1),
  handle: zod.string().min(1),
  description: zod.string().optional(),
  discountable: zod.boolean(),
})

export const EditProductForm = ({ product }: EditProductFormProps) => {
  const { t, i18n } = useTranslation()
  const { handleSuccess } = useRouteModal()
  const [deeplPending, setDeeplPending] = useState(false)
  const [deeplTargetLang, setDeeplTargetLang] = useState<string>("en")

  useEffect(() => {
    const lang = i18n.resolvedLanguage?.split("-")[0]?.toLowerCase() || ""
    if (
      lang &&
      lang !== "it" &&
      DEEPL_TARGET_OPTIONS.some((o) => o.value === lang)
    ) {
      setDeeplTargetLang(lang)
    }
  }, [i18n.resolvedLanguage])

  const { getFormFields, getFormConfigs } = useDashboardExtension()
  const fields = getFormFields("product", "edit")
  const configs = getFormConfigs("product", "edit")

  const form = useExtendableForm({
    defaultValues: {
      title: product.title,
      handle: product.handle || "",
      description: product.description || "",
      discountable: product.discountable,
    },
    schema: EditProductSchema,
    configs: configs,
    data: product,
  })

  const { mutateAsync, isPending } = useUpdateProduct(product.id)

  const translateDescription = async () => {
    const text = form.getValues("description")?.trim()
    if (!text) {
      toast.error(t("tramelle.deeplNeedText", "Inserisci una descrizione da tradurre."))
      return
    }
    const target = deeplTargetLang.toUpperCase()
    if (target === "IT") {
      toast.error(
        t(
          "tramelle.deeplNeedOtherLang",
          "Scegli una lingua di destinazione diversa dall’italiano."
        )
      )
      return
    }
    setDeeplPending(true)
    try {
      const res = (await fetchQuery("/vendor/tramelle/deepl-translate", {
        method: "POST",
        body: {
          text,
          source_lang: "IT",
          target_lang: target,
        },
      })) as { translated?: string }
      if (res.translated) {
        form.setValue("description", res.translated, { shouldDirty: true })
        toast.success(t("tramelle.deeplOk", "Traduzione applicata."))
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "DeepL")
    } finally {
      setDeeplPending(false)
    }
  }

  const handleSubmit = form.handleSubmit(async (data) => {
    const { description, discountable, handle, title } = data

    await mutateAsync(
      {
        description,
        discountable,
        handle,
        title,
      },
      {
        onSuccess: ({ product }) => {
          toast.success(
            t("products.edit.successToast", {
              title: product.title,
            })
          )
          handleSuccess(`/products/${product.id}`)
        },
        onError: (e) => {
          toast.error(e.message)
        },
      }
    )
  })

  return (
    <RouteDrawer.Form form={form}>
      <KeyboundForm
        onSubmit={handleSubmit}
        className="flex flex-1 flex-col overflow-hidden"
      >
        <RouteDrawer.Body className="flex flex-1 flex-col gap-y-8 overflow-y-auto">
          <div className="flex flex-col gap-y-8">
            <div className="flex flex-col gap-y-4">
              {/* <Form.Field
                control={form.control}
                name="status"
                render={({ field: { onChange, ref, ...field } }) => {
                  return (
                    <Form.Item>
                      <Form.Label>{t("fields.status")}</Form.Label>
                      <Form.Control>
                        <Select {...field} onValueChange={onChange}>
                          <Select.Trigger ref={ref}>
                            <Select.Value />
                          </Select.Trigger>
                          <Select.Content>
                            {(
                              [
                                "draft",
                                "published",
                                "proposed",
                                "rejected",
                              ] as const
                            ).map((status) => {
                              return (
                                <Select.Item key={status} value={status}>
                                  {t(`products.productStatus.${status}`)}
                                </Select.Item>
                              )
                            })}
                          </Select.Content>
                        </Select>
                      </Form.Control>
                      <Form.ErrorMessage />
                    </Form.Item>
                  )
                }}
              /> */}
              <Form.Field
                control={form.control}
                name="title"
                render={({ field }) => {
                  return (
                    <Form.Item>
                      <Form.Label>{t("fields.title")}</Form.Label>
                      <Form.Control>
                        <Input {...field} />
                      </Form.Control>
                      <Form.ErrorMessage />
                    </Form.Item>
                  )
                }}
              />
              {/* <Form.Field
                control={form.control}
                name='subtitle'
                render={({ field }) => {
                  return (
                    <Form.Item>
                      <Form.Label optional>
                        {t('fields.subtitle')}
                      </Form.Label>
                      <Form.Control>
                        <Input {...field} />
                      </Form.Control>
                      <Form.ErrorMessage />
                    </Form.Item>
                  );
                }}
              /> */}
              <Form.Field
                control={form.control}
                name="handle"
                render={({ field }) => {
                  return (
                    <Form.Item>
                      <Form.Label>{t("fields.handle")}</Form.Label>
                      <Form.Control>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 z-10 flex w-8 items-center justify-center border-r">
                            <Text
                              className="text-ui-fg-muted"
                              size="small"
                              leading="compact"
                              weight="plus"
                            >
                              /
                            </Text>
                          </div>
                          <Input {...field} className="pl-10" />
                        </div>
                      </Form.Control>
                      <Form.ErrorMessage />
                    </Form.Item>
                  )
                }}
              />
              {/* <Form.Field
                control={form.control}
                name='material'
                render={({ field }) => {
                  return (
                    <Form.Item>
                      <Form.Label optional>
                        {t('fields.material')}
                      </Form.Label>
                      <Form.Control>
                        <Input {...field} />
                      </Form.Control>
                      <Form.ErrorMessage />
                    </Form.Item>
                  );
                }}
              /> */}
              <Form.Field
                control={form.control}
                name="description"
                render={({ field }) => {
                  return (
                    <Form.Item>
                      <div className="flex flex-col gap-y-3">
                        <div className="flex flex-col gap-y-1 sm:flex-row sm:items-center sm:justify-between">
                          <Form.Label optional className="mb-0">
                            {t("fields.description")}
                          </Form.Label>
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <div className="flex min-w-[140px] flex-col gap-y-1">
                              <Text
                                size="xsmall"
                                className="text-ui-fg-muted"
                              >
                                {t(
                                  "tramelle.deeplTargetLabel",
                                  "Traduci in (da IT)"
                                )}
                              </Text>
                              <Select
                                value={deeplTargetLang}
                                onValueChange={setDeeplTargetLang}
                              >
                                <Select.Trigger>
                                  <Select.Value />
                                </Select.Trigger>
                                <Select.Content>
                                  {DEEPL_TARGET_OPTIONS.map((o) => (
                                    <Select.Item key={o.value} value={o.value}>
                                      {o.label}
                                    </Select.Item>
                                  ))}
                                </Select.Content>
                              </Select>
                            </div>
                            <Button
                              type="button"
                              variant="secondary"
                              size="small"
                              className="shrink-0 self-start sm:mt-5"
                              isLoading={deeplPending}
                              onClick={() => void translateDescription()}
                            >
                              {t("tramelle.deeplButton", "Traduci con DeepL")}
                            </Button>
                          </div>
                        </div>
                      </div>
                      <Form.Control>
                        <Textarea {...field} />
                      </Form.Control>
                      <Form.ErrorMessage />
                    </Form.Item>
                  )
                }}
              />
            </div>
            <SwitchBox
              control={form.control}
              name="discountable"
              label={t("fields.discountable")}
              description={t("products.discountableHint")}
            />
            <FormExtensionZone fields={fields} form={form} />
          </div>
        </RouteDrawer.Body>
        <RouteDrawer.Footer>
          <div className="flex items-center justify-end gap-x-2">
            <RouteDrawer.Close asChild>
              <Button size="small" variant="secondary">
                {t("actions.cancel")}
              </Button>
            </RouteDrawer.Close>
            <Button size="small" type="submit" isLoading={isPending}>
              {t("actions.save")}
            </Button>
          </div>
        </RouteDrawer.Footer>
      </KeyboundForm>
    </RouteDrawer.Form>
  )
}
