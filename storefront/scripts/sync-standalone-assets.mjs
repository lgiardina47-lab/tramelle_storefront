/**
 * Next.js standalone: dopo `next build` copia `public` e `.next/static`
 * dentro `.next/standalone`, altrimenti in produzione il sito è HTML senza CSS/asset.
 */
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, "..")
const standalone = path.join(root, ".next", "standalone")
const staticSrc = path.join(root, ".next", "static")
const staticDest = path.join(standalone, ".next", "static")
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

fs.mkdirSync(path.join(standalone, ".next"), { recursive: true })
rmrf(staticDest)
cpDir(staticSrc, staticDest)

console.log(
  "sync-standalone-assets: OK — public e .next/static copiati in .next/standalone/"
)
