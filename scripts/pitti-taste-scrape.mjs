#!/usr/bin/env node
/**
 * Pitti Taste T19 — elenco espositori dalla paginazione pubblica.
 * Fonte listing: https://taste.pittimmagine.com/it/fairs/T19/exhibitors
 *
 * Avviso legale: verifica termini di utilizzo e privacy del sito prima di usare
 * dati in produzione. Lo script include un delay tra le richieste (--delay).
 *
 * Uso:
 *   node scripts/pitti-taste-scrape.mjs
 *   node scripts/pitti-taste-scrape.mjs --out exhibitors.json
 *   node scripts/pitti-taste-scrape.mjs --details --out with-descriptions.json
 */

const BASE = 'https://taste.pittimmagine.com'
const LIST_PATH = '/it/fairs/T19/exhibitors'
const DEFAULT_UA =
  'Mozilla/5.0 (compatible; marketplace-pitti-import/1.0; +https://example.invalid)'

function arg(name, def) {
  const i = process.argv.indexOf(name)
  if (i === -1) return def
  const v = process.argv[i + 1]
  if (!v || v.startsWith('--')) return def
  return v
}

function hasFlag(name) {
  return process.argv.includes(name)
}

async function fetchText(url) {
  const delayMs = Number(arg('--delay', '600')) || 600
  await new Promise((r) => setTimeout(r, delayMs))
  const res = await fetch(url, {
    headers: { 'User-Agent': arg('--user-agent', DEFAULT_UA), Accept: 'text/html' }
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`)
  return res.text()
}

function parseListingCards(html) {
  const chunks = html.split('<div class="box-card" data-brand="')
  const rows = []
  for (let i = 1; i < chunks.length; i++) {
    const c = chunks[i]
    const idMatch = c.match(/^(\d+)"/)
    const linkTitle = c.match(
      /<a\s+href="(\/it\/pittimmagine\/archive\/taste19\/exhibitors\/[^"]+)"[^>]*class="box-card-head-title"[^>]*>\s*([\s\S]*?)<\/a>/i
    )
    if (!linkTitle) continue
    const path = linkTitle[1]
    const name = linkTitle[2].replace(/\s+/g, ' ').trim()
    const locMatch = c.match(/<p class="box-card-body-location">\s*([^<]*)\s*<\/p>/i)
    const countryMatch = c.match(/<p class="box-card-body-country">\s*([^<]*)\s*<\/p>/i)
    rows.push({
      brandId: idMatch ? idMatch[1] : null,
      name,
      url: `${BASE}${path}`,
      path,
      stand: locMatch ? locMatch[1].trim() : '',
      region: countryMatch ? countryMatch[1].trim() : ''
    })
  }
  return rows
}

async function fetchAllListingPages() {
  const seen = new Map()
  let page = 1
  let stable = 0
  const maxPages = Number(arg('--max-pages', '200')) || 200

  while (page <= maxPages && stable < 3) {
    const url = `${BASE}${LIST_PATH}?page=${page}`
    const html = await fetchText(url)
    const cards = parseListingCards(html)
    const before = seen.size
    for (const row of cards) {
      seen.set(row.path, row)
    }
    if (seen.size === before) stable++
    else stable = 0
    console.error(`page ${page}: +${seen.size - before} new (totale ${seen.size})`)
    page++
  }

  return [...seen.values()]
}

async function enrichOgDescription(url) {
  const html = await fetchText(url)
  const title =
    html.match(/<meta\s+property="og:title"\s+content="([^"]*)"/i)?.[1] ?? ''
  const description =
    html.match(/<meta\s+property="og:description"\s+content="([^"]*)"/i)?.[1] ??
    ''
  const image =
    html.match(/<meta\s+property="og:image"\s+content="([^"]*)"/i)?.[1] ?? ''
  return {
    ogTitle: title.replace(/&quot;/g, '"').replace(/&amp;/g, '&'),
    description: description
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&#39;/g, "'"),
    imageUrl: image.startsWith('//') ? `https:${image}` : image
  }
}

async function main() {
  const outPath = arg('--out', '')
  console.error('Scarico listing paginato…')
  let rows = await fetchAllListingPages()
  rows.sort((a, b) => a.name.localeCompare(b.name, 'it'))

  if (hasFlag('--details')) {
    console.error(`Recupero og:description per ${rows.length} schede…`)
    const concurrency = Math.min(
      5,
      Math.max(1, Number(arg('--concurrency', '2')) || 2)
    )
    for (let i = 0; i < rows.length; i += concurrency) {
      const batch = rows.slice(i, i + concurrency)
      const extra = await Promise.all(
        batch.map(async (r) => {
          try {
            return await enrichOgDescription(r.url)
          } catch (e) {
            return { error: String(e.message || e) }
          }
        })
      )
      batch.forEach((r, j) => Object.assign(r, extra[j]))
      console.error(`dettagli ${Math.min(i + concurrency, rows.length)}/${rows.length}`)
    }
  }

  const payload = {
    source: `${BASE}${LIST_PATH}`,
    scrapedAt: new Date().toISOString(),
    count: rows.length,
    exhibitors: rows
  }

  const json = JSON.stringify(payload, null, 2)
  if (outPath) {
    await import('node:fs/promises').then((fs) => fs.writeFile(outPath, json, 'utf8'))
    console.error(`Scritto ${outPath}`)
  } else {
    console.log(json)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
