#!/usr/bin/env node
/**
 * Garantisce che la splash Coming Soon non si “spezzi” per refact accidentali:
 * route e middleware devono usare solo requestShowsComingSoonHome.
 */
"use strict"

const fs = require("fs")
const path = require("path")

const root = path.join(__dirname, "..")
const checks = [
  ["page", path.join(root, "src/app/[locale]/(main)/page.tsx")],
  ["middleware", path.join(root, "src/middleware.ts")],
]

for (const [label, filePath] of checks) {
  if (!fs.existsSync(filePath)) {
    console.error(`verify-coming-soon-invariants: manca ${filePath}`)
    process.exit(1)
  }
  const s = fs.readFileSync(filePath, "utf8")
  if (s.includes("shouldUseProductionComingSoonHome")) {
    console.error(
      `${label}: non usare shouldUseProductionComingSoonHome qui — solo requestShowsComingSoonHome (coming-soon-public-home.ts).`
    )
    process.exit(1)
  }
  if (s.includes("effectiveRequestHostFromHeaders")) {
    console.error(
      `${label}: non usare effectiveRequestHostFromHeaders qui — solo requestShowsComingSoonHome.`
    )
    process.exit(1)
  }
  if (!s.includes("requestShowsComingSoonHome")) {
    console.error(`${label}: deve importare e usare requestShowsComingSoonHome.`)
    process.exit(1)
  }
}

const core = path.join(root, "src/lib/constants/coming-soon-public-home.ts")
const coreSrc = fs.readFileSync(core, "utf8")
if (!coreSrc.includes("TRAMELLE_COMING_SOON_CANONICAL_HOSTS")) {
  console.error(
    "coming-soon-public-home.ts: serve TRAMELLE_COMING_SOON_CANONICAL_HOSTS (fonte unica domini splash)."
  )
  process.exit(1)
}
if (!coreSrc.includes("export function requestShowsComingSoonHome")) {
  console.error("coming-soon-public-home.ts: manca requestShowsComingSoonHome.")
  process.exit(1)
}

console.log("verify-coming-soon-invariants: OK")
