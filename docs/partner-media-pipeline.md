# Partner media: download (Taste / Pitti) ed elaborazione immagini

Questo documento riassume **come** scaricare le immagini partner in modo coerente con le policy del progetto e **come** sono definite le due pipeline di processing (batch generico WEBP e batch “Tramelle minimal” incluso il **logo crop al sangue**).

## Dove sta il codice

- La cartella di lavoro tipica è **`dati_venditori/`** (workspace locale; **è in `.gitignore`** — non finisce nel repo).
- Gli script citati sotto si intendono eseguiti da lì, salvo diversa indicazione:
  ```bash
  cd dati_venditori
  ```

## Requisito Tor

- Tutte le richieste HTTP verso i siti target (HTML scheda, download immagini) devono passare da **Tor**, tramite `tor_session.require_anonymous_tor_session()` e la stessa sessione per i download (vedi commenti in `dati_venditori/tor_session.py`).
- In ascolto tipico: **SOCKS5 su `127.0.0.1:9050`** (servizio `tor` su Debian/Ubuntu).
- Se la porta non è aperta: avviare Tor prima di lanciare gli script.

Dipendenze Python usate dagli script: in ambiente progetto, **Pillow (PIL)** e, per il batch minimal con EXIF in WebP, **piexif** (es. `python3-piexif`).

## Pipeline 1 — WEBP + naming CDN + watermark su gallery

**Script:** `tramelle_process_partner_images_webp.py`

- Scarica logo, cover e gallery via Tor.
- Applica orientamento EXIF, poi output senza EXIF “di base” lato strategia dello script.
- Ridimensiona di **−2 px** su larghezza e altezza (minimo 1×1).
- Salva **`.webp`** sotto `{out}/partner/<slug>/` con naming allineato a `sync_partner_media_cdn.py`: `logo_{token}.webp`, `cover_{token}.webp`, `storytelling_{token}-N.webp`.
- **Watermark** testuale leggero (**solo** immagini gallery/storytelling), non su logo/cover.

Esempi (dal docstring dello script):

```bash
python3 tramelle_process_partner_images_webp.py --demo-acetaia-malpighi
python3 tramelle_process_partner_images_webp.py --seller-json export.json --slug acetaia-malpighi
```

## Pipeline 2 — Test “Tramelle minimal” (Malpighi)

**Script:** `test/run_malpighi_tramelle_minimal_batch.py`

Batch di prova in `test/output_tramelle_minimal/`, **senza watermark**. **Non usa WebP:** salva **JPEG** o **PNG** come da URL Taste (`.webp` sorgente → uscita `.png`). **Niente contrasto** sulle elaborazioni.

**EXIF su JPEG in uscita** (firma digitale; su PNG non viene incollato il blocco piexif):

| Campo (EXIF) | Valore tipico |
|----------------|---------------|
| Copyright | `--brand` |
| ImageDescription | `Official imagery of {brand}. Optimized for Tramelle Source Gourmet Marketplace.` |
| UserComment | `Source & Credit: Tramelle Source Gourmet Marketplace` |

JPEG salvato con **quality 95**, `subsampling=0`.

### Cover e immagini storytelling

- `ImageOps.exif_transpose`
- Ritaglio **−2 px per lato**.
- Salvataggio **JPG/PNG** (stesso famiglia dell’URL).

### Logo — crop al sangue e anti-tracking

1. Flood-fill **8-vicinanza** da bordo su **`#FFFFFF`** e **`alpha == 0`**, ritaglio minimo; ripetuto **anche dopo** il ridimensionamento (evita bordo bianco da LANCZOS).
2. **−2%** lato.
3. **JPEG** (o PNG se l’URL sorgente fosse PNG): RGB con fondo bianco se serviva per flatten alpha.

Cloudinary: strip opzionale `c_scale,f_auto,q_auto,w_auto` → `--no-cloudinary-strip` per disattivare.

### Comandi

Batch completo (logo + cover + storytelling):

```bash
python3 test/run_malpighi_tramelle_minimal_batch.py
```

Solo il logo (ri-scarica da Taste via Tor e sovrascrive il file logo):

```bash
python3 test/run_malpighi_tramelle_minimal_batch.py --only logo
```

Altra scheda (esempio Bagai — slug e suffissi file derivati dall’URL se omessi `--slug` / `--suffix`):

```bash
python3 test/run_malpighi_tramelle_minimal_batch.py \
  --url 'https://taste.pittimmagine.com/it/pittimmagine/archive/taste19/exhibitors/B/bagai-cioccolato' \
  --brand 'Bagai Cioccolato'
```

**URL Pitti / Cloudinary:** lo script può riscrivere gli URL `https://media.pittimmagine.com/image/upload/c_scale,f_auto,q_auto,w_auto/v…/…` in `…/upload/v…/…` (stesso asset, path “master” senza quel blocco di trasformazione). Disattivazione: `--no-cloudinary-strip`.

Opzioni utili: `--slug`, `--suffix`, `--story-geo`, `--description`, `--credit`, `--out-subdir`, `--save-originals`, `--no-cloudinary-strip`.

## Pubblicazione CDN

Upload opzionale tramite `sync_partner_media_cdn.py` con **`--rsync`**.

- Variabile d’ambiente: **`TRAMELLE_CDN_RSYNC_DEST`** (destinazione rsync sul server CDN).
- Base URL pubblica configurabile con **`TRAMELLE_CDN_PUBLIC_BASE`** (default come da script).

L’operatore esegue rsync quando intende pubblicare; non è parte automatica degli script di sola elaborazione locale.

## Riferimenti rapidi

| Oggetto | Percorso (sotto repo / dati_venditori) |
|--------|----------------------------------------|
| Sessione Tor obbligatoria | `dati_venditori/tor_session.py` |
| Download binari + convenzioni CDN | `dati_venditori/sync_partner_media_cdn.py` |
| WEBP batch watermark | `dati_venditori/tramelle_process_partner_images_webp.py` |
| Test minimal Malpighi + logo sangue | `dati_venditori/test/run_malpighi_tramelle_minimal_batch.py` |
