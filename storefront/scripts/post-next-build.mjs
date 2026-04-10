/**
 * Dopo `next build`: su Cloudflare Pages (`CF_PAGES=1`) non esiste `.next/standalone`
 * (output standard per @cloudflare/next-on-pages). Su Hetzner/PM2 copia asset in standalone.
 */
import { spawnSync } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, "..")

if (process.env.CF_PAGES === "1") {
  console.log(
    "post-next-build: CF_PAGES=1 — skip sync-standalone-assets (Cloudflare Pages)"
  )
  process.exit(0)
}

const r = spawnSync(
  process.execPath,
  [path.join(__dirname, "sync-standalone-assets.mjs")],
  { stdio: "inherit", cwd: root }
)
process.exit(r.status ?? 1)
