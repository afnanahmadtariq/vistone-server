#!/usr/bin/env bash
# Smoke checks when backends are up (`npm run dev` or docker-compose).
# Usage: from repo root `vistone-server`: bash scripts/dev-smoke-e2e.sh
# Optional: BASE=http://other-host  (default http://127.0.0.1)

set -euo pipefail
BASE="${BASE:-http://127.0.0.1}"
RED='\033[0;31m'
GRN='\033[0;32m'
YLW='\033[0;33m'
RST='\033[0m'

pass() { echo -e "${GRN}PASS${RST} $*"; }
fail() { echo -e "${RED}FAIL${RST} $*"; }
warn() { echo -e "${YLW}WARN${RST} $*"; }

check_http() {
  local name="$1" url="$2" want="${3:-200}"
  local code
  code=$(curl -sS -o /tmp/vistone-smoke-body.txt -w '%{http_code}' --max-time 5 "$url" 2>/dev/null) || true
  [[ -z "$code" ]] && code="000"
  if [[ "$code" == "$want" ]]; then
    pass "$name ($url) -> HTTP $code"
    return 0
  fi
  fail "$name ($url) -> HTTP $code (expected $want)"
  [[ -s /tmp/vistone-smoke-body.txt ]] && head -c 200 /tmp/vistone-smoke-body.txt | tr '\n' ' ' && echo
  return 1
}

echo "=== Vistone backend smoke (BASE=$BASE) ==="
echo

any_fail=0

# --- Direct service health (no auth on /health via defaultInternalAuthSkip) ---
check_http "auth-service"        "$BASE:3001/health"        || any_fail=1
check_http "workforce-management" "$BASE:3002/health"     || any_fail=1
check_http "project-management"   "$BASE:3003/health"     || any_fail=1
check_http "client-management"    "$BASE:3004/health"     || any_fail=1
check_http "knowledge-hub"        "$BASE:3005/health"     || any_fail=1
check_http "communication"        "$BASE:3006/health"     || any_fail=1
check_http "monitoring-reporting" "$BASE:3007/health"     || any_fail=1
check_http "notification"         "$BASE:3008/health"     || any_fail=1
check_http "ai-engine"            "$BASE:3009/health"     || any_fail=1

echo
# --- API gateway ---
check_http "api-gateway"          "$BASE:4000/health"      || any_fail=1

code=$(curl -sS -o /tmp/vistone-smoke-gql.txt -w '%{http_code}' --max-time 10 \
  -X POST "$BASE:4000/graphql" \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ __typename }"}' 2>/dev/null) || true
[[ -z "$code" ]] && code="000"
if [[ "$code" == "200" ]] && grep -q '"data"' /tmp/vistone-smoke-gql.txt 2>/dev/null; then
  pass "api-gateway GraphQL ($BASE:4000/graphql) -> HTTP $code with data"
else
  fail "api-gateway GraphQL -> HTTP $code"
  head -c 300 /tmp/vistone-smoke-gql.txt 2>/dev/null | tr '\n' ' ' || true
  echo
  any_fail=1
fi

echo
echo "=== Manual authenticated pass (after smoke is green) ==="
echo "1. Login: POST $BASE:3001/auth/login JSON { \"email\", \"password\" } -> accessToken"
echo "2. GraphQL: POST $BASE:4000/graphql Header Authorization: Bearer <token>, Header x-organization-id: <orgUuid>"
echo "   Body: {\"query\":\"query { me { id email role } }\"}"
echo "3. Gateway→service hop: pick a resolver your UI uses (e.g. projects); confirm 200 and no unexpected 401 from microservices."
echo "4. AI engine: POST $BASE:3009/api/chat with Bearer + JSON { \"query\": \"ping\", \"sessionId\": null } (needs keys / mocks per TESTING-AND-EVALUATION.md)"
echo "5. With FORWARD_GATEWAY_IDENTITY_TO_SERVICES + TRUST_GATEWAY_IDENTITY_HEADERS: tcpdump or logs should show x-internal-user-id on service requests and no per-request /auth/me from services."

echo
if [[ "$any_fail" -ne 0 ]]; then
  warn "Some checks failed — start stack: cd vistone-server && npm run dev"
  exit 1
fi
echo -e "${GRN}All automated smoke checks passed.${RST}"
exit 0
