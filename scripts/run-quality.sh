#!/bin/sh
# lefthook および AI hook 共通の品質チェックランナー
# Usage: run-quality.sh "cd backend && npx tsc --noEmit"
# 呼び出し元は信頼済みの lefthook / AI hook のみを想定
#
# 検出ロジック:
#   1. Docker 内 (/.dockerenv 存在) → 直接実行
#   2. git worktree 内 → メインプロジェクトの docker compose exec -w <worktree> 経由
#   3. メインプロジェクト → docker-dev.sh 経由
CMD="$1"
if [ -z "$CMD" ]; then
  echo "Usage: $0 <command>" >&2
  exit 1
fi

# 1. Docker 内: 直接実行
if [ -f "/.dockerenv" ]; then
  bash -c "$CMD"
  exit $?
fi

# プロジェクトディレクトリを特定
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"

# 2. git worktree 検出
GIT_COMMON_DIR="$(git -C "$PROJECT_DIR" rev-parse --git-common-dir 2>/dev/null)"
GIT_DIR="$(git -C "$PROJECT_DIR" rev-parse --git-dir 2>/dev/null)"

if [ -n "$GIT_COMMON_DIR" ] && [ -n "$GIT_DIR" ] && [ "$GIT_COMMON_DIR" != "$GIT_DIR" ]; then
  # worktree: メインプロジェクトの docker-compose.yml を使い、worktree パスで実行
  MAIN_PROJECT_DIR="$(cd "$GIT_COMMON_DIR/.." && pwd)"
  REPO_PARENT="$(cd "$MAIN_PROJECT_DIR/.." && pwd)"
  PROJECT_DIR_NAME="$(basename "$MAIN_PROJECT_DIR")"

  # コンテナが起動していない場合はスキップ
  CONTAINER_STATUS="$(docker compose -f "$MAIN_PROJECT_DIR/docker-compose.yml" ps --status running --quiet dev 2>/dev/null)"
  if [ -z "$CONTAINER_STATUS" ]; then
    echo "Docker コンテナが起動していないためスキップします" >&2
    exit 0
  fi

  REPO_PARENT="$REPO_PARENT" PROJECT_DIR_NAME="$PROJECT_DIR_NAME" \
    docker compose -f "$MAIN_PROJECT_DIR/docker-compose.yml" \
    exec -u devuser -w "$PROJECT_DIR" dev bash -c "$CMD"
  exit $?
fi

# 3. メインプロジェクト: docker-dev.sh 経由
SCRIPT="$PROJECT_DIR/scripts/docker-dev.sh"
if [ -x "$SCRIPT" ]; then
  # コンテナが起動していない場合はスキップ（停止中に hook を block しない）
  CONTAINER_STATUS="$(docker compose -f "$PROJECT_DIR/docker-compose.yml" ps --status running --quiet dev 2>/dev/null)"
  if [ -z "$CONTAINER_STATUS" ]; then
    echo "Docker コンテナが起動していないためスキップします" >&2
    exit 0
  fi
  "$SCRIPT" bash -c "$CMD"
  exit $?
fi

echo "Error: docker-dev.sh not found at $SCRIPT" >&2
exit 1
