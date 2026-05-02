# Meetup Community Management

Meetup コミュニティとメンバーシップを管理するフルスタック TypeScript アプリケーション。

## Tech Stack

- **Backend**: Express.js + Prisma + SQLite + TypeScript
- **Frontend**: React 19 + Vite + Tailwind CSS + React Router
- **Testing**: Vitest + Supertest + React Testing Library + Playwright

## Getting Started

```bash
# Docker 環境のセットアップ
alias d="./scripts/docker-dev.sh"
d up        # コンテナ起動
d install   # 依存インストール + DB セットアップ
d dev       # 開発サーバー起動 (backend:3000 + frontend:5173)
```

## Git Hooks セットアップ

コミット時に prettier / eslint / tsc / vitest が自動実行されます。

**Docker 環境:** `d install` で `npm install` が走るため、`npm prepare` 経由で `lefthook install` が自動実行されます。追加手順は不要です。

**ホスト直接実行の場合:** lefthook バイナリが必要です。

```bash
# macOS
brew install lefthook

# Linux（npm 経由）
npm install -g @evilmartians/lefthook
```

`npm install` 実行時に `npm prepare` が自動で `lefthook install` を呼び出します。

> **git worktree を使う場合:** worktree ごとに `npm install` または `lefthook install` の実行が必要です。

## Project Structure

```
backend/     Express API server (DDD bounded contexts)
frontend/    React SPA (auth/meetup コンテキスト分離)
e2e/         Playwright E2E tests
```
