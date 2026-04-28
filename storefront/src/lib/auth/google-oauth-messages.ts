/** Messaggi UI (IT) per errori flusso Google OAuth / Medusa. */
export function messageForGoogleOAuthErrorCode(code: string | null): string | null {
  if (!code) return null
  const map: Record<string, string> = {
    failed: "Accesso con Google non riuscito, riprova.",
    denied: "Accesso con Google annullato.",
    no_email: "Impossibile leggere l'email dal profilo Google.",
    provider:
      "Questo account è già associato a un altro metodo di accesso. Accedi con email e password.",
    conflict:
      "Esiste già un account per questa email con un altro metodo di accesso. Usa email e password.",
    generic: "Accesso con Google non riuscito, riprova.",
  }
  return map[code] ?? map.generic
}

export function inferGoogleOAuthErrorCodeFromMessage(raw: string): string {
  const s = raw.toLowerCase()
  if (s.includes("identity") && s.includes("email")) return "conflict"
  if (s.includes("already exists") || s.includes("già esist")) return "conflict"
  if (
    s.includes("already has an account") ||
    (s.includes("already") && s.includes("account"))
  ) {
    return "conflict"
  }
  /** Solo messaggi espliciti sul metodo di accesso — non "unauthorized"/"invalid" (401, errori generici). */
  if (
    s.includes("emailpass") ||
    s.includes("another method") ||
    s.includes("another sign-in") ||
    s.includes("altro metodo")
  ) {
    return "provider"
  }
  if (s.includes("unauthorized")) return "failed"
  return "generic"
}
