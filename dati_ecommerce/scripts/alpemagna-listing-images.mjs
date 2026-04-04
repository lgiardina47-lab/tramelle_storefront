/**
 * Estrae dalla griglia shop (via AJAX load_products) le due immagini card per prodotto:
 * 1) prima img cloudfront nella card = hover/overlay
 * 2) seconda = foto prodotto (vasetto)
 * URL unici preferendo variante -600x*.webp nello srcset.
 */

import * as cheerio from 'cheerio'

const DEFAULT_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
const DEFAULT_AJAX = 'https://alpemagna.com/wp/wp-admin/admin-ajax.php'

function normText(s) {
  return String(s || '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function normProductPermalink(url) {
  try {
    const u = new URL(url)
    return u.href.replace(/\/$/, '') + '/'
  } catch {
    return url
  }
}

/** Preferisce URL con -600x*.webp nello srcset; altrimenti src HTTP. */
export function pickPrefer600FromImg($, imgEl) {
  const $img = $(imgEl)
  if (!$img.length) return null
  const src = normText($img.attr('src'))
  const srcset = $img.attr('srcset')
  if (!srcset) {
    if (src && src.startsWith('http')) return src
    return null
  }

  const candidates = []
  for (const part of srcset.split(',')) {
    const bits = part.trim().split(/\s+/)
    const u = bits[0]
    if (!u || !u.startsWith('http')) continue
    const w = parseInt(bits[1] || '', 10)
    candidates.push({ url: u, w: Number.isFinite(w) ? w : 0 })
  }

  const by600 = candidates.find((c) => /(?<![0-9])600x\d+\.(webp|png|jpe?g)/i.test(c.url))
  if (by600) return normText(by600.url)

  if (candidates.length) {
    candidates.sort((a, b) => Math.abs(a.w - 600) - Math.abs(b.w - 600))
    return normText(candidates[0].url)
  }
  return src && src.startsWith('http') ? src : null
}

function permalinkFromCard($, cardEl) {
  const $c = $(cardEl)
  const a = $c.find('a.cta-1[href*="/prodotti/"]').first()
  const href = normText(a.attr('href'))
  if (!href) return null
  try {
    const u = new URL(href)
    if (!u.pathname.includes('/prodotti/')) return null
    return normProductPermalink(href)
  } catch {
    return null
  }
}

/**
 * HTML frammento risposta AJAX (solo figli della griglia).
 */
export function parseListingCardsFragment(html) {
  const $ = cheerio.load(`<div id="_frag_root">${html}</div>`)
  const map = new Map()

  $('#_frag_root div.product.type-product').each((_, cardEl) => {
    const permalink = permalinkFromCard($, cardEl)
    if (!permalink) return

    const $c = $(cardEl)
    const $cloud = $c.find('img').filter((_, el) => {
      const $i = $(el)
      const blob = `${$i.attr('src') || ''} ${$i.attr('srcset') || ''}`
      return blob.includes('cloudfront.net') && !blob.toLowerCase().includes('.svg')
    })

    let hoverUrl = null
    let productUrl = null
    if ($cloud.length >= 2) {
      hoverUrl = pickPrefer600FromImg($, $cloud.eq(0))
      productUrl = pickPrefer600FromImg($, $cloud.eq(1))
    } else if ($cloud.length === 1) {
      productUrl = pickPrefer600FromImg($, $cloud.eq(0))
    }

    map.set(permalink, { hoverUrl, productUrl })
  })

  return map
}

/** @deprecated Usare fetchAllCardImagesViaAjax */
export function parseListingPageForCardImages(html) {
  const $ = cheerio.load(html)
  const inner = $('#products-grid').html() || ''
  if (!inner) return new Map()
  return parseListingCardsFragment(inner)
}

/**
 * Tutte le card shop in una chiamata (posts_per_page abbastanza alto).
 */
export async function fetchAllCardImagesByPermalink(options = {}) {
  const ajaxUrl = options.ajaxUrl || DEFAULT_AJAX
  const ua = options.userAgent || DEFAULT_UA
  const perPage = options.postsPerPage ?? 100

  const fd = new FormData()
  fd.append('action', 'load_products')
  fd.append('posts_per_page', String(perPage))
  fd.append('offset', '0')
  fd.append('reset', 'true')

  const res = await fetch(ajaxUrl, { method: 'POST', body: fd, headers: { 'User-Agent': ua } })
  const json = await res.json()
  if (!json.success || !json.data?.html) return new Map()

  return parseListingCardsFragment(json.data.html)
}
