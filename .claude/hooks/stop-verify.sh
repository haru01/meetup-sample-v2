#!/bin/bash
# Stop hook: 作業完了前にテストと lint が通ることを確認 (docker-dev.sh 経由)
RUN_CMD="$CLAUDE_PROJECT_DIR/.claude/hooks/run-cmd.sh"

# run-cmd.sh 存在チェック
if [ ! -x "$RUN_CMD" ]; then
  echo '{"decision": "block", "reason": ".claude/hooks/run-cmd.sh が見つかりません。テストを実行できません。"}'
  exit 0
fi

ERRORS=""

# バックエンドテスト
"$RUN_CMD" "cd backend && npx vitest run" 2>&1 >/dev/null
if [ $? -ne 0 ]; then
  ERRORS="$ERRORS\n- バックエンドテストが失敗しています"
fi

# バックエンド lint
"$RUN_CMD" "cd backend && npx eslint src" 2>&1 >/dev/null
if [ $? -ne 0 ]; then
  ERRORS="$ERRORS\n- バックエンド lint エラーがあります"
fi

# フロントエンドテスト
"$RUN_CMD" "cd frontend && npx vitest run" 2>&1 >/dev/null
if [ $? -ne 0 ]; then
  ERRORS="$ERRORS\n- フロントエンドテストが失敗しています"
fi

# フロントエンド lint
"$RUN_CMD" "cd frontend && npx eslint src" 2>&1 >/dev/null
if [ $? -ne 0 ]; then
  ERRORS="$ERRORS\n- フロントエンド lint エラーがあります"
fi

if [ -n "$ERRORS" ]; then
  REASON=$(echo -e "Quality Gates 未達:$ERRORS")
  echo "{\"decision\": \"block\", \"reason\": \"$REASON\"}"
  exit 0
fi

exit 0
