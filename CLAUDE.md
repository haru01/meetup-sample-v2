# CLAUDE.md

プロジェクト共通の指示は AGENTS.md に記載。本ファイルは Claude Code 固有の設定のみ。

@AGENTS.md

## Claude Code Specific

- `/commit` スキルまたは `japanese-commit` スキルの形式でコミットメッセージを生成する
- `lefthook` の git pre-commit で品質ゲート（prettier/eslint/tsc/vitest）が自動実行される
- AI hook は secret-leak（Bash 出力監視）・lint-guard（Edit/Write 後の ESLint）・dep-install-guard（npm install ガード）の 3 個
- 実装完了時は code-reviewer + security-reviewer サブエージェントを並列実行する
- テスト追加時は test-analyzer サブエージェントで品質確認する
- 調査時は codebase-explorer サブエージェントに委譲しメインコンテキストを保護する
