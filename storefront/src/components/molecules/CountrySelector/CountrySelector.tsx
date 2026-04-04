"use client"

import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  Transition,
} from "@headlessui/react"
import { Fragment, useEffect, useMemo, useState } from "react"
import ReactCountryFlag from "react-country-flag"

import { useParams, usePathname, useRouter } from "next/navigation"
import { HttpTypes } from "@medusajs/types"

import { updateRegionWithValidation } from "@/lib/data/cart"
import { Label } from "@medusajs/ui"
import { toast } from "@/lib/helpers/toast"
import { ArrowDownIcon } from "@/icons"
import { cn } from "@/lib/utils"

type CountryOption = {
  country: string
  region: string
  label: string
}

type CountrySelectProps = {
  regions: HttpTypes.StoreRegion[]
  /** compact = solo bandiera; deliveryPill = box “Informazioni di consegna” come marketplace grocery */
  variant?: "compact" | "deliveryPill"
}

const CountrySelect = ({
  regions,
  variant = "compact",
}: CountrySelectProps) => {
  const [current, setCurrent] = useState<
    | { country: string | undefined; region: string; label: string | undefined }
    | undefined
  >(undefined)

  const { locale: countryCode } = useParams()
  const router = useRouter()
  const currentPath = usePathname().split(`/${countryCode}`)[1]

  const options = useMemo(() => {
    return regions
      ?.map((r) => {
        return r.countries?.map((c) => ({
          country: c.iso_2,
          region: r.id,
          label: c.display_name,
        }))
      })
      .flat()
      .sort((a, b) => (a?.label ?? "").localeCompare(b?.label ?? ""))
  }, [regions])

  useEffect(() => {
    if (countryCode) {
      const option = options?.find((o) => o?.country === countryCode)
      setCurrent(option)
    }
  }, [options, countryCode])

  const handleChange = async (option: CountryOption) => {
    try {
      const result = await updateRegionWithValidation(
        option.country,
        currentPath
      )

      if (result.removedItems.length > 0) {
        const itemsList = result.removedItems.join(", ")
        toast.info({
          title: "Cart updated",
          description: `${itemsList} ${result.removedItems.length === 1 ? "is" : "are"} not available in ${option.label} and ${result.removedItems.length === 1 ? "was" : "were"} removed from your cart.`,
        })
      }

      router.push(result.newPath)
      router.refresh()
    } catch (error: any) {
      toast.error({
        title: "Error switching region",
        description:
          error?.message || "Failed to update region. Please try again.",
      })
    }
  }

  const isPill = variant === "deliveryPill"

  return (
    <div
      className={cn(
        "relative",
        isPill ? "" : "md:flex md:items-center md:justify-end md:gap-2"
      )}
    >
      {!isPill && (
        <Label className="label-md hidden md:block">Shipping to</Label>
      )}
      <div className={cn(isPill && "min-w-[12rem] max-w-[20rem]")}>
        <Listbox
          onChange={handleChange}
          defaultValue={
            countryCode
              ? options?.find((o) => o?.country === countryCode)
              : undefined
          }
        >
          <ListboxButton
            className={cn(
              "relative flex cursor-default items-center border text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-cortilia/30",
              isPill
                ? "w-full rounded-full border-neutral-200 bg-white px-4 py-2.5 pr-3 shadow-none transition-colors hover:border-cortilia/40"
                : "h-10 w-16 justify-between rounded-lg bg-component-secondary focus-visible:border-gray-300 focus-visible:ring-opacity-75 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-300 text-base-regular"
            )}
          >
            {isPill ? (
              <span className="flex min-w-0 flex-1 items-center gap-2">
                {current?.country ? (
                  // @ts-expect-error react-country-flag types
                  <ReactCountryFlag
                    alt={`${current.country?.toUpperCase()} flag`}
                    svg
                    style={{ width: "20px", height: "20px" }}
                    countryCode={current.country ?? ""}
                  />
                ) : (
                  <span className="h-5 w-5 shrink-0 rounded-full bg-neutral-100" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-medium leading-tight text-cortilia">
                    Informazioni di consegna
                  </span>
                  <span className="mt-0.5 block truncate text-sm font-semibold leading-tight text-cortilia">
                    {current?.label
                      ? `${current.label} · Oggi, 17:00 – 23:00`
                      : "Seleziona zona di consegna"}
                  </span>
                </span>
                <ArrowDownIcon
                  size={18}
                  color="#000000"
                  className="shrink-0 text-cortilia"
                />
              </span>
            ) : (
              <div className="txt-compact-small mx-auto flex items-start">
                {current && (
                  <span className="txt-compact-small flex items-center gap-x-2">
                    {/* @ts-expect-error react-country-flag */}
                    <ReactCountryFlag
                      alt={`${current.country?.toUpperCase()} flag`}
                      svg
                      style={{
                        width: "16px",
                        height: "16px",
                      }}
                      countryCode={current.country ?? ""}
                    />
                    {current.country?.toUpperCase()}
                  </span>
                )}
              </div>
            )}
          </ListboxButton>
          <div className={cn("relative", isPill ? "w-full" : "flex w-16")}>
            <Transition
              as={Fragment}
              leave="transition ease-in duration-150"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <ListboxOptions
                className={cn(
                  "no-scrollbar absolute z-30 mt-1 max-h-60 overflow-auto rounded-lg border border-neutral-200 bg-white text-sm shadow-lg focus:outline-none",
                  isPill ? "left-0 w-full min-w-[16rem]" : "w-16 border-t-0"
                )}
              >
                {options?.map((o, index) => {
                  return (
                    <ListboxOption
                      key={index}
                      value={o}
                      className={cn(
                        "cursor-pointer select-none border-b border-neutral-100 py-2.5 pl-3 pr-2 last:border-b-0 hover:bg-cortilia-muted/50",
                        !isPill && "relative w-16"
                      )}
                    >
                      <span className="flex items-center gap-x-2">
                        {/* @ts-expect-error react-country-flag */}
                        <ReactCountryFlag
                          svg
                          style={{
                            width: "16px",
                            height: "16px",
                          }}
                          countryCode={o?.country ?? ""}
                        />
                        {isPill ? (
                          <span>{o?.label}</span>
                        ) : (
                          <span>{o?.country?.toUpperCase()}</span>
                        )}
                      </span>
                    </ListboxOption>
                  )
                })}
              </ListboxOptions>
            </Transition>
          </div>
        </Listbox>
      </div>
    </div>
  )
}

export default CountrySelect
