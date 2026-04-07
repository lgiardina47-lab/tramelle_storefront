import { zodResolver } from "@hookform/resolvers/zod"
import { HttpTypes } from "@medusajs/types"
import {
  Button,
  Checkbox,
  Container,
  Heading,
  Input,
  Label,
  Text,
  Textarea,
  toast,
} from "@medusajs/ui"
import { useEffect } from "react"
import { useTranslation } from "react-i18next"
import { FormProvider, useForm } from "react-hook-form"
import * as zod from "zod"

import { Form } from "../../../../../components/common/form"
import { useUpdateProduct } from "../../../../../hooks/api/products"
import { normalizeContentLang, DEFAULT_PRODUCT_CONTENT_LOCALE } from "../../../../../lib/tramelle-product-i18n"
import {
  PAIRING_ICON_OPTIONS,
  formValuesToTechnicalSheet,
  parseTechnicalSheet,
  sheetToFormValues,
  type TechnicalSheetFormValues,
} from "./technical-sheet-types"

const TechnicalSheetFormSchema = zod.object({
  ingredients: zod.string(),
  nutrition_kj: zod.string(),
  nutrition_kcal: zod.string(),
  nutrition_fat_g: zod.string(),
  nutrition_saturated_fat_g: zod.string(),
  nutrition_carbs_g: zod.string(),
  nutrition_sugars_g: zod.string(),
  nutrition_protein_g: zod.string(),
  nutrition_salt_g: zod.string(),
  pairings_description: zod.string(),
  pairing_icons: zod.array(zod.string()),
  organoleptic_aromatic: zod.string(),
  organoleptic_color: zod.string(),
  organoleptic_taste: zod.string(),
  logistics_format: zod.string(),
  logistics_shelf_life: zod.string(),
})

type ProductTechnicalSheetFormProps = {
  product: HttpTypes.AdminProduct
}

export const TechnicalSheetForm = ({ product }: ProductTechnicalSheetFormProps) => {
  const { i18n } = useTranslation()
  const contentLang = normalizeContentLang(i18n.language)
  const { mutateAsync, isPending } = useUpdateProduct(product.id)

  const form = useForm<TechnicalSheetFormValues>({
    resolver: zodResolver(TechnicalSheetFormSchema),
    defaultValues: sheetToFormValues({}),
  })

  useEffect(() => {
    const meta =
      product.metadata &&
      typeof product.metadata === "object" &&
      !Array.isArray(product.metadata)
        ? (product.metadata as Record<string, unknown>)
        : {}
    const sheet = parseTechnicalSheet(meta)
    form.reset(sheetToFormValues(sheet))
  }, [product.id, product.metadata])

  const handleSubmit = form.handleSubmit(async (data) => {
    const technical_sheet = formValuesToTechnicalSheet(data)
    const prev =
      product.metadata &&
      typeof product.metadata === "object" &&
      !Array.isArray(product.metadata)
        ? { ...(product.metadata as Record<string, unknown>) }
        : {}

    const nextMetadata: Record<string, unknown> = {
      ...prev,
      technical_sheet,
    }

    await mutateAsync(
      { metadata: nextMetadata },
      {
        onSuccess: ({ product: p }) => {
          toast.success(`Scheda tecnica salvata: ${p.title}`)
        },
        onError: (err) => {
          toast.error(err.message)
        },
      }
    )
  })

  return (
    <Container className="divide-y p-0" data-testid="product-technical-sheet-section">
      <div className="flex flex-col gap-y-1 px-6 py-4">
        <Heading level="h2" data-testid="product-technical-sheet-title">
          Scheda tecnica gourmet
        </Heading>
        <Text size="small" className="text-ui-fg-muted">
          Dati editoriali e nutrizionali salvati in{" "}
          <code className="text-xs">metadata.technical_sheet</code> per il sito.
        </Text>
        {contentLang !== DEFAULT_PRODUCT_CONTENT_LOCALE && (
          <Text size="small" className="text-orange-600">
            Lingua interfaccia {contentLang.toUpperCase()}: questa scheda è unica (campi non
            separati per lingua); usa il selettore in alto per l’interfaccia, i dati restano condivisi.
          </Text>
        )}
      </div>

      <FormProvider {...form}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-y-6 px-6 py-4">
          <div className="flex flex-col gap-y-2">
            <Label className="txt-compact-small font-medium">Ingredienti</Label>
            <Form.Field
              control={form.control}
              name="ingredients"
              render={({ field }) => (
                <Form.Item>
                  <Form.Control>
                    <Textarea {...field} rows={5} placeholder="Elenco ingredienti…" />
                  </Form.Control>
                  <Text size="xsmall" className="text-ui-fg-muted">
                    Scrivi gli allergeni in MAIUSCOLO (es. SEDANO) per evidenziarli automaticamente nel
                    sito.
                  </Text>
                </Form.Item>
              )}
            />
          </div>

          <div className="flex flex-col gap-y-3">
            <Label className="txt-compact-small font-medium">Valori nutrizionali</Label>
            <Text size="xsmall" className="text-ui-fg-muted -mt-1">
              Valori per 100 g (ove applicabile). Usa numeri decimali con il punto.
            </Text>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Form.Field
                control={form.control}
                name="nutrition_kj"
                render={({ field }) => (
                  <Form.Item>
                    <Form.Label>Energia (KJ)</Form.Label>
                    <div className="flex items-center gap-x-2">
                      <Form.Control>
                        <Input type="number" step="any" min={0} className="flex-1" {...field} />
                      </Form.Control>
                      <Text size="small" className="text-ui-fg-muted w-10 shrink-0">
                        kJ
                      </Text>
                    </div>
                  </Form.Item>
                )}
              />
              <Form.Field
                control={form.control}
                name="nutrition_kcal"
                render={({ field }) => (
                  <Form.Item>
                    <Form.Label>Energia (Kcal)</Form.Label>
                    <div className="flex items-center gap-x-2">
                      <Form.Control>
                        <Input type="number" step="any" min={0} className="flex-1" {...field} />
                      </Form.Control>
                      <Text size="small" className="text-ui-fg-muted w-14 shrink-0">
                        kcal
                      </Text>
                    </div>
                  </Form.Item>
                )}
              />
              <Form.Field
                control={form.control}
                name="nutrition_fat_g"
                render={({ field }) => (
                  <Form.Item>
                    <Form.Label>Grassi</Form.Label>
                    <div className="flex items-center gap-x-2">
                      <Form.Control>
                        <Input type="number" step="any" min={0} className="flex-1" {...field} />
                      </Form.Control>
                      <Text size="small" className="text-ui-fg-muted w-8 shrink-0">
                        g
                      </Text>
                    </div>
                  </Form.Item>
                )}
              />
              <Form.Field
                control={form.control}
                name="nutrition_saturated_fat_g"
                render={({ field }) => (
                  <Form.Item>
                    <Form.Label>di cui saturi</Form.Label>
                    <div className="flex items-center gap-x-2">
                      <Form.Control>
                        <Input type="number" step="any" min={0} className="flex-1" {...field} />
                      </Form.Control>
                      <Text size="small" className="text-ui-fg-muted w-8 shrink-0">
                        g
                      </Text>
                    </div>
                  </Form.Item>
                )}
              />
              <Form.Field
                control={form.control}
                name="nutrition_carbs_g"
                render={({ field }) => (
                  <Form.Item>
                    <Form.Label>Carboidrati</Form.Label>
                    <div className="flex items-center gap-x-2">
                      <Form.Control>
                        <Input type="number" step="any" min={0} className="flex-1" {...field} />
                      </Form.Control>
                      <Text size="small" className="text-ui-fg-muted w-8 shrink-0">
                        g
                      </Text>
                    </div>
                  </Form.Item>
                )}
              />
              <Form.Field
                control={form.control}
                name="nutrition_sugars_g"
                render={({ field }) => (
                  <Form.Item>
                    <Form.Label>di cui zuccheri</Form.Label>
                    <div className="flex items-center gap-x-2">
                      <Form.Control>
                        <Input type="number" step="any" min={0} className="flex-1" {...field} />
                      </Form.Control>
                      <Text size="small" className="text-ui-fg-muted w-8 shrink-0">
                        g
                      </Text>
                    </div>
                  </Form.Item>
                )}
              />
              <Form.Field
                control={form.control}
                name="nutrition_protein_g"
                render={({ field }) => (
                  <Form.Item>
                    <Form.Label>Proteine</Form.Label>
                    <div className="flex items-center gap-x-2">
                      <Form.Control>
                        <Input type="number" step="any" min={0} className="flex-1" {...field} />
                      </Form.Control>
                      <Text size="small" className="text-ui-fg-muted w-8 shrink-0">
                        g
                      </Text>
                    </div>
                  </Form.Item>
                )}
              />
              <Form.Field
                control={form.control}
                name="nutrition_salt_g"
                render={({ field }) => (
                  <Form.Item>
                    <Form.Label>Sale</Form.Label>
                    <div className="flex items-center gap-x-2">
                      <Form.Control>
                        <Input type="number" step="any" min={0} className="flex-1" {...field} />
                      </Form.Control>
                      <Text size="small" className="text-ui-fg-muted w-8 shrink-0">
                        g
                      </Text>
                    </div>
                  </Form.Item>
                )}
              />
            </div>
          </div>

          <div className="flex flex-col gap-y-3">
            <Label className="txt-compact-small font-medium">Abbinamenti</Label>
            <Form.Field
              control={form.control}
              name="pairings_description"
              render={({ field }) => (
                <Form.Item>
                  <Form.Label>Testo descrittivo</Form.Label>
                  <Form.Control>
                    <Textarea {...field} rows={3} placeholder="Descrizione abbinamenti…" />
                  </Form.Control>
                </Form.Item>
              )}
            />
            <Form.Field
              control={form.control}
              name="pairing_icons"
              render={({ field }) => (
                <Form.Item>
                  <Form.Label>Icone suggerite</Form.Label>
                  <div className="flex flex-col gap-y-2">
                    {PAIRING_ICON_OPTIONS.map((opt) => {
                      const checked = (field.value ?? []).includes(opt.value)
                      return (
                        <label
                          key={opt.value}
                          className="flex cursor-pointer items-center gap-x-2"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(state) => {
                              const cur = new Set(field.value ?? [])
                              if (state === true) {
                                cur.add(opt.value)
                              } else {
                                cur.delete(opt.value)
                              }
                              field.onChange([...cur])
                            }}
                          />
                          <Text size="small">{opt.label}</Text>
                        </label>
                      )
                    })}
                  </div>
                </Form.Item>
              )}
            />
          </div>

          <div className="flex flex-col gap-y-3">
            <Label className="txt-compact-small font-medium">Caratteristiche organolettiche</Label>
            <Form.Field
              control={form.control}
              name="organoleptic_aromatic"
              render={({ field }) => (
                <Form.Item>
                  <Form.Label>Note aromatiche</Form.Label>
                  <Form.Control>
                    <Textarea {...field} rows={2} />
                  </Form.Control>
                </Form.Item>
              )}
            />
            <Form.Field
              control={form.control}
              name="organoleptic_color"
              render={({ field }) => (
                <Form.Item>
                  <Form.Label>Colore</Form.Label>
                  <Form.Control>
                    <Input {...field} />
                  </Form.Control>
                </Form.Item>
              )}
            />
            <Form.Field
              control={form.control}
              name="organoleptic_taste"
              render={({ field }) => (
                <Form.Item>
                  <Form.Label>Note gustative</Form.Label>
                  <Form.Control>
                    <Textarea {...field} rows={2} />
                  </Form.Control>
                </Form.Item>
              )}
            />
          </div>

          <div className="flex flex-col gap-y-3">
            <Label className="txt-compact-small font-medium">Info logistiche</Label>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Form.Field
                control={form.control}
                name="logistics_format"
                render={({ field }) => (
                  <Form.Item>
                    <Form.Label>Formato</Form.Label>
                    <Form.Control>
                      <Input {...field} placeholder="es. 190 g" />
                    </Form.Control>
                  </Form.Item>
                )}
              />
              <Form.Field
                control={form.control}
                name="logistics_shelf_life"
                render={({ field }) => (
                  <Form.Item>
                    <Form.Label>Shelf life</Form.Label>
                    <Form.Control>
                      <Input {...field} placeholder="es. 24 mesi" />
                    </Form.Control>
                  </Form.Item>
                )}
              />
            </div>
          </div>

          <div className="flex justify-end border-t border-ui-border-base pt-4">
            <Button type="submit" isLoading={isPending} data-testid="technical-sheet-save">
              Salva
            </Button>
          </div>
        </form>
      </FormProvider>
    </Container>
  )
}
