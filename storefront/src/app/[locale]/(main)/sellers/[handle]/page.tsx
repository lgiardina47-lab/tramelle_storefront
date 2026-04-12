import { SellerTabs } from "@/components/organisms"
import { SellerPageHeader } from "@/components/sections"
import { retrieveCustomer } from "@/lib/data/customer"
import { getRegion } from "@/lib/data/regions"
import { getSellerByHandle } from "@/lib/data/seller"
import { notFound } from "next/navigation"

export default async function SellerPage({
  params,
}: {
  params: Promise<{ handle: string; locale: string }>
}) {
  const { handle, locale } = await params

  const seller = await getSellerByHandle(handle)

  const user = await retrieveCustomer()

  const currency_code = (await getRegion(locale))?.currency_code || "usd"

  const tab = "products"

  if (!seller) {
    notFound()
  }

  return (
    <main className="w-full max-w-[100vw] overflow-x-hidden">
      <SellerPageHeader
        header
        seller={seller}
        user={user}
        urlLocale={locale}
      />
      <div className="container">
        <SellerTabs
          tab={tab}
          seller_id={seller.id}
          seller_handle={seller.handle}
          locale={locale}
          currency_code={currency_code}
        />
      </div>
    </main>
  )
}
