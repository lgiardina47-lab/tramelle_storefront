"use client"

import { useCartContext } from "@/components/providers"
import { convertToLocale } from "@/lib/helpers/money"
import {
  nextCartonDelta,
  parsePiecesPerCarton,
  parseWholesaleTiers,
  unitPriceForWholesaleQty,
} from "@/lib/helpers/tramelle-variant-metadata"
import type { HttpTypes } from "@medusajs/types"

export function WholesalePricingPanel({
  variant,
  retailEuros,
  currencyCode,
  locale,
}: {
  variant: HttpTypes.StoreProductVariant | undefined
  retailEuros: number
  currencyCode: string
  locale: string
}) {
  const { cart, wholesaleBuyer } = useCartContext()

  if (!wholesaleBuyer || !variant) return null

  const meta = variant.metadata as Record<string, unknown> | undefined
  const tiers = parseWholesaleTiers(meta)
  const carton = parsePiecesPerCarton(meta)

  if (tiers.length === 0 && carton <= 0) return null

  const nf = locale || "it-IT"
  const lineQty =
    cart?.items?.find((i) => i.variant_id === variant.id)?.quantity ?? 0
  const delta = nextCartonDelta(lineQty, carton)
  const nextQty = lineQty + delta
  const nextUnit =
    delta > 0
      ? unitPriceForWholesaleQty(tiers, retailEuros, nextQty)
      : null

  const rows: { label: string; min: number; price: number }[] = [
    { label: "1+", min: 1, price: retailEuros },
    ...tiers
      .filter((t) => t.min_qty >= 2)
      .map((t) => ({
        label: `${t.min_qty}+`,
        min: t.min_qty,
        price: t.unit_price_euros,
      })),
  ]

  return (
    <div className="mt-4 space-y-3 rounded-sm border border-secondary/20 p-4">
      <p className="text-sm font-semibold uppercase tracking-wide text-secondary">
        Wholesale pricing
      </p>
      {tiers.length > 0 && (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-secondary/20 text-secondary">
              <th className="pb-2 pr-2 font-medium">From qty</th>
              <th className="pb-2 pr-2 font-medium">Unit price</th>
              <th className="pb-2 font-medium">vs retail</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const save =
                retailEuros > 0
                  ? Math.round(
                      (1 - r.price / retailEuros) * 1000
                    ) / 10
                  : 0
              return (
                <tr key={r.min} className="border-b border-secondary/10">
                  <td className="py-1.5 pr-2">{r.label}</td>
                  <td className="py-1.5 pr-2 font-medium">
                    {convertToLocale({
                      amount: r.price,
                      currency_code: currencyCode,
                      locale: nf,
                    })}
                  </td>
                  <td className="py-1.5 text-secondary">
                    {r.min === 1
                      ? "—"
                      : save > 0
                        ? `−${save}%`
                        : "—"}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
      {carton > 0 && delta > 0 && nextUnit != null && (
        <p className="text-sm text-secondary">
          Add{" "}
          <span className="font-semibold text-primary">{delta}</span> more unit
          {delta === 1 ? "" : "s"} to complete a carton of {carton}. At{" "}
          {nextQty} units your unit price can be{" "}
          <span className="font-semibold text-primary">
            {convertToLocale({
              amount: nextUnit,
              currency_code: currencyCode,
              locale: nf,
            })}
          </span>
          .
        </p>
      )}
      {carton > 0 && lineQty > 0 && lineQty % carton !== 0 && (
        <p className="text-xs text-amber-800">
          B2B: order quantity should be a multiple of {carton} (full cartons).
        </p>
      )}
    </div>
  )
}
