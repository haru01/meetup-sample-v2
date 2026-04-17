#!/bin/bash
# PostToolUse hook: Edit|Write された .ts ファイルを prettier で自動整形 (Docker 経由)
INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# .ts ファイルのみ対象
if [ -z "$FILE" ] || [[ ! "$FILE" =~ \.tsx?$ ]]; then
  exit 0
fi

# ファイルが存在する場合のみ実行
if [ -f "$FILE" ]; then
  RUN_CMD="$CLAUDE_PROJECT_DIR/.claude/hooks/run-cmd.sh"
  if [ -x "$RUN_CMD" ]; then
    "$RUN_CMD" "npx prettier --write '$FILE'" 2>/dev/null || true
  else
    cd "$CLAUDE_PROJECT_DIR/backend" 2>/dev/null || cd "$CLAUDE_PROJECT_DIR/frontend" 2>/dev/null || cd "$CLAUDE_PROJECT_DIR"
    npx prettier --write "$FILE" 2>/dev/null || true
  fi
fi

exit 0
