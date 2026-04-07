import { SellerFooter, SellerHeading } from "@/components/organisms"
import { HttpTypes } from "@medusajs/types"

export const SellerPageHeader = ({
  header = false,
  seller,
  user,
  urlLocale,
}: {
  header?: boolean
  seller: any
  user: HttpTypes.StoreCustomer | null
  urlLocale: string
}) => {
  return (
    <div className="border rounded-sm">
      <SellerHeading
        header={header}
        seller={seller}
        user={user}
        urlLocale={urlLocale}
      />
      <SellerFooter seller={seller} />
    </div>
  )
}
