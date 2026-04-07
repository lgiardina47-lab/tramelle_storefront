import Image from "next/image"

import { Montserrat } from "next/font/google"

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
})

/**
 * Home “Coming Soon” solo in produzione: bianco, tipografia Montserrat, zero chrome extra.
 */
export function ProductionComingSoonHome() {
  return (
    <main
      className={`${montserrat.className} min-h-screen w-full bg-[#FFFFFF] text-[#000000] flex flex-col items-center justify-center px-6 py-14 sm:py-20`}
    >
      <div className="flex w-full max-w-xl flex-col items-center text-center">
        <div className="relative mb-10 h-16 w-[min(280px,72vw)] sm:mb-12 sm:h-20 sm:w-[min(320px,80vw)]">
          <Image
            src="/tramelle.svg"
            alt="Tramelle"
            fill
            className="object-contain"
            priority
            sizes="(max-width: 640px) 72vw, 320px"
          />
        </div>

        <h1 className="text-balance text-[clamp(1.05rem,4.2vw,1.65rem)] font-semibold uppercase leading-snug tracking-[0.06em] sm:tracking-[0.08em]">
          IL MONDO È PIENO DI POSSIBILITÀ
        </h1>

        <div className="mt-8 w-full space-y-5 text-[clamp(0.9rem,3.2vw,1.05rem)] font-light leading-[1.75] tracking-wide text-[#000000]/88 sm:mt-10 sm:space-y-6">
          <p className="font-medium text-[#000000]">
            Tramelle.com: L&apos;eccellenza non ha più confini.
          </p>
          <p>
            La prima vetrina globale dedicata esclusivamente ai maestri del
            Gourmet.
          </p>
          <p>
            Un unico palcoscenico dove i produttori incontrano il mercato B2C e
            B2B.
          </p>
          <p>
            5 lingue per raccontare la tua storia, un&apos;unica piattaforma per
            conquistare il mondo.
          </p>
          <p className="pt-2 text-[0.95em] font-medium uppercase tracking-[0.12em] text-[#000000]">
            Coming Soon.
          </p>
        </div>
      </div>
    </main>
  )
}
