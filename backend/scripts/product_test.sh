#!/usr/bin/env bash
# Manual acceptance test for the Product Management API.
#
# Proves (per prompt 2 acceptance criteria):
#   - owner creates a product, lists/searches it, updates price + stock,
#   - uploads an image and the returned photo_url is fetchable,
#   - replaces the image and the OLD file is removed (old URL now 404s),
#   - RLS holds: shop B's owner gets 404 on GET/PATCH/DELETE of shop A's product,
#   - hard delete works on a product with no bill_items (409 path is implemented
#     and triggers once billing exists),
#   - soft delete deactivates (hidden from default list, visible with active=all).
#
# Requirements: bash, curl, jq, base64. Server running, bootstrap admin created.
#
# Usage:
#   BASE_URL=http://localhost:8000 \
#   ADMIN_EMAIL="owner@plantora.app" ADMIN_PASSWORD="<bootstrap pw>" \
#   bash scripts/product_test.sh
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8000}"
ADMIN_EMAIL="${ADMIN_EMAIL:?set ADMIN_EMAIL}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:?set ADMIN_PASSWORD}"

say() { printf '\n=== %s ===\n' "$1"; }
login() { # email password -> token
  curl -fsS -X POST "$BASE_URL/auth/login" -H 'Content-Type: application/json' \
    -d "{\"email\":\"$1\",\"password\":\"$2\"}" | jq -r '.access_token'
}
http_code() { curl -fsS -o /dev/null -w '%{http_code}' "$@" || true; }

TS=$(date +%s)

say "Admin login"
ADMIN_TOKEN=$(login "$ADMIN_EMAIL" "$ADMIN_PASSWORD")

say "Admin creates two shops + owners"
A_EMAIL="ownerA.$TS@example.com"; B_EMAIL="ownerB.$TS@example.com"; PW="ownerpass123"
curl -fsS -X POST "$BASE_URL/admin/shops" -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"name\":\"Shop A\",\"owner_email\":\"$A_EMAIL\",\"owner_password\":\"$PW\"}" >/dev/null
curl -fsS -X POST "$BASE_URL/admin/shops" -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"name\":\"Shop B\",\"owner_email\":\"$B_EMAIL\",\"owner_password\":\"$PW\"}" >/dev/null
TOKEN_A=$(login "$A_EMAIL" "$PW")
TOKEN_B=$(login "$B_EMAIL" "$PW")
echo "owners A and B logged in"

say "Owner A creates a product (no shop_id in body — taken from JWT)"
PROD=$(curl -fsS -X POST "$BASE_URL/products" -H "Authorization: Bearer $TOKEN_A" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Money Plant","category":"plants","retail_price":"120","last_wholesale_price":"80","stock":10}')
echo "$PROD" | jq
PID=$(echo "$PROD" | jq -r '.id')

say "Owner A lists products with name search q=money"
curl -fsS "$BASE_URL/products?q=money" -H "Authorization: Bearer $TOKEN_A" | jq

say "Owner A updates price and stock"
curl -fsS -X PATCH "$BASE_URL/products/$PID" -H "Authorization: Bearer $TOKEN_A" \
  -H 'Content-Type: application/json' \
  -d '{"retail_price":"149.50","stock":25}' | jq '{retail_price, stock}'

say "Negative price is rejected (expect 422)"
code=$(http_code -X PATCH "$BASE_URL/products/$PID" -H "Authorization: Bearer $TOKEN_A" \
  -H 'Content-Type: application/json' -d '{"retail_price":"-5"}')
echo "PATCH negative price -> HTTP $code"; [ "$code" = "422" ] || { echo "FAIL"; exit 1; }

say "Owner A uploads an image, then fetches the returned photo_url"
PNG=/tmp/plantora_test.png
base64 -d > "$PNG" <<'EOF'
iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==
EOF
OUT=$(curl -fsS -X POST "$BASE_URL/products/$PID/image" -H "Authorization: Bearer $TOKEN_A" \
  -F "file=@$PNG;type=image/png")
echo "$OUT" | jq '{photo_url}'
URL1=$(echo "$OUT" | jq -r '.photo_url')
code=$(http_code "$BASE_URL$URL1"); echo "GET $URL1 -> HTTP $code"
[ "$code" = "200" ] || { echo "FAIL: image not served"; exit 1; }

say "Owner A replaces the image; the OLD file must be removed (old URL 404)"
OUT2=$(curl -fsS -X POST "$BASE_URL/products/$PID/image" -H "Authorization: Bearer $TOKEN_A" \
  -F "file=@$PNG;type=image/png")
URL2=$(echo "$OUT2" | jq -r '.photo_url')
echo "new photo_url: $URL2"
[ "$URL1" != "$URL2" ] || { echo "FAIL: filename did not change"; exit 1; }
code=$(http_code "$BASE_URL$URL1"); echo "GET old $URL1 -> HTTP $code"
[ "$code" = "404" ] || { echo "FAIL: old image was not deleted"; exit 1; }

say "Reject non-image upload (expect 422)"
echo "not an image" > /tmp/plantora_test.txt
code=$(http_code -X POST "$BASE_URL/products/$PID/image" -H "Authorization: Bearer $TOKEN_A" \
  -F "file=@/tmp/plantora_test.txt;type=text/plain")
echo "upload .txt -> HTTP $code"; [ "$code" = "422" ] || { echo "FAIL"; exit 1; }

say "RLS: owner B cannot GET / PATCH / DELETE owner A's product (expect 404 each)"
for verb in GET PATCH DELETE; do
  if [ "$verb" = "PATCH" ]; then
    code=$(http_code -X PATCH "$BASE_URL/products/$PID" -H "Authorization: Bearer $TOKEN_B" \
      -H 'Content-Type: application/json' -d '{"stock":1}')
  else
    code=$(http_code -X "$verb" "$BASE_URL/products/$PID" -H "Authorization: Bearer $TOKEN_B")
  fi
  echo "$verb as owner B -> HTTP $code"; [ "$code" = "404" ] || { echo "FAIL: RLS leak!"; exit 1; }
done

say "Hard delete works on a product with NO sales history"
THROW=$(curl -fsS -X POST "$BASE_URL/products" -H "Authorization: Bearer $TOKEN_A" \
  -H 'Content-Type: application/json' -d '{"name":"Throwaway","retail_price":"1"}')
TID=$(echo "$THROW" | jq -r '.id')
curl -fsS -X DELETE "$BASE_URL/products/$TID?hard=true" -H "Authorization: Bearer $TOKEN_A" | jq
code=$(http_code "$BASE_URL/products/$TID" -H "Authorization: Bearer $TOKEN_A")
echo "GET hard-deleted product -> HTTP $code"; [ "$code" = "404" ] || { echo "FAIL"; exit 1; }
echo "(409 hard-delete-with-history path is implemented; it triggers once billing exists.)"

say "Soft delete deactivates (hidden by default, visible with active=all)"
curl -fsS -X DELETE "$BASE_URL/products/$PID" -H "Authorization: Bearer $TOKEN_A" | jq
DEFAULT_COUNT=$(curl -fsS "$BASE_URL/products" -H "Authorization: Bearer $TOKEN_A" | jq "[.[] | select(.id==\"$PID\")] | length")
ALL_COUNT=$(curl -fsS "$BASE_URL/products?active=all" -H "Authorization: Bearer $TOKEN_A" | jq "[.[] | select(.id==\"$PID\")] | length")
echo "appears in default list: $DEFAULT_COUNT (expect 0); in active=all: $ALL_COUNT (expect 1)"
[ "$DEFAULT_COUNT" = "0" ] && [ "$ALL_COUNT" = "1" ] || { echo "FAIL"; exit 1; }

say "All product acceptance checks passed"
