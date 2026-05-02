#!/bin/sh
# Stop hook: tsc --noEmit でプロジェクト全体の型チェックを実行
# エラーがあれば Claude を再起動して修正させる

PROJECT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
RUN_CMD="$PROJECT_DIR/scripts/run-quality.sh"

BACKEND_OUT="$("$RUN_CMD" "cd backend && npx tsc --noEmit" 2>&1)"
BACKEND_EXIT=$?

FRONTEND_OUT="$("$RUN_CMD" "cd frontend && npx tsc --noEmit" 2>&1)"
FRONTEND_EXIT=$?

if [ "$BACKEND_EXIT" -ne 0 ] || [ "$FRONTEND_EXIT" -ne 0 ]; then
  MSG=""
  [ "$BACKEND_EXIT" -ne 0 ] && MSG="${MSG}[backend]
$BACKEND_OUT
"
  [ "$FRONTEND_EXIT" -ne 0 ] && MSG="${MSG}[frontend]
$FRONTEND_OUT
"
  jq -nc --arg m "型チェックエラーが検出されました。修正してください:
$MSG" '{decision:"block",reason:$m}'
fi

exit 0
