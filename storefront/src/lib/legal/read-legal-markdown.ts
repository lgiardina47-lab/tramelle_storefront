import { readFile } from "fs/promises"
import path from "path"

const LEGAL_FILES = {
  privacy: "privacy-policy-tramelle.md",
  terms: "termini-condizioni-tramelle.md",
} as const

export type LegalMarkdownKind = keyof typeof LEGAL_FILES

export async function readLegalMarkdown(kind: LegalMarkdownKind): Promise<string> {
  const name = LEGAL_FILES[kind]
  const filePath = path.join(process.cwd(), "public", "legal", name)
  return readFile(filePath, "utf8")
}
