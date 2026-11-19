#!/usr/bin/env bash
# Acceptance test for the Nov 24, 2026 deadline (finish-line plan, Phase 4).
#
# One command, eight checks, one verdict. It is deliberately read-only:
# nothing here writes to the live project, so it can be run as often as wanted,
# including after the code freeze.
#
#   ./scripts/acceptance.sh              # everything
#   ./scripts/acceptance.sh --no-suites  # skip npm test / playwright (~1 min)
#
# Pass = 112/112 unit - 19/19 e2e - three 200s - both auth probes landing on
# the Pages app - last keep-alive run green.

set -uo pipefail

SITE=https://hanover-cs461.github.io/senior-project-2026-2027-Alexis-Brockway
APP=$SITE/app/
API=https://qsynlsbltpnhzncpqerz.supabase.co
RUN_SUITES=1
[ "${1:-}" = "--no-suites" ] && RUN_SUITES=0

ROOT=$(cd "$(dirname "$0")/.." && pwd)
APP_DIR=$ROOT/app
DATE=$(date -u +'%Y-%m-%d %H:%M UTC')

pass=0
fail=0
report() { # report <ok|bad> <label> <detail>
  if [ "$1" = ok ]; then
    pass=$((pass + 1))
    printf 'PASS  %s%s\n' "$2" "${3:+ — $3}"
  else
    fail=$((fail + 1))
    printf 'FAIL  %s%s\n' "$2" "${3:+ — $3}"
  fi
}

echo "Acceptance test — $DATE"
echo

# ---------------------------------------------------------------- 1. suites
if [ "$RUN_SUITES" = 1 ]; then
  unit=$(cd "$APP_DIR" && npm test 2>&1 | grep -oE 'Tests +[0-9]+ passed' | grep -oE '[0-9]+' | head -1)
  if [ "${unit:-0}" = 112 ]; then report ok 'npm test' "$unit/112"; else report bad 'npm test' "expected 112, got ${unit:-none}"; fi

  e2e=$(cd "$APP_DIR" && npm run test:e2e 2>&1 | grep -oE '[0-9]+ passed' | grep -oE '[0-9]+' | head -1)
  if [ "${e2e:-0}" = 19 ]; then report ok 'npm run test:e2e' "$e2e/19"; else report bad 'npm run test:e2e' "expected 19, got ${e2e:-none}"; fi
else
  echo 'SKIP  suites (--no-suites)'
fi

# ------------------------------------------------------------ 2. live pages
for url in "$SITE/" "$APP" "$SITE/tutorial/"; do
  code=$(curl -s -o /dev/null -w '%{http_code}' "$url")
  if [ "$code" = 200 ]; then report ok "GET ${url#*Brockway}"; else report bad "GET $url" "status $code"; fi
done

# --------------------------------------------------------- 3. auth routing
# An invalid token must bounce back to the app, with or without redirect_to.
# No email is sent. The location header is what proves the Site URL setting.
for q in "redirect_to=$APP" ""; do
  loc=$(curl -s -o /dev/null -D - "$API/auth/v1/verify?token=nope&type=recovery${q:+&$q}" \
    | grep -i '^location:' | sed 's/^[Ll]ocation: *//' | tr -d '\r')
  case "$loc" in
    "$SITE/app/"*) report ok "auth probe (${q:-no redirect_to})" "${loc%%#*}" ;;
    '') report bad "auth probe (${q:-no redirect_to})" 'no location header' ;;
    *) report bad "auth probe (${q:-no redirect_to})" "$loc" ;;
  esac
done

# ------------------------------------------------------------ 4. keep-alive
last=$(gh run list --workflow=keep-alive.yml --limit 1 --json status,conclusion,createdAt \
  -q '.[0] | "\(.conclusion) \(.createdAt)"' 2>/dev/null)
if [ "${last%% *}" = success ]; then
  report ok 'keep-alive last run' "$last"
else
  report bad 'keep-alive last run' "${last:-no runs found}"
  echo
  echo 'Note: a red or missing run means the free-tier project paused, not that'
  echo 'the app broke. Restore it in the Supabase dashboard and re-run.'
fi

# ---------------------------------------------------------------- verdict
echo
echo "$pass passed, $fail failed"
[ "$fail" -eq 0 ] && echo 'VERDICT: green — safe to present.' || echo 'VERDICT: red — do not present until the failures above are understood.'
exit $([ "$fail" -eq 0 ] && echo 0 || echo 1)
