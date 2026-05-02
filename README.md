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

## Git Hooks セットアップ（初回のみ）

コミット時に prettier / eslint / tsc / vitest が自動実行されます。初回クローン後に一度だけ実行してください。

**macOS:**
```bash
brew install lefthook
lefthook install
```

**Linux:**
```bash
# npm 経由
npm install -g @evilmartians/lefthook

# または curl でバイナリ取得（v2.1.6 の場合）
curl -sSL https://github.com/evilmartians/lefthook/releases/latest/download/lefthook_Linux_x86_64 -o /usr/local/bin/lefthook
chmod +x /usr/local/bin/lefthook

lefthook install
```

> **git worktree を使う場合:** worktree ごとに `lefthook install` の実行が必要です。

## Project Structure

```
backend/     Express API server (DDD bounded contexts)
frontend/    React SPA (auth/meetup コンテキスト分離)
e2e/         Playwright E2E tests
```
