#!/usr/bin/env node
/**
 * Applica storefront/algolia-config.json agli indici Mercur (products, reviews).
 * Richiede ALGOLIA_APP_ID + ALGOLIA_API_KEY (Admin) in backend/.env
 */
import { readFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { algoliasearch } from '../backend/node_modules/algoliasearch/dist/node.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return {}
  const out = {}
  for (const line of readFileSync(filePath, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i === -1) continue
    const k = t.slice(0, i).trim()
    let v = t.slice(i + 1).trim()
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1)
    }
    out[k] = v
  }
  return out
}

const env = { ...process.env, ...loadEnvFile(join(root, 'backend/.env')) }
let appId = env.ALGOLIA_APP_ID?.trim()
let apiKey = env.ALGOLIA_API_KEY?.trim()

const keyFile = join(root, 'backend/.algolia-admin-key')
if (!apiKey && existsSync(keyFile)) {
  apiKey = readFileSync(keyFile, 'utf8').trim().split('\n')[0]?.trim()
}
if (!appId && existsSync(join(root, 'storefront/.env.local'))) {
  const sf = loadEnvFile(join(root, 'storefront/.env.local'))
  appId = sf.NEXT_PUBLIC_ALGOLIA_ID?.trim()
}

if (!appId || !apiKey) {
  console.error(
    'Serve la Admin API Key (non la Search-Only dello storefront).\n' +
      '• Metti `ALGOLIA_API_KEY=...` in backend/.env, oppure\n' +
      '• Una sola riga in backend/.algolia-admin-key (file ignorato da git).\n' +
      'Dashboard: Algolia → Settings → API Keys → Admin API Key.'
  )
  process.exit(1)
}

const client = algoliasearch(appId, apiKey)
const { settings: productSettings } = JSON.parse(
  readFileSync(join(root, 'storefront/algolia-config.json'), 'utf8')
)

const reviewSettings = {
  attributesForFaceting: ['filterOnly(reference_id)', 'filterOnly(reference)'],
}

await client.setSettings({
  indexName: 'products',
  indexSettings: productSettings,
})
console.log('Algolia: impostazioni indice "products" aggiornate.')

await client.setSettings({
  indexName: 'reviews',
  indexSettings: reviewSettings,
})
console.log('Algolia: impostazioni indice "reviews" aggiornate.')
console.log('Fatto.')
