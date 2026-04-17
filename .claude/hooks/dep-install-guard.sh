#!/bin/bash
# PreToolUse hook: npm install の本番依存追加をブロック (slopsquatting 対策)
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# npm install / npm add コマンドのみ対象
if ! echo "$COMMAND" | grep -qE '(npm install|npm add|npm i )\s'; then
  exit 0
fi

# 引数なし (npm install) や npm ci は許可
if echo "$COMMAND" | grep -qE '(npm install|npm i)\s*$'; then
  exit 0
fi
if echo "$COMMAND" | grep -qE 'npm ci'; then
  exit 0
fi

# --save-dev / -D は許可
if echo "$COMMAND" | grep -qE '(\-\-save-dev|\-D)\b'; then
  exit 0
fi

# それ以外の本番依存追加はブロック
PKGS=$(echo "$COMMAND" | grep -oE '(npm install|npm add|npm i)\s+(.+)' | sed 's/npm [a-z]* //')
echo "{\"decision\": \"block\", \"reason\": \"本番依存の追加を検出: $PKGS\\n--save-dev (-D) を付けるか、本当に本番依存が必要か確認してください。\"}"
exit 0
