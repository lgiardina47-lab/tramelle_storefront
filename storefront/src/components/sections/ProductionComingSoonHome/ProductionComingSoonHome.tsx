import Image from "next/image"

import { Montserrat } from "next/font/google"

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
})

/** Solo codici ISO a 2 lettere: stesso glifo, stessa cella — niente emoji (dimensioni incoerenti tra browser). */
const LANG_CODES: { id: string; short: string; label: string }[] = [
  { id: "it", short: "IT", label: "Italiano" },
  { id: "en", short: "EN", label: "English" },
  { id: "fr", short: "FR", label: "Français" },
  { id: "de", short: "DE", label: "Deutsch" },
  { id: "es", short: "ES", label: "Español" },
  { id: "ja", short: "JA", label: "日本語" },
]

/**
 * Home "Coming Soon" solo in produzione: bianco, tipografia Montserrat, zero chrome extra.
 */
export function ProductionComingSoonHome() {
  return (
    <main
      className={`${montserrat.className} min-h-screen w-full bg-[#FFFFFF] text-[#000000] flex flex-col items-center justify-center px-6 py-14 sm:py-20`}
    >
      <div className="flex w-full max-w-xl flex-col items-center text-center">
        {/* Logo */}
        <div className="relative mb-4 h-16 w-[min(280px,72vw)] sm:mb-5 sm:h-20 sm:w-[min(320px,80vw)]">
          <Image
            src="/tramelle.svg"
            alt="Tramelle"
            fill
            className="object-contain"
            priority
            sizes="(max-width: 640px) 72vw, 320px"
          />
        </div>

        {/* Tagline sotto logo */}
        <p className="mb-10 text-[clamp(0.7rem,2.8vw,0.9rem)] font-normal uppercase tracking-[0.22em] text-[#000000]/75 sm:mb-12">
          SOURCE GOURMET MARKETPLACE
        </p>

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
            6 lingue per raccontare la tua storia, un&apos;unica piattaforma per
            conquistare il mondo.
          </p>
          <p className="pt-2 text-[0.95em] font-medium uppercase tracking-[0.12em] text-[#000000]">
            Coming Soon.
          </p>
        </div>

        {/* Lingue: griglia 6 colonne — ogni cella quadrata uguale (aspect-square + 1fr) */}
        <div
          className="mt-10 grid w-full max-w-[16.5rem] grid-cols-6 gap-1.5 sm:mt-12 sm:max-w-[18rem] sm:gap-2"
          role="list"
          aria-label="Lingue del sito"
        >
          {LANG_CODES.map(({ id, short, label }) => (
            <span
              key={id}
              role="listitem"
              title={label}
              aria-label={label}
              className="flex aspect-square min-h-0 min-w-0 items-center justify-center rounded-md border border-[#000000]/14 bg-[#FAFAFA] p-0"
            >
              <span
                className="w-full text-center font-semibold leading-none tracking-wide text-[#000000] [font-size:clamp(0.5625rem,2.6vw,0.6875rem)] sm:text-[0.6875rem]"
                aria-hidden
              >
                {short}
              </span>
            </span>
          ))}
        </div>
      </div>
    </main>
  )
}
