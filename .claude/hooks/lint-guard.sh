#!/bin/sh
# PostToolUse hook: Edit/Write 後に変更ファイル単体を ESLint でチェック
# lint エラー・レイヤー依存違反・複雑度超過をリアルタイムで検出する
# 呼び出し元は信頼済みの AI hook のみを想定

. "$(dirname "$0")/harness-lib.sh"
harness_init

FILE="$(harness_tool_file)"

# .ts / .tsx ファイルのみ対象
case "$FILE" in
  *.ts|*.tsx) ;;
  *) exit 0 ;;
esac

PROJECT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
RUN_CMD="$PROJECT_DIR/scripts/run-quality.sh"

# backend / frontend を判別して対象パスとコマンドを組む
if echo "$FILE" | grep -q '/backend/'; then
  REL="$(echo "$FILE" | sed 's|.*/backend/||')"
  CMD="cd backend && npx eslint \"$REL\""
elif echo "$FILE" | grep -q '/frontend/'; then
  REL="$(echo "$FILE" | sed 's|.*/frontend/||')"
  CMD="cd frontend && npx eslint \"$REL\""
else
  exit 0
fi

OUTPUT="$("$RUN_CMD" "$CMD" 2>&1)"
EXIT_CODE=$?

if [ "$EXIT_CODE" -ne 0 ]; then
  harness_block "ESLint エラー（$REL）:
$OUTPUT"
fi

exit 0
