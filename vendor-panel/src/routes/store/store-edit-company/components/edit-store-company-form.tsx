import { useForm } from "react-hook-form"
import { RouteDrawer, useRouteModal } from "../../../../components/modals"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { StoreVendor } from "../../../../types/user"
import { KeyboundForm } from "../../../../components/utilities/keybound-form"
import { Form } from "../../../../components/common/form"
import { Button, Input, toast } from "@medusajs/ui"
import { useUpdateMe, usersQueryKeys } from "../../../../hooks/api"
import { fetchQuery } from "../../../../lib/client"
import { queryClient } from "../../../../lib/query-client"

const EditStoreSchema = z.object({
  address_line: z.string().optional(),
  postal_code: z.string().optional(),
  city: z.string().optional(),
  country_code: z.string().optional(),
  tax_id: z.string().optional(),
  partita_iva: z.string().optional(),
  rea: z.string().optional(),
  sdi: z.string().optional(),
})

function fiscalFromMetadata(
  seller: StoreVendor,
  keys: readonly string[]
): string {
  const m = seller.metadata
  if (!m || typeof m !== "object" || Array.isArray(m)) {
    return ""
  }
  const rec = m as Record<string, unknown>
  for (const k of keys) {
    const v = rec[k]
    if (typeof v === "string" && v.trim()) {
      return v.trim()
    }
  }
  return ""
}

export const EditStoreCompanyForm = ({ seller }: { seller: StoreVendor }) => {
  const { handleSuccess } = useRouteModal()

  const form = useForm<z.infer<typeof EditStoreSchema>>({
    defaultValues: {
      address_line: seller.address_line || "",
      postal_code: seller.postal_code || "",
      city: seller.city || "",
      country_code: seller.country_code || "",
      tax_id: seller.tax_id || "",
      partita_iva: fiscalFromMetadata(seller, [
        "partita_iva",
        "p_iva",
        "piva",
        "vat_number",
      ]),
      rea: fiscalFromMetadata(seller, ["rea", "rea_number"]),
      sdi: fiscalFromMetadata(seller, ["sdi", "codice_sdi"]),
    },
    resolver: zodResolver(EditStoreSchema),
  })

  const { mutateAsync, isPending } = useUpdateMe()

  const handleSubmit = form.handleSubmit(async (values) => {
    const { partita_iva, rea, sdi, ...company } = values
    try {
      await mutateAsync(company)
      await fetchQuery("/vendor/sellers/me/listing-fiscal", {
        method: "POST",
        body: { partita_iva, rea, sdi },
      })
      await queryClient.invalidateQueries({ queryKey: usersQueryKeys.me() })
      toast.success("Store updated")
      handleSuccess()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Server error")
    }
  })

  return (
    <RouteDrawer.Form form={form}>
      <KeyboundForm onSubmit={handleSubmit} className="flex h-full flex-col">
        <RouteDrawer.Body>
          <div className="flex flex-col gap-y-8">
            <Form.Field
              name="address_line"
              control={form.control}
              render={({ field }) => (
                <Form.Item>
                  <Form.Label>Address</Form.Label>
                  <Form.Control>
                    <Input {...field} />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />
            <Form.Field
              name="postal_code"
              control={form.control}
              render={({ field }) => (
                <Form.Item>
                  <Form.Label>Postal Code</Form.Label>
                  <Form.Control>
                    <Input {...field} />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />
            <Form.Field
              name="city"
              control={form.control}
              render={({ field }) => (
                <Form.Item>
                  <Form.Label>City</Form.Label>
                  <Form.Control>
                    <Input {...field} />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />
            <Form.Field
              name="country_code"
              control={form.control}
              render={({ field }) => (
                <Form.Item>
                  <Form.Label>Country</Form.Label>
                  <Form.Control>
                    <Input {...field} />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />
            <Form.Field
              name="tax_id"
              control={form.control}
              render={({ field }) => (
                <Form.Item>
                  <Form.Label>Tax ID</Form.Label>
                  <Form.Control>
                    <Input {...field} />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />
            <Form.Field
              name="partita_iva"
              control={form.control}
              render={({ field }) => (
                <Form.Item>
                  <Form.Label optional>P.IVA</Form.Label>
                  <Form.Control>
                    <Input {...field} placeholder="es. 02627470228" />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />
            <Form.Field
              name="rea"
              control={form.control}
              render={({ field }) => (
                <Form.Item>
                  <Form.Label optional>REA</Form.Label>
                  <Form.Control>
                    <Input {...field} placeholder="es. TN 155459" />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />
            <Form.Field
              name="sdi"
              control={form.control}
              render={({ field }) => (
                <Form.Item>
                  <Form.Label optional>SDI</Form.Label>
                  <Form.Control>
                    <Input {...field} className="font-mono" placeholder="es. W7YVJK9" />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />
          </div>
        </RouteDrawer.Body>
        <RouteDrawer.Footer>
          <RouteDrawer.Close asChild>
            <Button size="small" variant="secondary">
              Cancel
            </Button>
          </RouteDrawer.Close>
          <Button type="submit" size="small" isLoading={isPending}>
            Save
          </Button>
        </RouteDrawer.Footer>
      </KeyboundForm>
    </RouteDrawer.Form>
  )
}
