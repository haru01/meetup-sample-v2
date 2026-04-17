# 境界づけられたコンテキスト分割 — リネーム + ストーリー書き換え

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 既存の `meetup` コンテキストを `community` にリネームし、ユーザーストーリーを 2 コンテキスト構成（community / participation）に書き換える

**Architecture:** ディレクトリ移動 → 設定ファイル更新 → import パス更新 → ドキュメント更新の順で進める。API エンドポイント URL、Prisma モデル名、DB テーブル名は変更しない。

**Tech Stack:** Express.js, Prisma, TypeScript, React, Vite, Vitest

**Spec:** `docs/superpowers/specs/2026-04-06-bounded-context-split-design.md`

---

## ファイル構成マップ

### 移動するディレクトリ（中身はそのまま）

| 移動元 | 移動先 |
|--------|--------|
| `backend/src/meetup/` (39 files) | `backend/src/community/` |
| `frontend/src/meetup/` (21 files) | `frontend/src/community/` |
| `backend/prisma/schema/meetup/` (2 files) | `backend/prisma/schema/community/` |

### 修正するファイル

| ファイル | 変更内容 |
|---------|---------|
| `backend/tsconfig.json` | `@meetup/*` → `@community/*` |
| `backend/vitest.config.ts` | `@meetup` → `@community` |
| `backend/.dependency-cruiser.cjs` | ルール名・パス `meetup` → `community` |
| `backend/src/app.ts` | import パス `./meetup/` → `./community/`、関数名 `createMeetupDependencies` → `createCommunityDependencies` |
| `backend/src/community/composition.ts` | 関数名・コメント `Meetup` → `Community` |
| `backend/src/community/errors/meetup-errors.ts` | ファイル名 → `community-errors.ts`、それに伴う import 更新 |
| `AGENTS.md` | パス参照 3 箇所を `community` に更新 |
| `frontend/src/App.tsx` | import パス `./meetup/` → `./community/` |
| `docs/stories/meetup-todo.md` | コンテキスト構成反映 + participation ストーリー追加 |

---

## Task 1: バックエンド — ディレクトリ移動

**Files:**
- Move: `backend/src/meetup/` → `backend/src/community/`
- Move: `backend/prisma/schema/meetup/` → `backend/prisma/schema/community/`

- [ ] **Step 1: バックエンドソースディレクトリを移動**

```bash
cd /Users/eiji/src/ai-driven-sample/meetup-sample
git mv backend/src/meetup backend/src/community
```

- [ ] **Step 2: Prisma スキーマディレクトリを移動**

```bash
git mv backend/prisma/schema/meetup backend/prisma/schema/community
```

- [ ] **Step 3: エラーファイルをリネーム**

```bash
git mv backend/src/community/errors/meetup-errors.ts backend/src/community/errors/community-errors.ts
```

- [ ] **Step 4: コミット**

```bash
git add -A
git commit -m "refactor: meetup ディレクトリを community にリネーム (backend)"
```

---

## Task 2: バックエンド — 設定ファイル更新

**Files:**
- Modify: `backend/tsconfig.json`
- Modify: `backend/vitest.config.ts`

- [ ] **Step 1: tsconfig.json のパスエイリアスを更新**

`backend/tsconfig.json` の paths セクション:

```json
"@meetup/*": ["src/meetup/*"]
```

↓ 変更後:

```json
"@community/*": ["src/community/*"]
```

- [ ] **Step 2: .dependency-cruiser.cjs のルール名・パスを更新**

`backend/.dependency-cruiser.cjs` の以下を変更:

```javascript
// 変更前
name: 'no-cross-context-auth-to-meetup',
comment: 'auth と meetup は直接依存できません。shared を経由してください',
// ...
path: '^src/meetup/',
// ...
name: 'no-cross-context-meetup-to-auth',
comment: 'meetup と auth は直接依存できません。shared を経由してください',
path: '^src/meetup/',
// ...
path: '^src/(auth|meetup)/(usecases|models|repositories|services)/',

// 変更後
name: 'no-cross-context-auth-to-community',
comment: 'auth と community は直接依存できません。shared を経由してください',
// ...
path: '^src/community/',
// ...
name: 'no-cross-context-community-to-auth',
comment: 'community と auth は直接依存できません。shared を経由してください',
path: '^src/community/',
// ...
path: '^src/(auth|community)/(usecases|models|repositories|services)/',
```

- [ ] **Step 3: vitest.config.ts の resolve.alias を更新**

`backend/vitest.config.ts` の alias セクション:

```typescript
'@meetup': path.resolve(__dirname, 'src/meetup'),
```

↓ 変更後:

```typescript
'@community': path.resolve(__dirname, 'src/community'),
```

- [ ] **Step 4: コミット**

```bash
git add backend/tsconfig.json backend/vitest.config.ts backend/.dependency-cruiser.cjs
git commit -m "refactor: パスエイリアス・依存ルールを @meetup から @community に更新 (backend)"
```

---

## Task 3: バックエンド — composition.ts の関数名・コメント更新

**Files:**
- Modify: `backend/src/community/composition.ts`

- [ ] **Step 1: コメントと関数名を更新**

`backend/src/community/composition.ts` を編集。以下 3 箇所を変更:

1. import パス（エラーファイルのリネーム反映）:

```typescript
// 変更前
import type { CommunityCreatedEvent } from './errors/meetup-errors';
// 変更後
import type { CommunityCreatedEvent } from './errors/community-errors';
```

2. コメント:

```typescript
// 変更前
// ============================================================
// Meetup コンテキスト 依存性構成
// ============================================================
// 変更後
// ============================================================
// Community コンテキスト 依存性構成
// ============================================================
```

3. 関数名とドキュメント:

```typescript
// 変更前
/**
 * Meetup コンテキストの依存性を構成する（Composition Root）
 */
export function createMeetupDependencies(prisma: PrismaClient): {
// 変更後
/**
 * Community コンテキストの依存性を構成する（Composition Root）
 */
export function createCommunityDependencies(prisma: PrismaClient): {
```

- [ ] **Step 2: コミット**

```bash
git add backend/src/community/composition.ts
git commit -m "refactor: composition.ts の関数名・コメントを community に更新 (backend)"
```

---

## Task 4: バックエンド — app.ts の import パス更新

**Files:**
- Modify: `backend/src/app.ts`

- [ ] **Step 1: import パスと変数名を更新**

`backend/src/app.ts` の 5 つの import を更新:

```typescript
// 変更前
import { createCommunityRouter } from './meetup/controllers/community.controller';
import { createMemberRouter } from './meetup/controllers/member.controller';
import { createMeetupDependencies } from './meetup/composition';
import './meetup/controllers/community-openapi';
import './meetup/controllers/member-openapi';
// 変更後
import { createCommunityRouter } from './community/controllers/community.controller';
import { createMemberRouter } from './community/controllers/member.controller';
import { createCommunityDependencies } from './community/composition';
import './community/controllers/community-openapi';
import './community/controllers/member-openapi';
```

変数名も更新:

```typescript
// 変更前
const meetupDeps = createMeetupDependencies(prismaClient);
application.use('/communities', createCommunityRouter(meetupDeps.community));
application.use('/communities/:id/members', createMemberRouter(meetupDeps.member));
// 変更後
const communityDeps = createCommunityDependencies(prismaClient);
application.use('/communities', createCommunityRouter(communityDeps.community));
application.use('/communities/:id/members', createMemberRouter(communityDeps.member));
```

- [ ] **Step 2: コミット**

```bash
git add backend/src/app.ts
git commit -m "refactor: app.ts の import パスを community に更新 (backend)"
```

---

## Task 5: バックエンド — エラーファイル参照の更新

**Files:**
- Modify: `backend/src/community/controllers/community-error-mappings.ts`
- Modify: `backend/src/community/controllers/member-error-mappings.ts`
- Modify: `backend/src/community/controllers/community.controller.ts`
- Modify: `backend/src/community/controllers/member.controller.ts`
- Modify: `backend/src/community/usecases/commands/create-community.command.ts`
- Modify: その他 `meetup-errors` を import しているファイル

- [ ] **Step 1: meetup-errors への参照を一括検索**

```bash
cd /Users/eiji/src/ai-driven-sample/meetup-sample
grep -r "meetup-errors" backend/src/community/ --include="*.ts" -l
```

期待される結果: `meetup-errors` を import しているファイル一覧が出る

- [ ] **Step 2: 各ファイルの import パスを更新**

検出された各ファイルで:

```typescript
// 変更前
from '../errors/meetup-errors'
// または
from '../../errors/meetup-errors'
// 変更後
from '../errors/community-errors'
// または
from '../../errors/community-errors'
```

すべてのファイルで `meetup-errors` → `community-errors` に置換する。

- [ ] **Step 3: 型チェック実行**

```bash
./scripts/docker-dev.sh bash -c "cd backend && npx tsc --noEmit"
```

期待される結果: エラーなし

- [ ] **Step 4: コミット**

```bash
git add backend/src/community/
git commit -m "refactor: meetup-errors の参照を community-errors に更新 (backend)"
```

---

## Task 6: バックエンド — テスト実行で全体確認

- [ ] **Step 1: バックエンドテスト実行**

```bash
./scripts/docker-dev.sh bash -c "cd backend && npm test"
```

期待される結果: 全テスト PASS

- [ ] **Step 2: lint 実行**

```bash
./scripts/docker-dev.sh bash -c "cd backend && npm run lint"
```

期待される結果: エラーなし

- [ ] **Step 3: review（レイヤー依存・カバレッジ・型チェック）実行**

```bash
./scripts/docker-dev.sh bash -c "cd backend && npm run review"
```

期待される結果: 全チェック PASS

- [ ] **Step 4: 問題があれば修正してコミット**

問題が見つかった場合のみ修正・コミット。

---

## Task 7: フロントエンド — ディレクトリ移動 + import 更新

**Files:**
- Move: `frontend/src/meetup/` → `frontend/src/community/`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: フロントエンドディレクトリを移動**

```bash
cd /Users/eiji/src/ai-driven-sample/meetup-sample
git mv frontend/src/meetup frontend/src/community
```

- [ ] **Step 2: App.tsx の import パスを更新**

`frontend/src/App.tsx`:

```typescript
// 変更前
import { CommunityListPage } from "./meetup/pages/CommunityListPage";
import { CommunityDetailPage } from "./meetup/pages/CommunityDetailPage";
import { CommunityCreatePage } from "./meetup/pages/CommunityCreatePage";
import { MyCommunitiesPage } from "./meetup/pages/MyCommunitiesPage";
// 変更後
import { CommunityListPage } from "./community/pages/CommunityListPage";
import { CommunityDetailPage } from "./community/pages/CommunityDetailPage";
import { CommunityCreatePage } from "./community/pages/CommunityCreatePage";
import { MyCommunitiesPage } from "./community/pages/MyCommunitiesPage";
```

- [ ] **Step 3: その他の meetup 参照を確認**

```bash
grep -r "meetup" frontend/src/ --include="*.ts" --include="*.tsx" -l
```

期待される結果: 該当なし（すべて community 内の相対パスで解決済み）

- [ ] **Step 4: フロントエンドテスト実行**

```bash
./scripts/docker-dev.sh bash -c "cd frontend && npm test"
```

期待される結果: 全テスト PASS

- [ ] **Step 5: フロントエンドビルド確認**

```bash
./scripts/docker-dev.sh bash -c "cd frontend && npm run build"
```

期待される結果: ビルド成功

- [ ] **Step 6: コミット**

```bash
git add -A
git commit -m "refactor: meetup ディレクトリを community にリネーム (frontend)"
```

---

## Task 8: ドキュメント — AGENTS.md 更新

**Files:**
- Modify: `AGENTS.md`

- [ ] **Step 1: AGENTS.md のパス参照を更新**

3 箇所を変更:

```markdown
<!-- 変更前 -->
- `backend/src/meetup/` — Meetup context (community CRUD, membership management)
<!-- 変更後 -->
- `backend/src/community/` — Community context (community CRUD, membership management)
```

```markdown
<!-- 変更前 -->
React 19 + Vite + Tailwind CSS + React Router — auth/meetup コンテキスト分離構成
<!-- 変更後 -->
React 19 + Vite + Tailwind CSS + React Router — auth/community コンテキスト分離構成
```

```markdown
<!-- 変更前 -->
- `frontend/src/meetup/` — Meetup context (pages, components, hooks, utils)
<!-- 変更後 -->
- `frontend/src/community/` — Community context (pages, components, hooks, utils)
```

- [ ] **Step 2: コミット**

```bash
git add AGENTS.md
git commit -m "docs: AGENTS.md のコンテキストパス参照を community に更新 (docs)"
```

---

## Task 9: ドキュメント — ユーザーストーリー書き換え

**Files:**
- Modify: `docs/stories/meetup-todo.md`

- [ ] **Step 1: ユーザーストーリーを 2 コンテキスト構成に書き換え**

`docs/stories/meetup-todo.md` を以下の方針で更新:

1. **ユーザージャーニーセクション**:
   - 「2. コミュニティの運営」の Note を更新: イベント管理が community コンテキストに含まれることを明記
   - 「3. コミュニティへの参加」の Note を更新: イベント参加が participation コンテキストになることを明記

2. **Phase 3（イベント管理）セクション**:
   - community コンテキストに属することを明記
   - 「スコープ外」表記はそのまま

3. **Phase 4（イベント参加申込）セクション**:
   - participation コンテキストに属することを明記
   - キャンセル待ち繰上げのユースケースを追加（MTP-018 を拡充）:
     - 定員満員時に Waitlist に追加
     - キャンセル発生時に Waitlist 先頭を自動繰上げ（WAITING → PROMOTED → CONFIRMED）
   - 「スコープ外」表記はそのまま

4. **エラー型定義セクション**:
   - パス参照 `src/meetup/errors/meetup-errors.ts` → `src/community/errors/community-errors.ts`

5. **依存関係セクション**:
   - Phase 3 に `(community コンテキスト)` を追記
   - Phase 4 に `(participation コンテキスト)` を追記

6. **ステータス遷移セクション**:
   - participation のステータス遷移を追加:

```text
イベント参加ステータス（participation コンテキスト）

参加申込:
  定員内 → CONFIRMED
  定員超過 → WAITING（Waitlist に追加）

キャンセル:
  CONFIRMED → CANCELLED → Waitlist 先頭を PROMOTED → CONFIRMED

Waitlist:
  WAITING → PROMOTED（キャンセル発生時、自動繰上げ）
  WAITING → EXPIRED（イベント開始時）
```

- [ ] **Step 2: コミット**

```bash
git add docs/stories/meetup-todo.md
git commit -m "docs: ユーザーストーリーを 2 コンテキスト構成に書き換え (docs)"
```

---

## Task 10: E2E テスト + 最終検証

- [ ] **Step 1: E2E テスト実行**

```bash
./scripts/docker-dev.sh e2e
```

期待される結果: 全 E2E テスト PASS

- [ ] **Step 2: 残存 meetup 参照の最終確認**

```bash
grep -r "meetup" backend/src/ frontend/src/ --include="*.ts" --include="*.tsx" -l
```

期待される結果: 該当なし（ドキュメントや設定ファイルは除く）

- [ ] **Step 3: 問題があれば修正してコミット**

問題が見つかった場合のみ修正・コミット。
