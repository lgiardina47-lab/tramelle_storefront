import { SellerDirectoryCard } from "@/components/organisms/SellerDirectoryCard/SellerDirectoryCard"
import { getIndexingRobots, publicSiteOrigin, resolvedSiteName } from "@/lib/constants/site"
import { listStoreSellers } from "@/lib/data/seller"
import { toHreflang } from "@/lib/helpers/hreflang"
import { listRegions } from "@/lib/data/regions"
import type { Metadata } from "next"
import Link from "next/link"
const PAGE_SIZE = 24

export const revalidate = 120

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const baseUrl = publicSiteOrigin()

  let languages: Record<string, string> = {}
  try {
    const regions = await listRegions()
    const locales = Array.from(
      new Set(
        (regions || []).flatMap((r) => r.countries?.map((c) => c.iso_2) || [])
      )
    ) as string[]
    languages = locales.reduce<Record<string, string>>((acc, code) => {
      acc[toHreflang(code)] = `${baseUrl}/${code}/sellers`
      return acc
    }, {})
  } catch {
    languages = { [toHreflang(locale)]: `${baseUrl}/${locale}/sellers` }
  }

  const site = resolvedSiteName()
  const title = locale === "it" ? "Produttori" : "Producers"
  const description =
    locale === "it"
      ? `Scopri tutti i produttori e le cantine su ${site}.`
      : `Discover all producers and sellers on ${site}.`
  const canonical = `${baseUrl}/${locale}/sellers`

  return {
    title,
    description,
    alternates: {
      canonical,
      languages: { ...languages, "x-default": `${baseUrl}/sellers` },
    },
    robots: getIndexingRobots(),
    openGraph: {
      title: `${title} | ${site}`,
      description,
      url: canonical,
    },
  }
}

export default async function SellersDirectoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const { locale } = await params
  const sp = await searchParams
  const pageRaw = parseInt(sp.page || "1", 10)
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? pageRaw : 1
  const offset = (page - 1) * PAGE_SIZE

  const data = await listStoreSellers({
    limit: PAGE_SIZE,
    offset,
    contentLocale: locale,
  })
  const sellers = data?.sellers ?? []
  const total = data?.count ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <main className="container py-10 md:py-14">
      <div className="mb-10 max-w-2xl">
        <h1 className="heading-lg text-primary uppercase tracking-tight">
          {locale === "it" ? "Produttori" : "Producers"}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-neutral-600 md:text-base">
          {locale === "it"
            ? "Specialità, cantine e artigiani del gusto: scegli un produttore per vedere i suoi prodotti."
            : "Specialties, makers, and gourmet producers — pick one to browse their catalog."}
        </p>
      </div>

      {!data ? (
        <p className="text-sm text-neutral-600">
          {locale === "it"
            ? "Impossibile caricare l’elenco. Riprova tra poco."
            : "We couldn’t load the list. Please try again shortly."}
        </p>
      ) : sellers.length === 0 ? (
        <p className="text-sm text-neutral-600">
          {locale === "it"
            ? "Nessun produttore pubblico con testo o immagini (logo/banner) in elenco al momento."
            : "No public producers with text or listing images in this language yet."}
        </p>
      ) : (
        <>
          <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sellers.map((seller) => (
              <li key={seller.id}>
                <SellerDirectoryCard seller={seller} urlLocale={locale} />
              </li>
            ))}
          </ul>

          {totalPages > 1 ? (
            <nav
              className="mt-12 flex flex-wrap items-center justify-center gap-3"
              aria-label={locale === "it" ? "Paginazione" : "Pagination"}
            >
              {page > 1 ? (
                <Link
                  href={`/${locale}/sellers${page > 2 ? `?page=${page - 1}` : ""}`}
                  className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-neutral-50"
                >
                  {locale === "it" ? "Precedente" : "Previous"}
                </Link>
              ) : null}
              <span className="text-sm text-neutral-600">
                {locale === "it" ? "Pagina" : "Page"} {page} / {totalPages}
              </span>
              {page < totalPages ? (
                <Link
                  href={`/${locale}/sellers?page=${page + 1}`}
                  className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-neutral-50"
                >
                  {locale === "it" ? "Successiva" : "Next"}
                </Link>
              ) : null}
            </nav>
          ) : null}
        </>
      )}
    </main>
  )
}
