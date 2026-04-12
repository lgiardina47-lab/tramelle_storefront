import Image from "next/image"

import tailwindConfig from "../../../../tailwind.config"
import { ArrowRightIcon } from "@/icons"
import Link from "next/link"

type HeroProps = {
  image: string
  heading: string
  paragraph: string
  buttons: { label: string; path: string }[]
}

export const Hero = ({ image, heading, paragraph, buttons }: HeroProps) => {
  return (
    <section className="container mt-5 flex w-full max-w-full min-w-0 flex-col overflow-x-hidden text-primary lg:flex-row lg:items-stretch lg:gap-6">
      <div className="order-2 flex w-full min-w-0 max-w-full flex-[1_1_50%] justify-center lg:order-1">
        <Image
          src={decodeURIComponent(image)}
          width={700}
          height={600}
          alt={`Hero banner - ${heading}`}
          className="h-auto w-full max-h-[min(42vh,420px)] max-w-full object-contain object-left lg:max-h-[min(48vh,480px)]"
          priority
          fetchPriority="high"
          quality={50}
          sizes="(min-width: 1024px) 42vw, 92vw"
        />
      </div>
      <div className="flex w-full min-w-0 flex-[1_1_50%] flex-col lg:order-2">
        <div className="border rounded-sm w-full px-6 flex items-end h-[calc(100%-144px)]">
          <div>
            <h2 className="font-bold mb-6 uppercase display-md max-w-[652px] text-4xl md:text-5xl leading-tight">
              {heading}
            </h2>
            <p className="text-lg mb-8">{paragraph}</p>
          </div>
        </div>
        {buttons.length && (
          <div className="h-[72px] lg:h-[144px] flex font-bold uppercase">
            {buttons.map(({ label, path }) => (
              <Link
                key={path}
                href={path}
                className="group flex border rounded-sm h-full w-1/2 bg-content hover:bg-action hover:text-tertiary transition-all duration-300 p-6 justify-between items-end"
                aria-label={label}
                title={label}
              >
                <span>
                  <span className="group-hover:inline-flex hidden">#</span>
                  {label}
                </span>

                <ArrowRightIcon
                  color={tailwindConfig.theme.extend.backgroundColor.primary}
                  aria-hidden
                />
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
