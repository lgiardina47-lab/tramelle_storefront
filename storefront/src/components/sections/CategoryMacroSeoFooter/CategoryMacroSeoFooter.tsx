import Link from "next/link"

import {
  parseCategorySeoFooter,
  type CategorySeoFooterPart,
} from "@/lib/tramelle-category-seo-footer"

function localizedInternalHref(path: string, localeSeg: string): string {
  const raw = path.trim()
  const seg = localeSeg.trim().toLowerCase() || "it"
  const q = raw.indexOf("?")
  const hash = raw.indexOf("#")
  if (q !== -1 && (hash === -1 || q < hash)) {
    const base = raw.slice(0, q)
    const rest = raw.slice(q + 1)
    const pathOnly = base.startsWith("/") ? base : `/${base}`
    return `/${seg}${pathOnly}?${rest}`
  }
  if (hash !== -1) {
    const base = raw.slice(0, hash)
    const frag = raw.slice(hash)
    const pathOnly = base.startsWith("/") ? base : `/${base}`
    return `/${seg}${pathOnly}${frag}`
  }
  const pathOnly = raw.startsWith("/") ? raw : `/${raw}`
  return `/${seg}${pathOnly}`
}

function SeoParts({
  parts,
  locale,
}: {
  parts: CategorySeoFooterPart[]
  locale: string
}) {
  const seg = (locale || "it").trim().toLowerCase() || "it"
  return (
    <>
      {parts.map((p, i) => {
        if (p.type === "text") {
          return <span key={i}>{p.text}</span>
        }
        if (p.type === "strong") {
          return (
            <strong key={i} className="font-medium text-[#0F0E0B]">
              {p.text}
            </strong>
          )
        }
        const href = localizedInternalHref(p.path, seg)
        return (
          <Link
            key={i}
            href={href}
            className="text-[#0F0E0B] underline underline-offset-[3px]"
          >
            {p.label}
          </Link>
        )
      })}
    </>
  )
}

/**
 * Blocco SEO a fondo pagina macro: dati strutturati in
 * `metadata.tramelle_seo_footer` (Admin → Storefront SEO).
 */
export function CategoryMacroSeoFooter({
  metadata,
  locale,
}: {
  metadata: unknown
  locale: string
}) {
  const data = parseCategorySeoFooter(metadata)
  if (!data) {
    return null
  }

  return (
    <section
      className="w-full border-t border-[#E8E4DE] bg-white px-7 py-[52px] sm:px-8"
      aria-label="Informazioni sulla categoria"
      data-testid="category-macro-seo-footer"
    >
      <div className="mx-auto max-w-[760px]">
        <h2 className="mb-3.5 font-tramelle-hero text-sm font-bold uppercase tracking-[0.08em] text-[#0F0E0B]">
          {data.title}
        </h2>

        <p className="mb-7 text-[13px] leading-[1.78] text-[#8A8580]">
          <SeoParts parts={data.lead} locale={locale} />
        </p>

        {data.sections.map((sec, idx) => (
          <div key={idx} className={idx < data.sections.length - 1 ? "mb-7" : ""}>
            <h3 className="mb-2.5 font-tramelle-hero text-xs font-bold uppercase tracking-[0.08em] text-[#0F0E0B]">
              {sec.heading}
            </h3>
            <p className="text-[13px] leading-[1.78] text-[#8A8580]">
              <SeoParts parts={sec.parts} locale={locale} />
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

export { CATEGORY_SEO_FOOTER_METADATA_KEY } from "@/lib/tramelle-category-seo-footer"
