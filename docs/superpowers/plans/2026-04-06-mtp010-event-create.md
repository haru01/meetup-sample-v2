# MTP-010: イベント作成 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** コミュニティのオーナー/管理者がイベントを作成できる API・UI・E2E をフルスタックで実装する

**Architecture:** community コンテキスト内にイベント管理を追加。Prisma スキーマ → ドメインモデル → リポジトリ → ユースケース → コントローラの順で TDD で積み上げ、フロントエンドとE2Eで仕上げる。権限チェックは `requireCommunityRole` ミドルウェアとして新設し、コントローラレベルで適用する。

**Tech Stack:** Express.js, Prisma (SQLite), Zod, OpenAPI, React 19, Vite, Tailwind CSS, Playwright

**Design Spec:** `docs/superpowers/specs/2026-04-06-mtp010-event-create-design.md`

---

## ファイルマップ

| 操作 | ファイルパス | 責務 |
|------|-------------|------|
| Create | `backend/prisma/schema/community/event.prisma` | Event モデル・enum 定義 |
| Modify | `backend/prisma/schema/community/community.prisma` | events リレーション追加 |
| Modify | `backend/prisma/schema/auth/account.prisma` | events リレーション追加 |
| Modify | `backend/src/shared/schemas/common.ts` | EventId Branded Type |
| Modify | `backend/src/shared/schemas/id-factories.ts` | createEventId() |
| Create | `backend/src/community/models/schemas/event.schema.ts` | Zod スキーマ |
| Create | `backend/src/community/models/event.ts` | ドメインエンティティ・ファクトリ |
| Create | `backend/src/community/models/__tests__/event.test.ts` | ファクトリのユニットテスト |
| Create | `backend/src/community/repositories/event.repository.ts` | リポジトリインターフェース |
| Create | `backend/src/community/repositories/prisma-event.repository.ts` | Prisma 実装 |
| Create | `backend/src/community/errors/event-errors.ts` | エラー型定義 |
| Create | `backend/src/community/usecases/commands/create-event.command.ts` | ユースケース |
| Create | `backend/src/community/usecases/commands/__tests__/create-event.command.test.ts` | ユースケーステスト |
| Create | `backend/src/shared/middleware/community-role.middleware.ts` | 権限ミドルウェア |
| Create | `backend/src/shared/middleware/__tests__/community-role.middleware.test.ts` | ミドルウェアテスト |
| Create | `backend/src/community/controllers/event-error-mappings.ts` | エラー→HTTPマッピング |
| Create | `backend/src/community/controllers/event.controller.ts` | ルーターファクトリ |
| Create | `backend/src/community/controllers/event-openapi.ts` | OpenAPI 登録 |
| Create | `backend/src/community/controllers/__tests__/event.e2e.test.ts` | コントローラ E2E テスト |
| Modify | `backend/src/community/composition.ts` | EventDependencies 追加 |
| Modify | `backend/src/app.ts` | イベントルート登録 |
| Modify | `backend/src/infrastructure/test-helper.ts` | clearMeetupTables に Event 追加 |
| Modify | `frontend/src/community/types.ts` | Event 型追加 |
| Create | `frontend/src/community/hooks/useEvents.ts` | イベント API フック |
| Create | `frontend/src/community/hooks/__tests__/useEvents.test.ts` | フックテスト |
| Create | `frontend/src/community/utils/event-label-utils.ts` | 開催形式ラベル |
| Create | `frontend/src/community/components/EventCreateForm.tsx` | 作成フォーム |
| Create | `frontend/src/community/components/__tests__/EventCreateForm.test.tsx` | フォームテスト |
| Create | `frontend/src/community/pages/EventCreatePage.tsx` | 作成ページ |
| Modify | `frontend/src/community/pages/CommunityDetailPage.tsx` | イベント作成ボタン追加 |
| Modify | `frontend/src/App.tsx` | ルート追加 |
| Create | `e2e/tests/event.spec.ts` | Playwright E2E テスト |

---

### Task 1: Prisma スキーマ & DB 反映

**Files:**
- Create: `backend/prisma/schema/community/event.prisma`
- Modify: `backend/prisma/schema/community/community.prisma`
- Modify: `backend/prisma/schema/auth/account.prisma`

- [ ] **Step 1: Event Prisma スキーマを作成する**

```prisma
// backend/prisma/schema/community/event.prisma

// ============================================================
// Community Context — イベント
// ============================================================

model Event {
  id          String      @id @default(uuid())
  communityId String
  createdBy   String
  title       String
  description String?
  startsAt    DateTime
  endsAt      DateTime
  format      EventFormat
  capacity    Int
  status      EventStatus @default(DRAFT)
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  community        Community @relation(fields: [communityId], references: [id])
  createdByAccount Account   @relation(fields: [createdBy], references: [id])

  @@index([communityId])
}

enum EventFormat {
  ONLINE
  OFFLINE
  HYBRID
}

enum EventStatus {
  DRAFT
}
```

- [ ] **Step 2: Community モデルに events リレーションを追加する**

`backend/prisma/schema/community/community.prisma` の Community モデル末尾、`members CommunityMember[]` の下に追加:

```prisma
  events  Event[]
```

- [ ] **Step 3: Account モデルに events リレーションを追加する**

`backend/prisma/schema/auth/account.prisma` の Account モデル末尾、`members CommunityMember[]` の下に追加:

```prisma
  events Event[]
```

- [ ] **Step 4: Prisma generate & DB push を実行する**

Run: `./scripts/docker-dev.sh bash -c "cd backend && npx prisma generate && npx prisma db push"`
Expected: 正常終了、Event テーブルが作成される

- [ ] **Step 5: コミット**

```bash
git add backend/prisma/schema/
git commit -m "feat: Event Prisma スキーマを追加 (community)"
```

---

### Task 2: Branded Type & ID ファクトリ

**Files:**
- Modify: `backend/src/shared/schemas/common.ts`
- Modify: `backend/src/shared/schemas/id-factories.ts`

- [ ] **Step 1: EventId Branded Type を追加する**

`backend/src/shared/schemas/common.ts` の末尾に追加:

```typescript
/** イベントID - イベントを一意に識別するUUID */
export type EventId = string & { readonly __brand: 'EventId' };
```

- [ ] **Step 2: createEventId ファクトリを追加する**

`backend/src/shared/schemas/id-factories.ts` に import 追加と関数追加:

import 行を変更:
```typescript
import type { AccountId, CommunityId, CommunityMemberId, EventId } from './common.js';
```

ファイル末尾に追加:
```typescript
// ============================================================
// EventId Factories
// ============================================================

/**
 * EventIdを生成する
 *
 * @param id 指定した場合はその文字列をEventIdとして使用する。省略時はランダムUUIDを生成する。
 * @returns EventId
 */
export function createEventId(id?: string): EventId {
  return (id ?? randomUUID()) as EventId;
}
```

- [ ] **Step 3: コミット**

```bash
git add backend/src/shared/schemas/common.ts backend/src/shared/schemas/id-factories.ts
git commit -m "feat: EventId Branded Type と createEventId ファクトリを追加 (shared)"
```

---

### Task 3: Zod スキーマ & ドメインモデル（TDD）

**Files:**
- Create: `backend/src/community/models/schemas/event.schema.ts`
- Create: `backend/src/community/models/event.ts`
- Create: `backend/src/community/models/__tests__/event.test.ts`

- [ ] **Step 1: Zod スキーマを作成する**

```typescript
// backend/src/community/models/schemas/event.schema.ts
import { z } from 'zod';

// ============================================================
// イベントタイトルスキーマ
// ============================================================

export const EventTitleSchema = z.string().min(1).max(100);
export type EventTitle = z.infer<typeof EventTitleSchema>;

// ============================================================
// イベント説明スキーマ
// ============================================================

export const EventDescriptionSchema = z.string().max(1000).nullable();
export type EventDescription = z.infer<typeof EventDescriptionSchema>;

// ============================================================
// イベント開催形式スキーマ
// ============================================================

export const EventFormatSchema = z.enum(['ONLINE', 'OFFLINE', 'HYBRID']);
export type EventFormat = z.infer<typeof EventFormatSchema>;

/** イベント開催形式定数（スキーマから導出） */
export const EventFormat = EventFormatSchema.enum;

// ============================================================
// イベントステータススキーマ
// ============================================================

export const EventStatusSchema = z.enum(['DRAFT']);
export type EventStatus = z.infer<typeof EventStatusSchema>;

/** イベントステータス定数（スキーマから導出） */
export const EventStatus = EventStatusSchema.enum;

// ============================================================
// イベント定員スキーマ
// ============================================================

export const EventCapacitySchema = z.number().int().min(1).max(1000);
export type EventCapacity = z.infer<typeof EventCapacitySchema>;
```

- [ ] **Step 2: テストを先に書く**

```typescript
// backend/src/community/models/__tests__/event.test.ts
import { describe, it, expect } from 'vitest';
import { createEvent } from '../event';
import { createEventId, createCommunityId, createAccountId } from '@shared/schemas/id-factories';

describe('createEvent', () => {
  const now = new Date('2026-01-01T00:00:00Z');
  const futureStart = new Date('2026-06-01T10:00:00Z');
  const futureEnd = new Date('2026-06-01T12:00:00Z');

  const baseInput = {
    id: createEventId(),
    communityId: createCommunityId(),
    createdBy: createAccountId(),
    title: 'テストイベント',
    description: 'テスト用の説明',
    startsAt: futureStart,
    endsAt: futureEnd,
    format: 'ONLINE' as const,
    capacity: 50,
    now,
    createdAt: now,
    updatedAt: now,
  };

  it('有効な入力でイベントを作成できる', () => {
    const result = createEvent(baseInput);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.id).toBe(baseInput.id);
    expect(result.value.title).toBe('テストイベント');
    expect(result.value.status).toBe('DRAFT');
    expect(result.value.communityId).toBe(baseInput.communityId);
    expect(result.value.createdBy).toBe(baseInput.createdBy);
  });

  it('開始日時が現在時刻以前の場合は EventDateInPast エラーを返す', () => {
    const input = { ...baseInput, startsAt: new Date('2025-01-01T00:00:00Z') };
    const result = createEvent(input);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.type).toBe('EventDateInPast');
  });

  it('終了日時が開始日時以前の場合は EventEndBeforeStart エラーを返す', () => {
    const input = { ...baseInput, endsAt: new Date('2026-06-01T09:00:00Z') };
    const result = createEvent(input);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.type).toBe('EventEndBeforeStart');
  });

  it('終了日時が開始日時と同じ場合は EventEndBeforeStart エラーを返す', () => {
    const input = { ...baseInput, endsAt: futureStart };
    const result = createEvent(input);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.type).toBe('EventEndBeforeStart');
  });

  it('description が null の場合は null が設定される', () => {
    const input = { ...baseInput, description: null };
    const result = createEvent(input);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.description).toBeNull();
  });

  it('OFFLINE 形式のイベントを作成できる', () => {
    const input = { ...baseInput, format: 'OFFLINE' as const };
    const result = createEvent(input);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.format).toBe('OFFLINE');
  });

  it('HYBRID 形式のイベントを作成できる', () => {
    const input = { ...baseInput, format: 'HYBRID' as const };
    const result = createEvent(input);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.format).toBe('HYBRID');
  });
});
```

- [ ] **Step 3: テストが失敗することを確認する**

Run: `./scripts/docker-dev.sh bash -c "cd backend && npx vitest run src/community/models/__tests__/event.test.ts"`
Expected: FAIL — `createEvent` が存在しない

- [ ] **Step 4: ドメインモデルを実装する**

```typescript
// backend/src/community/models/event.ts
import { ok, err, type Result } from '@shared/result';
import type { AccountId, CommunityId, EventId } from '@shared/schemas/common';
import type {
  EventTitle,
  EventDescription,
  EventFormat,
  EventCapacity,
} from './schemas/event.schema';
import { EventStatus } from './schemas/event.schema';

// ============================================================
// イベントエンティティ
// ============================================================

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

// ============================================================
// イベント作成
// ============================================================

export interface CreateEventInput {
  readonly id: EventId;
  readonly communityId: CommunityId;
  readonly createdBy: AccountId;
  readonly title: EventTitle;
  readonly description: EventDescription;
  readonly startsAt: Date;
  readonly endsAt: Date;
  readonly format: EventFormat;
  readonly capacity: EventCapacity;
  readonly now: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export type CreateEventValidationError =
  | { type: 'EventDateInPast' }
  | { type: 'EventEndBeforeStart' };

/**
 * イベントを作成する（ファクトリ関数）
 *
 * 日時のバリデーションを行い、DRAFT 状態のイベントを生成する。
 *
 * @param input イベント作成入力
 * @returns イベント、またはバリデーションエラー
 */
export function createEvent(input: CreateEventInput): Result<Event, CreateEventValidationError> {
  if (input.startsAt <= input.now) {
    return err({ type: 'EventDateInPast' });
  }
  if (input.endsAt <= input.startsAt) {
    return err({ type: 'EventEndBeforeStart' });
  }

  const event: Event = {
    id: input.id,
    communityId: input.communityId,
    createdBy: input.createdBy,
    title: input.title,
    description: input.description,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    format: input.format,
    capacity: input.capacity,
    status: EventStatus.DRAFT,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  };

  return ok(event);
}
```

- [ ] **Step 5: テストが通ることを確認する**

Run: `./scripts/docker-dev.sh bash -c "cd backend && npx vitest run src/community/models/__tests__/event.test.ts"`
Expected: ALL PASS

- [ ] **Step 6: コミット**

```bash
git add backend/src/community/models/schemas/event.schema.ts backend/src/community/models/event.ts backend/src/community/models/__tests__/event.test.ts
git commit -m "feat: イベントドメインモデルと Zod スキーマを追加 (community)"
```

---

### Task 4: リポジトリ & エラー型

**Files:**
- Create: `backend/src/community/repositories/event.repository.ts`
- Create: `backend/src/community/repositories/prisma-event.repository.ts`
- Create: `backend/src/community/errors/event-errors.ts`

- [ ] **Step 1: エラー型を定義する**

```typescript
// backend/src/community/errors/event-errors.ts

// ============================================================
// イベントコンテキスト - エラー型定義
// ============================================================

/**
 * イベント作成エラー（Discriminated Union）
 */
export type CreateEventError =
  | { type: 'CommunityNotFound' }
  | { type: 'EventDateInPast' }
  | { type: 'EventEndBeforeStart' };
```

- [ ] **Step 2: リポジトリインターフェースを作成する**

```typescript
// backend/src/community/repositories/event.repository.ts
import type { Event } from '../models/event';
import type { EventId } from '@shared/schemas/common';

// ============================================================
// EventRepository インターフェース
// ============================================================

export interface EventRepository {
  /**
   * イベントを保存（upsert）
   */
  save(event: Event): Promise<void>;

  /**
   * IDでイベントを取得
   */
  findById(id: EventId): Promise<Event | null>;
}
```

- [ ] **Step 3: Prisma リポジトリ実装を作成する**

```typescript
// backend/src/community/repositories/prisma-event.repository.ts
import type { PrismaClient } from '@prisma/client';
import type { Event } from '../models/event';
import type { CommunityId, EventId, AccountId } from '@shared/schemas/common';
import type { EventRepository } from './event.repository';

// ============================================================
// Prisma を使用した EventRepository 実装
// ============================================================

type EventRecord = {
  id: string;
  communityId: string;
  createdBy: string;
  title: string;
  description: string | null;
  startsAt: Date;
  endsAt: Date;
  format: string;
  capacity: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

export class PrismaEventRepository implements EventRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(event: Event): Promise<void> {
    await this.prisma.event.upsert({
      where: { id: event.id },
      create: {
        id: event.id,
        communityId: event.communityId,
        createdBy: event.createdBy,
        title: event.title,
        description: event.description,
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        format: event.format,
        capacity: event.capacity,
        status: event.status,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
      },
      update: {
        title: event.title,
        description: event.description,
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        format: event.format,
        capacity: event.capacity,
        status: event.status,
        updatedAt: event.updatedAt,
      },
    });
  }

  async findById(id: EventId): Promise<Event | null> {
    const record = await this.prisma.event.findUnique({ where: { id } });
    return record ? this.toEvent(record) : null;
  }

  private toEvent(record: EventRecord): Event {
    return {
      id: record.id as EventId,
      communityId: record.communityId as CommunityId,
      createdBy: record.createdBy as AccountId,
      title: record.title,
      description: record.description,
      startsAt: record.startsAt,
      endsAt: record.endsAt,
      format: record.format as Event['format'],
      capacity: record.capacity,
      status: record.status as Event['status'],
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
```

- [ ] **Step 4: コミット**

```bash
git add backend/src/community/errors/event-errors.ts backend/src/community/repositories/event.repository.ts backend/src/community/repositories/prisma-event.repository.ts
git commit -m "feat: イベントリポジトリとエラー型を追加 (community)"
```

---

### Task 5: CreateEventCommand ユースケース（TDD）

**Files:**
- Create: `backend/src/community/usecases/commands/create-event.command.ts`
- Create: `backend/src/community/usecases/commands/__tests__/create-event.command.test.ts`

- [ ] **Step 1: テストを先に書く**

```typescript
// backend/src/community/usecases/commands/__tests__/create-event.command.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateEventCommand } from '../create-event.command';
import type { CreateEventInput } from '../create-event.command';
import type { CommunityRepository } from '../../../repositories/community.repository';
import type { EventRepository } from '../../../repositories/event.repository';
import { createEventId, createCommunityId, createAccountId } from '@shared/schemas/id-factories';

// ============================================================
// テスト用フィクスチャ
// ============================================================

const now = new Date('2026-01-01T00:00:00Z');

const makeCommand = (): CreateEventInput => ({
  id: createEventId('event-1'),
  communityId: createCommunityId('community-1'),
  createdBy: createAccountId('account-1'),
  title: 'テストイベント',
  description: 'テスト用の説明',
  startsAt: new Date('2026-06-01T10:00:00Z'),
  endsAt: new Date('2026-06-01T12:00:00Z'),
  format: 'ONLINE' as const,
  capacity: 50,
  now,
  createdAt: now,
  updatedAt: now,
});

const makeCommunityRepository = (): CommunityRepository => ({
  findById: vi.fn().mockResolvedValue({
    id: createCommunityId('community-1'),
    name: 'テストコミュニティ',
    description: null,
    category: 'TECH' as const,
    visibility: 'PUBLIC' as const,
    createdAt: now,
    updatedAt: now,
  }),
  findByName: vi.fn().mockResolvedValue(null),
  save: vi.fn().mockResolvedValue(undefined),
  findAll: vi.fn().mockResolvedValue({ communities: [], total: 0 }),
  countByOwnerAccountId: vi.fn().mockResolvedValue(0),
});

const makeEventRepository = (): EventRepository => ({
  save: vi.fn().mockResolvedValue(undefined),
  findById: vi.fn().mockResolvedValue(null),
});

// ============================================================
// テスト
// ============================================================

describe('CreateEventCommand', () => {
  let communityRepo: CommunityRepository;
  let eventRepo: EventRepository;
  let useCase: CreateEventCommand;

  beforeEach(() => {
    communityRepo = makeCommunityRepository();
    eventRepo = makeEventRepository();
    useCase = new CreateEventCommand(communityRepo, eventRepo);
  });

  describe('正常系', () => {
    it('イベントを作成し保存する', async () => {
      const cmd = makeCommand();

      const result = await useCase.execute(cmd);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBe(cmd.id);
        expect(result.value.title).toBe('テストイベント');
        expect(result.value.status).toBe('DRAFT');
        expect(result.value.communityId).toBe(cmd.communityId);
      }
    });

    it('イベントをリポジトリに保存する', async () => {
      const cmd = makeCommand();

      await useCase.execute(cmd);

      expect(eventRepo.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('異常系', () => {
    it('コミュニティが存在しない場合は CommunityNotFound エラーを返す', async () => {
      const cmd = makeCommand();
      vi.mocked(communityRepo.findById).mockResolvedValue(null);

      const result = await useCase.execute(cmd);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('CommunityNotFound');
      }
    });

    it('開始日時が過去の場合は EventDateInPast エラーを返す', async () => {
      const cmd = { ...makeCommand(), startsAt: new Date('2025-01-01T00:00:00Z') };

      const result = await useCase.execute(cmd);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('EventDateInPast');
      }
    });

    it('終了日時が開始日時以前の場合は EventEndBeforeStart エラーを返す', async () => {
      const cmd = { ...makeCommand(), endsAt: new Date('2026-06-01T09:00:00Z') };

      const result = await useCase.execute(cmd);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('EventEndBeforeStart');
      }
    });
  });
});
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `./scripts/docker-dev.sh bash -c "cd backend && npx vitest run src/community/usecases/commands/__tests__/create-event.command.test.ts"`
Expected: FAIL — `CreateEventCommand` が存在しない

- [ ] **Step 3: ユースケースを実装する**

```typescript
// backend/src/community/usecases/commands/create-event.command.ts
import { ok, err, type Result } from '@shared/result';
import type { AccountId, CommunityId, EventId } from '@shared/schemas/common';
import type { Event } from '../../models/event';
import { createEvent } from '../../models/event';
import type { EventTitle, EventDescription, EventFormat, EventCapacity } from '../../models/schemas/event.schema';
import type { CommunityRepository } from '../../repositories/community.repository';
import type { EventRepository } from '../../repositories/event.repository';
import type { CreateEventError } from '../../errors/event-errors';

// ============================================================
// イベント作成コマンド
// ============================================================

export interface CreateEventInput {
  readonly id: EventId;
  readonly communityId: CommunityId;
  readonly createdBy: AccountId;
  readonly title: EventTitle;
  readonly description: EventDescription;
  readonly startsAt: Date;
  readonly endsAt: Date;
  readonly format: EventFormat;
  readonly capacity: EventCapacity;
  readonly now: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

// ============================================================
// イベント作成ユースケース
// ============================================================

/**
 * イベント作成ユースケース
 *
 * コミュニティ存在チェック後、ファクトリでイベントを生成し保存する。
 * 権限チェックはミドルウェアで実施済みのため、ここでは行わない。
 */
export class CreateEventCommand {
  constructor(
    private readonly communityRepository: CommunityRepository,
    private readonly eventRepository: EventRepository
  ) {}

  async execute(command: CreateEventInput): Promise<Result<Event, CreateEventError>> {
    // コミュニティ存在チェック
    const community = await this.communityRepository.findById(command.communityId);
    if (!community) {
      return err({ type: 'CommunityNotFound' });
    }

    // ファクトリでイベント生成（日時バリデーション含む）
    const createResult = createEvent({
      id: command.id,
      communityId: command.communityId,
      createdBy: command.createdBy,
      title: command.title,
      description: command.description,
      startsAt: command.startsAt,
      endsAt: command.endsAt,
      format: command.format,
      capacity: command.capacity,
      now: command.now,
      createdAt: command.createdAt,
      updatedAt: command.updatedAt,
    });

    if (!createResult.ok) return createResult;
    const event = createResult.value;

    // リポジトリに保存
    await this.eventRepository.save(event);

    return ok(event);
  }
}
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `./scripts/docker-dev.sh bash -c "cd backend && npx vitest run src/community/usecases/commands/__tests__/create-event.command.test.ts"`
Expected: ALL PASS

- [ ] **Step 5: コミット**

```bash
git add backend/src/community/usecases/commands/create-event.command.ts backend/src/community/usecases/commands/__tests__/create-event.command.test.ts
git commit -m "feat: イベント作成ユースケースを追加 (community)"
```

---

### Task 6: 権限ミドルウェア（TDD）

**Files:**
- Create: `backend/src/shared/middleware/community-role.middleware.ts`
- Create: `backend/src/shared/middleware/__tests__/community-role.middleware.test.ts`

- [ ] **Step 1: テストを先に書く**

```typescript
// backend/src/shared/middleware/__tests__/community-role.middleware.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { createRequireCommunityRole } from '../community-role.middleware';
import type { CommunityMemberRepository } from '@/community/repositories/community-member.repository';
import { CommunityMemberRole } from '@/community/models/schemas/member.schema';
import { createCommunityId, createCommunityMemberId, createAccountId } from '@shared/schemas/id-factories';

// ============================================================
// テスト用フィクスチャ
// ============================================================

const makeMemberRepository = (): CommunityMemberRepository => ({
  findByIds: vi.fn().mockResolvedValue(null),
  findById: vi.fn().mockResolvedValue(null),
  save: vi.fn().mockResolvedValue(undefined),
  delete: vi.fn().mockResolvedValue(undefined),
  findByCommunityId: vi.fn().mockResolvedValue({ members: [], total: 0 }),
});

const makeRequest = (communityId: string, accountId: string): Partial<Request> => ({
  params: { id: communityId },
  accountId,
});

const makeResponse = (): Partial<Response> => {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

// ============================================================
// テスト
// ============================================================

describe('createRequireCommunityRole', () => {
  let memberRepo: CommunityMemberRepository;
  let next: NextFunction;

  beforeEach(() => {
    memberRepo = makeMemberRepository();
    next = vi.fn();
  });

  it('OWNER ロールのメンバーが OWNER 要求を通過する', async () => {
    const communityId = createCommunityId('community-1');
    const accountId = createAccountId('account-1');
    vi.mocked(memberRepo.findByIds).mockResolvedValue({
      id: createCommunityMemberId('member-1'),
      communityId,
      accountId,
      role: CommunityMemberRole.OWNER,
      status: 'ACTIVE',
      createdAt: new Date(),
    });

    const middleware = createRequireCommunityRole(memberRepo, CommunityMemberRole.OWNER, CommunityMemberRole.ADMIN);
    const req = makeRequest(communityId, accountId);
    const res = makeResponse();

    await middleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
  });

  it('ADMIN ロールのメンバーが OWNER/ADMIN 要求を通過する', async () => {
    const communityId = createCommunityId('community-1');
    const accountId = createAccountId('account-1');
    vi.mocked(memberRepo.findByIds).mockResolvedValue({
      id: createCommunityMemberId('member-1'),
      communityId,
      accountId,
      role: CommunityMemberRole.ADMIN,
      status: 'ACTIVE',
      createdAt: new Date(),
    });

    const middleware = createRequireCommunityRole(memberRepo, CommunityMemberRole.OWNER, CommunityMemberRole.ADMIN);
    const req = makeRequest(communityId, accountId);
    const res = makeResponse();

    await middleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
  });

  it('MEMBER ロールのメンバーが OWNER/ADMIN 要求で 403 を返す', async () => {
    const communityId = createCommunityId('community-1');
    const accountId = createAccountId('account-1');
    vi.mocked(memberRepo.findByIds).mockResolvedValue({
      id: createCommunityMemberId('member-1'),
      communityId,
      accountId,
      role: CommunityMemberRole.MEMBER,
      status: 'ACTIVE',
      createdAt: new Date(),
    });

    const middleware = createRequireCommunityRole(memberRepo, CommunityMemberRole.OWNER, CommunityMemberRole.ADMIN);
    const req = makeRequest(communityId, accountId);
    const res = makeResponse();

    await middleware(req as Request, res as Response, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      code: 'FORBIDDEN',
      message: 'この操作を行う権限がありません',
    });
  });

  it('メンバーが見つからない場合は 403 を返す', async () => {
    const communityId = createCommunityId('community-1');
    const accountId = createAccountId('account-1');
    vi.mocked(memberRepo.findByIds).mockResolvedValue(null);

    const middleware = createRequireCommunityRole(memberRepo, CommunityMemberRole.OWNER, CommunityMemberRole.ADMIN);
    const req = makeRequest(communityId, accountId);
    const res = makeResponse();

    await middleware(req as Request, res as Response, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `./scripts/docker-dev.sh bash -c "cd backend && npx vitest run src/shared/middleware/__tests__/community-role.middleware.test.ts"`
Expected: FAIL — `createRequireCommunityRole` が存在しない

- [ ] **Step 3: ミドルウェアを実装する**

```typescript
// backend/src/shared/middleware/community-role.middleware.ts
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { CommunityMemberRepository } from '@/community/repositories/community-member.repository';
import type { CommunityMemberRole } from '@/community/models/schemas/member.schema';
import type { AccountId, CommunityId } from '@shared/schemas/common';

// ============================================================
// Express Request 型拡張
// ============================================================

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      communityMember?: {
        id: string;
        role: string;
        communityId: string;
      };
    }
  }
}

// ============================================================
// コミュニティロール要求ミドルウェア
// ============================================================

/**
 * 指定されたロールのいずれかを持つコミュニティメンバーのみ通過を許可する
 *
 * @param memberRepo メンバーリポジトリ
 * @param roles 許可するロール
 * @returns Express ミドルウェア
 */
export function createRequireCommunityRole(
  memberRepo: CommunityMemberRepository,
  ...roles: CommunityMemberRole[]
): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const communityId = req.params['id'] as CommunityId;
    const accountId = req.accountId as AccountId;

    const member = await memberRepo.findByIds(communityId, accountId);

    if (!member || !roles.includes(member.role as CommunityMemberRole)) {
      res.status(403).json({
        code: 'FORBIDDEN',
        message: 'この操作を行う権限がありません',
      });
      return;
    }

    req.communityMember = {
      id: member.id,
      role: member.role,
      communityId: member.communityId,
    };

    next();
  };
}
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `./scripts/docker-dev.sh bash -c "cd backend && npx vitest run src/shared/middleware/__tests__/community-role.middleware.test.ts"`
Expected: ALL PASS

- [ ] **Step 5: コミット**

```bash
git add backend/src/shared/middleware/community-role.middleware.ts backend/src/shared/middleware/__tests__/community-role.middleware.test.ts
git commit -m "feat: コミュニティロール権限ミドルウェアを追加 (shared)"
```

---

### Task 7: コントローラ & OpenAPI & DI 構成

**Files:**
- Create: `backend/src/community/controllers/event-error-mappings.ts`
- Create: `backend/src/community/controllers/event.controller.ts`
- Create: `backend/src/community/controllers/event-openapi.ts`
- Modify: `backend/src/community/composition.ts`
- Modify: `backend/src/app.ts`
- Modify: `backend/src/infrastructure/test-helper.ts`

- [ ] **Step 1: エラーマッピングを作成する**

```typescript
// backend/src/community/controllers/event-error-mappings.ts
import type { CreateEventError } from '../errors/event-errors';
import type { ErrorResponse } from '@shared/controllers/error-response';

// ============================================================
// イベントエラー → HTTP レスポンス マッピング
// ============================================================

/**
 * イベント作成エラーをHTTPレスポンスにマッピングする
 */
export function mapCreateEventErrorToResponse(error: CreateEventError): ErrorResponse {
  switch (error.type) {
    case 'CommunityNotFound':
      return {
        status: 404,
        response: {
          code: 'COMMUNITY_NOT_FOUND',
          message: 'コミュニティが見つかりません',
        },
      };
    case 'EventDateInPast':
      return {
        status: 422,
        response: {
          code: 'EVENT_DATE_IN_PAST',
          message: '開始日時は現在時刻より未来でなければなりません',
        },
      };
    case 'EventEndBeforeStart':
      return {
        status: 422,
        response: {
          code: 'EVENT_END_BEFORE_START',
          message: '終了日時は開始日時より後でなければなりません',
        },
      };
  }
}
```

- [ ] **Step 2: コントローラを作成する**

```typescript
// backend/src/community/controllers/event.controller.ts
import { Router } from 'express';
import type { Request, Response } from 'express';
import { requireAuth } from '@shared/middleware/auth.middleware';
import { createEventId } from '@shared/schemas/id-factories';
import type { AccountId, CommunityId } from '@shared/schemas/common';
import { mapCreateEventErrorToResponse } from './event-error-mappings';
import type { Event } from '../models/event';
import type { EventFormat } from '../models/schemas/event.schema';
import type { EventDependencies } from '../composition';

// ============================================================
// イベントレスポンス変換
// ============================================================

function toEventResponse(event: Event): Record<string, unknown> {
  return {
    id: event.id,
    communityId: event.communityId,
    title: event.title,
    description: event.description,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt.toISOString(),
    format: event.format,
    capacity: event.capacity,
    status: event.status,
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
  };
}

// ============================================================
// イベントルーターファクトリ
// ============================================================

/**
 * イベントルーターを作成する
 *
 * @param deps イベントコンテキストの依存性
 */
export function createEventRouter(deps: EventDependencies): Router {
  const router = Router({ mergeParams: true });

  const { createEventCommand, requireCommunityRole } = deps;

  /**
   * POST /communities/:id/events — イベント作成
   */
  router.post(
    '/',
    requireAuth,
    requireCommunityRole,
    async (req: Request, res: Response): Promise<void> => {
      const now = new Date();

      const command = {
        id: createEventId(),
        communityId: req.params['id'] as CommunityId,
        createdBy: req.accountId as AccountId,
        title: req.body.title as string,
        description: (req.body.description as string | null | undefined) ?? null,
        startsAt: new Date(req.body.startsAt as string),
        endsAt: new Date(req.body.endsAt as string),
        format: req.body.format as EventFormat,
        capacity: req.body.capacity as number,
        now,
        createdAt: now,
        updatedAt: now,
      };

      const result = await createEventCommand.execute(command);

      if (!result.ok) {
        const { status, response } = mapCreateEventErrorToResponse(result.error);
        res.status(status).json(response);
        return;
      }

      res.status(201).json({ event: toEventResponse(result.value) });
    }
  );

  return router;
}
```

- [ ] **Step 3: OpenAPI 登録を作成する**

```typescript
// backend/src/community/controllers/event-openapi.ts
import { z } from 'zod';
import { registry, UuidSchema, ErrorResponseSchema } from '@shared/openapi/registry';
import {
  EventTitleSchema,
  EventDescriptionSchema,
  EventFormatSchema,
  EventStatusSchema,
  EventCapacitySchema,
} from '../models/schemas/event.schema';

// ============================================================
// Event OpenAPI スキーマ定義
// ============================================================

const EventSchema = z
  .object({
    id: UuidSchema.openapi({ description: 'イベントID' }),
    communityId: UuidSchema.openapi({ description: 'コミュニティID' }),
    title: EventTitleSchema.openapi({ description: 'タイトル', example: 'TypeScript もくもく会' }),
    description: EventDescriptionSchema.openapi({
      description: '説明',
      example: 'TypeScriptでもくもくプログラミングする会です',
    }),
    startsAt: z.string().datetime().openapi({ description: '開始日時', example: '2026-07-01T19:00:00.000Z' }),
    endsAt: z.string().datetime().openapi({ description: '終了日時', example: '2026-07-01T21:00:00.000Z' }),
    format: EventFormatSchema.openapi({ description: '開催形式', example: 'ONLINE' }),
    capacity: EventCapacitySchema.openapi({ description: '定員', example: 50 }),
    status: EventStatusSchema.openapi({ description: 'ステータス', example: 'DRAFT' }),
    createdAt: z.string().datetime().openapi({ example: '2026-01-15T10:30:00.000Z' }),
    updatedAt: z.string().datetime().openapi({ example: '2026-01-15T10:30:00.000Z' }),
  })
  .openapi('Event');

const EventResponseSchema = z
  .object({
    event: EventSchema,
  })
  .openapi('EventResponse');

const CreateEventRequestSchema = z
  .object({
    title: EventTitleSchema.openapi({ description: 'タイトル', example: 'TypeScript もくもく会' }),
    description: EventDescriptionSchema.optional().openapi({
      description: '説明',
      example: 'TypeScriptでもくもくプログラミングする会です',
    }),
    startsAt: z.string().datetime().openapi({ description: '開始日時', example: '2026-07-01T19:00:00.000Z' }),
    endsAt: z.string().datetime().openapi({ description: '終了日時', example: '2026-07-01T21:00:00.000Z' }),
    format: EventFormatSchema.openapi({ description: '開催形式', example: 'ONLINE' }),
    capacity: EventCapacitySchema.openapi({ description: '定員', example: 50 }),
  })
  .openapi('CreateEventRequest');

// ============================================================
// スキーマ登録
// ============================================================

registry.register('EventResponse', EventResponseSchema);
registry.register('CreateEventRequest', CreateEventRequestSchema);

// ============================================================
// Event API パス定義
// ============================================================

// POST /communities/{communityId}/events - イベント作成
registry.registerPath({
  method: 'post',
  path: '/communities/{communityId}/events',
  tags: ['Events'],
  summary: 'イベントを作成する',
  description: 'コミュニティ内にイベントを作成します。オーナーまたは管理者のみ操作可能です。',
  security: [{ BearerAuth: [] }],
  request: {
    params: z.object({
      communityId: UuidSchema.openapi({ description: 'コミュニティID' }),
    }),
    body: {
      content: {
        'application/json': { schema: CreateEventRequestSchema },
      },
    },
  },
  responses: {
    201: {
      description: 'イベント作成成功',
      content: { 'application/json': { schema: EventResponseSchema } },
    },
    400: {
      description: 'バリデーションエラー',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    401: {
      description: '認証エラー',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    403: {
      description: '権限エラー',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'コミュニティが見つからない',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    422: {
      description: '日時バリデーションエラー',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});
```

- [ ] **Step 4: composition.ts に EventDependencies を追加する**

`backend/src/community/composition.ts` に以下を追加:

import 追加:
```typescript
import type { RequestHandler } from 'express';
import { PrismaEventRepository } from './repositories/prisma-event.repository';
import { CreateEventCommand } from './usecases/commands/create-event.command';
import { CommunityMemberRole } from './models/schemas/member.schema';
import { createRequireCommunityRole } from '@shared/middleware/community-role.middleware';
```

インターフェース追加:
```typescript
export interface EventDependencies {
  readonly createEventCommand: CreateEventCommand;
  readonly requireCommunityRole: RequestHandler;
}
```

`createCommunityDependencies` の戻り値の型に `event: EventDependencies` を追加し、return 文に以下を追加:
```typescript
    event: {
      createEventCommand: new CreateEventCommand(communityRepository, new PrismaEventRepository(prisma)),
      requireCommunityRole: createRequireCommunityRole(
        communityMemberRepository,
        CommunityMemberRole.OWNER,
        CommunityMemberRole.ADMIN
      ),
    },
```

- [ ] **Step 5: app.ts にイベントルートを登録する**

`backend/src/app.ts` に以下を追加:

import 追加:
```typescript
import { createEventRouter } from './community/controllers/event.controller';
```

side-effect import 追加:
```typescript
import './community/controllers/event-openapi';
```

OpenAPI tags に `Events` を追加 — `backend/src/shared/openapi/registry.ts` の `generateOpenAPIDocument` 内の `tags` 配列に `{ name: 'Events', description: 'Event management' }` を追加する。

ルート登録追加（Member routes の下）:
```typescript
  // Event routes (nested under communities)
  application.use('/communities/:id/events', createEventRouter(communityDeps.event));
```

- [ ] **Step 6: test-helper.ts の clearMeetupTables に Event テーブル削除を追加する**

`backend/src/infrastructure/test-helper.ts` の `clearMeetupTables` 関数内の `$transaction` 配列の先頭に追加:

```typescript
    prisma.event.deleteMany(),
```

（Event は CommunityMember より先に削除する必要がある — 外部キー制約のため）

- [ ] **Step 7: コミット**

```bash
git add backend/src/community/controllers/event-error-mappings.ts backend/src/community/controllers/event.controller.ts backend/src/community/controllers/event-openapi.ts backend/src/community/composition.ts backend/src/app.ts backend/src/infrastructure/test-helper.ts
git commit -m "feat: イベント作成 API コントローラと DI 構成を追加 (community)"
```

---

### Task 8: バックエンド E2E テスト（TDD）

**Files:**
- Create: `backend/src/community/controllers/__tests__/event.e2e.test.ts`

- [ ] **Step 1: E2E テストを書く**

```typescript
// backend/src/community/controllers/__tests__/event.e2e.test.ts
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import type { PrismaClient } from '@prisma/client';
import { createApp } from '../../../app';
import {
  createTestPrismaClient,
  cleanupTestPrismaClient,
  clearMeetupTables,
} from '../../../infrastructure/test-helper';

// ============================================================
// テスト用ヘルパー
// ============================================================

async function アカウントを登録してトークンを取得する(
  app: ReturnType<typeof createApp>,
  data: { name: string; email: string; password: string }
): Promise<string> {
  await request(app).post('/auth/register').send(data).expect(201);
  const loginRes = await request(app)
    .post('/auth/login')
    .send({ email: data.email, password: data.password })
    .expect(200);
  return loginRes.body.token as string;
}

async function コミュニティを作成する(
  app: ReturnType<typeof createApp>,
  token: string
): Promise<string> {
  const res = await request(app)
    .post('/communities')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: `テストコミュニティ${Date.now()}`,
      description: 'テスト用',
      category: 'TECH',
      visibility: 'PUBLIC',
    })
    .expect(201);
  return res.body.community.id as string;
}

const 有効なイベントデータ = () => ({
  title: 'TypeScript もくもく会',
  description: 'TypeScriptでもくもくプログラミングする会',
  startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
  format: 'ONLINE',
  capacity: 50,
});

// ============================================================
// POST /communities/:id/events E2E テスト
// ============================================================

describe('POST /communities/:id/events', () => {
  let prisma: PrismaClient;
  let app: ReturnType<typeof createApp>;

  beforeAll(() => {
    prisma = createTestPrismaClient();
    app = createApp(prisma);
  });

  beforeEach(async () => {
    await clearMeetupTables(prisma);
  });

  afterAll(async () => {
    await cleanupTestPrismaClient(prisma);
  });

  describe('オーナーが有効なデータを送信した場合', () => {
    it('201 が返り、作成されたイベント情報が含まれること', async () => {
      const token = await アカウントを登録してトークンを取得する(app, {
        name: 'オーナー',
        email: 'owner@example.com',
        password: 'password123',
      });
      const communityId = await コミュニティを作成する(app, token);
      const eventData = 有効なイベントデータ();

      const response = await request(app)
        .post(`/communities/${communityId}/events`)
        .set('Authorization', `Bearer ${token}`)
        .send(eventData)
        .expect(201);

      expect(response.body.event.id).toBeDefined();
      expect(response.body.event.title).toBe('TypeScript もくもく会');
      expect(response.body.event.status).toBe('DRAFT');
      expect(response.body.event.communityId).toBe(communityId);
      expect(response.body.event.format).toBe('ONLINE');
      expect(response.body.event.capacity).toBe(50);
    });
  });

  describe('認証なしでリクエストした場合', () => {
    it('401 が返ること', async () => {
      await request(app)
        .post('/communities/00000000-0000-0000-0000-000000000000/events')
        .send(有効なイベントデータ())
        .expect(401);
    });
  });

  describe('一般メンバー（MEMBER ロール）がリクエストした場合', () => {
    it('403 が返ること', async () => {
      // オーナーでコミュニティ作成
      const ownerToken = await アカウントを登録してトークンを取得する(app, {
        name: 'オーナー',
        email: 'owner2@example.com',
        password: 'password123',
      });
      const communityId = await コミュニティを作成する(app, ownerToken);

      // 別ユーザーでコミュニティに参加
      const memberToken = await アカウントを登録してトークンを取得する(app, {
        name: 'メンバー',
        email: 'member@example.com',
        password: 'password123',
      });
      await request(app)
        .post(`/communities/${communityId}/members`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(201);

      // メンバーがイベント作成を試みる
      await request(app)
        .post(`/communities/${communityId}/events`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send(有効なイベントデータ())
        .expect(403);
    });
  });

  describe('存在しないコミュニティの場合', () => {
    it('403 が返ること', async () => {
      const token = await アカウントを登録してトークンを取得する(app, {
        name: 'ユーザー',
        email: 'user@example.com',
        password: 'password123',
      });

      await request(app)
        .post('/communities/00000000-0000-0000-0000-000000000000/events')
        .set('Authorization', `Bearer ${token}`)
        .send(有効なイベントデータ())
        .expect(403);
    });
  });

  describe('開始日時が過去の場合', () => {
    it('422 EVENT_DATE_IN_PAST が返ること', async () => {
      const token = await アカウントを登録してトークンを取得する(app, {
        name: 'オーナー',
        email: 'owner3@example.com',
        password: 'password123',
      });
      const communityId = await コミュニティを作成する(app, token);

      const response = await request(app)
        .post(`/communities/${communityId}/events`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          ...有効なイベントデータ(),
          startsAt: '2020-01-01T00:00:00.000Z',
          endsAt: '2020-01-01T02:00:00.000Z',
        })
        .expect(422);

      expect(response.body.code).toBe('EVENT_DATE_IN_PAST');
    });
  });

  describe('終了日時が開始日時以前の場合', () => {
    it('422 EVENT_END_BEFORE_START が返ること', async () => {
      const token = await アカウントを登録してトークンを取得する(app, {
        name: 'オーナー',
        email: 'owner4@example.com',
        password: 'password123',
      });
      const communityId = await コミュニティを作成する(app, token);
      const startsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const response = await request(app)
        .post(`/communities/${communityId}/events`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          ...有効なイベントデータ(),
          startsAt,
          endsAt: startsAt,
        })
        .expect(422);

      expect(response.body.code).toBe('EVENT_END_BEFORE_START');
    });
  });
});
```

- [ ] **Step 2: テストを実行する**

Run: `./scripts/docker-dev.sh bash -c "cd backend && npx vitest run src/community/controllers/__tests__/event.e2e.test.ts"`
Expected: ALL PASS

- [ ] **Step 3: 全バックエンドテストを実行する**

Run: `./scripts/docker-dev.sh bash -c "cd backend && npm test"`
Expected: ALL PASS

- [ ] **Step 4: コミット**

```bash
git add backend/src/community/controllers/__tests__/event.e2e.test.ts
git commit -m "test: イベント作成 API の E2E テストを追加 (community)"
```

---

### Task 9: バックエンド品質ゲート

- [ ] **Step 1: review コマンドを実行する**

Run: `./scripts/docker-dev.sh bash -c "cd backend && npm run review"`
Expected: レイヤー依存チェック OK、カバレッジ 80%+、型チェック OK

- [ ] **Step 2: lint を実行する**

Run: `./scripts/docker-dev.sh bash -c "cd backend && npm run lint"`
Expected: エラーなし

- [ ] **Step 3: 問題があれば修正してコミット**

問題がなければスキップ。

---

### Task 10: フロントエンド型定義 & ユーティリティ

**Files:**
- Modify: `frontend/src/community/types.ts`
- Create: `frontend/src/community/utils/event-label-utils.ts`

- [ ] **Step 1: types.ts にイベント関連の型を追加する**

`frontend/src/community/types.ts` の末尾に追加:

```typescript
// --- Event types ---

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

export type EventResponse = {
  event: Event;
};
```

- [ ] **Step 2: イベント用ラベルユーティリティを作成する**

```typescript
// frontend/src/community/utils/event-label-utils.ts
import type { EventFormat } from "../types";

export const EVENT_FORMATS: EventFormat[] = ["ONLINE", "OFFLINE", "HYBRID"];

const FORMAT_LABELS: Record<EventFormat, string> = {
  ONLINE: "オンライン",
  OFFLINE: "オフライン",
  HYBRID: "ハイブリッド",
};

export const getFormatLabel = (format: EventFormat): string =>
  FORMAT_LABELS[format];
```

- [ ] **Step 3: コミット**

```bash
git add frontend/src/community/types.ts frontend/src/community/utils/event-label-utils.ts
git commit -m "feat: フロントエンドにイベント型定義とラベルユーティリティを追加 (frontend)"
```

---

### Task 11: フロントエンド useEvents フック（TDD）

**Files:**
- Create: `frontend/src/community/hooks/useEvents.ts`
- Create: `frontend/src/community/hooks/__tests__/useEvents.test.ts`

- [ ] **Step 1: テストを先に書く**

```typescript
// frontend/src/community/hooks/__tests__/useEvents.test.ts
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useEvents } from "../useEvents";

vi.mock("../../../lib/api-client", () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

import { apiClient } from "../../../lib/api-client";

const mockPost = vi.mocked(apiClient.post);

describe("useEvents フック", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createEvent でイベントを作成する", async () => {
    const event = {
      id: "1",
      communityId: "c1",
      title: "テストイベント",
      description: "説明",
      startsAt: "2026-07-01T19:00:00.000Z",
      endsAt: "2026-07-01T21:00:00.000Z",
      format: "ONLINE",
      capacity: 50,
      status: "DRAFT",
      createdAt: "",
      updatedAt: "",
    };
    mockPost.mockResolvedValue({ ok: true, data: { event } });

    const { result } = renderHook(() => useEvents());

    let created: unknown;
    await act(async () => {
      created = await result.current.createEvent("c1", {
        title: "テストイベント",
        description: "説明",
        startsAt: "2026-07-01T19:00:00.000Z",
        endsAt: "2026-07-01T21:00:00.000Z",
        format: "ONLINE",
        capacity: 50,
      });
    });

    expect(created).toEqual(event);
    expect(mockPost).toHaveBeenCalledWith("/communities/c1/events", {
      title: "テストイベント",
      description: "説明",
      startsAt: "2026-07-01T19:00:00.000Z",
      endsAt: "2026-07-01T21:00:00.000Z",
      format: "ONLINE",
      capacity: 50,
    });
  });

  it("createEvent 失敗時に null を返しエラーを設定する", async () => {
    mockPost.mockResolvedValue({ ok: false, error: { message: "error" } });

    const { result } = renderHook(() => useEvents());

    let created: unknown;
    await act(async () => {
      created = await result.current.createEvent("c1", {
        title: "テスト",
        description: "説明",
        startsAt: "2026-07-01T19:00:00.000Z",
        endsAt: "2026-07-01T21:00:00.000Z",
        format: "ONLINE",
        capacity: 50,
      });
    });

    expect(created).toBeNull();
    expect(result.current.error).toBe("イベントの作成に失敗しました");
  });
});
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `./scripts/docker-dev.sh bash -c "cd frontend && npx vitest run src/community/hooks/__tests__/useEvents.test.ts"`
Expected: FAIL — `useEvents` が存在しない

- [ ] **Step 3: フックを実装する**

```typescript
// frontend/src/community/hooks/useEvents.ts
import { useState, useCallback } from "react";
import { apiClient } from "../../lib/api-client";
import type { Event, EventResponse, CreateEventRequest } from "../types";

export const useEvents = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createEvent = useCallback(
    async (
      communityId: string,
      data: CreateEventRequest,
    ): Promise<Event | null> => {
      setLoading(true);
      setError(null);
      const result = await apiClient.post<EventResponse>(
        `/communities/${communityId}/events`,
        data,
      );
      if (result.ok) {
        setLoading(false);
        return result.data.event;
      }
      setError("イベントの作成に失敗しました");
      setLoading(false);
      return null;
    },
    [],
  );

  return { createEvent, loading, error };
};
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `./scripts/docker-dev.sh bash -c "cd frontend && npx vitest run src/community/hooks/__tests__/useEvents.test.ts"`
Expected: ALL PASS

- [ ] **Step 5: コミット**

```bash
git add frontend/src/community/hooks/useEvents.ts frontend/src/community/hooks/__tests__/useEvents.test.ts
git commit -m "feat: useEvents フックを追加 (frontend)"
```

---

### Task 12: EventCreateForm コンポーネント（TDD）

**Files:**
- Create: `frontend/src/community/components/EventCreateForm.tsx`
- Create: `frontend/src/community/components/__tests__/EventCreateForm.test.tsx`

- [ ] **Step 1: テストを先に書く**

```typescript
// frontend/src/community/components/__tests__/EventCreateForm.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { EventCreateForm } from "../EventCreateForm";

describe("EventCreateForm コンポーネント", () => {
  it("フォーム要素をレンダリングする", () => {
    render(
      <EventCreateForm onSubmit={vi.fn()} loading={false} error={null} />,
    );
    expect(screen.getByLabelText("タイトル")).toBeInTheDocument();
    expect(screen.getByLabelText("説明")).toBeInTheDocument();
    expect(screen.getByLabelText("開始日時")).toBeInTheDocument();
    expect(screen.getByLabelText("終了日時")).toBeInTheDocument();
    expect(screen.getByLabelText("開催形式")).toBeInTheDocument();
    expect(screen.getByLabelText("定員")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "作成" })).toBeInTheDocument();
  });

  it("タイトルが未入力で送信するとバリデーションエラーを表示する", async () => {
    const onSubmit = vi.fn();
    render(
      <EventCreateForm onSubmit={onSubmit} loading={false} error={null} />,
    );

    await userEvent.click(screen.getByRole("button", { name: "作成" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "タイトルと日時を入力してください",
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("正しい入力で送信すると onSubmit をフォームデータで呼び出す", async () => {
    const onSubmit = vi.fn();
    render(
      <EventCreateForm onSubmit={onSubmit} loading={false} error={null} />,
    );

    await userEvent.type(screen.getByLabelText("タイトル"), "もくもく会");
    await userEvent.type(screen.getByLabelText("説明"), "プログラミングする会");
    // datetime-local inputs
    await userEvent.type(screen.getByLabelText("開始日時"), "2026-07-01T19:00");
    await userEvent.type(screen.getByLabelText("終了日時"), "2026-07-01T21:00");
    await userEvent.selectOptions(screen.getByLabelText("開催形式"), "OFFLINE");
    await userEvent.clear(screen.getByLabelText("定員"));
    await userEvent.type(screen.getByLabelText("定員"), "30");
    await userEvent.click(screen.getByRole("button", { name: "作成" }));

    expect(onSubmit).toHaveBeenCalledWith({
      title: "もくもく会",
      description: "プログラミングする会",
      startsAt: expect.stringContaining("2026-07-01"),
      endsAt: expect.stringContaining("2026-07-01"),
      format: "OFFLINE",
      capacity: 30,
    });
  });

  it("外部エラー(error prop)を表示する", () => {
    render(
      <EventCreateForm
        onSubmit={vi.fn()}
        loading={false}
        error="サーバーエラーが発生しました"
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "サーバーエラーが発生しました",
    );
  });

  it("loading 中はボタンが無効化される", () => {
    render(
      <EventCreateForm onSubmit={vi.fn()} loading={true} error={null} />,
    );
    expect(screen.getByRole("button")).toBeDisabled();
  });
});
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `./scripts/docker-dev.sh bash -c "cd frontend && npx vitest run src/community/components/__tests__/EventCreateForm.test.tsx"`
Expected: FAIL — `EventCreateForm` が存在しない

- [ ] **Step 3: フォームコンポーネントを実装する**

```tsx
// frontend/src/community/components/EventCreateForm.tsx
import { useState, type FormEvent } from "react";
import { Input } from "../../components/Input";
import { Button } from "../../components/Button";
import { ErrorAlert } from "../../components/ErrorAlert";
import { EVENT_FORMATS, getFormatLabel } from "../utils/event-label-utils";
import type { CreateEventRequest, EventFormat } from "../types";

type EventCreateFormProps = {
  onSubmit: (data: CreateEventRequest) => void;
  loading: boolean;
  error: string | null;
};

export const EventCreateForm = ({
  onSubmit,
  loading,
  error,
}: EventCreateFormProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [format, setFormat] = useState<EventFormat>("ONLINE");
  const [capacity, setCapacity] = useState(50);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!title || !startsAt || !endsAt) {
      setValidationError("タイトルと日時を入力してください");
      return;
    }

    onSubmit({
      title,
      description,
      startsAt: new Date(startsAt).toISOString(),
      endsAt: new Date(endsAt).toISOString(),
      format,
      capacity,
    });
  };

  return (
    <>
      <ErrorAlert message={validationError || error} />
      <form onSubmit={handleSubmit}>
        <Input
          label="タイトル"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div className="mb-4">
          <label
            htmlFor="event-description"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            説明
          </label>
          <textarea
            id="event-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={4}
          />
        </div>
        <Input
          label="開始日時"
          type="datetime-local"
          value={startsAt}
          onChange={(e) => setStartsAt(e.target.value)}
        />
        <Input
          label="終了日時"
          type="datetime-local"
          value={endsAt}
          onChange={(e) => setEndsAt(e.target.value)}
        />
        <div className="mb-4">
          <label
            htmlFor="event-format"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            開催形式
          </label>
          <select
            id="event-format"
            value={format}
            onChange={(e) => setFormat(e.target.value as EventFormat)}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          >
            {EVENT_FORMATS.map((f) => (
              <option key={f} value={f}>
                {getFormatLabel(f)}
              </option>
            ))}
          </select>
        </div>
        <Input
          label="定員"
          type="number"
          value={String(capacity)}
          onChange={(e) => setCapacity(parseInt(e.target.value, 10) || 0)}
          min={1}
          max={1000}
        />
        <Button type="submit" loading={loading} className="w-full">
          作成
        </Button>
      </form>
    </>
  );
};
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `./scripts/docker-dev.sh bash -c "cd frontend && npx vitest run src/community/components/__tests__/EventCreateForm.test.tsx"`
Expected: ALL PASS

- [ ] **Step 5: コミット**

```bash
git add frontend/src/community/components/EventCreateForm.tsx frontend/src/community/components/__tests__/EventCreateForm.test.tsx
git commit -m "feat: EventCreateForm コンポーネントを追加 (frontend)"
```

---

### Task 13: EventCreatePage & ルーティング & コミュニティ詳細ページ変更

**Files:**
- Create: `frontend/src/community/pages/EventCreatePage.tsx`
- Modify: `frontend/src/community/pages/CommunityDetailPage.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: EventCreatePage を作成する**

```tsx
// frontend/src/community/pages/EventCreatePage.tsx
import { useNavigate, useParams } from "react-router-dom";
import { useEvents } from "../hooks/useEvents";
import { Card } from "../../components/Card";
import { EventCreateForm } from "../components/EventCreateForm";
import type { CreateEventRequest } from "../types";

export const EventCreatePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { createEvent, loading, error } = useEvents();

  const handleSubmit = async (data: CreateEventRequest) => {
    if (!id) return;
    const event = await createEvent(id, data);
    if (event) {
      navigate(`/communities/${id}`);
    }
  };

  return (
    <div className="flex justify-center">
      <Card className="w-full max-w-lg">
        <h1 className="mb-6 text-2xl font-bold">イベント作成</h1>
        <EventCreateForm
          onSubmit={handleSubmit}
          loading={loading}
          error={error}
        />
      </Card>
    </div>
  );
};
```

- [ ] **Step 2: CommunityDetailPage にイベント作成ボタンを追加する**

`frontend/src/community/pages/CommunityDetailPage.tsx` に以下の変更を加える:

import 追加:
```typescript
import { useNavigate } from "react-router-dom";
```

コンポーネント内に追加:
```typescript
  const navigate = useNavigate();
```

`isOwner` の下に `isAdmin` 判定を追加:
```typescript
  const isAdmin = members.some(
    (m) => m.accountId === user?.id && m.role === "ADMIN",
  );
  const canManageEvents = isOwner || isAdmin;
```

コミュニティ詳細 Card 内、参加/退会ボタンの後に追加:
```tsx
        {canManageEvents && (
          <Button
            onClick={() => navigate(`/communities/${id}/events/new`)}
            className="mt-4 ml-2"
          >
            イベント作成
          </Button>
        )}
```

- [ ] **Step 3: App.tsx にルートを追加する**

import 追加:
```typescript
import { EventCreatePage } from "./community/pages/EventCreatePage";
```

`/communities/:id` ルートの下に追加:
```tsx
            <Route path="/communities/:id/events/new" element={<EventCreatePage />} />
```

**重要**: `/communities/:id/events/new` は `/communities/:id` より後に配置する（React Router はパターンマッチで適切に処理する）。

- [ ] **Step 4: コミット**

```bash
git add frontend/src/community/pages/EventCreatePage.tsx frontend/src/community/pages/CommunityDetailPage.tsx frontend/src/App.tsx
git commit -m "feat: イベント作成ページとルーティングを追加 (frontend)"
```

---

### Task 14: フロントエンドテスト & lint

- [ ] **Step 1: フロントエンド全テストを実行する**

Run: `./scripts/docker-dev.sh bash -c "cd frontend && npm test"`
Expected: ALL PASS

- [ ] **Step 2: フロントエンド lint を実行する**

Run: `./scripts/docker-dev.sh bash -c "cd frontend && npm run lint"`
Expected: エラーなし

- [ ] **Step 3: 問題があれば修正してコミット**

問題がなければスキップ。

---

### Task 15: Playwright E2E テスト

**Files:**
- Create: `e2e/tests/event.spec.ts`

- [ ] **Step 1: E2E テストを書く**

```typescript
// e2e/tests/event.spec.ts
import { test, expect, type Page } from '@playwright/test'

const uniqueSuffix = () => Date.now().toString()

async function registerAndLogin(page: Page, suffix: string) {
  await page.goto('/register')
  await page.getByLabel('名前').fill(`イベントユーザー${suffix}`)
  await page.getByLabel('メールアドレス').fill(`event${suffix}@example.com`)
  await page.getByLabel('パスワード').fill('password123')
  await page.getByRole('button', { name: '登録' }).click()
  await expect(page).toHaveURL('/')
}

async function createCommunity(page: Page, suffix: string): Promise<string> {
  await page.getByRole('link', { name: 'コミュニティ作成' }).click()
  await expect(page.getByRole('heading', { name: 'コミュニティ作成' })).toBeVisible()
  const communityName = `イベントテスト${suffix}`
  await page.getByLabel('コミュニティ名').fill(communityName)
  await page.locator('textarea#description').fill(`${communityName}の説明文です`)
  await page.locator('select#category').selectOption('TECH')
  await page.locator('select#visibility').selectOption('PUBLIC')
  await page.getByRole('button', { name: '作成' }).click()
  await expect(page.getByRole('heading', { name: communityName })).toBeVisible()
  return communityName
}

async function logout(page: Page) {
  await page.getByRole('button', { name: 'ログアウト' }).click()
  await expect(page).toHaveURL('/login')
}

async function login(page: Page, email: string) {
  await page.goto('/login')
  await page.getByLabel('メールアドレス').fill(email)
  await page.getByLabel('パスワード').fill('password123')
  await page.getByRole('button', { name: 'ログイン' }).click()
  await expect(page).toHaveURL('/')
}

test.describe('イベント', () => {
  test.describe('イベント作成', () => {
    test('オーナーがイベントを作成するとコミュニティ詳細ページに遷移する', async ({ page }) => {
      const suffix = uniqueSuffix()
      await registerAndLogin(page, suffix)
      const communityName = await createCommunity(page, suffix)

      // イベント作成ボタンをクリック
      await page.getByRole('button', { name: 'イベント作成' }).click()
      await expect(page.getByRole('heading', { name: 'イベント作成' })).toBeVisible()

      // フォーム入力
      await page.getByLabel('タイトル').fill('TypeScript もくもく会')
      await page.locator('textarea#event-description').fill('TypeScriptでもくもくプログラミングする会')
      await page.getByLabel('開始日時').fill('2026-12-01T19:00')
      await page.getByLabel('終了日時').fill('2026-12-01T21:00')
      await page.locator('select#event-format').selectOption('ONLINE')
      await page.getByLabel('定員').clear()
      await page.getByLabel('定員').fill('50')
      await page.getByRole('button', { name: '作成' }).click()

      // コミュニティ詳細ページにリダイレクト
      await expect(page.getByRole('heading', { name: communityName })).toBeVisible()
    })
  })

  test.describe('権限チェック', () => {
    test('一般メンバーにはイベント作成ボタンが表示されない', async ({ page }) => {
      const suffix = uniqueSuffix()
      // オーナーでコミュニティ作成
      await registerAndLogin(page, suffix)
      await createCommunity(page, suffix)
      await logout(page)

      // 別ユーザーで参加
      const memberSuffix = `member${suffix}`
      await page.goto('/register')
      await page.getByLabel('名前').fill(`メンバー${memberSuffix}`)
      await page.getByLabel('メールアドレス').fill(`event-member${suffix}@example.com`)
      await page.getByLabel('パスワード').fill('password123')
      await page.getByRole('button', { name: '登録' }).click()
      await expect(page).toHaveURL('/')

      // コミュニティ一覧からコミュニティを見つけてクリック
      const communityName = `イベントテスト${suffix}`
      await page.getByRole('heading', { name: communityName, level: 2, exact: true }).click()
      await expect(page.getByRole('heading', { name: communityName })).toBeVisible()

      // 参加する
      await page.getByRole('button', { name: '参加する' }).click()

      // イベント作成ボタンが表示されないことを確認
      await expect(page.getByRole('button', { name: 'イベント作成' })).not.toBeVisible()
    })
  })
})
```

- [ ] **Step 2: E2E テストを実行する**

Run: `./scripts/docker-dev.sh e2e`
Expected: ALL PASS

- [ ] **Step 3: コミット**

```bash
git add e2e/tests/event.spec.ts
git commit -m "test: イベント作成 Playwright E2E テストを追加 (e2e)"
```

---

### Task 16: 全体品質ゲート

- [ ] **Step 1: 全バックエンドテスト + review**

Run: `./scripts/docker-dev.sh bash -c "cd backend && npm run review"`
Expected: ALL PASS、カバレッジ 80%+

- [ ] **Step 2: 全フロントエンドテスト + lint**

Run: `./scripts/docker-dev.sh bash -c "cd frontend && npm test && npm run lint"`
Expected: ALL PASS

- [ ] **Step 3: E2E テスト**

Run: `./scripts/docker-dev.sh e2e`
Expected: ALL PASS

- [ ] **Step 4: 問題があれば修正してコミット**

---

## 検証手順（手動確認）

1. `./scripts/docker-dev.sh dev` でサーバー起動
2. ブラウザでログイン → コミュニティ作成 → 詳細ページ → 「イベント作成」ボタン → フォーム入力 → 作成成功 → コミュニティ詳細に戻る
3. 一般メンバーでログイン → コミュニティ詳細ページ → 「イベント作成」ボタンが表示されないことを確認
