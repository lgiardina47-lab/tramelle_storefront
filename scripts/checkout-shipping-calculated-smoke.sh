#!/usr/bin/env bash
# GET /store/shipping-options: usare calculated_price.calculated_amount (provider manuale: no POST /calculate).
# Richiede: storefront/.env con NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY, API 127.0.0.1:9000
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
set -a
# shellcheck source=/dev/null
[ -f "$ROOT/storefront/.env" ] && source "$ROOT/storefront/.env"
set +a
PK="${NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY:?missing NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY}"
BASE="${MEDUSA_STORE_URL:-http://127.0.0.1:9000}"

build_cart() {
  local QTY="${1:-1}"
  local CC="${2:-it}"
  local REGION
  REGION=$(curl -sS "${BASE}/store/regions" -H "x-publishable-api-key: ${PK}" | node -pe "JSON.parse(require('fs').readFileSync(0,'utf8')).regions[0].id")
  local CART
  CART=$(curl -sS -X POST "${BASE}/store/carts" -H "x-publishable-api-key: ${PK}" -H "Content-Type: application/json" -d "{\"region_id\":\"${REGION}\"}" | node -pe "JSON.parse(require('fs').readFileSync(0,'utf8')).cart.id")
  local VID
  VID=$(curl -sS "${BASE}/store/products?limit=1&fields=%2Avariants" -H "x-publishable-api-key: ${PK}" | node -pe "const j=JSON.parse(require('fs').readFileSync(0,'utf8')); (j.products[0]||{}).variants[0].id")
  if [ -z "$VID" ] || [ "$VID" = "undefined" ]; then echo "no variant"; exit 1; fi
  curl -sS -X POST "${BASE}/store/carts/${CART}/line-items" -H "x-publishable-api-key: ${PK}" -H "Content-Type: application/json" -d "{\"variant_id\":\"${VID}\",\"quantity\":${QTY}}" >/dev/null
  curl -sS -X POST "${BASE}/store/carts/${CART}" -H "x-publishable-api-key: ${PK}" -H "Content-Type: application/json" -d "{\"shipping_address\":{\"first_name\":\"T\",\"last_name\":\"T\",\"address_1\":\"Via X 1\",\"city\":\"X\",\"postal_code\":\"20100\",\"country_code\":\"${CC}\",\"province\":\"MI\",\"phone\":\"+39\"},\"email\":\"t@t.com\",\"billing_address\":{\"first_name\":\"T\",\"last_name\":\"T\",\"address_1\":\"Via X 1\",\"city\":\"X\",\"postal_code\":\"20100\",\"country_code\":\"${CC}\",\"province\":\"MI\",\"phone\":\"+39\"}}" >/dev/null
  echo "$CART"
}

report() {
  local CART_ID="$1"
  curl -sS "${BASE}/store/carts/${CART_ID}" -H "x-publishable-api-key: ${PK}" | node -e "const j=JSON.parse(require('fs').readFileSync(0,'utf8')); const c=j.cart; console.log('item_subtotal', c.item_subtotal, 'id', c.id);"
  curl -sS "${BASE}/store/shipping-options?cart_id=${CART_ID}" -H "x-publishable-api-key: ${PK}" | node -e "
    const j = JSON.parse(require('fs').readFileSync(0, 'utf8'));
    for (const o of (j.shipping_options || [])) {
      const ca = o.calculated_price && o.calculated_price.calculated_amount;
      console.log(o.name, 'amount', o.amount, 'calculated_amount', ca);
    }
  "
}

echo "--- below threshold (qty 1) ---"
C1=$(build_cart 1 it)
report "$C1"
echo "--- high qty (expect free shipping for IT if subtotal >= 65 EUR) ---"
C2=$(build_cart 200 it)
report "$C2"
echo "done"
