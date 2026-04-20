"use client"

import { Button } from "@/components/atoms"
import { LabeledInput } from "@/components/cells"
import { toast } from "@/lib/helpers/toast"
import { cn } from "@/lib/utils"
import { TRAMELLE_ITALY_REGION_OPTIONS } from "@/lib/registration/italy-regions"
import type { StoreCountryOption } from "@/lib/registration/store-country-option"
import { TRAMELLE_MACRO_CATEGORY_FORM_OPTIONS } from "@/lib/tramelle-macro-categories"
import { zodResolver } from "@hookform/resolvers/zod"
import { Container } from "@medusajs/ui"
import { useTranslations } from "next-intl"
import { useParams, useRouter } from "next/navigation"
import { useForm, Controller, FieldError } from "react-hook-form"
import { z } from "zod"

const MACRO_SET = new Set(TRAMELLE_MACRO_CATEGORY_FORM_OPTIONS.map((m) => m.value))

const schema = z
  .object({
    companyName: z.string().min(1),
    contactName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
    country: z.string().min(1),
    regionIt: z.string().optional(),
    mainCategory: z.string().refine((v) => MACRO_SET.has(v), { message: "Invalid" }),
    websiteSocial: z.string().optional(),
    description: z.string().min(1).max(300),
    certDop: z.boolean().optional(),
    certIgp: z.boolean().optional(),
    certBio: z.boolean().optional(),
    certSlow: z.boolean().optional(),
    certNone: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.country === "IT" && !data.regionIt?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "required",
        path: ["regionIt"],
      })
    }
  })

type FormData = z.infer<typeof schema>

export function ProducerLeadForm({
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
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      country: "",
      mainCategory: "",
      certDop: false,
      certIgp: false,
      certBio: false,
      certSlow: false,
      certNone: false,
    },
  })

  const certNone = watch("certNone")

  const onSubmit = async (data: FormData) => {
    const certifications: string[] = []
    if (data.certNone) certifications.push("none")
    else {
      if (data.certDop) certifications.push("dop")
      if (data.certIgp) certifications.push("igp")
      if (data.certBio) certifications.push("bio")
      if (data.certSlow) certifications.push("slow_food")
    }

    const payload = {
      companyName: data.companyName.trim(),
      contactName: data.contactName.trim(),
      email: data.email.trim(),
      phone: data.phone?.trim() || undefined,
      country: data.country,
      regionIt: data.country === "IT" ? data.regionIt?.trim() : undefined,
      mainCategory: data.mainCategory,
      websiteSocial: data.websiteSocial?.trim() || undefined,
      description: data.description.trim(),
      certifications,
      submittedAt: new Date().toISOString(),
      locale,
    }

    try {
      const res = await fetch("/api/tramelle/registration-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "producer", payload }),
      })
      if (!res.ok) {
        toast.error({ title: t("errorSubmit") })
        return
      }
      router.push(`/${locale}/grazie/produttore`)
    } catch {
      toast.error({ title: t("errorSubmit") })
    }
  }

  return (
    <Container id={id} className="mx-auto max-w-2xl border p-6">
      <h2 className="heading-sm mb-6 text-primary uppercase">{t("formProducerHeading")}</h2>
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
          label={`${t("fieldEmail")} *`}
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
        {watch("country") === "IT" ? (
          <div>
            <label className="mb-1 block text-sm font-medium">{t("fieldRegionIt")}</label>
            <select
              className={cn(
                "w-full rounded-md border border-neutral-200 px-3 py-2 text-sm",
                errors.regionIt && "border-red-500"
              )}
              {...register("regionIt")}
            >
              <option value="">—</option>
              {TRAMELLE_ITALY_REGION_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            {errors.regionIt ? (
              <p className="mt-1 text-sm text-red-600">Obbligatorio per l&apos;Italia</p>
            ) : null}
          </div>
        ) : null}
        <div>
          <label className="mb-1 block text-sm font-medium">{t("fieldMainCategory")} *</label>
          <select
            className={cn(
              "w-full rounded-md border border-neutral-200 px-3 py-2 text-sm",
              errors.mainCategory && "border-red-500"
            )}
            {...register("mainCategory")}
          >
            <option value="">—</option>
            {TRAMELLE_MACRO_CATEGORY_FORM_OPTIONS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <LabeledInput label={t("fieldWebsiteSocial")} {...register("websiteSocial")} />
        <div>
          <label className="mb-1 block text-sm font-medium">{t("fieldCompanyDesc")} *</label>
          <textarea
            rows={4}
            maxLength={300}
            className={cn(
              "w-full rounded-md border border-neutral-200 px-3 py-2 text-sm",
              errors.description && "border-red-500"
            )}
            {...register("description")}
          />
          <p className="mt-1 text-xs text-secondary">{watch("description")?.length ?? 0}/300</p>
        </div>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">{t("fieldCertifications")}</legend>
          <Controller
            name="certNone"
            control={control}
            render={({ field }) => (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={field.value ?? false}
                  onChange={(e) => {
                    const on = e.target.checked
                    field.onChange(on)
                    if (on) {
                      setValue("certDop", false)
                      setValue("certIgp", false)
                      setValue("certBio", false)
                      setValue("certSlow", false)
                    }
                  }}
                />
                {t("certNone")}
              </label>
            )}
          />
          {(
            [
              ["certDop", t("certDop")],
              ["certIgp", t("certIgp")],
              ["certBio", t("certBio")],
              ["certSlow", t("certSlow")],
            ] as const
          ).map(([name, label]) => (
            <Controller
              key={name}
              name={name}
              control={control}
              render={({ field }) => (
                <label
                  className={cn("flex items-center gap-2 text-sm", certNone && "opacity-40")}
                >
                  <input
                    type="checkbox"
                    disabled={certNone}
                    checked={field.value ?? false}
                    onChange={(e) => {
                      field.onChange(e.target.checked)
                      if (e.target.checked) setValue("certNone", false)
                    }}
                  />
                  {label}
                </label>
              )}
            />
          ))}
        </fieldset>
        <Button
          type="submit"
          className="flex w-full justify-center uppercase"
          disabled={isSubmitting}
          loading={isSubmitting}
        >
          {t("formProducerSubmit")}
        </Button>
      </form>
    </Container>
  )
}
