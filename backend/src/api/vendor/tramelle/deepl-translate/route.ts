import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

type Body = {
  text?: string
  source_lang?: string
  target_lang?: string
}

function toDeepLCode(code: string, role: "source" | "target"): string {
  const c = code.trim().toUpperCase().replace(/-/g, "_")
  if (c === "EN" || c === "EN_US" || c === "EN_GB") {
    return role === "source" ? "EN" : "EN-US"
  }
  if (c === "PT" || c === "PTBR" || c === "PT_BR") {
    return "PT-BR"
  }
  const two = c.split("_")[0] || c
  if (two.length === 2) {
    return two
  }
  return "EN"
}

/**
 * POST /vendor/tramelle/deepl-translate — traduzione server-side (chiave solo in env).
 * Richiede sessione vendor (stesso contesto delle altre route /vendor).
 */
export async function POST(
  req: AuthenticatedMedusaRequest<Body>,
  res: MedusaResponse
): Promise<void> {
  const key = process.env.DEEPL_AUTH_KEY?.trim()
  if (!key) {
    res.status(503).json({
      message:
        "DeepL non configurato: imposta DEEPL_AUTH_KEY nel backend (.env).",
    })
    return
  }

  const body = req.body || {}
  const text = typeof body.text === "string" ? body.text.trim() : ""
  if (!text) {
    res.status(400).json({ message: "Campo text obbligatorio." })
    return
  }

  const source_lang = toDeepLCode(body.source_lang || "IT", "source")
  const target_lang = toDeepLCode(body.target_lang || "EN", "target")

  const base = key.endsWith(":fx")
    ? "https://api-free.deepl.com"
    : "https://api.deepl.com"

  try {
    const params = new URLSearchParams()
    params.set("text", text)
    params.set("source_lang", source_lang)
    params.set("target_lang", target_lang)

    const dr = await fetch(`${base}/v2/translate`, {
      method: "POST",
      headers: {
        Authorization: `DeepL-Auth-Key ${key}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    })

    const raw = await dr.text()
    if (!dr.ok) {
      res.status(502).json({
        message: raw.slice(0, 200) || "DeepL errore HTTP",
      })
      return
    }

    let json: { translations?: { text?: string }[] }
    try {
      json = JSON.parse(raw)
    } catch {
      res.status(502).json({ message: "Risposta DeepL non valida" })
      return
    }

    const translated = json.translations?.[0]?.text ?? ""
    res.status(200).json({ translated })
  } catch (e) {
    res.status(502).json({
      message: e instanceof Error ? e.message : "Errore DeepL",
    })
  }
}
