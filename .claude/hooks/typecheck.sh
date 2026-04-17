#!/bin/bash
# PostToolUse hook: Edit/Write 後にバックエンドの型チェックを実行
INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.file // empty')

# バックエンドファイルのみ対象
if [[ "$FILE" != *"backend/"* ]]; then
  exit 0
fi

RUN_CMD="$CLAUDE_PROJECT_DIR/.claude/hooks/run-cmd.sh"
if [ ! -x "$RUN_CMD" ]; then
  exit 0
fi

OUTPUT=$("$RUN_CMD" "cd backend && npx tsc --noEmit" 2>&1 | head -20)
if echo "$OUTPUT" | grep -q "error TS"; then
  echo "型チェックエラー:"
  echo "$OUTPUT"
fi

exit 0
