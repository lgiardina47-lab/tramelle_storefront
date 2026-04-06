"use client"

import {
  FieldError,
  FormProvider,
  useForm,
  useFormContext,
} from "react-hook-form"
import { Button } from "@/components/atoms"
import { zodResolver } from "@hookform/resolvers/zod"
import { LabeledInput } from "@/components/cells"
import { registerFormSchema, RegisterFormData } from "./schema"
import { signup } from "@/lib/data/customer"
import { useState } from "react"
import { Container } from "@medusajs/ui"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { PasswordValidator } from "@/components/cells/PasswordValidator/PasswordValidator"
import { toast } from "@/lib/helpers/toast"
import { cn } from "@/lib/utils"

export const RegisterForm = () => {
  const methods = useForm<RegisterFormData>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      registrationType: "b2c",
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      password: "",
      companyName: "",
      vatId: "",
      sdiOrPec: "",
    },
  })

  return (
    <FormProvider {...methods}>
      <Form />
    </FormProvider>
  )
}

const Form = () => {
  const router = useRouter()
  const [passwordError, setPasswordError] = useState({
    isValid: false,
    lower: false,
    upper: false,
    "8chars": false,
    symbolOrDigit: false,
  })

  const {
    handleSubmit,
    register,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useFormContext<RegisterFormData>()

  const registrationType = watch("registrationType")

  const submit = async (data: RegisterFormData) => {
    if (!passwordError.isValid) {
      return
    }

    const formData = new FormData()
    formData.append("registration_type", data.registrationType)
    formData.append("email", data.email)
    formData.append("password", data.password)

    if (data.registrationType === "b2c") {
      formData.append("first_name", data.firstName)
      formData.append("last_name", data.lastName)
      if (data.phone?.trim()) {
        formData.append("phone", data.phone.trim())
      }
    } else {
      formData.append("company_name", data.companyName)
      formData.append("vat_id", data.vatId)
      formData.append("sdi_or_pec", data.sdiOrPec)
    }

    const res = await signup(formData)

    if (res && !res?.id) {
      const errorMessage = res
        .toLowerCase()
        .includes("error: identity with email already exists")
        ? "It seems the email you entered is already associated with another account. Please log in instead."
        : res
      toast.error({ title: errorMessage })
      return
    }

    if (res?.id) {
      toast.success({ title: "Account created" })
      router.push("/user")
      router.refresh()
    }
  }

  return (
    <main className="container" data-testid="register-page">
      <Container
        className="border max-w-xl mx-auto mt-8 p-4"
        data-testid="register-form-container"
      >
        <h1 className="heading-md text-primary uppercase mb-6">
          Create account
        </h1>

        <div
          className="flex border-b border-secondary/20 mb-8 gap-1"
          role="tablist"
          aria-label="Account type"
        >
          <button
            type="button"
            role="tab"
            aria-selected={registrationType === "b2c"}
            className={cn(
              "flex-1 py-3 px-2 text-sm font-medium uppercase tracking-wide transition-colors border-b-2 -mb-px",
              registrationType === "b2c"
                ? "border-action text-primary"
                : "border-transparent text-secondary hover:text-primary"
            )}
            onClick={() => setValue("registrationType", "b2c", { shouldValidate: true })}
          >
            Privato
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={registrationType === "b2b_pro"}
            className={cn(
              "flex-1 py-3 px-2 text-sm font-medium uppercase tracking-wide transition-colors border-b-2 -mb-px",
              registrationType === "b2b_pro"
                ? "border-action text-primary"
                : "border-transparent text-secondary hover:text-primary"
            )}
            onClick={() => setValue("registrationType", "b2b_pro", { shouldValidate: true })}
          >
            Professionista
          </button>
        </div>
        <p className="label-md text-secondary mb-6">
          {registrationType === "b2c"
            ? "Acquista al dettaglio: prezzi al pubblico e checkout rapido."
            : "Accesso listini professionali e dati per fatturazione elettronica (P.IVA, SDI/PEC)."}
        </p>

        <form onSubmit={handleSubmit(submit)} data-testid="register-form">
          <input type="hidden" {...register("registrationType")} />
          {registrationType === "b2c" ? (
            <>
              <div className="flex flex-col md:flex-row gap-4 mb-4">
                <LabeledInput
                  className="md:w-1/2"
                  label="Nome"
                  placeholder="Nome"
                  error={errors.firstName as FieldError}
                  data-testid="register-first-name-input"
                  {...register("firstName")}
                />
                <LabeledInput
                  className="md:w-1/2"
                  label="Cognome"
                  placeholder="Cognome"
                  error={errors.lastName as FieldError}
                  data-testid="register-last-name-input"
                  {...register("lastName")}
                />
              </div>
              <LabeledInput
                className="mb-4"
                label="Telefono (opzionale)"
                placeholder="Es. +393331234567"
                error={errors.phone as FieldError}
                data-testid="register-phone-input"
                {...register("phone")}
              />
            </>
          ) : (
            <>
              <LabeledInput
                className="mb-4"
                label="Ragione sociale"
                placeholder="Ragione sociale"
                error={errors.companyName as FieldError}
                data-testid="register-company-input"
                {...register("companyName")}
              />
              <LabeledInput
                className="mb-4"
                label="Partita IVA"
                placeholder="Partita IVA"
                error={errors.vatId as FieldError}
                data-testid="register-vat-input"
                {...register("vatId")}
              />
              <LabeledInput
                className="mb-4"
                label="Codice SDI o PEC"
                placeholder="Es. ABCDE12 o nome@pec.it"
                error={errors.sdiOrPec as FieldError}
                data-testid="register-sdi-pec-input"
                {...register("sdiOrPec")}
              />
            </>
          )}

          <LabeledInput
            className="mb-4"
            label="E-mail"
            placeholder="La tua email"
            error={errors.email as FieldError}
            data-testid="register-email-input"
            {...register("email")}
          />
          <div>
            <LabeledInput
              className="mb-4"
              label="Password"
              placeholder="Password"
              type="password"
              error={errors.password as FieldError}
              data-testid="register-password-input"
              {...register("password")}
            />
            <PasswordValidator
              password={watch("password")}
              setError={setPasswordError}
            />
          </div>

          <Button
            className="w-full flex justify-center mt-8 uppercase"
            disabled={isSubmitting}
            loading={isSubmitting}
            data-testid="register-submit-button"
          >
            Create account
          </Button>
        </form>
      </Container>
      <Container className="border max-w-xl mx-auto mt-8 p-4">
        <h2 className="heading-md text-primary uppercase mb-8">
          Already have an account?
        </h2>
        <Link href="/login" data-testid="register-login-link">
          <Button
            variant="tonal"
            className="w-full flex justify-center mt-8 uppercase"
          >
            Log in
          </Button>
        </Link>
      </Container>
    </main>
  )
}
