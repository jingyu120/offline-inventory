#!/usr/bin/env bash
# ──────────────────────────────────────────────────
# Pre-commit checks
# Runs: typecheck → lint → test → format check
# Install as git hook: cp scripts/precommit.sh .git/hooks/pre-commit
# ──────────────────────────────────────────────────
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

step() { echo -e "\n${CYAN}${BOLD}▸ $1${NC}"; }
pass() { echo -e "${GREEN}  ✓ $1${NC}"; }
fail() { echo -e "${RED}  ✗ $1${NC}" >&2; exit 1; }

echo -e "${BOLD}🔍 Burma Inventory — Pre-commit Checks${NC}"
echo "────────────────────────────────────────"

# 0. Format Code
step "Formatting code"
npx nx format:write 2>&1 \
  && git add -u \
  && pass "Formatting completed and changes staged" \
  || fail "Formatting failed"

# 1. TypeCheck
step "TypeCheck (all projects)"
npx nx run-many -t typecheck --skip-nx-cache --tui-auto-exit=true --nx-bail 2>&1 \
  && pass "TypeCheck passed" \
  || fail "TypeCheck failed — fix type errors before committing"

# 2. Lint
step "Lint (all projects)"
npx nx run-many -t lint --skip-nx-cache --tui-auto-exit=true --nx-bail 2>&1 \
  && pass "Lint passed" \
  || fail "Lint failed — run 'npm run lint' to see details"

# 3. Tests
step "Tests (all projects)"
npx nx run-many -t test --skip-nx-cache --tui-auto-exit=true --nx-bail 2>&1 \
  && pass "Tests passed" \
  || fail "Tests failed — run 'npm run test' to see details"

# 4. Format
step "Format check"
npx nx format:check 2>&1 \
  && pass "Format check passed" \
  || fail "Format check failed — run 'npm run format' to fix"

# 5. Build (shared-types + sync-server)
step "Build verification"
npx nx run sync-server:build --skip-nx-cache 2>&1 \
  && pass "Build passed" \
  || fail "Build failed — fix compilation errors before committing"

echo ""
echo -e "${GREEN}${BOLD}✅ All pre-commit checks passed${NC}"
echo ""
