#!/bin/sh
# PostToolUse hook: Edit/Write 後に変更ファイルへ prettier を自動適用
# lint-guard より先に実行することで、ESLint は整形済みのコードを検査する

. "$(dirname "$0")/harness-lib.sh"
harness_init

FILE="$(harness_tool_file)"
[ -z "$FILE" ] && exit 0

case "$FILE" in
  *.ts|*.tsx|*.js|*.jsx|*.json|*.css) ;;
  *) exit 0 ;;
esac

PROJECT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
RUN_CMD="$PROJECT_DIR/scripts/run-quality.sh"

# ホストの絶対パス → プロジェクトルートからの相対パスへ変換
REL="$(echo "$FILE" | sed "s|^$PROJECT_DIR/||")"
[ "$REL" = "$FILE" ] && exit 0  # プロジェクト外はスキップ

"$RUN_CMD" "npx prettier --write \"$REL\"" > /dev/null 2>&1

exit 0
