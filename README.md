# Mercur (nuovo stack) — sostituisce il marketplace Tech Labi

Questa cartella è un **nuovo progetto** MercurJS ([documentazione](https://docs.mercurjs.com/get-started), [org GitHub](https://github.com/mercurjs)).

## Cosa c’è qui

| Cartella     | Contenuto |
|-------------|-----------|
| `backend/`  | Medusa + plugin `@mercurjs/*` (clone di [clean-medusa-starter](https://github.com/mercurjs/clean-medusa-starter) + dipendenze Mercur) |
| `storefront/` | [b2c-marketplace-storefront](https://github.com/mercurjs/b2c-marketplace-storefront) (porta default **3000**) |
| `admin-panel/` | [admin-panel](https://github.com/mercurjs/admin-panel) (Vite) |
| `vendor-panel/` | [vendor-panel](https://github.com/mercurjs/vendor-panel) (Vite, porta tipica **5173**) |

Il vecchio progetto resta in `../marketplace/` finché non lo spegnete o archiviate.

## Database (obbligatorio)

Usate un **PostgreSQL vuoto** dedicato a Mercur.

- **Consigliato:** un **nuovo progetto Supabase** (solo `postgres` pulito), oppure un altro Postgres gestito.
- **Sconsigliato:** riusare lo stesso database già popolato dal marketplace Tech Labi senza backup e senza sapere cosa cancella una migrazione.

Copiate `backend/.env.example` → `backend/.env` e impostate `DATABASE_URL`.

Su Supabase/PG con SSL, in `medusa-config.ts` è già previsto `rejectUnauthorized: false` quando l’URL contiene `supabase`.

## Backend: migrazioni e seed

```bash
cd backend
cp .env.example .env   # poi modificate .env
npx medusa db:migrate
npx medusa user --email admin@mercurjs.com --password admin
yarn seed
```

Dallo stdout del seed ricavate la **publishable key** (`pk_...`) per storefront e vendor.

## Integrazioni (da compilare in `.env`)

Dettaglio in `backend/.env.example` e `storefront/.env.local.example`.

- **Algolia** — Facoltativo in dev: se `ALGOLIA_APP_ID` e `ALGOLIA_API_KEY` nel backend sono vuoti (o `placeholder`), il plugin Algolia non viene caricato e il catalogo resta senza ricerca instant. Quando lo attivi: nel backend **Admin API Key** (`ALGOLIA_API_KEY` in `.env`, oppure una sola riga in `backend/.algolia-admin-key`, file git-ignored); Application ID uguale allo storefront. Storefront: `NEXT_PUBLIC_ALGOLIA_ID` + **Search-Only** key. Poi `node scripts/push-algolia-index-settings.mjs` e riavvio del backend.
- **Stripe** — Obbligatorio per avviare il backend: `@mercurjs/b2c-core` costruisce il client Stripe dai payout. Metti `STRIPE_SECRET_API_KEY` nel backend e la **publishable** corrispondente in `storefront/.env.local` come `NEXT_PUBLIC_STRIPE_KEY` (stesso account Stripe, tab *Developers → API keys*). Per Stripe Connect in produzione: `STRIPE_CONNECTED_ACCOUNTS_WEBHOOK_SECRET` dal webhook configurato in Dashboard.
- **Resend** — email (`RESEND_*`)
- **TalkJS** — messaggi buyer/seller (variabili `VITE_TALK_JS_*` per i pannelli)

Senza Resend/TalkJS le relative funzioni restano disattivate o in fallback.

## Avvio in sviluppo (4 terminali)

1. Redis: `redis-server` (o il servizio già attivo su `127.0.0.1:6379`)
2. Backend: `cd backend && yarn dev` → **http://localhost:9000**
3. Storefront: `cd storefront` — copiate `.env.local.example` → `.env.local`, inserite `pk_` → `npm run dev` → **http://localhost:3000**
4. Admin: `cd admin-panel` — copiate `.env.example` → `.env` → `npm run dev` → **http://localhost:7000** (porta da `deploy/monorepo-default-ports.cjs` / `vite.config.mts`)
5. Vendor: `cd vendor-panel` — copiate `.env.example` → `.env`, aggiungete `VITE_PUBLISHABLE_API_KEY` se richiesto → `npm run dev` → **http://localhost:5173**

Credenziali seed tipiche (se create come sopra): admin `admin@mercurjs.com` / `admin`; vendor `seller@mercurjs.com` / `secret` (verificate nel seed Mercur se cambiano).

## Alternativa ufficiale: Mercur CLI

Se preferite il flusso guidato: `npx mercur-cli install` ([Get Started](https://docs.mercurjs.com/get-started)). Questa cartella replica manualmente quel risultato (backend starter + clone dei pannelli), con `npm install --legacy-peer-deps` sui front perché in ambiente Docker alcuni `yarn install` fallivano su `date-fns`.
