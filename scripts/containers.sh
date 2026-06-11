#!/usr/bin/env bash
# ──────────────────────────────────────────────────
# Container Lifecycle Management — Burma Inventory
# Thin CLI over the shared container-engine helpers.
#
# Usage: ./scripts/containers.sh <command>
#   up        Start containers (self-heals stale-name conflicts), wait for DB
#   down      Stop & remove containers (KEEPS data volume)
#   restart   down + up
#   fix       Force-remove stale named containers, then up (fixes the
#             "container name already in use" error; data preserved)
#   clean     Stop & remove containers AND data volume (DESTRUCTIVE)
#   status    Show engine + container states
#   logs [svc] Tail logs (default: the postgres container)
# ──────────────────────────────────────────────────
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

# shellcheck source=scripts/lib/container-engine.sh
source "$(dirname "$0")/lib/container-engine.sh"

detect_container_engine

cmd_status() {
  echo -e "${BOLD}Engine:${NC}  $CONTAINER_ENGINE"
  echo -e "${BOLD}Compose:${NC} $COMPOSE_CMD"
  echo ""
  echo -e "${BOLD}Containers:${NC}"
  local found=false
  for c in "${ALL_CONTAINERS[@]}"; do
    if container_exists "$c"; then
      found=true
      local state
      state="$("$CONTAINER_ENGINE" ps -a --filter "name=^${c}$" --format '{{.Status}}' 2>/dev/null || echo 'unknown')"
      if container_running "$c"; then
        log "$c — $state"
      else
        warn "$c — $state (stopped)"
      fi
    fi
  done
  [ "$found" = false ] && warn "No project containers exist yet. Run 'npm run db:up'."
}

case "${1:-help}" in
  up)
    compose_up
    wait_for_db
    log "Containers are up"
    ;;
  down)
    compose_down
    log "Containers stopped and removed (data volume preserved)"
    ;;
  restart)
    compose_down
    compose_up
    wait_for_db
    log "Containers restarted"
    ;;
  fix)
    warn "Clearing stale named containers (data volume preserved)..."
    remove_stale_containers
    compose_up
    wait_for_db
    log "Containers recovered"
    ;;
  clean)
    compose_clean
    log "Containers and data volume removed (destructive)"
    ;;
  status)
    cmd_status
    ;;
  logs)
    shift || true
    "$CONTAINER_ENGINE" logs -f "${1:-$DB_CONTAINER}"
    ;;
  *)
    echo "Usage: $0 {up|down|restart|fix|clean|status|logs [service]}"
    echo ""
    echo "  up       Start containers (self-heals name conflicts) + wait for DB"
    echo "  down     Stop & remove containers (keeps data volume)"
    echo "  restart  down + up"
    echo "  fix      Force-clear stale named containers then start (data kept)"
    echo "  clean    Remove containers AND data volume (DESTRUCTIVE)"
    echo "  status   Show engine + container states"
    echo "  logs     Tail logs (default: postgres)"
    exit 1
    ;;
esac
