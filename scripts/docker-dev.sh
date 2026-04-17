#!/usr/bin/env bash
# Docker development environment helper
# Usage: ./scripts/docker-dev.sh [command]
set -euo pipefail

# Derive paths dynamically from script location
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
export REPO_PARENT="$(cd "$PROJECT_DIR/.." && pwd)"
export PROJECT_DIR_NAME="$(basename "$PROJECT_DIR")"

COMPOSE="docker compose"
EXEC="$COMPOSE exec -u devuser"

case "${1:-shell}" in
  build)
    $COMPOSE build
    ;;
  up)
    $COMPOSE up -d --build
    echo "Container running. Use './scripts/docker-dev.sh shell' to enter."
    ;;
  down)
    $COMPOSE down
    ;;
  install)
    $EXEC dev npm install
    $EXEC -w "$PROJECT_DIR/backend" dev npx prisma generate
    $EXEC -w "$PROJECT_DIR/backend" dev npm run db:push
    $EXEC -w "$PROJECT_DIR/e2e" dev npx playwright install chromium
    ;;
  test)
    $EXEC -w "$PROJECT_DIR/backend" dev npm test
    $EXEC -w "$PROJECT_DIR/frontend" dev npm test
    ;;
  dev)
    $EXEC -d -w "$PROJECT_DIR/backend" dev npm run dev
    $EXEC -d -w "$PROJECT_DIR/frontend" dev npm run dev
    echo "Backend: http://localhost:3000"
    echo "Frontend: http://localhost:5173"
    ;;
  e2e)
    $EXEC -w "$PROJECT_DIR/e2e" dev npm test
    ;;
  shell)
    $EXEC dev bash
    ;;
  *)
    $COMPOSE exec -u devuser dev "$@"
    ;;
esac
