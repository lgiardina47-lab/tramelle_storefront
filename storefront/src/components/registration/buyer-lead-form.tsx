"use client"

import { Button } from "@/components/atoms"
import { LabeledInput } from "@/components/cells"
import { toast } from "@/lib/helpers/toast"
import { cn } from "@/lib/utils"
import type { StoreCountryOption } from "@/lib/registration/store-country-option"
import { TRAMELLE_MACRO_CATEGORY_FORM_OPTIONS } from "@/lib/tramelle-macro-categories"
import { zodResolver } from "@hookform/resolvers/zod"
import { Container } from "@medusajs/ui"
import { useTranslations } from "next-intl"
import { useParams, useRouter } from "next/navigation"
import { useForm, Controller, FieldError } from "react-hook-form"
import { z } from "zod"

const ACTIVITY = z.enum([
  "importer",
  "distributor",
  "retailer",
  "horeca",
  "gdo",
  "other",
])

const VOLUME = z.enum(["lt1k", "1k5k", "5k20k", "gt20k"])

const MACRO_SET = new Set(TRAMELLE_MACRO_CATEGORY_FORM_OPTIONS.map((m) => m.value))

const schema = z.object({
  companyName: z.string().min(1),
  contactName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  country: z.string().min(1),
  vat: z.string().min(1),
  activityType: ACTIVITY,
  interestCategories: z.array(z.string()).min(1),
  monthlyVolume: VOLUME,
  companyWebsite: z.string().optional(),
})

type FormData = z.infer<typeof schema>

function refineMacros(data: FormData, ctx: z.RefinementCtx) {
  const bad = data.interestCategories.filter((h) => !MACRO_SET.has(h))
  if (bad.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "invalid",
      path: ["interestCategories"],
    })
  }
}

const schemaWithMacros = schema.superRefine(refineMacros)

export function BuyerLeadForm({
  countries,
  id = "registration-lead-form",
}: {
  countries: StoreCountryOption[]
  id?: string
}) {
  const t = useTranslations("Registration")
  const router = useRouter()
  const params = useParams()
  const locale = typeof params?.locale === "string" ? params.locale : "it"

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schemaWithMacros),
    defaultValues: {
      country: "",
      activityType: "importer",
      monthlyVolume: "lt1k",
      interestCategories: [],
    },
  })

  const onSubmit = async (data: FormData) => {
    const payload = {
      companyName: data.companyName.trim(),
      contactName: data.contactName.trim(),
      email: data.email.trim(),
      phone: data.phone?.trim() || undefined,
      country: data.country,
      vat: data.vat.trim(),
      activityType: data.activityType,
      interestCategories: data.interestCategories,
      monthlyVolume: data.monthlyVolume,
      companyWebsite: data.companyWebsite?.trim() || undefined,
      submittedAt: new Date().toISOString(),
      locale,
    }

    try {
      const res = await fetch("/api/tramelle/registration-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "b2b", payload }),
      })
      if (!res.ok) {
        toast.error({ title: t("errorSubmit") })
        return
      }
      router.push(`/${locale}/grazie/b2b`)
    } catch {
      toast.error({ title: t("errorSubmit") })
    }
  }

  return (
    <Container id={id} className="mx-auto max-w-2xl border p-6">
      <h2 className="heading-sm mb-6 text-primary uppercase">{t("formBuyerHeading")}</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <LabeledInput
          label={`${t("fieldCompany")} *`}
          error={errors.companyName as FieldError}
          {...register("companyName")}
        />
        <LabeledInput
          label={`${t("fieldContactName")} *`}
          error={errors.contactName as FieldError}
          {...register("contactName")}
        />
        <LabeledInput
          label={`${t("fieldBusinessEmail")} *`}
          type="email"
          error={errors.email as FieldError}
          {...register("email")}
        />
        <LabeledInput label={t("fieldPhone")} {...register("phone")} />
        <div>
          <label className="mb-1 block text-sm font-medium">{t("fieldCountry")} *</label>
          <select
            className={cn(
              "w-full rounded-md border border-neutral-200 px-3 py-2 text-sm",
              errors.country && "border-red-500"
            )}
            {...register("country")}
          >
            <option value="">—</option>
            {countries.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <LabeledInput
          label={`${t("fieldVat")} *`}
          error={errors.vat as FieldError}
          {...register("vat")}
        />
        <div>
          <label className="mb-1 block text-sm font-medium">{t("fieldActivityType")} *</label>
          <select
            className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
            {...register("activityType")}
          >
            <option value="importer">{t("activityImporter")}</option>
            <option value="distributor">{t("activityDistributor")}</option>
            <option value="retailer">{t("activityRetailer")}</option>
            <option value="horeca">{t("activityHoreca")}</option>
            <option value="gdo">{t("activityGdo")}</option>
            <option value="other">{t("activityOther")}</option>
          </select>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium">{t("fieldInterestCategories")} *</p>
          <Controller
            name="interestCategories"
            control={control}
            render={({ field }) => (
              <div className="grid gap-2 sm:grid-cols-2">
                {TRAMELLE_MACRO_CATEGORY_FORM_OPTIONS.map((m) => {
                  const checked = field.value?.includes(m.value) ?? false
                  return (
                    <label key={m.value} className="flex items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={checked}
                        onChange={(e) => {
                          const next = new Set(field.value ?? [])
                          if (e.target.checked) next.add(m.value)
                          else next.delete(m.value)
                          field.onChange(Array.from(next))
                        }}
                      />
                      <span>{m.label}</span>
                    </label>
                  )
                })}
              </div>
            )}
          />
          {errors.interestCategories ? (
            <p className="mt-1 text-sm text-red-600">Seleziona almeno una categoria</p>
          ) : null}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">{t("fieldMonthlyVolume")} *</label>
          <select
            className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
            {...register("monthlyVolume")}
          >
            <option value="lt1k">{t("volLt1k")}</option>
            <option value="1k5k">{t("vol1k5k")}</option>
            <option value="5k20k">{t("vol5k20k")}</option>
            <option value="gt20k">{t("volGt20k")}</option>
          </select>
        </div>
        <LabeledInput label={t("fieldCompanyWebsite")} {...register("companyWebsite")} />
        <Button
          type="submit"
          className="flex w-full justify-center uppercase"
          disabled={isSubmitting}
          loading={isSubmitting}
        >
          {t("formBuyerSubmit")}
        </Button>
      </form>
    </Container>
  )
}
