![B2C Storefront Cover](https://cdn.prod.website-files.com/6790aeffc4b432ccaf1b56e5/67a21bd27b4ac8b812c1d84f_B2C%20Storefront%20Cover.png)

<div align="center">
  <h1> B2C Storefront
    <br> 
for <a href="https://github.com/mercurjs/mercur">Mercur</a> - Open Source Marketplace Platform  </h1>
  <!-- Shields.io Badges -->
  <a href="https://github.com/mercurjs/mercur/tree/main?tab=MIT-1-ov-file">
    <img alt="License" src="https://img.shields.io/badge/license-MIT-blue.svg" />
  </a>
  <a href="#">
    <img alt="PRs Welcome" src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" />
  </a>
  <a href="https://mercurjs.com/contact">
    <img alt="Support" src="https://img.shields.io/badge/support-contact%20author-blueviolet.svg" />
  </a>
  <!-- Website Links -->
  <p>
  <a href="https://b2c.mercurjs.com/">🛍️ B2C Marketplace Storefront Demo </a> · <a href="https://mercurjs.com/">Mercur Website</a> · <a href="https://docs.mercurjs.com/">📃 Explore the docs</a> 
  </p> 
</div>

## B2C Storefront for Marketplace

Customizable storefront designed for B2C with all elements including browsing and buying products across multiple vendors at once.

Ready to go:

- Home Page - <a href="https://b2c.mercurjs.com/">🛍️ Check demo </a>
- Listing
- Product Page
- Shopping Cart
- Seller Page
- Selling Hub - Moved to external <a href="https://github.com/mercurjs/vendor-panel">VendorPanel</a>
- Wishlist

# Part of Mercur

<a href="https://github.com/mercurjs/mercur">Mercur</a> is an open source marketplace platform that allows you to create high-quality experiences for shoppers and vendors while having the most popular Open Source commerce platform MedusaJS as a foundation.

Mercur is a platform to start, customize, manage, and scale your marketplace for every business model with a modern technology stack.

![Mercur](https://cdn.prod.website-files.com/6790aeffc4b432ccaf1b56e5/67a1020f202572832c954ead_6b96703adfe74613f85133f83a19b1f0_Fleek%20Tilt%20-%20Readme.png)

## Quickstart

### Installation

Clone the repository

```js
git clone https://github.com/mercurjs/b2c-marketplace-storefront.git
```

&nbsp;

Go to directory

```js
cd b2c-marketplace-storefront
```

&nbsp;

Install dependencies

```js
yarn install
```

&nbsp;

Make a .env.local file and copy the code below

```js
# API URL
MEDUSA_BACKEND_URL=http://localhost:9000
# Your publishable key generated in mercur admin panel
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=
# Your public url
NEXT_PUBLIC_BASE_URL=http://localhost:3000
# Default region
NEXT_PUBLIC_DEFAULT_REGION=pl
# Stripe payment key. It can be random string, don't leave it empty.
NEXT_PUBLIC_STRIPE_KEY=supersecret
# Backend cookie secret
REVALIDATE_SECRET=supersecret
# Your site name in metadata
NEXT_PUBLIC_SITE_NAME="Fleek Marketplace"
# Your site description in metadata
NEXT_PUBLIC_SITE_DESCRIPTION="Fleek Markeplace"
#TalkJS APP ID
NEXT_PUBLIC_TALKJS_APP_ID=<your talkjs app id>
```

&nbsp;

Start storefront

```js
yarn dev
```

&nbsp;

### Guides

#### <a href="https://talkjs.com/docs/Reference/Concepts/Sessions/" target="_blank">How to get TalkJs App ID</a>

### Product search (Meilisearch)

Listing search calls the backend `POST /store/products/search`, backed by Meilisearch. Set `MEILISEARCH_HOST` and `MEILI_MASTER_KEY` in `backend/.env`, then from `/backend` run `yarn meilisearch:sync`. Index settings live in `backend/src/lib/meilisearch/index-settings.ts`.

## Deploy produzione (Tramelle)

Il deploy dello storefront **è sul server** (build, `sync-standalone-assets`, riavvio, CDN). Istruzioni e file compose: vedi **`../README.md`** sezione *Deploy in produzione (storefront Tramelle)*.
