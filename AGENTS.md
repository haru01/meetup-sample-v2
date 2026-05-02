# AGENTS.md

Meetup community management full-stack application (Express.js + Prisma + SQLite + React + TypeScript)

## Commands

**ホスト実行時**: すべてのコマンドは `./scripts/docker-dev.sh` 経由で Docker コンテナ内で実行する。
**Docker 内実行時** (`/.dockerenv` が存在する場合): `docker-dev.sh` を使わず直接コマンドを実行する。

```bash
# Alias for running commands inside the container
alias d="./scripts/docker-dev.sh"

# Setup
d up                     # Build + start container
d install                # npm install + prisma + db:push + playwright browsers (lefthook install は npm prepare で自動実行)

# Development
d dev                    # Start backend + frontend dev servers
d shell                  # Enter container shell

# Testing
d test                   # Run backend + frontend tests
d e2e                    # Run Playwright E2E tests

# Cleanup
d down                   # Stop + remove container (named volumes preserved)
docker compose down -v   # Stop + remove container + named volumes (full clean)

# Arbitrary command (catch-all: d <command> runs inside container)
d bash -c "cd backend && npm run lint"             # ESLint check
d bash -c "cd backend && npm run lint:fix"         # ESLint auto-fix
d bash -c "cd backend && npm run test:coverage"    # Tests with coverage (80% threshold)
d bash -c "cd backend && npm run review"           # Layer deps, circular deps, complexity, type check, coverage
d bash -c "cd backend && npm run format"           # Prettier format
d bash -c "cd backend && npm run format:check"     # Prettier check
d bash -c "cd backend && npm run db:migrate"       # Prisma migrate dev
d bash -c "cd frontend && npm run lint"            # ESLint check
d bash -c "cd frontend && npm run build"           # Production build

# Run a single test file
d bash -c "cd backend && npx vitest run src/auth/usecases/__tests__/register.usecase.test.ts"
d bash -c "cd frontend && npx vitest run src/auth/pages/__tests__/LoginPage.test.tsx"

# Worktrees
git worktree add .worktrees/feature -b feature
./scripts/docker-worktree.sh feature install
./scripts/docker-worktree.sh feature test
./scripts/docker-worktree.sh feature shell
git worktree remove .worktrees/feature         # Cleanup worktree
git branch -d feature                          # Delete branch (if merged)

# Docker 内 Claude Code（ホストから起動）
d shell                  # コンテナに入る
claude                   # Claude Code 起動（ANTHROPIC_API_KEY または ~/.claude 認証を使用）
```

### Docker 内で直接実行する場合（`/.dockerenv` 存在時）

Docker コンテナ内で Claude Code を使う場合、`docker-dev.sh` は不要。直接コマンドを実行する。

```bash
# テスト
cd backend && npm test
cd frontend && npm test

# Lint
cd backend && npm run lint
cd frontend && npm run lint

# 型チェック
cd backend && npx tsc --noEmit
cd frontend && npx tsc --noEmit

# Prisma
cd backend && npx prisma generate
cd backend && npm run db:push

# 単一テストファイル
cd backend && npx vitest run src/auth/usecases/__tests__/register.usecase.test.ts
```

## General Rules

- 削除・リファクタリングを依頼された場合、指定されたファイル/ディレクトリのみを対象とする。関連ファイルや参照の削除は明示的に依頼されない限り行わない
- **ホスト実行時**: docker compose を直接使わず、必ず `./scripts/docker-dev.sh` ラッパー経由でコマンドを実行する
- **Docker 内実行時** (`/.dockerenv` が存在): `docker-dev.sh` は不要。`cd backend && npm test` のように直接実行する
- シェルスクリプトは macOS/zsh 互換にする。GNU 固有フラグ (`grep -P`)、bash 固有機能 (連想配列)、`set -euo pipefail`（source されるスクリプト内）は使用禁止。POSIX 互換または zsh 互換の代替を使う

## Git Conventions

- コミットメッセージは日本語で記述し、Conventional Commits prefix を使用する

## Architecture

Monorepo with npm workspaces: `backend/`, `frontend/`, `e2e/`

### Backend

DDD bounded contexts with layered structure: `controllers/` -> `usecases/` -> `models/`, `repositories/`, `services/`

- `backend/src/auth/` — Authentication context (registration, login, JWT)
- `backend/src/community/` — Community context (community CRUD, membership management)
- `backend/src/shared/` — Shared kernel (Result type, Branded Types, Event Bus, middleware, OpenAPI registry)
- `backend/src/infrastructure/` — Prisma client, test helpers

### Frontend

React 19 + Vite + Tailwind CSS + React Router — auth/community コンテキスト分離構成

- `frontend/src/auth/` — Authentication context (pages, hooks, contexts)
- `frontend/src/community/` — Community context (pages, components, hooks, utils)
- `frontend/src/components/` — Shared UI components (Button, Input, Card, ErrorAlert, Layout)
- `frontend/src/lib/` — API client, token management, shared types

### E2E

Playwright tests covering full user flows (auth, community, member). Config starts both backend and frontend via `webServer`.

## Core Patterns

- **Result<T, E>** — Return type for all domain functions and UseCases. Never throw exceptions (`@shared/result.ts`)
- **Branded Types** — Type-safe IDs (`CommunityId`, `AccountId`) in `shared/schemas/common.ts`. Factories in `shared/schemas/id-factories.ts`
- **Discriminated Union Errors** — `{ type: 'NotFound' }` format. Each context defines errors in `errors/` dir, controllers map them to HTTP via `*-error-mappings.ts`
- **Readonly Interface** — Entities defined as readonly interfaces, not classes
- **Schema-derived types** — Use `z.infer<typeof Schema>` types from `models/schemas/` instead of inline literal unions (`'PUBLIC' | 'PRIVATE'`). Use schema constants (`CommunityMemberRole.OWNER`) instead of hardcoded string literals
- **OpenAPI-driven validation** — Zod schemas registered via `*-openapi.ts` (side-effect imports in `app.ts`), validated by `express-openapi-validator`. Import domain schemas and add `.openapi({ description, example })` only — never duplicate constraints (min/max/nullable) in OpenAPI definitions
- **Event Bus** — In-memory `InMemoryEventBus<TEvent>` for cross-context side effects

## Coding Conventions

@docs/conventions/coding.md

## Testing

@docs/conventions/testing.md

## Quality Gates

**git pre-commit（lefthook）:**
- `lefthook install` で一度だけ有効化する（worktree ごとに実行が必要）
- コミット時に prettier / eslint / tsc / vitest が自動実行される（`lefthook.yml` 参照）

**AI ハーネス hook（Claude Code / Copilot CLI 共通）:**
- `secret-leak-detector.sh` — Bash 出力に機密情報（JWT/AWS key/sk-*）が含まれていれば block
- `lint-guard.sh` — Edit/Write 後にファイル単体を ESLint でチェック（レイヤー依存・複雑度をリアルタイム検出）
- `dep-install-guard.sh` — `--save-dev` なしの `npm install` をブロック（slopsquatting 対策）

**AI が実装完了前に必ず実行すること:**
- `d bash -c "cd backend && npm run test:coverage"` — カバレッジ 80% 以上を確認
- `d bash -c "cd backend && npm run review"` — 型チェック・循環依存・複雑度・カバレッジの総合確認

**手動実行:**
- `d test` — backend + frontend テスト
- `d bash -c "cd backend && npm run review"` — 型チェック、カバレッジ (80%+) など総合チェック
- `d bash -c "cd backend && npm run lint"` / `d bash -c "cd frontend && npm run lint"`

## AI Harness Compatibility

このプロジェクトは **Claude Code** と **GitHub Copilot CLI** の両方で動作するよう設計されています。

- **Skills:** `.claude/skills/` 配下のスキルは両ハーネスが auto-discover します
- **Hooks:** AI 専用 hook は `secret-leak-detector.sh`（機密情報）・`lint-guard.sh`（ESLint）・`dep-install-guard.sh`（依存関係）の 3 本
  - Claude Code 設定: `.claude/settings.json`
  - Copilot CLI 設定: `.github/hooks/hooks.json`
- **品質ゲート:** lint/typecheck/test/format は `lefthook.yml` の git pre-commit で管理（AI 非依存）

## Security

- 認証ミドルウェア: `requireAuth`（認証必須）と `optionalAuth`（認証任意）を適切に使い分ける
- 入力検証: Zod スキーマ + express-openapi-validator で全 API エンドポイントを検証
- Prisma の raw query は使用禁止（SQL インジェクション防止）
- エラーレスポンスにスタックトレースを含めない
- 機密ファイル（.env, credentials, *.pem, *.key）を読み書きしない

## Gotchas

- Prisma schema is multi-file under `backend/prisma/schema/` (`prismaSchemaFolder` is GA in Prisma 6.x, no longer a preview feature)
- Path aliases (`@/`) resolved via `tsx` only (not with `node` directly)
- ESM project (`"type": "module"`) — `tsx` handles import resolution
- Frontend Vite proxy forwards `/auth`, `/communities`, `/health` to backend on port 3000
- `app.ts` uses side-effect imports for OpenAPI registration (`import './auth/controllers/auth-openapi'`)
- Auth middleware exports `requireAuth` and `optionalAuth` — use `optionalAuth` for endpoints accessible without login

## Subagent Guidelines

品質ゲートやコードレビューにサブエージェントを活用する。

### code-reviewer

変更差分に対するコードレビュー。DDD パターン準拠、Result 型、Branded Types、Schema-derived types、UseCase orchestration only、関数/ファイル行数制限、`any` 禁止、named exports、issue の受け入れ基準と実装コードの整合性（EVT 発火・状態遷移など）をチェック。

### security-reviewer

OWASP Top 10 観点のレビュー。認証/認可、入力検証、SQL インジェクション、XSS、機密情報露出、CORS/CSRF をチェック。

### test-analyzer

テスト品質確認。カバレッジ 80%+、日本語テスト命名、issueの受け入れ基準との 1:1 対応、テスト分離、モック適切性、エッジケースをチェック。

### codebase-explorer

アーキテクチャ調査、既存パターン発見、影響範囲分析。メインコンテキスト保護のため調査を委譲。

## Context Management

- タスク間で `/clear` を実行し、コンテキストをリセットする
- 調査はサブエージェントに委譲し、メインコンテキストを保護する
- コンパクション時は変更ファイル一覧とテストコマンドを保持する
