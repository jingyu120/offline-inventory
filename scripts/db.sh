#!/usr/bin/env bash
# ──────────────────────────────────────────────────
# Database Schema Management — Burma Inventory
# Usage: ./scripts/db.sh <command>
#   ensure    Start containers if needed (delegates to the shared helper)
#   wipe      Drop & recreate the public schema (empties the DB)
#   push      Apply the Drizzle schema and seed master data
#   generate  Generate a Drizzle SQL migration from the schema
#   studio    Open Drizzle Studio against the local DB
#   reset     wipe + push
#   fresh     ensure containers + reset
#
# Container lifecycle (up/down/clean/fix) lives in ./scripts/containers.sh.
# ──────────────────────────────────────────────────
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

# shellcheck source=scripts/lib/container-engine.sh
source "$(dirname "$0")/lib/container-engine.sh"

DB_URL="postgresql://postgres:postgres@localhost:5433/inventory_db?schema=public"

cmd_wipe() {
  ensure_containers
  "$CONTAINER_ENGINE" exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" \
    -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" \
    > /dev/null 2>&1
  log "Database wiped (schema public dropped and recreated)"
}

cmd_push() {
  ensure_containers
  echo "Applying Drizzle schema..."
  DATABASE_URL="$DB_URL" npx drizzle-kit push --config=drizzle.config.ts --force
  log "Schema applied and fully seeded via drizzle-kit"
}

cmd_generate() {
  echo "Generating Drizzle migration from schema..."
  DATABASE_URL="$DB_URL" npx drizzle-kit generate --config=drizzle.config.ts
  log "Migration generated under ./migrations"
}

cmd_studio() {
  ensure_containers
  echo "Opening Drizzle Studio (Ctrl+C to stop)..."
  DATABASE_URL="$DB_URL" npx drizzle-kit studio --config=drizzle.config.ts
}

# Push the schema only when it is missing (cheap no-op once created).
# Used by the dev launcher so a fresh database is provisioned automatically.
cmd_ensure_schema() {
  ensure_containers
  local exists
  exists=$("$CONTAINER_ENGINE" exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -tAc \
    "SELECT to_regclass('public.items') IS NOT NULL;" 2>/dev/null || echo "f")
  if [ "$exists" = "t" ]; then
    log "Database schema present"
  else
    warn "Database schema missing — applying Drizzle schema..."
    cmd_push
  fi
}

cmd_reset() {
  cmd_wipe
  cmd_push
  log "Database fully reset and seeded"
}

cmd_fresh() {
  ensure_containers
  cmd_reset
}

# ── Main ─────────────────────────────────────────
case "${1:-help}" in
  ensure)        ensure_containers ;;
  ensure-schema) cmd_ensure_schema ;;
  wipe)          cmd_wipe ;;
  push)          cmd_push ;;
  generate)      cmd_generate ;;
  studio)        cmd_studio ;;
  reset)         cmd_reset ;;
  fresh)         cmd_fresh ;;
  *)
    echo "Usage: $0 {ensure|ensure-schema|wipe|push|generate|studio|reset|fresh}"
    echo ""
    echo "  ensure         Start containers if not running"
    echo "  ensure-schema  Start containers + push schema only if it is missing"
    echo "  wipe           Drop & recreate the public schema (empties the DB)"
    echo "  push           Apply the Drizzle schema and seed master data"
    echo "  generate       Generate a Drizzle SQL migration from the schema"
    echo "  studio         Open Drizzle Studio against the local DB"
    echo "  reset          wipe + push"
    echo "  fresh          ensure containers + reset"
    exit 1
    ;;
esac
