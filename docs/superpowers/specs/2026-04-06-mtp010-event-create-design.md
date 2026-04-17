# MTP-010: イベント作成 設計仕様

## Context

Phase 3 の最初のストーリーとして、コミュニティ内にイベントを作成する機能を実装する。
community コンテキストにイベント管理を追加する方針は ADR `arch-20260406-bounded-context-split` で承認済み。
MTP-005（コミュニティ作成）のフルスタックパターンを踏襲し、backend → frontend → E2E の順で実装する。

## スコープ

- MTP-010（イベント作成）のみ。一覧取得（MTP-015）や詳細取得（MTP-014）は含まない
- EventStatus は Prisma enum で `DRAFT` のみ定義（PUBLISHED / CANCELLED は後続ストーリーで追加）
- 権限チェックは専用ミドルウェアとして新設（UseCase 内ではなくコントローラレベル）

## 設計決定

| 項目 | 決定 | 理由 |
|------|------|------|
| EventStatus enum | DRAFT のみ | 後続ストーリーでマイグレーション追加する方針 |
| 権限チェック | 専用ミドルウェア | MTP-011〜015 で再利用可能。UseCase がシンプルになる |
| Event 配置 | community コンテキスト内 | ADR 承認済み |

---

## 1. データモデル & ドメイン層

### 1.1 Prisma スキーマ

**ファイル**: `backend/prisma/schema/community/event.prisma`

```prisma
model Event {
  id            String       @id @default(uuid())
  communityId   String
  createdBy     String
  title         String
  description   String?
  startsAt      DateTime
  endsAt        DateTime
  format        EventFormat
  capacity      Int
  status        EventStatus  @default(DRAFT)
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt

  community        Community @relation(fields: [communityId], references: [id])
  createdByAccount Account   @relation(fields: [createdBy], references: [id])

  @@index([communityId])
}

enum EventFormat { ONLINE OFFLINE HYBRID }
enum EventStatus { DRAFT }
```

Community モデルに `events Event[]` リレーションを追加。
Account モデルに `events Event[]` リレーションを追加。

### 1.2 Branded Types & ID Factory

**ファイル**: `backend/src/shared/schemas/common.ts`

- `EventId` 型を追加

**ファイル**: `backend/src/shared/schemas/id-factories.ts`

- `createEventId(id?: string): EventId` を追加

### 1.3 Zod スキーマ

**ファイル**: `backend/src/community/models/schemas/event.schema.ts`

```typescript
export const EventTitleSchema = z.string().min(1).max(100);
export type EventTitle = z.infer<typeof EventTitleSchema>;

export const EventDescriptionSchema = z.string().max(1000).nullable();
export type EventDescription = z.infer<typeof EventDescriptionSchema>;

export const EventFormatSchema = z.enum(['ONLINE', 'OFFLINE', 'HYBRID']);
export type EventFormat = z.infer<typeof EventFormatSchema>;
export const EventFormat = EventFormatSchema.enum;

export const EventStatusSchema = z.enum(['DRAFT']);
export type EventStatus = z.infer<typeof EventStatusSchema>;
export const EventStatus = EventStatusSchema.enum;

export const EventCapacitySchema = z.number().int().min(1).max(1000);
export type EventCapacity = z.infer<typeof EventCapacitySchema>;
```

### 1.4 ドメインモデル

**ファイル**: `backend/src/community/models/event.ts`

```typescript
export interface Event {
  readonly id: EventId;
  readonly communityId: CommunityId;
  readonly createdBy: AccountId;
  readonly title: EventTitle;
  readonly description: EventDescription;
  readonly startsAt: Date;
  readonly endsAt: Date;
  readonly format: EventFormat;
  readonly capacity: EventCapacity;
  readonly status: EventStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export type CreateEventValidationError =
  | { type: 'EventDateInPast' }
  | { type: 'EventEndBeforeStart' };

export function createEvent(input: CreateEventInput): Result<Event, CreateEventValidationError> {
  if (input.startsAt <= input.now) {
    return err({ type: 'EventDateInPast' });
  }
  if (input.endsAt <= input.startsAt) {
    return err({ type: 'EventEndBeforeStart' });
  }
  // Event オブジェクトを構築して ok() で返す
}
```

- `now` は外部から注入（UseCase から渡す。ファクトリ内で `new Date()` 禁止）

---

## 2. リポジトリ層

### 2.1 インターフェース

**ファイル**: `backend/src/community/repositories/event.repository.ts`

```typescript
export interface EventRepository {
  save(event: Event): Promise<void>;
  findById(id: EventId): Promise<Event | null>;
}
```

### 2.2 Prisma 実装

**ファイル**: `backend/src/community/repositories/prisma-event.repository.ts`

- `PrismaEventRepository` クラス
- `toEvent()` プライベートマッパーで Prisma レコード → ドメインエンティティ変換

---

## 3. 権限ミドルウェア

**ファイル**: `backend/src/shared/middleware/community-role.middleware.ts`

```typescript
export function createRequireCommunityRole(
  memberRepo: CommunityMemberRepository,
  ...roles: CommunityMemberRole[]
): RequestHandler
```

- `req.params['id']`（communityId）と `req.accountId` からメンバーを検索
- ロールが `roles` に含まれなければ `403 Forbidden` (`{ code: 'FORBIDDEN', message: '...' }`)
- コミュニティが見つからない or メンバーでない場合も `403`
- 成功時は `req.communityMember` にメンバー情報をセット

Express Request 型を拡張:
```typescript
declare global {
  namespace Express {
    interface Request {
      communityMember?: { id: string; role: string; communityId: string };
    }
  }
}
```

---

## 4. ユースケース層

### 4.1 エラー定義

**ファイル**: `backend/src/community/errors/event-errors.ts`

```typescript
export type CreateEventError =
  | { type: 'CommunityNotFound' }
  | { type: 'EventDateInPast' }
  | { type: 'EventEndBeforeStart' };
```

### 4.2 コマンド

**ファイル**: `backend/src/community/usecases/commands/create-event.command.ts`

```typescript
export class CreateEventCommand {
  constructor(
    private readonly communityRepository: CommunityRepository,
    private readonly eventRepository: EventRepository
  ) {}

  async execute(input: CreateEventInput): Promise<Result<Event, CreateEventError>> {
    // 1. コミュニティ存在チェック → CommunityNotFound
    // 2. createEvent() ファクトリ呼び出し → EventDateInPast / EventEndBeforeStart
    // 3. eventRepository.save()
    // 4. ok(event) を返す
  }
}
```

- 権限チェックはミドルウェアで完了しているため UseCase には含まない

---

## 5. コントローラ層

### 5.1 ルーター

**ファイル**: `backend/src/community/controllers/event.controller.ts`

- `POST /` — `requireAuth` → `requireCommunityRole(OWNER, ADMIN)` → ハンドラ
- レスポンス: `201 Created` with `{ event: { id, communityId, title, ... } }`
- エラーマッピング: `event-error-mappings.ts`

### 5.2 エラーマッピング

**ファイル**: `backend/src/community/controllers/event-error-mappings.ts`

| エラー | HTTP | コード |
|--------|------|--------|
| CommunityNotFound | 404 | COMMUNITY_NOT_FOUND |
| EventDateInPast | 422 | EVENT_DATE_IN_PAST |
| EventEndBeforeStart | 422 | EVENT_END_BEFORE_START |

### 5.3 OpenAPI 登録

**ファイル**: `backend/src/community/controllers/event-openapi.ts`

- `CreateEventRequest` スキーマ（ドメインスキーマに `.openapi()` を付与）
- `POST /communities/{communityId}/events` パス登録
- side-effect import で `app.ts` に登録

### 5.4 DI 構成

**ファイル**: `backend/src/community/composition.ts`

```typescript
export interface EventDependencies {
  readonly createEventCommand: CreateEventCommand;
  readonly requireCommunityRole: (...roles: CommunityMemberRole[]) => RequestHandler;
}
```

`createCommunityDependencies` の戻り値に `event: EventDependencies` を追加。

### 5.5 アプリ登録

**ファイル**: `backend/src/app.ts`

```typescript
import './community/controllers/event-openapi';
// ...
application.use('/communities/:id/events', createEventRouter(deps.event));
```

---

## 6. フロントエンド

### 6.1 型定義

**ファイル**: `frontend/src/community/types.ts` に追加

```typescript
export type EventFormat = "ONLINE" | "OFFLINE" | "HYBRID";
export type EventStatus = "DRAFT";

export type Event = {
  readonly id: string;
  readonly communityId: string;
  readonly title: string;
  readonly description: string | null;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly format: EventFormat;
  readonly capacity: number;
  readonly status: EventStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type CreateEventRequest = {
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  format: EventFormat;
  capacity: number;
};
```

### 6.2 フック

**ファイル**: `frontend/src/community/hooks/useEvents.ts`

- `createEvent(communityId, data)` — `POST /communities/${communityId}/events`
- `loading`, `error` 状態管理
- 既存の `useCommunities.ts` パターンを踏襲

### 6.3 コンポーネント

**ファイル**: `frontend/src/community/components/EventCreateForm.tsx`

- フォームフィールド: タイトル、説明、開催日時（datetime-local）、終了日時（datetime-local）、開催形式（select）、定員（number）
- クライアントサイドバリデーション: 必須チェック、日時の前後関係
- 既存の共有 UI コンポーネント（Button, Input, Card）を使用

**ファイル**: `frontend/src/community/pages/EventCreatePage.tsx`

- `useEvents` + `useNavigate`
- 作成成功 → `/communities/${communityId}` へ遷移

### 6.4 ルーティング

**ファイル**: `frontend/src/App.tsx`

- `/communities/:id/events/new` → `EventCreatePage`

### 6.5 コミュニティ詳細ページの変更

**ファイル**: `frontend/src/community/pages/CommunityDetailPage.tsx`

- 「イベント作成」ボタンを追加（OWNER / ADMIN のみ表示）
- 表示条件: メンバー一覧から自分のロールを判定

---

## 7. E2E テスト

**ファイル**: `e2e/tests/event.spec.ts`

### テストケース

1. **オーナーがイベントを作成できる**: アカウント登録 → コミュニティ作成 → イベント作成フォーム入力 → 作成成功 → コミュニティ詳細ページに遷移
2. **一般メンバーには「イベント作成」ボタンが表示されない**: 別アカウントで参加 → コミュニティ詳細ページに「イベント作成」ボタンが無いことを確認

---

## 8. テスト戦略

| レイヤー | テスト種別 | ファイル |
|----------|-----------|----------|
| ドメインモデル | Unit | `community/models/__tests__/event.test.ts` |
| ユースケース | Unit (mock repo) | `community/usecases/__tests__/create-event.command.test.ts` |
| コントローラ | E2E (supertest) | `community/controllers/__tests__/event.e2e.test.ts` |
| ミドルウェア | Unit | `shared/middleware/__tests__/community-role.middleware.test.ts` |
| フロントエンド | Component | `community/components/__tests__/EventCreateForm.test.tsx` |
| フック | Hook | `community/hooks/__tests__/useEvents.test.ts` |
| フルスタック E2E | Playwright | `e2e/tests/event.spec.ts` |

---

## 9. 検証手順

1. `d bash -c "cd backend && npx prisma db push"` — スキーマ反映
2. `d test` — 全テスト通過
3. `d bash -c "cd backend && npm run review"` — レイヤー依存、カバレッジ 80%+、型チェック
4. `d bash -c "cd backend && npm run lint"` / `d bash -c "cd frontend && npm run lint"` — lint 通過
5. `d e2e` — Playwright E2E テスト通過
6. `d dev` で手動確認 — コミュニティ詳細 → イベント作成 → 成功
