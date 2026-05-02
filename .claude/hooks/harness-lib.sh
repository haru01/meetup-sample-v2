# .claude/hooks/harness-lib.sh
# source して使うハーネス互換シム。このファイル単体では実行不可。
# set -euo pipefail は書かない（source 元のシェルに影響するため）

HARNESS_INPUT=""
HARNESS_KIND=""

# stdin を読み込み、ハーネスを検出する。必ず最初に呼ぶ。
harness_init() {
  HARNESS_INPUT="$(cat)"
  if echo "$HARNESS_INPUT" | jq -e '.hookEventName // empty' >/dev/null 2>&1 && \
     [ -n "$(echo "$HARNESS_INPUT" | jq -r '.hookEventName // empty')" ]; then
    HARNESS_KIND="copilot"
  else
    HARNESS_KIND="claude"
  fi
}

# Bash tool の command 引数を返す
harness_tool_command() {
  if [ "$HARNESS_KIND" = "copilot" ]; then
    echo "$HARNESS_INPUT" | jq -r '.toolArgs // "{}"' | jq -r '.command // empty'
  else
    echo "$HARNESS_INPUT" | jq -r '.tool_input.command // empty'
  fi
}

# Edit/Write tool の file_path 引数を返す
harness_tool_file() {
  if [ "$HARNESS_KIND" = "copilot" ]; then
    echo "$HARNESS_INPUT" | jq -r '.toolArgs // "{}"' | jq -r '.file_path // .path // empty'
  else
    echo "$HARNESS_INPUT" | jq -r '.tool_input.file_path // empty'
  fi
}

# Bash tool の実行結果（出力）を返す
harness_tool_output() {
  if [ "$HARNESS_KIND" = "copilot" ]; then
    echo "$HARNESS_INPUT" | jq -r '.toolResult // .output // empty'
  else
    echo "$HARNESS_INPUT" | jq -r '.tool_output // empty'
  fi
}

# 適切なフォーマットで block/deny 出力を行い exit 0 する
# Claude: {"decision":"block","reason":"..."}
# Copilot: {"permissionDecision":"deny","permissionDecisionReason":"..."}
harness_block() {
  local reason="$1"
  if [ "$HARNESS_KIND" = "copilot" ]; then
    jq -nc --arg r "$reason" '{permissionDecision:"deny",permissionDecisionReason:$r}'
  else
    jq -nc --arg r "$reason" '{decision:"block",reason:$r}'
  fi
  exit 0
}
