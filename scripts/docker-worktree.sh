#!/usr/bin/env bash
# Run commands in a git worktree using the existing dev container
# Usage: ./scripts/docker-worktree.sh <branch-name> [command]
#
# Example:
#   git worktree add .worktrees/feature-xyz -b feature-xyz
#   ./scripts/docker-worktree.sh feature-xyz install
#   ./scripts/docker-worktree.sh feature-xyz test
#   ./scripts/docker-worktree.sh feature-xyz shell
set -euo pipefail

WORKTREE_NAME="${1:?Usage: $0 <worktree-dir-name> [command]}"
COMMAND="${2:-shell}"

# Derive paths dynamically from script location
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
export REPO_PARENT="$(cd "$PROJECT_DIR/.." && pwd)"
export PROJECT_DIR_NAME="$(basename "$PROJECT_DIR")"

WORKTREE_DIR="${PROJECT_DIR}/.worktrees/${WORKTREE_NAME}"

if [ ! -d "$WORKTREE_DIR" ]; then
  echo "Error: ${WORKTREE_DIR} does not exist"
  echo "Create a worktree first: git worktree add .worktrees/${WORKTREE_NAME} -b ${WORKTREE_NAME}"
  exit 1
fi

COMPOSE="docker compose -f ${PROJECT_DIR}/docker-compose.yml"
EXEC="$COMPOSE exec -u devuser -w ${WORKTREE_DIR}"

case "${COMMAND}" in
  install)
    $EXEC dev npm install
    $EXEC dev bash -c "cd backend && npx prisma generate"
    $EXEC dev bash -c "cd backend && npm run db:push"
    ;;
  test)
    $EXEC dev bash -c "cd backend && npm test"
    $EXEC dev bash -c "cd frontend && npm test"
    ;;
  shell)
    $EXEC dev bash
    ;;
  *)
    shift  # remove worktree name
    $EXEC dev "$@"
    ;;
esac
