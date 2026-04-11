# Pipeline venditori: `dati_venditori_nuova` → Tor → elaborazione → Cloudflare Images → database

Documento di riferimento per il flusso **prima** dell’import Medusa: scaricare ed elaborare le immagini, pubblicarle su **Cloudflare Images**, poi persistere riferimenti nel DB (convenzione **`cfimg:<image_id>`**).

## Dove sta il lavoro

- Cartella sul server: **`/var/www/tramelle/dati_venditori_nuova/`** (script Python, `data/`, `output/`, ecc.).
- **Export “ufficiale” (snapshot approvato):** `output/official/marketplace_sellers_official.json` (sellers da batch Tor) e `output/official/marketplace_sellers_official_import.json` (merge import Medusa); metadati e hash in `output/official/manifest.json`. `sync_partner_media_cdn.py` usa questi file come default se non passi altro JSON.
- Dettaglio Tor, Pillow e naming file: [`partner-media-pipeline.md`](partner-media-pipeline.md) (stesso spirito di `dati_venditori/`).
- Segreti **solo** in file ignorati da git: `backend/.env`; opzionale `dati_venditori_nuova/.env` per script locali. **Mai** il token Cloudflare nello storefront.

## Cosa fa ogni file (sintesi)

| File | Ruolo |
|------|--------|
| `taste_config.py` | Host Taste, directory `output/`, promemoria VPN→Tor. |
| `tor_network_config.py` / `tor_proxy.py` / `tor_session.py` | SOCKS5 Tor, sessioni `requests`, verifica che il traffico verso Taste passi solo da Tor. |
| `seller_extract.py` | Parsing HTML scheda espositore → JSON seller (profilo, merceologie, lookbook URL, ecc.). |
| `taste_probe.py` | Probe rete/archivio (test rapido con Tor). |
| `taste_playwright_detail.py` | Opzionale: Playwright per HTML più completo (carousel). |
| `taste_exhibitor_pipeline.py` | Scheda → HTML (Tor) → `build_marketplace_seller`. |
| `export_sellers_tor_batch.py` | Batch listing → molte schede, checkpoint sotto `output/`. |
| `sync_partner_media_cdn.py` | Da JSON seller: **scarica** logo/cover/gallery via Tor → `partner_media_out/partner/<slug>/` con nomi **`logo_<token>.<ext>`**, **`cover_<token>.<ext>`**, **`storytelling_<token>-N.<ext>`** dove `<token>` = `brand_file_token(name, slug)` (campo **`name`** + **`slug`** nel JSON; `listing_country` resta solo metadato scheda, **non** nel nome file). |
| `process_partner_images_webp.py` | **Riscarica** da URL (Tor) e produce **WebP** + watermark gallery; naming allineato a `sync_*`. |
| `data/merceology_menu_context_*.json` | Contesto categorie padre per le merceologie. |

## Tor: installazione e verifica

Gli script **non** funzionano senza Tor in ascolto (tipico **SOCKS5 `127.0.0.1:9050`**).

Su Debian/Ubuntu, se `systemctl status tor` non esiste: installare il demone (`tor`), **`sudo systemctl enable --now tor`**, poi attendere il **bootstrap al 100%** (alla prima accensione può servire **diversi minuti**; finché non è completo, le richieste via SOCKS vanno in timeout). Verifica log: `journalctl _COMM=tor -f` fino a `Bootstrapped 100% (done)`.

Script di controllo nel repo: [`scripts/ensure-tor-tramelle.sh`](../scripts/ensure-tor-tramelle.sh) (attivo + test uscita su `icanhazip`).

Solo dopo il 100%: `taste_probe.py` / export / `sync_partner_media_cdn.py` / `process_partner_images_webp.py`.

**Pillow:** Ubuntu 22.04 fornisce spesso Pillow 9. Se `process_partner_images_webp.py` fallisce con `Image.Resampling`, usare `Image.LANCZOS` al posto di `Image.Resampling.LANCZOS` oppure `pip install 'pillow>=10'`.

## Copia degli originali

- Dopo **`sync_partner_media_cdn.py`**, la cartella **`partner_media_out/partner/...`** contiene i **binari scaricati** (jpg/png/webp/… come da URL): trattala come archivio “originale” lato progetto.
- **`process_partner_images_webp.py`** effettua **nuovi download** dagli URL del JSON e scrive WebP: conviene fare un **backup** (es. `tar` o copia della cartella) **dopo il sync** e **prima** del passaggio WebP se vuoi tenere sia sorgenti non convertite sia derivati, senza riscaricare a mano.

## Ordine operativo (checklist)

1. **Tor** in ascolto (es. SOCKS5 `127.0.0.1:9050`), come da regole progetto.
2. **Download** da JSON export: `sync_partner_media_cdn.py` (logo, cover, gallery via Tor) → output sotto `partner_media_out/partner/<slug>/`.
3. **(Consigliato)** Backup di `partner_media_out` = copia originali su disco.
4. **Elaborazione e salvataggio su disco** (scegline una; l’output resta locale fino al passo 5):
   - **WebP + watermark gallery:** `process_partner_images_webp.py` → tipicamente `venditori/partner/<slug>/` con `.webp`, naming `logo_*`, `cover_*`, `storytelling_*-N`.
   - **Minimal (JPEG/PNG, EXIF, logo sangue):** [`scripts/partner_media_minimal_local.py`](../scripts/partner_media_minimal_local.py) con `--in-dir` = `partner_media_out/partner/<slug>/` e **`--out-dir`** = cartella dedicata (es. `test/output_tramelle_minimal/<slug>/`). Qui **non** c’è upload: solo file scritti in `--out-dir`.
5. **Upload Cloudflare Images** dalla **stessa cartella** usata come output al passo 4: [`scripts/upload-webp-dir-to-cloudflare-images.py`](../scripts/upload-webp-dir-to-cloudflare-images.py) legge `CLOUDFLARE_*` da `backend/.env`, carica **`.webp` / `.jpg` / `.jpeg` / `.png`** (solo naming partner) e genera un JSON import con **`cfimg:<id>`**.
6. **JSON / DB**: per logo, hero e gallery salvare **`cfimg:<id>`** (o URL `https://imagedelivery.net/...` completi) nei campi che l’import già mappa (`logo_url`, `brand_banner_url`, `product_image_urls` → metadata / `photo`).
7. **Import Medusa**: `import-json-catalog` / script backend come da [`backend/src/scripts/import-json-catalog.ts`](../backend/src/scripts/import-json-catalog.ts).

### Testo seller in italiano (`i18n`)

L’import da JSON (`company_profile` / `short_description`) scrive:

- `seller_listing_profile.metadata.tramelle_import_description_source` (sorgente completa);
- **`seller_listing_profile.metadata.tramelle_description_i18n.it`** (stesso testo, per filtri `content_locale=it` e UI per lingua).

In aggiornamento seller, le altre chiavi `tramelle_description_i18n` (es. `en`) già presenti **non** vengono rimosse.

**Seller di riferimento “Alpe Magna”** nel codice: handle tipico **`alpe-magna`** (es. script WooCommerce [`import-wc-store-catalog-products.ts`](../backend/src/scripts/import-wc-store-catalog-products.ts)); verifica sempre handle/email nel DB prima di un import mirato.

## Variabili d’ambiente (allineamento)

| Dove | Variabili |
|------|-----------|
| **Backend** | `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_IMAGES_ACCOUNT_HASH`, `CLOUDFLARE_IMAGES_VARIANT`; opz. `CLOUDFLARE_IMAGES_DELIVERY_HOST` |
| **Storefront** | `NEXT_PUBLIC_CLOUDFLARE_IMAGES_ACCOUNT_HASH`, `NEXT_PUBLIC_CLOUDFLARE_IMAGES_VARIANT` (stessi valori di hash/variant del backend) |
| **Vendor panel** | `VITE_CLOUDFLARE_IMAGES_ACCOUNT_HASH`, `VITE_CLOUDFLARE_IMAGES_VARIANT` |

Espansione `cfimg:` nel codice: [`storefront/src/lib/helpers/cloudflare-images.ts`](../storefront/src/lib/helpers/cloudflare-images.ts), [`vendor-panel/src/utils/cloudflare-images.ts`](../vendor-panel/src/utils/cloudflare-images.ts), [`backend/src/lib/cloudflare-images.ts`](../backend/src/lib/cloudflare-images.ts).

## Note

- **`cfimg:`** evita ambiguità con path relativi; hash e variant restano negli env, non nel DB.
- Dopo cambi env: riavvio dev / rebuild storefront e vendor dove applicabile.
