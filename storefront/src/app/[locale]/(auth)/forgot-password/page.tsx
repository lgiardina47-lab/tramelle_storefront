import { ForgotPasswordForm } from "@/components/molecules/ForgotPasswordForm/ForgotPasswordForm"
import { Metadata } from "next"

export const runtime = 'edge';

export const metadata: Metadata = {
  title: "Password dimenticata",
  description: "Reimposta la password del tuo account Tramelle.",
}

export default function ForgotPasswordPage() {

  return (
    <main className="container">
      <ForgotPasswordForm />
    </main>
  )
}
