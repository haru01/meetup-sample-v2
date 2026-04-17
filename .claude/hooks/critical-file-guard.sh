#!/bin/bash
# PreToolUse hook: クリティカルファイルの編集を警告
# NOTE: 現在 settings.json の hooks には未登録。自身の設定変更をブロックする
# 鶏と卵問題があるため、運用方法を検討してから有効化する。
INPUT=$(cat)
TOOL=$(echo "$INPUT" | jq -r '.tool_name // empty')
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Edit / Write のみ対象
if [ "$TOOL" != "Edit" ] && [ "$TOOL" != "Write" ]; then
  exit 0
fi

if [ -z "$FILE" ]; then
  exit 0
fi

# クリティカルファイルのパターン
CRITICAL=""
case "$FILE" in
  */prisma/schema/*)
    CRITICAL="Prisma スキーマ (DB マイグレーションが必要になる可能性)"
    ;;
  */shared/middleware/auth*)
    CRITICAL="認証ミドルウェア (セキュリティ影響大)"
    ;;
  */docker-compose.yml|*/docker-compose.yaml|*/Dockerfile)
    CRITICAL="Docker インフラ設定"
    ;;
  */.claude/settings.json)
    CRITICAL="Claude Code ハーネス設定"
    ;;
esac

if [ -n "$CRITICAL" ]; then
  echo "{\"decision\": \"block\", \"reason\": \"クリティカルファイルの編集を検出: $CRITICAL\\nファイル: $FILE\\nこの変更は不可逆またはセキュリティ影響が大きい可能性があります。\"}"
  exit 0
fi

exit 0
