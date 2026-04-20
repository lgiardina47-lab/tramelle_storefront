import Image from "next/image"
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
      <div className="order-2 flex w-full min-w-0 max-w-full flex-[1_1_50%] items-center justify-center lg:order-1">
        <Image
          src={decodeURIComponent(image)}
          width={700}
          height={600}
          alt={`Hero — ${heading}`}
          className="h-auto w-full max-h-[min(46vh,460px)] max-w-full object-contain object-center lg:max-h-[min(52vh,520px)] lg:object-left"
          priority
          fetchPriority="high"
          quality={75}
          sizes="(min-width: 1024px) 42vw, 92vw"
        />
      </div>
      <div className="flex w-full min-w-0 flex-[1_1_50%] flex-col lg:order-2">
        <div className="border rounded-sm w-full px-6 py-8 flex items-end min-h-[200px] lg:h-[calc(100%-144px)] lg:py-0">
          <div>
            <h1 className="display-md uppercase mb-5 max-w-[620px]">
              {heading}
            </h1>
            <p className="text-md text-secondary leading-relaxed max-w-[480px]">{paragraph}</p>
          </div>
        </div>
        {buttons.length > 0 && (
          <div className="h-[80px] lg:h-[144px] flex font-medium uppercase tracking-wide">
            {buttons.map(({ label, path }, index) => (
              <Link
                key={path}
                href={path}
                prefetch={true}
                className={
                  index === 0
                    ? "flex border rounded-sm h-full w-1/2 bg-action text-tertiary hover:bg-action-hover transition-all duration-200 p-5 lg:p-6 justify-between items-end"
                    : "flex border rounded-sm h-full w-1/2 bg-primary text-primary hover:bg-action hover:text-tertiary transition-all duration-200 p-5 lg:p-6 justify-between items-end"
                }
                aria-label={label}
                title={label}
              >
                <span className="text-sm lg:text-md">{label}</span>
                <ArrowRightIcon aria-hidden />
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
