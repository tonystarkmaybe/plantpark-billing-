#!/usr/bin/env bash
# Manual acceptance test for the HTTP auth + admin flow.
#
# Proves: admin can log in and create a shop + owner; the shop owner can log in;
# admin can list shops. (DB-level RLS isolation between shops is proven
# separately and more rigorously by `python -m scripts.rls_check`, because
# product endpoints are out of scope for this prompt.)
#
# Requirements: bash, curl, jq. Server running, bootstrap admin created.
#
# Usage:
#   BASE_URL=http://localhost:8000 \
#   ADMIN_EMAIL="owner@plantora.app" ADMIN_PASSWORD="<bootstrap pw>" \
#   bash scripts/acceptance_test.sh
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8000}"
ADMIN_EMAIL="${ADMIN_EMAIL:?set ADMIN_EMAIL}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:?set ADMIN_PASSWORD}"

say() { printf '\n=== %s ===\n' "$1"; }

say "Health check"
curl -fsS "$BASE_URL/health"; echo

say "Admin login"
ADMIN_TOKEN=$(curl -fsS -X POST "$BASE_URL/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" \
  | jq -r '.access_token')
echo "got admin token: ${ADMIN_TOKEN:0:16}..."

say "Admin /auth/me"
curl -fsS "$BASE_URL/auth/me" -H "Authorization: Bearer $ADMIN_TOKEN" | jq

OWNER_EMAIL="owner.$(date +%s)@example.com"
OWNER_PASSWORD="ownerpass123"

say "Admin creates a shop + owner"
SHOP_JSON=$(curl -fsS -X POST "$BASE_URL/admin/shops" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"name\":\"Green Thumb Nursery\",\"owner_name\":\"Asha\",\"owner_phone\":\"9999999999\",\"owner_email\":\"$OWNER_EMAIL\",\"owner_password\":\"$OWNER_PASSWORD\"}")
echo "$SHOP_JSON" | jq
SHOP_ID=$(echo "$SHOP_JSON" | jq -r '.shop.id')

say "Admin lists shops"
curl -fsS "$BASE_URL/admin/shops" -H "Authorization: Bearer $ADMIN_TOKEN" | jq

say "New shop owner logs in"
OWNER_TOKEN=$(curl -fsS -X POST "$BASE_URL/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$OWNER_EMAIL\",\"password\":\"$OWNER_PASSWORD\"}" \
  | jq -r '.access_token')
echo "got owner token: ${OWNER_TOKEN:0:16}..."

say "Owner /auth/me (note role=shop_owner, shop_id set)"
curl -fsS "$BASE_URL/auth/me" -H "Authorization: Bearer $OWNER_TOKEN" | jq

say "Owner is forbidden from admin endpoints (expect HTTP 403)"
code=$(curl -fsS -o /dev/null -w '%{http_code}' "$BASE_URL/admin/shops" \
  -H "Authorization: Bearer $OWNER_TOKEN" || true)
echo "GET /admin/shops as owner -> HTTP $code"
[ "$code" = "403" ] && echo "OK: owner correctly denied" || { echo "FAIL: expected 403"; exit 1; }

say "Admin deactivates the shop, owner can no longer log in (expect HTTP 403)"
curl -fsS -X PATCH "$BASE_URL/admin/shops/$SHOP_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"is_active":false}' | jq
code=$(curl -fsS -o /dev/null -w '%{http_code}' -X POST "$BASE_URL/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$OWNER_EMAIL\",\"password\":\"$OWNER_PASSWORD\"}" || true)
echo "owner login after deactivation -> HTTP $code"
[ "$code" = "403" ] && echo "OK: inactive shop blocks login" || { echo "FAIL: expected 403"; exit 1; }

say "All HTTP acceptance checks passed"
