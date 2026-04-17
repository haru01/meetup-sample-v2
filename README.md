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

## Project Structure

```
backend/     Express API server (DDD bounded contexts)
frontend/    React SPA (auth/meetup コンテキスト分離)
e2e/         Playwright E2E tests
```
