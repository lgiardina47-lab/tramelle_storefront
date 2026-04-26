# Cache Cloudflare (Tramelle) — regole consigliate

Riferimento operativo usando solo ciò che il monorepo e l’origine espongono oggi.

## Contesto verificato

| Origine | Ruolo |
|--------|--------|
| `tramelle.com` / `www.tramelle.com` | Tunnel → `127.0.0.1:8000` (Next standalone produzione). Pagine spesso `force-dynamic` → HTML **non** va trattato come asset statico lungo. |
| `/_next/static/*` | Origine risponde già con `Cache-Control: public, max-age=31536000, immutable` (verificato su chunk `.js`). Ideale per **cache edge lunga**. |
| `media.tramelle.com` | Cloudflare Images (`/cdn-cgi/imagedelivery/<hash>/<id>/<variante>`). Le varianti `w=…,fit=scale-down,…` sono URL **univoci per dimensione/qualità** → molto cacheabili. |

## Dashboard Cloudflare (zone `tramelle.com`)

Impostazioni → **Caching** → **Cache Rules** (o **Rules** → **Cache Rules**). Ordine: dalla più specifica alla più generica.

### 1) Lungo TTL in edge per gli asset Next versionati

- **If**: `(http.host eq "tramelle.com" or http.host eq "www.tramelle.com") and starts_with(http.request.uri.path, "/_next/static/")`
- **Then**: **Eligible for cache** (o “Cache everything” se la tua UI lo richiede), **Edge TTL** = **1 month** (o “Respect origin” se rispetta già `max-age=31536000`).
- **Browser TTL**: rispetta origine / stesso valore.

Così i chunk hashati restano HIT dopo il primo request; un nuovo deploy cambia hash → nuovi URL → niente stale per JS/CSS.

### 2) Non forzare cache sull’HTML dinamico

Evita regole globali tipo “Cache Everything” su `tramelle.com` senza eccezioni: le PDP/listing sono SSR e possono cambiare senza cambiare path.

Se serve una regola “default”: **Bypass cache** solo se usi cookie di sessione sensibili sulla stessa URL (di solito non necessario se l’origine manda `no-store` sulle pagine dinamiche).

### 3) Sottodominio immagini (`media.tramelle.com`)

Cloudflare Images imposta già header di cache sulle risposte. Opzionale:

- **If**: `http.host eq "media.tramelle.com"`
- **Then**: **Edge TTL** lungo (es. **7 giorni** o **1 mese**) se la dashboard lo consente senza rompere invalidazioni; in alternativa **Respect origin** e verifica che le risposte non siano `no-store`.

Dopo cambio asset su Images, usare **Purge by URL** o purge per prefix se necessario.

### 4) API Medusa (se proxata sulla stessa zone)

Se `api.tramelle.com` o path `/store/*` passano dalla zone: **Bypass cache** o TTL 0 — i dati carrello/sessione non devono essere serviti da cache edge.

## Dopo ogni deploy storefront

- **Purge** mirato: solo se vedi HTML/asset vecchi — di solito **non** serve purge globale.
- Se cambi solo chunk statici: i nomi file cambiano; purge **non** richiesta per `/_next/static/`.
- Se usi **Purge Everything**, riscaldi almeno homepage e una PDP per ripopolare edge.

## Controlli rapidi

```bash
# Asset statico (origine o tramite dominio pubblico)
curl -sSI "https://tramelle.com/_next/static/chunks/<file>.js" | grep -i cache-control

# Immagine flexible (URL reale dalla PDP)
curl -sSI "https://media.tramelle.com/cdn-cgi/imagedelivery/<hash>/<id>/w=960,fit=scale-down,quality=88,sharpen=1" | grep -iE 'cache-control|cf-cache-status'
```

`cf-cache-status: HIT` su ripetizione indica che la regola edge sta lavorando.

## Cosa non fare

- Non impostare TTL lunghi su **tutto** `tramelle.com/*` senza escludere API e pagine account/checkout.
- Non confondere **Cloudflare Images** (dominio `media.`) con il Worker/Pages dello storefront: regole e purge sono per zone/hostname diversi se separati.
