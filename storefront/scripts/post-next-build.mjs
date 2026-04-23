/**
 * Dopo `next build`: copia `public` e `{TRAMELLE_NEXT_DIST_DIR||.next}/static` in standalone
 * (PM2/Hetzner). Anche la pipeline `@opennextjs/cloudflare` esegue `yarn build` prima del bundle Worker.
 */
import { spawnSync } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, "..")

const r = spawnSync(
  process.execPath,
  [path.join(__dirname, "sync-standalone-assets.mjs")],
  { stdio: "inherit", cwd: root }
)
process.exit(r.status ?? 1)
