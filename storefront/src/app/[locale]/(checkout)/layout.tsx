import { Button } from "@/components/atoms"
import LocalizedClientLink from "@/components/molecules/LocalizedLink/LocalizedLink"
import { CollapseIcon } from "@/icons"
import Image from "next/image"

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <header className="border-b border-[#e8e8e8] bg-white">
        <div className="relative mx-auto w-full max-w-[62rem] py-3 lg:px-6 px-4">
          <div className="absolute top-3">
            <LocalizedClientLink href="/cart">
              <Button variant="tonal" className="flex items-center gap-2">
                <CollapseIcon className="rotate-90" />
                <span className="hidden lg:block">Back to cart</span>
              </Button>
            </LocalizedClientLink>
          </div>
          <div className="flex items-center justify-center pl-4 lg:pl-0 w-full">
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
        </div>
      </header>
      {children}
    </div>
  )
}
