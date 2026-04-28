import { SellerReviewTab } from "@/components/cells/SellerReviewTab/SellerReviewTab"
import { SellerTabs } from "@/components/organisms"
import { SellerPageHeader } from "@/components/sections"
import { buildSellerStaticParamList } from "@/lib/data/build-static-paths"
import { retrieveCustomer } from "@/lib/data/customer"
import { getRegion } from "@/lib/data/regions"
import { getSellerByHandle } from "@/lib/data/seller"
import { notFound } from "next/navigation"

export const dynamic = "force-dynamic"
export const dynamicParams = true

export async function generateStaticParams() {
  try {
    return await buildSellerStaticParamList()
  } catch {
    return []
  }
}

export default async function SellerPage({
  params,
}: {
  params: Promise<{ handle: string; locale: string }>
}) {
  const { handle, locale } = await params

  const [seller, user, region] = await Promise.all([
    getSellerByHandle(handle),
    retrieveCustomer(),
    getRegion(locale),
  ])

  const currency_code = region?.currency_code || "usd"
  const region_id = region?.id

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
          region_id={region_id}
          seller={seller}
        />
        <section
          className="mt-12 border-t border-[#e8e8e8] pt-10 pb-16"
          id="recensioni"
          aria-label="recensioni-produttore"
        >
          <SellerReviewTab
            seller_handle={seller.handle}
            seller={seller}
            urlLocale={locale}
          />
        </section>
      </div>
    </main>
  )
}
