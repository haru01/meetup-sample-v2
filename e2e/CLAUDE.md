# E2E テスト (Playwright)

Meetup アプリケーションのエンドツーエンドテスト。バックエンド + フロントエンドを起動し、ブラウザ上でユーザーフロー全体を検証する。

## Commands

```bash
# 実行前提 (初回 or 環境変更時)
npm install                          # 全ワークスペースの依存インストール (ルートで)
npx playwright install --with-deps   # ブラウザバイナリのインストール (e2e/ で)
cd ../backend && npm run db:push     # DB スキーマ反映 (スキーマ変更時)
# ※ バックエンド・フロントエンドは webServer 設定で自動起動されるため手動起動不要

# テスト実行 (cd e2e/)
npm test          # Playwright テスト実行 (headless)
npm run test:ui   # Playwright UI モードで実行
```

## 構成

- **テストファイル**: `tests/*.spec.ts`
- **設定**: `playwright.config.ts`
- `webServer` でバックエンド (port 3000) とフロントエンド (port 5173) を自動起動し、テスト終了後に自動停止する
- `reuseExistingServer: true` — 既に起動済みなら再利用（その場合はテスト後も停止しない）
- フロントエンド (Vite) は起動ログを出さないため、ログに `[WebServer] Server running on http://localhost:3000` しか表示されなくても正常。テストが実行されていればフロントエンドも起動している

## テストファイル

| ファイル | コンテキスト | カバー範囲 |
|---------|------------|-----------|
| `auth.spec.ts` | auth | 新規登録、ログイン、ログイン失敗、ログアウト |
| `community.spec.ts` | meetup | コミュニティ作成、詳細表示、カテゴリフィルター |
| `member.spec.ts` | meetup | コミュニティ参加、コミュニティ退会 |
| `event.spec.ts` | meetup | イベント作成、権限チェック |

## パターン

- **テスト分離**: `Date.now()` ベースの `uniqueSuffix()` でユーザー・コミュニティ名を一意化。テスト間でデータが衝突しない
- **ヘルパー関数**: テストファイルごとに `registerAndLogin()`, `createCommunity()`, `navigateToCommunity()`, `logout()`, `login()` 等を定義
- **ロケーター**: `getByRole`, `getByLabel`, `getByText` を優先（Playwright 推奨セレクタ）。`textarea#description`, `select#category` 等の ID セレクタも一部使用
- **アサーション**: `toBeVisible()`, `toHaveURL()`, `not.toBeVisible()` で UI 状態を検証
- **describe/test 名は日本語**で記述する

## テスト作成時の注意

- 各テストは登録から始めて独立して動作すること（他テストの状態に依存しない）
- フォーム操作後は `await expect(...).toBeVisible()` や `await expect(page).toHaveURL(...)` で遷移完了を待つ
- ログイン状態が必要なテストは、テスト内で登録→ログインを行う
- 複数ユーザーが関わるテスト（参加・退会）は、登録→操作→ログアウト→別ユーザー登録→操作の流れ
