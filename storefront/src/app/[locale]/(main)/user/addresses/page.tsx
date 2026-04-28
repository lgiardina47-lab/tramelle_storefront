import { UserNavigation } from "@/components/molecules"
import { retrieveCustomer } from "@/lib/data/customer"
import { redirect } from "next/navigation"
import { Addresses } from "@/components/organisms"
import { listRegions } from "@/lib/data/regions"

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const user = await retrieveCustomer()
  const regions = await listRegions()

  if (!user) {
    redirect(`/${locale}/login`)
  }

  return (
    <main className="container" data-testid="addresses-page">
      <div className="grid grid-cols-1 md:grid-cols-4 mt-6 gap-5 md:gap-8">
        <UserNavigation />
        <Addresses {...{ user, regions }} />
      </div>
    </main>
  )
}
