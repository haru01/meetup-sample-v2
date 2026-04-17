#!/bin/bash
# PreToolUse hook: git commit 前に quality gates を実行 (docker-dev.sh 経由)
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# git commit コマンドのみ対象
if [[ ! "$COMMAND" =~ ^git\ commit ]]; then
  exit 0
fi

RUN_CMD="$CLAUDE_PROJECT_DIR/.claude/hooks/run-cmd.sh"

# run-cmd.sh 存在チェック
if [ ! -x "$RUN_CMD" ]; then
  echo '{"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny", "permissionDecisionReason": ".claude/hooks/run-cmd.sh が見つかりません。"}}'
  exit 0
fi

# バックエンドテスト
"$RUN_CMD" "cd backend && npx vitest run" 2>&1 >/dev/null
if [ $? -ne 0 ]; then
  echo '{"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny", "permissionDecisionReason": "バックエンドテストが失敗しています。commit 前に修正してください。"}}'
  exit 0
fi

# バックエンド lint
"$RUN_CMD" "cd backend && npx eslint src" 2>&1 >/dev/null
if [ $? -ne 0 ]; then
  echo '{"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny", "permissionDecisionReason": "バックエンド lint エラーがあります。commit 前に修正してください。"}}'
  exit 0
fi

# フロントエンドテスト
"$RUN_CMD" "cd frontend && npx vitest run" 2>&1 >/dev/null
if [ $? -ne 0 ]; then
  echo '{"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny", "permissionDecisionReason": "フロントエンドテストが失敗しています。commit 前に修正してください。"}}'
  exit 0
fi

# フロントエンド lint
"$RUN_CMD" "cd frontend && npx eslint src" 2>&1 >/dev/null
if [ $? -ne 0 ]; then
  echo '{"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny", "permissionDecisionReason": "フロントエンド lint エラーがあります。commit 前に修正してください。"}}'
  exit 0
fi

exit 0
