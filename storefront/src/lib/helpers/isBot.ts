/** UA assente o vuoto → non è bot (alcuni proxy/client non inviano header: prima si finiva sempre su ProductListing senza filtri). */
export default function isBot(ua: string) {
  const s = ua?.trim()
  if (!s) {
    return false
  }
  return /bot|crawl|spider|slurp|bing|duckduckbot|GPTBot/i.test(s)
}
