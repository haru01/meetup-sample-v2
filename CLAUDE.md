# CLAUDE.md

プロジェクト共通の指示は AGENTS.md に記載。本ファイルは Claude Code 固有の設定のみ。

@AGENTS.md

## Claude Code Specific

- `/commit` スキルまたは `japanese-commit` スキルの形式でコミットメッセージを生成する
- Stop hook と pre-commit hook で Quality Gates が自動実行される
- PostToolUse hook で Prettier 整形、レイヤー依存チェック、型チェックが自動実行される
- 実装完了時は code-reviewer + security-reviewer サブエージェントを並列実行する
- テスト追加時は test-analyzer サブエージェントで品質確認する
- 調査時は codebase-explorer サブエージェントに委譲しメインコンテキストを保護する
