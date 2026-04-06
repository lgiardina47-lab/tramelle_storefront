import { Container, Heading, Text } from "@medusajs/ui"
import { ExtendedAdminProduct } from "../../../../../types/products"
import { PencilSquare } from "@medusajs/icons"
import { ActionMenu } from "../../../../../components/common/action-menu"
import { useProductAttributes } from "../../../../../hooks/api/products"
import { SectionRow } from "../../../../../components/common/section"
import { useMemo } from "react"

type ProductAttributeSectionProps = {
  product: ExtendedAdminProduct
}

export const ProductAdditionalAttributesSection = ({
  product,
}: ProductAttributeSectionProps) => {
  const { attributes, isLoading, isError, error } = useProductAttributes(product.id)

  const attributeList = useMemo(() => {
    return attributes?.map((attribute) => {
      const value =
        product.attribute_values?.find((av) => av && av.attribute_id === attribute.id)
          ?.value || "-"
      return {
        ...attribute,
        value,
      }
    })
  }, [attributes, product.attribute_values])

  if (isLoading) {
    return (
      <Container className="p-6">
        <Text size="small" className="text-ui-fg-muted">
          Loading attributes…
        </Text>
      </Container>
    )
  }

  if (isError) {
    return (
      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <Heading level="h2">Attributes</Heading>
          <Text size="small" className="mt-2 text-ui-fg-error">
            {error?.message ?? "Could not load applicable attributes. Check the product belongs to this seller and the API is reachable."}
          </Text>
        </div>
      </Container>
    )
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Attributes</Heading>
        <ActionMenu
          groups={[
            {
              actions: [
                {
                  label: "Edit",
                  to: "additional-attributes",
                  icon: <PencilSquare />,
                },
              ],
            },
          ]}
        />
      </div>
      {attributeList?.map((attribute) => (
        <SectionRow
          key={attribute.id}
          title={attribute.name}
          value={attribute.value}
          tooltip={attribute.description}
        />
      ))}
    </Container>
  )
}
