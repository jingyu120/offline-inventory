#!/usr/bin/env bash
# ──────────────────────────────────────────────────
# Unified Setup & Reset Script — Burma Inventory
# Handles initial machine setup as well as full project resets.
# Detects and works with both Podman and Docker seamlessly.
# ──────────────────────────────────────────────────
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

# Colors, logging, engine detection, and resilient compose helpers.
# shellcheck source=scripts/lib/container-engine.sh
source "$(dirname "$0")/lib/container-engine.sh"

show_help() {
  echo -e "${BOLD}🇲🇲  Burma Inventory — Unified System Setup${NC}"
  echo "Usage: ./scripts/setup.sh [options]"
  echo ""
  echo "Options:"
  echo "  -r, --reset    Destructively wipes databases, container volumes, node_modules, and rebuilds everything fresh"
  echo "  -y, --yes      Bypasses the confirmation prompt during a reset"
  echo "  -h, --help     Displays this help menu"
  echo ""
  echo "Examples:"
  echo "  ./scripts/setup.sh          # Idempotent setup (safe for daily use)"
  echo "  ./scripts/setup.sh --reset  # Full clean start (destructive)"
  echo ""
}

# ── 1. Parse Arguments ────────────────────────────
RESET_MODE=false
FORCE_YES=false

for arg in "$@"; do
  case $arg in
    --reset|-r)
      RESET_MODE=true
      shift
      ;;
    -y|--yes)
      FORCE_YES=true
      shift
      ;;
    -h|--help)
      show_help
      exit 0
      ;;
    *)
      # Ignore other unknown args
      ;;
  esac
done

echo -e "${BOLD}🇲🇲  Burma Inventory — Unified System Setup${NC}"
echo -e "   One script to initialize or reset your environment.\n"

# ── 2. Create Default .env File if Missing ────────
if [ ! -f ".env" ]; then
  step "Creating default .env file..."
  cat <<EOF > .env
# ──────────────────────────────────────────────────
# Burma Inventory — Environment Configuration
# ──────────────────────────────────────────────────

# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/inventory_db?schema=public"

# Sync Server
SYNC_SERVER_PORT=3000
SYNC_SERVER_PREFIX=api
NX_TUI=false
REDIS_URL="redis://localhost:6379"

# Mobile Client
SYNC_API_URL=http://localhost:3000/api/sync
EOF
  log ".env file created with correct development defaults"
fi

# ── 3. Container Engine Detection ─────────────────
detect_container_engine || exit 1
log "Container engine detected: $CONTAINER_ENGINE ($(command -v "$CONTAINER_ENGINE"))"
log "Compose tool detected: $COMPOSE_CMD"

# ── 4. Podman Machine Check (macOS specific) ──────
start_podman_machine_if_needed

# ── 5. Database readiness is provided by wait_for_db() from the shared lib ──

# ── 6. Handle Destructive Reset Mode ──────────────
if [ "$RESET_MODE" = true ]; then
  step "⚠️  Destructive Reset Requested"
  echo -e "This action is destructive and will:"
  echo -e "  - Stop local databases and DELETE container volumes (WIPING ALL LOCAL DATA)"
  echo -e "  - Delete all built files and NX temporary files (dist, .nx, tmp)"
  echo -e "  - Delete and reinstall all node_modules"
  echo -e "  - Rebuild the application and database schemas from scratch"
  echo ""

  if [ "$FORCE_YES" = false ]; then
    read -p "Are you absolutely sure you want to proceed? (y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      echo "Aborted."
      exit 0
    fi
  fi

  step "1/5  Wiping containers and persistent database volumes..."
  compose_clean || true
  log "Containers and database volumes wiped"

  step "2/5  Cleaning built directories, caches, and node_modules..."
  rm -rf dist .nx tmp node_modules package-lock.json mobile-web/node_modules mobile-web/package-lock.json metro-debug.log
  log "Cleaned build artifacts and node_modules"

  step "3/5  Installing all workspace dependencies..."
  npm install --no-audit
  log "Clean npm install completed"

  step "4/5  Starting database containers cleanly..."
  compose_up
  log "Database containers started"

  # Wait for database container to be ready
  wait_for_db

  step "5/5  Applying database schema & seeding master data..."
  DB_URL="postgresql://postgres:postgres@localhost:5433/inventory_db?schema=public"
  DATABASE_URL="$DB_URL" npx drizzle-kit push --config=drizzle.config.ts --force
  log "Drizzle database schema pushed and fully seeded"

  echo ""
  echo -e "${GREEN}${BOLD}🎉 Reset & Setup complete!${NC}"
  echo -e "   Run ${YELLOW}npm run dev${NC} to start the development environment."
  echo ""
  exit 0
fi

# ── 7. Non-Destructive Initial Setup ─────────────
step "1/5  Checking system prerequisites..."

check_cmd() {
  if ! command -v "$1" &>/dev/null; then
    err "Required tool not found: $1. Please install it and re-run this script."
    exit 1
  fi
}

check_cmd node
check_cmd npm

NODE_MAJOR=$(node -e "process.stdout.write(process.version.replace('v','').split('.')[0])")
if [ "$NODE_MAJOR" -lt 22 ]; then
  err "Node.js >= 22 is required (found $(node --version)). Please check .nvmrc and use nvm."
  exit 1
fi
log "Node $(node --version) — OK"

step "2/5  Installing workspace dependencies..."
echo "📦 Syncing package dependencies..."
npm install --no-audit
log "Workspace dependencies verified and synced"

step "3/5  Ensuring database containers are running..."
if container_running "$DB_CONTAINER"; then
  log "Container ${DB_CONTAINER} is already running"
else
  echo "🐳 Starting database containers..."
  compose_up
  log "Database containers started"
fi

# Wait for database container to be ready
wait_for_db

step "4/5  Applying database schema (Drizzle push)..."
TABLE_EXISTS=$("$CONTAINER_ENGINE" exec "$DB_CONTAINER" psql -U postgres -d inventory_db -tAc \
  "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema='public' AND table_name='items');" 2>/dev/null || echo "f")

if [ "$TABLE_EXISTS" = "t" ]; then
  warn "Schema tables already exist — running push anyway to verify structure and seed master data"
fi

DB_URL="postgresql://postgres:postgres@localhost:5433/inventory_db?schema=public"
DATABASE_URL="$DB_URL" npx drizzle-kit push --config=drizzle.config.ts --force
log "Schema applied and fully seeded"

step "5/5  Running initial sync-server build..."
echo "🏗️  Syncing builds..."
npx nx run sync-server:build:development
log "Initial build verified and synced"

echo ""
echo -e "${GREEN}${BOLD}🎉 Setup complete!${NC}"
echo -e "   Run ${YELLOW}npm run dev${NC} to start the development environment."
echo ""
