# 境界づけられたコンテキスト分割設計

## Context

現在の `meetup` コンテキストにはコミュニティ管理とメンバー管理がまとまっている。将来的にイベント管理（マネージャ向け）とイベント参加（参加者向け）を追加する予定があり、責務の異なるドメインが1つのコンテキストに混在することを防ぐため、今のうちにコンテキストを分割する。

## 方針

2コンテキスト分割:

- **community** — コミュニティ運営 + イベント運営（マネージャ向け）
- **participation** — イベント参加・キャンセル待ち・繰上げ（参加者向け）

## 今回のスコープ

1. 既存 `meetup/` → `community/` にリネーム（バックエンド + フロントエンド）
2. `docs/stories/meetup-todo.md` を 2 コンテキスト構成に書き換え
3. participation コンテキストの設計をストーリーに反映（実装はしない）

---

## 1. ディレクトリ構成（変更後）

```
backend/src/
  auth/              ← 変更なし
  community/         ← meetup/ からリネーム
    models/            community.ts, community-member.ts, schemas/
    controllers/       community.controller.ts, member.controller.ts
    usecases/          commands/, queries/
    repositories/
    errors/
    composition.ts
    (将来: event モデル・コントローラ等をここに追加)
  participation/      ← 将来追加（今回は設計のみ）
    models/            registration.ts, waitlist.ts, schemas/
    controllers/       registration.controller.ts
    usecases/          commands/, queries/
    repositories/
    errors/
    composition.ts
  shared/             ← 変更なし
  infrastructure/     ← 変更なし

frontend/src/
  auth/               ← 変更なし
  community/          ← meetup/ からリネーム
    pages/, components/, hooks/, utils/, types.ts
  participation/      ← 将来追加
  components/         ← 変更なし
  lib/                ← 変更なし
```

## 2. リネーム作業詳細

### バックエンド

| 変更種別 | 対象 |
|---------|------|
| ディレクトリ移動 | `backend/src/meetup/` → `backend/src/community/` |
| パスエイリアス | `tsconfig.json`: `@meetup/*` → `@community/*` |
| import 更新 | `app.ts` 内の `@meetup/*` 参照 |
| Vitest alias | `vitest.config.ts` の `resolve.alias` 更新 |
| Prisma スキーマ | `prisma/schema/meetup/` → `prisma/schema/community/` |

### フロントエンド

| 変更種別 | 対象 |
|---------|------|
| ディレクトリ移動 | `frontend/src/meetup/` → `frontend/src/community/` |
| import 更新 | `App.tsx` 等のルーティング設定内パス |

### ドキュメント更新

| 対象 | 変更内容 |
|------|---------|
| `AGENTS.md` | `backend/src/meetup/` → `backend/src/community/` のパス参照更新 |
| `docs/stories/meetup-todo.md` | コンテキスト構成反映 + participation ストーリー追加 |

### 変更しないもの

- API エンドポイント URL（`/communities`, `/communities/:id/members`）
- Prisma モデル名（`Community`, `CommunityMember`）
- DB テーブル名
- ドメインモデル・型名

## 3. participation コンテキスト設計

### ドメインモデル

- **EventRegistration** — 参加登録（EventId, AccountId, status: CONFIRMED / CANCELLED）
- **Waitlist** — キャンセル待ち（EventId, AccountId, position, status: WAITING / PROMOTED / EXPIRED）

### ステータス遷移

```text
参加申込:
  定員内 → CONFIRMED
  定員超過 → WAITING（Waitlist に追加）

キャンセル:
  CONFIRMED → CANCELLED → Waitlist 先頭を PROMOTED → CONFIRMED

Waitlist:
  WAITING → PROMOTED（キャンセル発生時）
  WAITING → EXPIRED（イベント開始時）
```

### 主要ユースケース

| ユースケース | 説明 |
|------------|------|
| RegisterForEvent | 参加申込。定員内なら CONFIRMED、超過なら Waitlist 追加 |
| CancelRegistration | 参加キャンセル。Waitlist 先頭を自動繰上げ |
| PromoteFromWaitlist | キャンセル発生時に先頭を CONFIRMED に昇格 |
| ListRegistrations | 主催者向け参加者一覧 |

### コンテキスト間イベント

| イベント | 発行元 | 購読先 | 説明 |
|---------|-------|--------|------|
| EventPublishedEvent | community | participation | 参加受付開始 |
| EventCancelledEvent | community | participation | 全登録キャンセル |
| RegistrationConfirmedEvent | participation | (通知) | 参加確定通知 |

### 共有される Branded Types（shared に追加）

- `EventId` — イベント ID
- `EventRegistrationId` — 参加登録 ID
- `WaitlistEntryId` — キャンセル待ちエントリ ID

## 4. ユーザーストーリー書き換え方針

- Phase 3（イベント管理）を community コンテキストに明示的に紐付け
- Phase 4（イベント参加）を participation コンテキストとして再構成
- エラー型定義のパス参照を `meetup` → `community` に更新
- 依存関係図を 2 コンテキスト構成に更新

## 5. 検証方法

リネーム後:
1. `d test` — バックエンド + フロントエンドの全テスト通過
2. `d bash -c "cd backend && npm run review"` — レイヤー依存、型チェック、カバレッジ
3. `d bash -c "cd backend && npm run lint"` / `d bash -c "cd frontend && npm run lint"` — ESLint
4. `d bash -c "cd frontend && npm run build"` — プロダクションビルド
5. `d e2e` — E2E テスト通過
