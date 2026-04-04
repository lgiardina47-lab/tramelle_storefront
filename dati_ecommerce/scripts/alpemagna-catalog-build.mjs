#!/usr/bin/env node
/**
 * Catalogo completo Alpe Magna via WooCommerce Store API + filtri da HTML salvato.
 *
 * Uso:
 *   node scripts/alpemagna-catalog-build.mjs
 *   node scripts/alpemagna-catalog-build.mjs --filters-html "../../La nostra dispensa - Alpe Magna.html"
 *   node scripts/alpemagna-catalog-build.mjs --enrich --enrich-concurrency 4
 */

import * as cheerio from 'cheerio'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { fetchAllCardImagesByPermalink, normProductPermalink } from './alpemagna-listing-images.mjs'
import { scrapeAlpemagnaProductHtml } from './alpemagna-product-scrape.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const STORE_BASE = 'https://alpemagna.com/wp-json/wc/store/v1/products'
const DEFAULT_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

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

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': DEFAULT_UA, Accept: 'application/json' }
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`)
  return { data: await res.json(), headers: res.headers }
}

async function parseFiltersFromShopHtml(htmlPath) {
  const raw = await fs.readFile(htmlPath, 'utf8')
  const $ = cheerio.load(raw)
  const form = $('form.products-filter-form[data-products-form]').first()
  if (!form.length) return { source: htmlPath, filters: [] }


  const filters = []

  form.find('[data-filter-key]').each((_, wrap) => {
    const $w = $(wrap)
    const key = $w.attr('data-filter-key')
    if (!key) return
    const toggle = $w.find('[data-toggle]').first()
    const heading = norm(toggle.find('span[data-label]').first().text()) || key

    const options = []
    $w.find('input[type="checkbox"][data-filter-checkbox]').each((__, inp) => {
      const $i = $(inp)
      const slug = $i.attr('value')
      const lab = norm($i.closest('label').find('span').last().text())
      if (slug) options.push({ slug, label: lab || slug })
    })

    filters.push({ key, label: heading, options })
  })

  return {
    source: htmlPath,
    productsFormMeta: {
      perPage: form.attr('data-products-per-page'),
      offset: form.attr('data-offset'),
      total: form.attr('data-total')
    },
    filters
  }
}

function norm(s) {
  return String(s || '')
    .replace(/\s+/g, ' ')
    .trim()
}

function priceToAmount(minorUnit, raw) {
  const n = Number(raw)
  if (!Number.isFinite(n)) return null
  const div = 10 ** (Number(minorUnit) || 0)
  return n / (div || 100)
}

function imagesFromCardOrStore(p, cardMap) {
  const key = normProductPermalink(p.permalink)
  const card = cardMap?.get(key)
  if (card && (card.hoverUrl || card.productUrl)) {
    const out = []
    if (card.hoverUrl) out.push({ role: 'hover', url: card.hoverUrl })
    if (card.productUrl) out.push({ role: 'product', url: card.productUrl })
    return out
  }
  const img0 = (p.images || [])[0]
  return img0
    ? [{ role: 'product', url: img0.src, alt: img0.alt || null }]
    : []
}

function normalizeProduct(p, cardMap) {
  const minor = p.prices?.currency_minor_unit ?? 2
  return {
    id: p.id,
    sku: p.sku || null,
    slug: p.slug,
    name: p.name,
    permalink: p.permalink,
    type: p.type,
    onSale: p.on_sale,
    prices: {
      amount: priceToAmount(minor, p.prices?.price),
      regularAmount: priceToAmount(minor, p.prices?.regular_price),
      currency: p.prices?.currency_code || 'EUR',
      formatted: p.price_html ? stripTags(p.price_html) : null
    },
    categories: (p.categories || []).map((c) => ({ id: c.id, slug: c.slug, name: c.name })),
    images: imagesFromCardOrStore(p, cardMap),
    attributes: (p.attributes || []).map((a) => ({
      id: a.id,
      name: a.name,
      taxonomy: a.taxonomy,
      terms: (a.terms || []).map((t) => ({ id: t.id, slug: t.slug, name: t.name }))
    })),
    tags: p.tags || [],
    brands: p.brands || []
  }
}

function stripTags(html) {
  return norm(String(html).replace(/<[^>]+>/g, ' ').replace(/\u00a0/g, ' '))
}

async function fetchAllProducts() {
  const perPage = 100
  let page = 1
  const all = []
  let totalPages = 1

  do {
    const url = `${STORE_BASE}?per_page=${perPage}&page=${page}`
    const { data, headers } = await fetchJson(url)
    if (!Array.isArray(data)) throw new Error('Risposta store API non è un array')
    all.push(...data)
    totalPages = Number(headers.get('x-wp-totalpages') || '1')
    page++
  } while (page <= totalPages)

  return all
}

async function mapPool(items, concurrency, fn) {
  const results = new Array(items.length)
  let i = 0
  async function worker() {
    while (i < items.length) {
      const idx = i++
      results[idx] = await fn(items[idx], idx)
    }
  }
  const n = Math.min(concurrency, items.length || 1)
  await Promise.all(Array.from({ length: n }, () => worker()))
  return results
}

async function main() {
  const outPath = arg(
    '--out',
    path.join(ROOT, 'output', hasFlag('--enrich') ? 'alpemagna-catalog-enriched.json' : 'alpemagna-catalog.json')
  )
  const absOut = path.isAbsolute(outPath) ? outPath : path.resolve(process.cwd(), outPath)

  let filtersHtmlPath = arg('--filters-html', '')
  if (!filtersHtmlPath) {
    const guess = path.resolve(ROOT, '..', 'La nostra dispensa - Alpe Magna.html')
    try {
      await fs.access(guess)
      filtersHtmlPath = guess
    } catch {
      filtersHtmlPath = ''
    }
  } else {
    filtersHtmlPath = path.resolve(process.cwd(), filtersHtmlPath)
  }

  console.error('Scarico prodotti Store API…')
  const rawProducts = await fetchAllProducts()
  console.error('Card immagini shop (AJAX load_products)…')
  const cardMap = await fetchAllCardImagesByPermalink({ postsPerPage: 100 })
  console.error(`Card map: ${cardMap.size} prodotti`)
  const products = rawProducts.map((p) => normalizeProduct(p, cardMap))


  let filtersUi = null
  if (filtersHtmlPath) {
    try {
      filtersUi = await parseFiltersFromShopHtml(filtersHtmlPath)
      console.error(`Filtri UI da: ${filtersHtmlPath}`)
    } catch (e) {
      console.error(`Filtri HTML non letti (${e.message})`)
    }
  }

  const attributeIndex = []
  const termMap = new Map()
  for (const p of products) {
    for (const a of p.attributes) {
      if (!termMap.has(a.taxonomy)) termMap.set(a.taxonomy, new Map())
      const m = termMap.get(a.taxonomy)
      for (const t of a.terms) {
        if (!m.has(t.slug)) m.set(t.slug, t)
      }
    }
  }
  for (const [taxonomy, m] of termMap) {
    const first = products.flatMap((p) => p.attributes).find((a) => a.taxonomy === taxonomy)
    attributeIndex.push({
      taxonomy,
      name: first?.name || taxonomy,
      terms: [...m.values()].sort((a, b) => a.name.localeCompare(b.name, 'it'))
    })
  }
  attributeIndex.sort((a, b) => a.name.localeCompare(b.name, 'it'))

  const payload = {
    source: {
      storeApi: STORE_BASE,
      filtersHtml: filtersHtmlPath || null
    },
    scrapedAt: new Date().toISOString(),
    summary: {
      productCount: products.length,
      attributeDimensions: attributeIndex.length
    },
    filtersUi,
    attributeIndex,
    products
  }

  if (hasFlag('--enrich')) {
    const conc = Math.max(1, Math.min(8, Number(arg('--enrich-concurrency', '4')) || 4))
    console.error(`Arricchimento schede (${conc} paralleli)…`)
    const enriched = await mapPool(products, conc, async (p) => {
      const url = p.permalink
      try {
        const res = await fetch(url, { headers: { 'User-Agent': DEFAULT_UA, Accept: 'text/html' } })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const html = await res.text()
        const key = normProductPermalink(url)
        const cardImages = cardMap.get(key) || {}
        const detail = scrapeAlpemagnaProductHtml(html, url, [], { cardImages })
        return {
          ...p,
          detail: detail.product
        }
      } catch (e) {
        return { ...p, detailError: String(e.message || e) }
      }
    })
    payload.products = enriched
    payload.summary = { ...payload.summary, enriched: true, enrichConcurrency: conc }
  }

  await fs.mkdir(path.dirname(absOut), { recursive: true })
  await fs.writeFile(absOut, JSON.stringify(payload, null, 2), 'utf8')
  console.error(`Scritto ${absOut} (${payload.products.length} prodotti)`)
  console.log(JSON.stringify(payload.summary, null, 2))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
