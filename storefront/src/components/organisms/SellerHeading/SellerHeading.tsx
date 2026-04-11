import { SellerInfo } from "@/components/molecules"
import { SellerDescriptionTabsHtml } from "@/components/molecules/SellerDescriptionTabs/SellerDescriptionTabs"
import { sellerDescriptionsMapForUi } from "@/lib/helpers/tramelle-seller-description-i18n"
import { SellerProps } from "@/types/seller"
import { Chat } from "../Chat/Chat"
import { HttpTypes } from "@medusajs/types"

export const SellerHeading = ({
  seller,
  user,
  header,
  urlLocale,
}: {
  header: boolean
  seller: SellerProps
  user: HttpTypes.StoreCustomer | null
  urlLocale: string
}) => {
  const descriptions = sellerDescriptionsMapForUi(
    seller.description,
    seller.metadata ?? undefined
  )

  return (
    <div className="border-b">
      <div className="flex flex-col md:flex-row justify-between">
        <div>
          <SellerInfo header={header} seller={seller} />
        </div>
        {user && (
          <div className="flex gap-2 md:mt-0 p-5 md:ml-auto">
            <Chat
              user={user}
              seller={seller}
              buttonClassNames="uppercase h-10"
              variant="filled"
              buttonSize="small"
            />
          </div>
        )}
      </div>
      <div className="px-5 pb-5">
        <SellerDescriptionTabsHtml
          key={urlLocale}
          descriptions={descriptions}
          urlLocale={urlLocale}
        />
      </div>
    </div>
  )
}
