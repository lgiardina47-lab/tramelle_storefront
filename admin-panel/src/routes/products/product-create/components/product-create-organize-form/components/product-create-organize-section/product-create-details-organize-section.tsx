import { Button, Heading } from "@medusajs/ui"
import { UseFormReturn, useFieldArray } from "react-hook-form"
import { Trans, useTranslation } from "react-i18next"

import { ChipGroup } from "../../../../../../../components/common/chip-group"
import { Form } from "../../../../../../../components/common/form"
import { SwitchBox } from "../../../../../../../components/common/switch-box"
import { Combobox } from "../../../../../../../components/inputs/combobox"
import { StackedFocusModal } from "../../../../../../../components/modals"
import { useComboboxData } from "../../../../../../../hooks/use-combobox-data"
import { sdk } from "../../../../../../../lib/client"
import { VendorSeller } from "../../../../../../../types"
import { CategoryCombobox } from "../../../../../common/components/category-combobox"
import { ProductCreateSchemaType } from "../../../../types"

type ProductCreateOrganizationSectionProps = {
  form: UseFormReturn<ProductCreateSchemaType>
}

export const ProductCreateOrganizationSection = ({
  form,
}: ProductCreateOrganizationSectionProps) => {
  const { t } = useTranslation()

  const collections = useComboboxData({
    queryKey: ["product_collections"],
    queryFn: (params) => sdk.admin.productCollection.list(params),
    getOptions: (data) =>
      data.collections.map((collection) => ({
        label: collection.title!,
        value: collection.id!,
      })),
  })

  const types = useComboboxData({
    queryKey: ["product_types"],
    queryFn: (params) => sdk.admin.productType.list(params),
    getOptions: (data) =>
      data.product_types.map((type) => ({
        label: type.value,
        value: type.id,
      })),
  })

  const tags = useComboboxData({
    queryKey: ["product_tags"],
    queryFn: (params) => sdk.admin.productTag.list(params),
    getOptions: (data) =>
      data.product_tags.map((tag) => ({
        label: tag.value,
        value: tag.id,
      })),
  })

  const shippingProfiles = useComboboxData({
    queryKey: ["shipping_profiles"],
    queryFn: (params) => sdk.admin.shippingProfile.list(params),
    getOptions: (data) =>
      data.shipping_profiles.map((shippingProfile) => ({
        label: shippingProfile.name,
        value: shippingProfile.id,
      })),
  })

  const marketplaceSellers = useComboboxData<
    { sellers: VendorSeller[]; count: number; offset: number; limit: number },
    { q?: string; offset?: number; limit?: number; id?: string }
  >({
    queryKey: ["admin_sellers", "product-create"],
    queryFn: async (params) => {
      const limit = params.limit ?? 20
      const offset = params.offset ?? 0
      if (params.id) {
        const one = await sdk.client.fetch<{ seller: VendorSeller }>(
          `/admin/sellers/${params.id}`,
          { method: "GET", query: { fields: "id,name,handle" } }
        )
        const s = one.seller
        return {
          sellers: s?.id ? [s] : [],
          count: s?.id ? 1 : 0,
          offset: 0,
          limit: 1,
        }
      }
      const query: Record<string, string | number | undefined> = {
        limit,
        offset,
        fields: "id,name,handle",
      }
      if (params.q) {
        query.q = params.q
      }
      const raw = await sdk.client.fetch<{
        sellers: VendorSeller[]
        count: number
      }>("/admin/sellers", { method: "GET", query })
      return {
        sellers: raw.sellers ?? [],
        count: raw.count ?? 0,
        offset,
        limit,
      }
    },
    getOptions: (data) =>
      (data.sellers ?? []).map((s) => ({
        label: `${s.name ?? s.handle ?? s.id} (${s.handle ?? s.id})`,
        value: s.id!,
      })),
    pageSize: 20,
  })

  const { fields, remove, replace } = useFieldArray({
    control: form.control,
    name: "sales_channels",
    keyName: "key",
  })

  const handleClearAllSalesChannels = () => {
    replace([])
  }

  return (
    <div id="organize" className="flex flex-col gap-y-8" data-testid="product-create-organize-section">
      <Heading data-testid="product-create-organize-section-heading">{t("products.organization.header")}</Heading>
      <SwitchBox
        control={form.control}
        name="discountable"
        label={t("products.fields.discountable.label")}
        description={t("products.fields.discountable.hint")}
        optional
        data-testid="product-create-organize-section-discountable-switch"
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2" data-testid="product-create-organize-section-type-collection">
        <Form.Field
          control={form.control}
          name="type_id"
          render={({ field }) => {
            return (
              <Form.Item data-testid="product-create-organize-section-type-item">
                <Form.Label optional data-testid="product-create-organize-section-type-label">
                  {t("products.fields.type.label")}
                </Form.Label>
                <Form.Control data-testid="product-create-organize-section-type-control">
                  <Combobox
                    {...field}
                    options={types.options}
                    searchValue={types.searchValue}
                    onSearchValueChange={types.onSearchValueChange}
                    fetchNextPage={types.fetchNextPage}
                    data-testid="product-create-organize-section-type-input"
                  />
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )
          }}
        />
        <Form.Field
          control={form.control}
          name="collection_id"
          render={({ field }) => {
            return (
              <Form.Item data-testid="product-create-organize-section-collection-item">
                <Form.Label optional data-testid="product-create-organize-section-collection-label">
                  {t("products.fields.collection.label")}
                </Form.Label>
                <Form.Control data-testid="product-create-organize-section-collection-control">
                  <Combobox
                    {...field}
                    options={collections.options}
                    searchValue={collections.searchValue}
                    onSearchValueChange={collections.onSearchValueChange}
                    fetchNextPage={collections.fetchNextPage}
                    data-testid="product-create-organize-section-collection-input"
                  />
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )
          }}
        />
      </div>
      <Form.Field
        control={form.control}
        name="seller_id"
        render={({ field }) => {
          return (
            <Form.Item data-testid="product-create-organize-section-seller-item">
              <Form.Label optional data-testid="product-create-organize-section-seller-label">
                Seller (marketplace)
              </Form.Label>
              <Form.Hint>
                Collega il prodotto a un vendor per listing e commissioni. Equivale a{" "}
                <code className="text-xs">additional_data.seller_id</code> in API.
              </Form.Hint>
              <Form.Control data-testid="product-create-organize-section-seller-control">
                <Combobox
                  {...field}
                  options={marketplaceSellers.options}
                  searchValue={marketplaceSellers.searchValue}
                  onSearchValueChange={marketplaceSellers.onSearchValueChange}
                  fetchNextPage={marketplaceSellers.fetchNextPage}
                  data-testid="product-create-organize-section-seller-input"
                />
              </Form.Control>
              <Form.ErrorMessage />
            </Form.Item>
          )
        }}
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2" data-testid="product-create-organize-section-categories-tags">
        <Form.Field
          control={form.control}
          name="categories"
          render={({ field }) => {
            return (
              <Form.Item data-testid="product-create-organize-section-categories-item">
                <Form.Label optional data-testid="product-create-organize-section-categories-label">
                  {t("products.fields.categories.label")}
                </Form.Label>
                <Form.Control data-testid="product-create-organize-section-categories-control">
                  <CategoryCombobox {...field} data-testid="product-create-organize-section-categories-input" />
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )
          }}
        />
        <Form.Field
          control={form.control}
          name="tags"
          render={({ field }) => {
            return (
              <Form.Item data-testid="product-create-organize-section-tags-item">
                <Form.Label optional data-testid="product-create-organize-section-tags-label">
                  {t("products.fields.tags.label")}
                </Form.Label>
                <Form.Control data-testid="product-create-organize-section-tags-control">
                  <Combobox
                    {...field}
                    options={tags.options}
                    searchValue={tags.searchValue}
                    onSearchValueChange={tags.onSearchValueChange}
                    fetchNextPage={tags.fetchNextPage}
                    data-testid="product-create-organize-section-tags-input"
                  />
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )
          }}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <Form.Label optional>
            {t("products.fields.shipping_profile.label")}
          </Form.Label>
          <Form.Hint>
            <Trans i18nKey={"products.fields.shipping_profile.hint"} />
          </Form.Hint>
        </div>
        <Form.Field
          control={form.control}
          name="shipping_profile_id"
          render={({ field }) => {
            return (
              <Form.Item>
                <Form.Control>
                  <Combobox
                    {...field}
                    options={shippingProfiles.options}
                    searchValue={shippingProfiles.searchValue}
                    onSearchValueChange={shippingProfiles.onSearchValueChange}
                    fetchNextPage={shippingProfiles.fetchNextPage}
                  />
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )
          }}
        />
      </div>
      <div className="grid grid-cols-1 gap-y-4">
        <Form.Field
          control={form.control}
          name="sales_channels"
          render={() => {
            return (
              <Form.Item>
                <div className="flex items-start justify-between gap-x-4">
                  <div>
                    <Form.Label optional>
                      {t("products.fields.sales_channels.label")}
                    </Form.Label>
                    <Form.Hint>
                      <Trans i18nKey={"products.fields.sales_channels.hint"} />
                    </Form.Hint>
                  </div>
                  <StackedFocusModal.Trigger asChild>
                    <Button size="small" variant="secondary" type="button" data-testid="product-create-organize-section-sales-channels-add-button">
                      {t("actions.add")}
                    </Button>
                  </StackedFocusModal.Trigger>
                </div>
                <Form.Control className="mt-0">
                  {fields.length > 0 && (
                    <ChipGroup
                      onClearAll={handleClearAllSalesChannels}
                      onRemove={remove}
                      className="py-4"
                    >
                      {fields.map((field, index) => (
                        <ChipGroup.Chip key={field.key} index={index}>
                          {field.name}
                        </ChipGroup.Chip>
                      ))}
                    </ChipGroup>
                  )}
                </Form.Control>
              </Form.Item>
            )
          }}
        />
      </div>
    </div>
  )
}
