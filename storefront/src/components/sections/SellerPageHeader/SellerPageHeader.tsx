import { SellerFooter, SellerHeading } from "@/components/organisms"
import { SellerPageHeroCover } from "@/components/molecules/SellerPageHeroCover/SellerPageHeroCover"
import { sellerHeroImageCandidates } from "@/lib/helpers/seller-media-url"
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
  const heroCandidates =
    header && seller ? sellerHeroImageCandidates(seller) : []
  const showHeroDebug = process.env.NODE_ENV === "development"

  return (
    <div className="border rounded-sm">
      {heroCandidates.length > 0 ? (
        <SellerPageHeroCover
          heroCandidates={heroCandidates}
          name={seller.name}
          showDebugUrls={showHeroDebug}
          className="rounded-t-sm overflow-hidden border-b border-neutral-200"
        />
      ) : null}
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
