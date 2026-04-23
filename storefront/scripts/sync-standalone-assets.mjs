/**
 * Next.js standalone: dopo `next build` copia `public` e `{distDir}/static`
 * dentro `{distDir}/standalone` (nella sottocartella con lo stesso nome di `distDir`), altrimenti in produzione il sito è HTML senza CSS/asset.
 */
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, "..")
const distDir = (process.env.TRAMELLE_NEXT_DIST_DIR || ".next").trim() || ".next"
const standalone = path.join(root, distDir, "standalone")
const staticSrc = path.join(root, distDir, "static")
const staticDest = path.join(standalone, distDir, "static")
const publicSrc = path.join(root, "public")
const publicDest = path.join(standalone, "public")

function rmrf(p) {
  fs.rmSync(p, { recursive: true, force: true })
}

function cpDir(src, dest) {
  fs.cpSync(src, dest, { recursive: true })
}

if (!fs.existsSync(standalone)) {
  console.error(
    "sync-standalone-assets: manca .next/standalone — eseguire prima `next build`."
  )
  process.exit(1)
}
if (!fs.existsSync(staticSrc)) {
  console.error(
    "sync-standalone-assets: manca .next/static — eseguire prima `next build`."
  )
  process.exit(1)
}
if (!fs.existsSync(publicSrc)) {
  console.error("sync-standalone-assets: manca la cartella public/")
  process.exit(1)
}

rmrf(publicDest)
cpDir(publicSrc, publicDest)

fs.mkdirSync(path.join(standalone, distDir), { recursive: true })
rmrf(staticDest)
cpDir(staticSrc, staticDest)

console.log(
  `sync-standalone-assets: OK — public e ${distDir}/static copiati in ${distDir}/standalone/`
)
