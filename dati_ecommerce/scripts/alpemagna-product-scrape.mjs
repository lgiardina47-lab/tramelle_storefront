#!/usr/bin/env node
/**
 * Estrae dati strutturati da una scheda prodotto alpemagna.com.
 *
 * Uso:
 *   node scripts/alpemagna-product-scrape.mjs <productUrl> [--out file.json] [--listing-image url ...]
 *   node scripts/alpemagna-product-scrape.mjs <url> --include-gallery
 */

import * as cheerio from 'cheerio'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DEFAULT_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

function arg(name, def) {
  const i = process.argv.indexOf(name)
  if (i === -1) return def
  const v = process.argv[i + 1]
  if (!v || v.startsWith('--')) return def
  return v
}

function argsAll(name) {
  const out = []
  for (let i = 0; i < process.argv.length; i++) {
    if (process.argv[i] === name && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')) {
      out.push(process.argv[i + 1])
      i++
    }
  }
  return out
}

function normText(s) {
  return String(s || '')
    .replace(/\s+/g, ' ')
    .trim()
}

function slugFromUrl(productUrl) {
  try {
    const u = new URL(productUrl)
    const seg = u.pathname.replace(/\/$/, '').split('/').filter(Boolean)
    return seg[seg.length - 1] || 'product'
  } catch {
    return 'product'
  }
}

function parseEuroAmount(formatted) {
  const t = normText(formatted).replace(/\u00a0/g, ' ')
  const m = t.match(/([\d.,]+)/)
  if (!m) return null
  const n = parseFloat(m[1].replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

async function fetchHtml(url) {
  const delayMs = Number(arg('--delay', '400')) || 400
  await new Promise((r) => setTimeout(r, delayMs))
  const res = await fetch(url, {
    headers: { 'User-Agent': arg('--user-agent', DEFAULT_UA), Accept: 'text/html,application/xhtml+xml' }
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`)
  return res.text()
}

function parseCharacteristicsParagraphs($, $textBlock) {
  const pairs = []
  $textBlock.find('p.text-space').each((_, p) => {
    const $p = $(p)
    const $st = $p.find('strong').first()
    if (!$st.length) return
    const label = normText($st.text())
    const html = $p.html() || ''
    const parts = html.split(/<br\s*\/?>/i)
    let value = ''
    if (parts.length > 1) {
      value = normText(parts.slice(1).join(' ').replace(/<[^>]+>/g, ' '))
    } else {
      const clone = $p.clone()
      clone.find('strong').first().remove()
      value = normText(clone.text())
    }
    pairs.push({ label, value })
  })
  return pairs
}

function parseNutritionList($, $textBlock) {
  const items = []
  $textBlock.find('ul.text-space li').each((_, li) => {
    items.push(normText($(li).text()))
  })
  return items
}

function parseInfoGrid($, $grid) {
  const sections = []
  const headingsSeen = new Set()

  $grid.find('strong.title-small.uppercase').each((_, el) => {
    const $heading = $(el)
    const heading = normText($heading.text())
    if (!heading || headingsSeen.has(heading)) return
    headingsSeen.add(heading)

    const $block = $heading.parent()
    const $textBlock = $block.find('> div.text-content').first()
    const $col = $heading.closest('div.flex.flex-col')

    const tags = []
    if ($col.length) {
      $col.find('> div.flex.items-center.gap-3 span.font-semibold').each((_, t) => {
        tags.push(normText($(t).text()))
      })
    }

    let type = 'text'
    let body = ''
    let intro = ''
    let items = []
    let pairs = []

    const hlow = heading.toLowerCase()
    if (hlow.includes('nutrizional')) {
      if ($textBlock.find('ul.text-space').length) {
        const t0 = normText($textBlock.find('p.text-space').first().text())
        if (t0) intro = t0
      }
      items = parseNutritionList($, $textBlock)
      type = items.length ? 'list' : 'text'
    } else if (hlow.includes('caratteristic')) {
      pairs = parseCharacteristicsParagraphs($, $textBlock)
      type = pairs.length ? 'keyValue' : 'text'
    } else {
      const parts = []
      $textBlock.find('p.text-space').each((_, p) => {
        parts.push(normText($(p).text()))
      })
      body = parts.filter(Boolean).join('\n\n')
    }

    const section = {
      heading,
      type,
      ...(body ? { body } : {}),
      ...(intro ? { intro } : {}),
      ...(items.length ? { items } : {}),
      ...(pairs.length ? { pairs } : {}),
      ...(tags.length ? { tags } : {})
    }
    sections.push(section)
  })

  return sections
}

function parseGallery($, $scope) {
  const slides = []
  const $gal = $scope.find('.gallery-dida-swiper').first()
  $gal.find('.swiper-slide').each((_, slide) => {
    const $s = $(slide)
    const src = $s.find('img').first().attr('src')
    if (!src) return
    let caption = null
    const capEl = $s.find('.text-content p.text-space').first()
    if (capEl.length) caption = normText(capEl.text())
    slides.push({ imageUrl: normText(src), caption })
  })
  return slides
}

/** Una sola URL hero: preferisce file -600x*.webp nello srcset. */
function pickHeroImageUrl(heroImg) {
  if (!heroImg?.length) return null
  const src = normText(heroImg.attr('src'))
  const srcset = heroImg.attr('srcset')
  if (!srcset) return src || null

  const candidates = []
  for (const part of srcset.split(',')) {
    const bits = part.trim().split(/\s+/)
    const u = bits[0]
    if (!u) continue
    const w = parseInt(bits[1] || '', 10)
    candidates.push({ url: u, w: Number.isFinite(w) ? w : 0 })
  }

  const by600file = candidates.find((c) => /(?<![0-9])600x\d+\.(webp|png|jpe?g)/i.test(c.url))
  if (by600file) return normText(by600file.url)

  if (candidates.length) {
    candidates.sort((a, b) => Math.abs(a.w - 600) - Math.abs(b.w - 600))
    return normText(candidates[0].url)
  }
  return src || null
}

export function scrapeAlpemagnaProductHtml(html, productUrl, listingImages = [], options = {}) {
  const includeGallery = options.includeGallery === true

  const $ = cheerio.load(html)
  const $main = $('main#main')
  const $root = $main.find('div.product.type-product[id^="product-"]').first()
  if (!$root.length) throw new Error('Prodotto principale non trovato')

  const h1 = $root.find('h1.h4').first()
  const title = normText(h1.text())
  const panel = h1.parent()
  const line = normText(panel.find('> span.font-semibold').first().text())
  const priceFormatted = normText(panel.find('.woocommerce-Price-amount bdi').first().text())
  const formatLabel = normText(panel.find('> span.text-small').first().text())
  const description = normText(panel.find('> div.text-content p.text-space').first().text())

  const $grid = $root
    .find('div.relative.grid')
    .filter((_, el) => $(el).find('strong.title-small.uppercase').length > 0)
    .first()

  const infoGrid = {
    sections: $grid.length ? parseInfoGrid($, $grid) : [],
    ...(includeGallery ? { galleryCaptions: parseGallery($, $main) } : {})
  }

  const trustBadges = []
  $root.find('div.hidden.md\\:flex').first().find('span.block').each((_, el) => {
    const t = normText($(el).text())
    if (t && t.length < 80) trustBadges.push(t)
  })

  const ci = options.cardImages && typeof options.cardImages === 'object' ? options.cardImages : {}
  const pair = []
  if (ci.hoverUrl) pair.push({ role: 'hover', url: normText(ci.hoverUrl) })
  if (ci.productUrl) pair.push({ role: 'product', url: normText(ci.productUrl) })
  if (!pair.length && listingImages.length) {
    const max = Math.min(2, listingImages.length)
    for (let i = 0; i < max; i++) {
      const role = i === 0 ? 'hover' : 'product'
      pair.push({ role, url: normText(listingImages[i]) })
    }
  }

  const listing = {
    title: null,
    price: null,
    currency: 'EUR',
    images: pair
  }

  const heroImg = $root.find('div.flex-col img[src], div.md\\:flex-row img[src]').first()
  const heroUrl = pickHeroImageUrl(heroImg)
  const images = pair.length ? [...pair] : heroUrl ? [{ role: 'product', url: heroUrl }] : []

  return {
    source: { productUrl, listingUrl: null },
    scrapedAt: new Date().toISOString(),
    listing,
    product: {
      url: productUrl,
      title,
      line,
      description,
      price: {
        amount: parseEuroAmount(priceFormatted),
        formatted: priceFormatted || null
      },
      formatLabel: formatLabel || null,
      images,
      infoGrid,
      trustRow: trustBadges
    }
  }
}

async function main() {
  const urlArg = process.argv.find((a) => a.startsWith('http'))
  if (!urlArg) {
    console.error(
      'Uso: node scripts/alpemagna-product-scrape.mjs <productUrl> [--out file] [--listing-image url ...] [--include-gallery]'
    )
    process.exit(1)
  }
  const listingImages = argsAll('--listing-image')
  let outPath = arg('--out', '')
  if (!outPath) {
    await fs.mkdir(path.join(ROOT, 'output'), { recursive: true })
    outPath = path.join(ROOT, 'output', `${slugFromUrl(urlArg)}.json`)
  } else if (!path.isAbsolute(outPath)) {
    outPath = path.resolve(process.cwd(), outPath)
  }

  const html = await fetchHtml(urlArg)
  const payload = scrapeAlpemagnaProductHtml(html, urlArg, listingImages, {
    includeGallery: process.argv.includes('--include-gallery')
  })
  const json = JSON.stringify(payload, null, 2)
  await fs.mkdir(path.dirname(outPath), { recursive: true })
  await fs.writeFile(outPath, json, 'utf8')
  console.error(`Scritto ${outPath}`)
  console.log(json)
}

const isMain =
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === pathToFileURL(fileURLToPath(import.meta.url)).href
if (isMain) {
  main().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}
