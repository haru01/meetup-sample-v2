#!/bin/bash
# PostToolUse hook: Bash 出力に機密情報パターンが含まれていないかチェック
INPUT=$(cat)
OUTPUT=$(echo "$INPUT" | jq -r '.tool_output // empty')

if [ -z "$OUTPUT" ]; then
  exit 0
fi

WARNINGS=""

# JWT トークン (eyJ で始まる Base64)
if echo "$OUTPUT" | grep -qE 'eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}'; then
  WARNINGS="$WARNINGS\n- JWT トークンが出力に含まれています"
fi

# AWS アクセスキー
if echo "$OUTPUT" | grep -qE 'AKIA[0-9A-Z]{16}'; then
  WARNINGS="$WARNINGS\n- AWS アクセスキーが出力に含まれています"
fi

# 汎用 API キー/シークレットキーパターン
if echo "$OUTPUT" | grep -qE '(sk-[a-zA-Z0-9]{20,}|sk_live_[a-zA-Z0-9]+)'; then
  WARNINGS="$WARNINGS\n- API シークレットキーが出力に含まれています"
fi

# パスワード系 (key=value 形式)
if echo "$OUTPUT" | grep -iqE '(password|passwd|secret|token)\s*[=:]\s*\S{8,}'; then
  WARNINGS="$WARNINGS\n- パスワード/シークレットが key=value 形式で出力に含まれています"
fi

if [ -n "$WARNINGS" ]; then
  REASON=$(echo -e "機密情報リークの可能性:$WARNINGS\\nコンテキストに機密データが残っています。/clear の実行を検討してください。")
  echo "{\"decision\": \"block\", \"reason\": \"$REASON\"}"
  exit 0
fi

exit 0
