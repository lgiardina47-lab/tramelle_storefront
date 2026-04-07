#!/usr/bin/env node
/**
 * Il vendor Tramelle mantiene solo `it.json`. Script di utilità: normalizza
 * il JSON (indentazione) senza merge con altre lingue.
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, "..")
const IT = path.join(ROOT, "src/i18n/translations/it.json")

const obj = JSON.parse(fs.readFileSync(IT, "utf8"))
fs.writeFileSync(IT, `${JSON.stringify(obj, null, 2)}\n`, "utf8")
console.log("OK:", IT)
