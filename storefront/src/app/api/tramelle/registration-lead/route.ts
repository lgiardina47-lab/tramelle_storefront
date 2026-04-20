import { NextResponse } from "next/server"

const MAX_LEN = 12_000

type LeadType = "producer" | "b2b"

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v)
}

/**
 * Candidature produttore / richieste B2B da landing SEO.
 * Opzionale: `TRAMELLE_REGISTRATION_LEAD_WEBHOOK_URL` (POST JSON).
 */
export async function POST(req: Request): Promise<Response> {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!isRecord(body) || (body.type !== "producer" && body.type !== "b2b")) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 })
  }

  const payload = body.payload
  if (!isRecord(payload)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  }

  const raw = JSON.stringify({ type: body.type as LeadType, payload })
  if (raw.length > MAX_LEN) {
    return NextResponse.json({ error: "Payload too large" }, { status: 400 })
  }

  const webhook = process.env.TRAMELLE_REGISTRATION_LEAD_WEBHOOK_URL?.trim()
  if (webhook) {
    try {
      const whRes = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: raw,
      })
      if (!whRes.ok) {
        console.warn(
          "[registration-lead] webhook",
          whRes.status,
          await whRes.text()
        )
        return NextResponse.json(
          { error: "Webhook failed" },
          { status: 502 }
        )
      }
    } catch (e) {
      console.warn("[registration-lead] webhook error", e)
      return NextResponse.json({ error: "Webhook error" }, { status: 502 })
    }
  } else {
    console.info("[registration-lead]", body.type, payload)
  }

  return NextResponse.json({ ok: true })
}
