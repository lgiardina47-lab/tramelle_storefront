import { Cormorant_Garamond, DM_Sans, Oswald } from "next/font/google"

/** UI, body, label, bottoni — design system Tramelle */
export const tramelleDmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  display: "swap",
  variable: "--font-tramelle-dm",
})

/** Titoli sezione h2, prezzi, enfasi serif */
export const tramelleCormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-tramelle-cormorant",
})

/** Display: hero, H1 prodotto/pagina (600–700) */
export const tramelleOswald = Oswald({
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
  variable: "--font-tramelle-oswald",
})

/** Applicare su `<html>` (o wrapper alto) così `font-tramelle` / `font-tramelle-display` / `font-tramelle-hero` risolvono. */
export const tramelleDesignSystemFontVariables = [
  tramelleDmSans.variable,
  tramelleCormorant.variable,
  tramelleOswald.variable,
].join(" ")
