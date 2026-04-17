#!/bin/bash
# PostToolUse hook: controllers/ 内のファイル編集時にレイヤー依存違反を検出
INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# controllers/ 配下の .ts ファイルのみ対象（テストは除外）
if [ -z "$FILE" ] || [[ ! "$FILE" =~ /controllers/ ]] || [[ "$FILE" =~ \.test\.ts$ ]] || [[ ! "$FILE" =~ \.ts$ ]]; then
  exit 0
fi

# ファイルが存在しない場合はスキップ
if [ ! -f "$FILE" ]; then
  exit 0
fi

# repositories/ や prisma- 実装への直接インポートを検出
VIOLATIONS=$(grep -nE "import .*(repositories/|prisma-|bcrypt-|jwt-)" "$FILE" | grep -v "composition" || true)

if [ -n "$VIOLATIONS" ]; then
  echo "{\"decision\": \"block\", \"reason\": \"レイヤー依存違反: Controller が Repository/Service 実装に直接依存しています。composition 経由で注入してください。\\n$VIOLATIONS\"}"
  exit 0
fi

exit 0
