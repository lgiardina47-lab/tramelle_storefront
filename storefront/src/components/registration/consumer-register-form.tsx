"use client"

import { Button } from "@/components/atoms"
import { LabeledInput } from "@/components/cells"
import { PasswordValidator } from "@/components/cells/PasswordValidator/PasswordValidator"
import LocalizedClientLink from "@/components/molecules/LocalizedLink/LocalizedLink"
import { signup } from "@/lib/data/customer"
import { toast } from "@/lib/helpers/toast"
import { cn } from "@/lib/utils"
import type { StoreCountryOption } from "@/lib/registration/store-country-option"
import { zodResolver } from "@hookform/resolvers/zod"
import { Container } from "@medusajs/ui"
import { useTranslations } from "next-intl"
import { useParams, useRouter } from "next/navigation"
import { useState } from "react"
import { FieldError, useForm } from "react-hook-form"
import { z } from "zod"

const emailField = z
  .string()
  .min(1, "Email obbligatoria")
  .email("Email non valida")
  .max(60)

const passwordField = z
  .string()
  .min(1, "Password obbligatoria")
  .min(8, "Almeno 8 caratteri")
  .regex(/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/, {
    message: "Maiuscola, numero e carattere speciale (!@#$%^&*)",
  })
  .max(64)

const schema = z.object({
  firstName: z.string().min(1, "Nome obbligatorio").max(50),
  lastName: z.string().min(1, "Cognome obbligatorio").max(50),
  email: emailField,
  password: passwordField,
  country: z.string().min(1, "Paese obbligatorio"),
})

type FormData = z.infer<typeof schema>

export function ConsumerRegisterForm({
  countries,
}: {
  countries: StoreCountryOption[]
}) {
  const t = useTranslations("Registration")
  const router = useRouter()
  const params = useParams()
  const locale = typeof params?.locale === "string" ? params.locale : "it"
  const [passwordError, setPasswordError] = useState({
    isValid: false,
    lower: false,
    upper: false,
    "8chars": false,
    symbolOrDigit: false,
  })

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { country: "" },
  })

  const onSubmit = async (data: FormData) => {
    if (!passwordError.isValid) return

    const formData = new FormData()
    formData.append("registration_type", "b2c")
    formData.append("email", data.email)
    formData.append("password", data.password)
    formData.append("first_name", data.firstName)
    formData.append("last_name", data.lastName)
    formData.append("country", data.country)

    const res = await signup(formData)

    if (res && !("id" in res)) {
      const msg = String(res).toLowerCase()
      const title = msg.includes("identity with email already exists")
        ? "Questa email è già registrata. Accedi dal login."
        : String(res)
      toast.error({ title })
      return
    }

    if (res && "id" in res) {
      toast.success({ title: t("consumerWelcomeToast") })
      router.push(`/${locale}`)
      router.refresh()
    }
  }

  return (
    <main className="container py-8" data-testid="consumer-register-page">
      <Container className="mx-auto max-w-xl border p-6">
        <h1 className="heading-md mb-6 text-primary uppercase">{t("consumerTitle")}</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row">
            <LabeledInput
              className="md:w-1/2"
              label="Nome *"
              error={errors.firstName as FieldError}
              {...register("firstName")}
            />
            <LabeledInput
              className="md:w-1/2"
              label="Cognome *"
              error={errors.lastName as FieldError}
              {...register("lastName")}
            />
          </div>
          <LabeledInput
            label="Email *"
            type="email"
            error={errors.email as FieldError}
            {...register("email")}
          />
          <div>
            <LabeledInput
              label="Password *"
              type="password"
              error={errors.password as FieldError}
              {...register("password")}
            />
            <PasswordValidator
              password={watch("password")}
              setError={setPasswordError}
            />
          </div>
          <div>
            <label
              htmlFor="consumer-country"
              className="mb-1 block text-sm font-medium text-primary"
            >
              {t("fieldCountry")} *
            </label>
            <select
              id="consumer-country"
              className={cn(
                "w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm",
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
            {errors.country?.message ? (
              <p className="mt-1 text-sm text-red-600">{errors.country.message}</p>
            ) : null}
          </div>
          <Button
            type="submit"
            className="mt-6 flex w-full justify-center uppercase"
            disabled={isSubmitting}
            loading={isSubmitting}
          >
            {t("consumerCta")}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-secondary">
          <LocalizedClientLink href="/accedi" locale={locale} className="underline">
            Hai già un account?
          </LocalizedClientLink>
        </p>
      </Container>
    </main>
  )
}
