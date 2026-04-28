import { Button } from "@/components/atoms"
import LocalizedClientLink from "@/components/molecules/LocalizedLink/LocalizedLink"
import { CollapseIcon } from "@/icons"
import { getTranslations } from "next-intl/server"
import Image from "next/image"

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const t = await getTranslations("Checkout")
  return (
    <>
      <link rel="preconnect" href="https://js.stripe.com" crossOrigin="anonymous" />
      <link rel="preconnect" href="https://m.stripe.network" crossOrigin="anonymous" />
      <div className="flex min-h-screen flex-col bg-white">
      <header className="shrink-0 border-b border-[#e8e8e8] bg-white">
        <div className="relative flex min-h-[3.75rem] w-full items-center justify-center px-4 py-3 sm:px-6">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 sm:left-6">
            <LocalizedClientLink href="/cart">
              <Button variant="tonal" className="flex items-center gap-2">
                <CollapseIcon className="rotate-90" />
                <span className="hidden sm:inline">{t("backToCart")}</span>
              </Button>
            </LocalizedClientLink>
          </div>
          <LocalizedClientLink href="/" className="inline-flex items-center">
            <Image
              src="/tramelle.svg"
              width={260}
              height={52}
              alt="Tramelle Source Gourmet"
              className="h-10 w-auto max-h-11 md:h-12 md:max-h-[52px]"
              priority
              unoptimized
            />
          </LocalizedClientLink>
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
    </>
  )
}
