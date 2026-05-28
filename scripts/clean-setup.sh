#!/usr/bin/env bash
# ──────────────────────────────────────────────────
# Clean Setup Script
# Resets the project to a fresh starting point:
# Stops DB container, deletes volume, clears node_modules/dist,
# re-installs dependencies, starts DB, and applies schema/migrations.
# ──────────────────────────────────────────────────
set -euo pipefail

# Ensure we are in the project root
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }
err()  { echo -e "${RED}✗${NC} $1" >&2; }

# Check for uncommitted git changes
if git diff --quiet 2>/dev/null && git diff --cached --quiet 2>/dev/null; then
  GIT_STATUS_CLEAN=true
else
  GIT_STATUS_CLEAN=false
fi

echo -e "${YELLOW}⚠️  WARNING: This will reset the project to its initial state.${NC}"
echo -e "This action is destructive and will:"
echo -e "  - Delete all local build directories (dist, .nx, tmp)"
echo -e "  - Delete and recreate all node_modules"
echo -e "  - Stop the Docker database container and DELETE the volume (WIPING ALL LOCAL DATA)"
echo -e "  - Perform a fresh, clean npm installation"
echo -e "  - Spin up a clean PostgreSQL database and apply schema"
echo ""

if [ "$GIT_STATUS_CLEAN" = false ]; then
  warn "You have uncommitted git changes! They will NOT be deleted by git reset unless you choose to, but build artifact wiping can sometimes affect untracked files."
  echo ""
fi

read -p "Are you sure you want to proceed? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 1
fi

# 1. Stop and remove Docker containers/volumes
echo "🐳 Stopping and wiping database container/volume..."
docker compose down -v --remove-orphans || true
log "Database container and volume wiped"

# 2. Clean temporary/build files
echo "🧹 Cleaning built files, node_modules, and locks..."
rm -rf dist .nx tmp node_modules package-lock.json mobile-web/node_modules mobile-web/package-lock.json metro-debug.log
log "Cleaned dist, .nx, tmp, metro-debug.log, and node_modules"

# 3. Fresh installation
echo "📦 Installing root npm dependencies..."
npm install --no-audit
log "All workspace dependencies installed"

# 4. Start database container
echo "🐳 Starting database container..."
docker compose up -d
log "Database container started"

# 5. Wait for database to accept connections
echo "⏳ Waiting for database to be ready..."
# Keep trying for up to 30 seconds
FOR_LIMIT=30
count=0
until docker exec burma_inventory_db pg_isready -U postgres -d inventory_db >/dev/null 2>&1; do
  sleep 1
  count=$((count + 1))
  if [ $count -ge $FOR_LIMIT ]; then
    err "Database did not become ready in $FOR_LIMIT seconds."
    exit 1
  fi
done
log "Database is ready"

# 6. Apply database schema and generate Prisma client
echo "🗄️ Setting up database schema..."
./scripts/db.sh reset
log "Database schema applied and Prisma client generated"

# 7. Initial build
echo "🏗️  Running initial server build..."
npx nx run sync-server:build:development
log "Initial build successful"

echo -e "\n${GREEN}🎉 Project successfully reset and initialized!${NC}"
echo -e "Run ${YELLOW}npm run dev${NC} to start developing."
