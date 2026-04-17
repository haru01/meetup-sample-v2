# ミートアップサイト (Meetup) - Issue一覧

> **アーカイブ済み (2026-04-17)**: 本ファイルは初期ロードマップであり、実装は完了済み。
> 現在のドメイン構成は [docs/eventstorming-20260417-2009.md](../../eventstorming-20260417-2009.md) を参照。
> 本ファイルは履歴として保持する。

ミートアップサイトのAPIストーリー一覧。

## ユーザージャーニー

### 1. アカウント登録〜ログイン

1. **新規登録** — ユーザーはメールアドレス・パスワード・表示名で**アカウントを作成**する
2. **ログイン** — メールアドレスとパスワードで**JWTトークンを取得**する

> **Note**: メール認証・プロフィール設定は本プロジェクトではスコープ外（最小限の認証のみ実装）

### 2. コミュニティの運営（オーナー視点）

1. **コミュニティ作成** — オーナーがテーマ・カテゴリ・公開設定（PUBLIC/PRIVATE）を決めて**コミュニティを立ち上げる**
2. **参加申請の管理**（PRIVATEの場合） — 届いた参加申請を**承認 or 拒否**する

> **Note**: イベント管理（作成・公開・キャンセル等）はフェーズ3（community コンテキスト）で対応予定

### 3. コミュニティへの参加（メンバー視点）

1. **コミュニティ検索** — カテゴリで**興味のあるコミュニティを探す**
2. **参加** — PUBLICなら即参加、PRIVATEなら承認待ち（`PENDING` → `ACTIVE`）
3. **脱退** — コミュニティから**脱退**する（オーナーは脱退不可）

> **Note**: イベント参加・キャンセル待ち等はフェーズ4（participation コンテキスト）で対応予定

### 4. 発見と通知

> **Note**: 横断検索・AIレコメンド・通知はフェーズ5-6で対応予定（スコープ外）

---

## DONEの定義

Issueが「完了」となるための条件:

- [x] 受け入れ条件がすべて満たされている
- [x] UseCaseのユニットテストが通過する
- [x] E2Eテストが通過する
- [x] カバレッジ80%以上、lint通過

---

## Phase 1: 登録・認証（最小限実装）

### MTP-001: ユーザー登録API

**概要**
ユーザーがメールアドレスとパスワードで新規アカウントを作成できるAPIを実装する。

**受け入れ条件**

- [x] メールアドレス、パスワード、表示名で登録できる
- [ ] ~~パスワードは8文字以上、英字・数字の混在が必須~~ (簡略化: バリデーション省略)
- [x] 登録済みメールアドレスは `DuplicateEmail` エラーを返す
- [ ] ~~登録直後のアカウント状態は `UNVERIFIED` である~~ (簡略化: 即時ACTIVEとして扱う)

---

### MTP-002: メール認証API

> **スコープ外**: 最小限の認証のため省略

---

### MTP-003: ログインAPI

**概要**
ユーザーがメールアドレスとパスワードでJWTアクセストークンを取得できるAPIを実装する。

**受け入れ条件**

- [x] メールアドレスとパスワードが正しければJWTトークンを返す
- [x] 存在しないメールアドレスまたは誤ったパスワードは `InvalidCredentials` エラーを返す
- [ ] ~~`UNVERIFIED` 状態のアカウントはログイン不可~~ (メール認証なし)
- [ ] ~~`SUSPENDED` 状態のアカウントはログイン不可~~ (サスペンド機能なし)

---

### MTP-004: プロフィール登録・更新API

> **スコープ外**: 最小限の認証のため省略

---

## Phase 2: コミュニティ管理

### MTP-005: コミュニティ作成API

**概要**
ユーザーが特定のテーマに基づくコミュニティを作成できるAPIを実装する。

**受け入れ条件**

- [x] 名前、説明（最大1000文字）、カテゴリ、公開設定（PUBLIC / PRIVATE）でコミュニティを作成できる
- [x] 作成者は自動的にオーナーとなる
- [x] 名前は1〜100文字、同一名のコミュニティは作成不可 (`DuplicateCommunityName` エラー)
- [x] 1ユーザーあたり作成できるコミュニティは最大10件

---

### MTP-006: コミュニティ参加・脱退API

**概要**
ユーザーがコミュニティに参加・脱退できるAPIを実装する。

**受け入れ条件**

- [x] コミュニティIDを指定して参加できる
- [x] `PRIVATE` コミュニティへの参加は承認待ち状態 (`PENDING`) になる
- [x] `PUBLIC` コミュニティへの参加は即時承認 (`ACTIVE`) になる
- [x] オーナーは脱退不可 (`OwnerCannotLeave` エラー)
- [x] 参加済みコミュニティへの再参加は `AlreadyMember` エラーを返す

---

### MTP-007: コミュニティ参加承認・拒否API（オーナー・管理者）

**概要**
コミュニティのオーナーまたは管理者がPRIVATEコミュニティへの参加申請を承認・拒否できるAPIを実装する。

**受け入れ条件**

- [x] オーナーまたは管理者のみ操作可能、それ以外は `NotAuthorized` エラー
- [x] 承認後のメンバーステータスは `ACTIVE` になる
- [x] 拒否後の申請は削除される
- [x] 存在しないメンバーIDは `MemberNotFound` エラーを返す

---

### MTP-008: コミュニティ詳細取得API

**概要**
ユーザーがコミュニティの詳細情報を取得できるAPIを実装する。

**受け入れ条件**

- [x] コミュニティID、名前、説明、カテゴリ、公開設定、作成日時が返される
- [x] `PRIVATE` コミュニティの詳細はメンバーのみ取得可能（非メンバーには `CommunityNotFound`）
- [x] 存在しないコミュニティIDは `CommunityNotFound` エラーを返す

---

### MTP-009: コミュニティ一覧・検索API

**概要**
ユーザーがカテゴリでコミュニティを検索できるAPIを実装する。

**受け入れ条件**

- [ ] ~~キーワードで名前・説明を全文検索できる~~ (簡略化: キーワード検索は未実装)
- [x] カテゴリでフィルタリングできる
- [x] `PUBLIC` コミュニティのみ返す（非ログインユーザーも可）
- [x] ページネーション対応（limit/offsetパラメータ）
- [x] 検索結果が0件の場合は空配列を返す
- [x] `?member=me` で自分が参加中のコミュニティを取得できる（認証必要）

---

## Phase 3: イベント管理（community コンテキスト）

> **Note**: MTP-010 はチュートリアル題材として実装済み。MTP-011〜015 は未実装。

### MTP-010: イベント作成

**概要**
コミュニティのオーナーまたは管理者が、コミュニティ内にイベントを作成できる機能を実装する。API・UI・E2E をフルスタックで実装する。

**受け入れ条件**

#### API（Backend）
- [x] `POST /communities/:communityId/events` でイベントを作成できる
- [x] タイトル（1〜100文字）、説明（最大1000文字）、開催日時、終了日時、開催形式（ONLINE / OFFLINE / HYBRID）、定員（1〜1000）を指定できる
- [x] 開始日時は現在時刻より未来でなければならない（`EventDateInPast` エラー）
- [x] 終了日時は開始日時より後でなければならない（`EventEndBeforeStart` エラー）
- [x] 作成直後のイベント状態は `DRAFT` である
- [x] オーナーまたは管理者のみ作成可能（`NotAuthorized` エラー）
- [x] 存在しないコミュニティは `CommunityNotFound` エラー

#### UI（Frontend）
- [x] コミュニティ詳細ページに「イベント作成」ボタンを表示する（オーナー/管理者のみ）
- [x] イベント作成フォーム（タイトル、説明、開催日時、終了日時、開催形式、定員）を表示する
- [x] バリデーションエラー時にエラーメッセージを表示する
- [x] 作成成功時にコミュニティ詳細ページへ遷移する

#### E2E
- [x] オーナーがイベント作成フォームを入力し、作成が成功する一連のフローを確認する
- [x] 権限のないメンバーには「イベント作成」ボタンが表示されないことを確認する

### MTP-011: イベント公開

**概要**
オーナーまたは管理者が DRAFT 状態のイベントを公開し、コミュニティメンバーに見えるようにする。

**受け入れ条件**

#### API（Backend）
- [ ] `PATCH /communities/:communityId/events/:eventId/publish` でイベントを公開できる
- [ ] `DRAFT` → `PUBLISHED` のステータス遷移のみ許可（それ以外は `InvalidEventStatus` エラー）
- [ ] 公開時に `EventPublishedEvent` をイベントバスに発行する
- [ ] オーナーまたは管理者のみ操作可能（`NotAuthorized` エラー）

#### UI（Frontend）
- [ ] イベント詳細ページに「公開する」ボタンを表示する（DRAFT 状態 かつ オーナー/管理者のみ）
- [ ] 公開確認ダイアログを表示し、確認後に公開する
- [ ] 公開成功時にイベント詳細ページのステータス表示が `PUBLISHED` に更新される

#### E2E
- [ ] オーナーが DRAFT イベントを公開し、ステータスが PUBLISHED に変わるフローを確認する

---

### MTP-012: イベント更新

**概要**
オーナーまたは管理者が DRAFT または PUBLISHED 状態のイベント情報を更新できる。

**受け入れ条件**

#### API（Backend）
- [ ] `PUT /communities/:communityId/events/:eventId` でイベントを更新できる
- [ ] `DRAFT` / `PUBLISHED` のイベントのみ更新可能（`CANCELLED` は `InvalidEventStatus` エラー）
- [ ] 更新可能フィールド: タイトル、説明、開催日時、終了日時、開催形式、定員
- [ ] オーナーまたは管理者のみ操作可能（`NotAuthorized` エラー）

#### UI（Frontend）
- [ ] イベント詳細ページに「編集」ボタンを表示する（DRAFT/PUBLISHED かつ オーナー/管理者のみ）
- [ ] イベント編集フォームに既存値をプリフィルして表示する
- [ ] 更新成功時にイベント詳細ページへ遷移する

#### E2E
- [ ] オーナーがイベント情報を編集し、更新内容が反映されるフローを確認する

---

### MTP-013: イベントキャンセル

**概要**
オーナーまたは管理者が PUBLISHED 状態のイベントをキャンセルできる。

**受け入れ条件**

#### API（Backend）
- [ ] `PATCH /communities/:communityId/events/:eventId/cancel` でイベントをキャンセルできる
- [ ] `PUBLISHED` → `CANCELLED` のステータス遷移のみ許可（それ以外は `InvalidEventStatus` エラー）
- [ ] キャンセル時に `EventCancelledEvent` をイベントバスに発行する
- [ ] オーナーまたは管理者のみ操作可能（`NotAuthorized` エラー）

#### UI（Frontend）
- [ ] イベント詳細ページに「キャンセル」ボタンを表示する（PUBLISHED かつ オーナー/管理者のみ）
- [ ] キャンセル確認ダイアログを表示し、確認後にキャンセルする
- [ ] キャンセル成功時にステータス表示が `CANCELLED` に更新される

#### E2E
- [ ] オーナーが PUBLISHED イベントをキャンセルし、ステータスが CANCELLED に変わるフローを確認する

---

### MTP-014: イベント詳細取得

**概要**
ユーザーがイベントの詳細情報を取得・閲覧できる。

**受け入れ条件**

#### API（Backend）
- [ ] `GET /communities/:communityId/events/:eventId` でイベント詳細を取得できる
- [ ] レスポンス: イベントID、タイトル、説明、開催日時、終了日時、開催形式、定員、ステータス、作成日時
- [ ] 存在しないイベントは `EventNotFound` エラー
- [ ] `DRAFT` イベントはオーナー/管理者のみ取得可能（一般メンバーには `EventNotFound`）

#### UI（Frontend）
- [ ] イベント詳細ページにイベント情報（タイトル、説明、日時、形式、定員、ステータス）を表示する
- [ ] ステータスに応じたバッジ（DRAFT / PUBLISHED / CANCELLED）を表示する
- [ ] 権限に応じて管理ボタン（公開・編集・キャンセル）を出し分ける

#### E2E
- [ ] メンバーが PUBLISHED イベントの詳細を閲覧できるフローを確認する

---

### MTP-015: イベント一覧取得

**概要**
コミュニティ内のイベント一覧を取得・閲覧できる。

**受け入れ条件**

#### API（Backend）
- [ ] `GET /communities/:communityId/events` でイベント一覧を取得できる
- [ ] ページネーション対応（limit/offset パラメータ）
- [ ] 一般メンバーには `PUBLISHED` イベントのみ返す
- [ ] オーナー/管理者には `DRAFT` / `PUBLISHED` / `CANCELLED` すべて返す

#### UI（Frontend）
- [ ] コミュニティ詳細ページにイベント一覧セクションを表示する
- [ ] 各イベントをカード形式で表示する（タイトル、日時、形式、ステータスバッジ）
- [ ] イベントカードをクリックするとイベント詳細ページへ遷移する
- [ ] イベントが0件の場合は空状態メッセージを表示する

#### E2E
- [ ] コミュニティ詳細ページでイベント一覧が表示され、クリックで詳細に遷移するフローを確認する

---

## Phase 4: イベント参加申込（participation コンテキスト）

### MTP-016: イベント参加申込

**概要**
ログインユーザーが PUBLISHED 状態のイベントに参加申込できる。

**受け入れ条件**

#### API（Backend）
- [ ] `POST /communities/:communityId/events/:eventId/registrations` でイベントに参加申込できる
- [ ] 定員内の場合、ステータスは `CONFIRMED`
- [ ] 定員超過の場合、ステータスは `WAITING`（キャンセル待ちリストに追加）
- [ ] 同一イベントへの重複申込は `AlreadyRegistered` エラー
- [ ] `PUBLISHED` 以外のイベントは `EventNotPublished` エラー
- [ ] コミュニティメンバーのみ申込可能（`NotCommunityMember` エラー）

#### UI（Frontend）
- [ ] イベント詳細ページに「参加する」ボタンを表示する（PUBLISHED かつ 未申込のメンバーのみ）
- [ ] 定員超過時は「キャンセル待ちに登録」ボタンを表示する
- [ ] 申込成功時にボタンが「参加済み」または「キャンセル待ち中」に変わる
- [ ] 残り定員数を表示する（例:「残り 3 / 20 席」）

#### E2E
- [ ] メンバーがイベントに参加申込し、CONFIRMED ステータスになるフローを確認する
- [ ] 定員超過時にキャンセル待ちリストに登録されるフローを確認する

---

### MTP-017: イベント参加キャンセル

**概要**
参加申込済みのユーザーが、イベント開始1時間前までキャンセルできる。

**受け入れ条件**

#### API（Backend）
- [ ] `DELETE /communities/:communityId/events/:eventId/registrations/me` で参加をキャンセルできる
- [ ] `CONFIRMED` → `CANCELLED` のステータス遷移
- [ ] イベント開始1時間前を過ぎた場合は `CancellationDeadlinePassed` エラー
- [ ] キャンセル発生時にキャンセル待ち先頭を自動繰上げする（MTP-018 と連動）

#### UI（Frontend）
- [ ] イベント詳細ページに「参加をキャンセル」ボタンを表示する（CONFIRMED のユーザーのみ）
- [ ] キャンセル確認ダイアログを表示し、確認後にキャンセルする
- [ ] キャンセル成功時にボタンが「参加する」に戻る
- [ ] キャンセル期限を過ぎている場合はボタンを非活性にし、期限切れメッセージを表示する

#### E2E
- [ ] 参加者がイベント参加をキャンセルできるフローを確認する

---

### MTP-018: キャンセル待ち・繰上げ

**概要**
キャンセル発生時にキャンセル待ちリストの先頭を自動繰上げし、イベント開始時に未繰上げエントリを期限切れにする。

**受け入れ条件**

#### API（Backend）
- [ ] キャンセル発生時に Waitlist 先頭を自動繰上げ（`WAITING` → `CONFIRMED`）
- [ ] 繰上げ時に `RegistrationPromotedEvent` をイベントバスに発行する
- [ ] イベント開始時に未繰上げの Waitlist エントリを `EXPIRED` にする
- [ ] `GET /communities/:communityId/events/:eventId/registrations/me` で自分の申込ステータスを取得できる

#### UI（Frontend）
- [ ] キャンセル待ち中のユーザーに「キャンセル待ち中（n番目）」と順番を表示する
- [ ] 繰上げが発生した場合、次回ページ表示時にステータスが `CONFIRMED` に更新されている

#### E2E
- [ ] 定員満員のイベントで参加者がキャンセルし、キャンセル待ち先頭が自動繰上げされるフローを確認する

---

### MTP-019: イベント参加者一覧

**概要**
オーナーまたは管理者がイベントの参加者一覧を取得・閲覧できる。

**受け入れ条件**

#### API（Backend）
- [ ] `GET /communities/:communityId/events/:eventId/registrations` で参加者一覧を取得できる
- [ ] レスポンス: ユーザーID、表示名、ステータス（CONFIRMED / WAITING / CANCELLED / EXPIRED）、申込日時
- [ ] オーナーまたは管理者のみ取得可能（`NotAuthorized` エラー）
- [ ] ページネーション対応（limit/offset パラメータ）

#### UI（Frontend）
- [ ] イベント詳細ページに「参加者一覧」セクションを表示する（オーナー/管理者のみ）
- [ ] 参加者をステータスごとにグループ分けして表示する
- [ ] 参加者数サマリー（確定 n名 / キャンセル待ち n名）を表示する

#### E2E
- [ ] オーナーがイベント参加者一覧を閲覧できるフローを確認する

---

## Phase 5: 検索・レコメンド

### MTP-020: イベント横断検索

**概要**
ユーザーがキーワードや条件でサイト横断的にイベントを検索できる。

**受け入れ条件**

#### API（Backend）
- [ ] `GET /events/search` でコミュニティ横断のイベント検索ができる
- [ ] キーワード（タイトル・説明の部分一致）、カテゴリ、開催形式、日付範囲でフィルタリングできる
- [ ] `PUBLISHED` イベントのみ返す
- [ ] ページネーション対応（limit/offset パラメータ）

#### UI（Frontend）
- [ ] ヘッダーにイベント検索バーを表示する
- [ ] 検索結果ページにフィルター（カテゴリ、形式、日付範囲）を表示する
- [ ] 検索結果をイベントカード形式で表示する（コミュニティ名も表示）
- [ ] 検索結果が0件の場合は空状態メッセージを表示する

#### E2E
- [ ] ユーザーがキーワードでイベントを検索し、結果が表示されるフローを確認する

---

### MTP-021: AI イベントレコメンド

**概要**
ユーザーの参加履歴や興味に基づいて、AI がおすすめイベントをスコアリング・提案する。

**受け入れ条件**

#### API（Backend）
- [ ] `GET /events/recommendations` でユーザー向けおすすめイベントを取得できる
- [ ] ユーザーの参加履歴、所属コミュニティのカテゴリを元にスコアリングする
- [ ] `PUBLISHED` かつ 開催日時が未来のイベントのみ返す
- [ ] 上位10件を返す

#### UI（Frontend）
- [ ] ホームページに「おすすめイベント」セクションを表示する（ログインユーザーのみ）
- [ ] レコメンド理由を簡潔に表示する（例:「参加中のコミュニティのイベント」）
- [ ] 未ログイン時は「ログインしておすすめを表示」メッセージを表示する

#### E2E
- [ ] ログインユーザーにおすすめイベントが表示されるフローを確認する

---

### MTP-022: AI コミュニティレコメンド

**概要**
ユーザーの所属コミュニティや参加履歴に基づいて、AI がおすすめコミュニティを提案する。

**受け入れ条件**

#### API（Backend）
- [ ] `GET /communities/recommendations` でユーザー向けおすすめコミュニティを取得できる
- [ ] ユーザーの所属コミュニティのカテゴリ傾向からスコアリングする
- [ ] `PUBLIC` かつ 未参加のコミュニティのみ返す
- [ ] 上位10件を返す

#### UI（Frontend）
- [ ] ホームページに「おすすめコミュニティ」セクションを表示する（ログインユーザーのみ）
- [ ] レコメンド理由を簡潔に表示する（例:「TECH カテゴリに興味がありそう」）

#### E2E
- [ ] ログインユーザーにおすすめコミュニティが表示されるフローを確認する

---

## Phase 6: 通知

### MTP-023: 通知一覧取得

**概要**
ユーザー宛の通知（イベント公開、キャンセル待ち繰上げ等）を一覧で取得・閲覧できる。

**受け入れ条件**

#### API（Backend）
- [ ] `GET /notifications` でログインユーザー宛の通知一覧を取得できる
- [ ] 通知タイプ: `EVENT_PUBLISHED`、`REGISTRATION_PROMOTED`、`EVENT_CANCELLED`
- [ ] 新しい順にソートして返す
- [ ] ページネーション対応（limit/offset パラメータ）
- [ ] 未読件数を返す

#### UI（Frontend）
- [ ] ヘッダーに通知ベルアイコンを表示する（未読件数バッジ付き）
- [ ] 通知一覧ドロップダウンまたはページを表示する
- [ ] 各通知をクリックすると関連ページ（イベント詳細等）へ遷移する
- [ ] 未読/既読のスタイルを区別する

#### E2E
- [ ] イベント公開後に通知が表示され、クリックでイベント詳細に遷移するフローを確認する

---

### MTP-024: 通知既読

**概要**
ユーザーが通知を既読にできる。

**受け入れ条件**

#### API（Backend）
- [ ] `PATCH /notifications/:notificationId/read` で通知を既読にできる
- [ ] `PATCH /notifications/read-all` で全通知を一括既読にできる
- [ ] 既読済みの通知を再度既読にしてもエラーにならない（冪等）

#### UI（Frontend）
- [ ] 通知をクリックすると自動的に既読になる
- [ ] 「すべて既読にする」ボタンを表示する
- [ ] 既読後にヘッダーの未読バッジが更新される

#### E2E
- [ ] 通知を既読にし、未読バッジが減るフローを確認する

---

## エラー型定義

### 実装済み（auth / community）

```typescript
// src/auth/errors/auth-errors.ts
export type RegisterAccountError =
  | { type: 'DuplicateEmail'; email: string };

export type LoginError =
  | { type: 'InvalidCredentials' };

// src/community/errors/community-errors.ts
export type CreateCommunityError =
  | { type: 'DuplicateCommunityName'; name: string }
  | { type: 'TooManyCommunities' };

export type JoinCommunityError =
  | { type: 'CommunityNotFound' }
  | { type: 'AlreadyMember' };

export type LeaveCommunityError =
  | { type: 'CommunityNotFound' }
  | { type: 'MemberNotFound' }
  | { type: 'OwnerCannotLeave' };

export type ApproveMemberError =
  | { type: 'CommunityNotFound' }
  | { type: 'MemberNotFound' }
  | { type: 'NotAuthorized' }
  | { type: 'MemberAlreadyActive' };

export type RejectMemberError =
  | { type: 'CommunityNotFound' }
  | { type: 'MemberNotFound' }
  | { type: 'NotAuthorized' };

export type GetCommunityError =
  | { type: 'CommunityNotFound' };

export type ListMembersError =
  | { type: 'CommunityNotFound' };

export type ListCommunitiesError = never;
```

### 実装済み（event）

```typescript
// src/community/errors/event-errors.ts
export type CreateEventError =
  | { type: 'CommunityNotFound' }
  | { type: 'NotAuthorized' }
  | { type: 'EventDateInPast' }
  | { type: 'EventEndBeforeStart' };
```

### 未実装（event 残り / participation / notification）

```typescript
// Phase 3: イベント管理（残り）
export type PublishEventError =
  | { type: 'EventNotFound' }
  | { type: 'NotAuthorized' }
  | { type: 'InvalidEventStatus' };

export type UpdateEventError =
  | { type: 'EventNotFound' }
  | { type: 'NotAuthorized' }
  | { type: 'InvalidEventStatus' }
  | { type: 'EventDateInPast' }
  | { type: 'EventEndBeforeStart' };

export type CancelEventError =
  | { type: 'EventNotFound' }
  | { type: 'NotAuthorized' }
  | { type: 'InvalidEventStatus' };

export type GetEventError =
  | { type: 'EventNotFound' };

export type ListEventsError =
  | { type: 'CommunityNotFound' };

// Phase 4: イベント参加申込
export type RegisterEventError =
  | { type: 'EventNotFound' }
  | { type: 'EventNotPublished' }
  | { type: 'NotCommunityMember' }
  | { type: 'AlreadyRegistered' };

export type CancelRegistrationError =
  | { type: 'EventNotFound' }
  | { type: 'RegistrationNotFound' }
  | { type: 'CancellationDeadlinePassed' };

export type ListRegistrationsError =
  | { type: 'EventNotFound' }
  | { type: 'NotAuthorized' };
```

---

## ステータス遷移

### コミュニティメンバーステータス

```text
PENDING → ACTIVE（承認）
        ↘ （拒否 → レコード削除 → 再申請可能）
```

> **Note**: OWNER は脱退不可

### イベントステータス（community コンテキスト）

```text
DRAFT → PUBLISHED（公開）
         ↘ CANCELLED（キャンセル）
```

> **Note**: DRAFT は作成者/管理者のみ閲覧可能

### イベント参加ステータス（participation コンテキスト）

```text
参加申込:
  定員内 → CONFIRMED
  定員超過 → WAITING（キャンセル待ちリストに追加）

キャンセル:
  CONFIRMED → CANCELLED → Waitlist 先頭を自動繰上げ → CONFIRMED

Waitlist:
  WAITING → CONFIRMED（キャンセル発生時、自動繰上げ）
  WAITING → EXPIRED（イベント開始時）
```

---

## 依存関係

```text
Phase 1（登録・認証）  ← 最小限実装済み
  └─ Phase 2（コミュニティ管理）  ← 実装済み
       └─ Phase 3（イベント管理 / community コンテキスト）  ← MTP-010 実装済み、MTP-011〜015 未実装
            └─ Phase 4（イベント参加申込 / participation コンテキスト）  ← 未実装
  └─ Phase 5（検索・レコメンド）  ← 未実装
  └─ Phase 6（通知）  ← 未実装
```

---

## 実装ステータスまとめ

| Phase | Issue | Status |
|-------|-------|--------|
| 1 | MTP-001 ユーザー登録 | :white_check_mark: 実装済み（簡略版） |
| 1 | MTP-002 メール認証 | :no_entry: スコープ外 |
| 1 | MTP-003 ログイン | :white_check_mark: 実装済み（簡略版） |
| 1 | MTP-004 プロフィール | :no_entry: スコープ外 |
| 2 | MTP-005 コミュニティ作成 | :white_check_mark: 実装済み |
| 2 | MTP-006 参加・脱退 | :white_check_mark: 実装済み |
| 2 | MTP-007 承認・拒否 | :white_check_mark: 実装済み |
| 2 | MTP-008 詳細取得 | :white_check_mark: 実装済み |
| 2 | MTP-009 一覧・検索 | :white_check_mark: 実装済み（キーワード検索除く） |
| 3 | MTP-010 イベント作成（フルスタック） | :white_check_mark: 実装済み（チュートリアル題材） |
| 3 | MTP-011 イベント公開 | :black_square_button: 未実装 |
| 3 | MTP-012 イベント更新 | :black_square_button: 未実装 |
| 3 | MTP-013 イベントキャンセル | :black_square_button: 未実装 |
| 3 | MTP-014 イベント詳細取得 | :black_square_button: 未実装 |
| 3 | MTP-015 イベント一覧取得 | :black_square_button: 未実装 |
| 4 | MTP-016 イベント参加申込 | :black_square_button: 未実装 |
| 4 | MTP-017 イベント参加キャンセル | :black_square_button: 未実装 |
| 4 | MTP-018 キャンセル待ち・繰上げ | :black_square_button: 未実装 |
| 4 | MTP-019 イベント参加者一覧 | :black_square_button: 未実装 |
| 5 | MTP-020 イベント横断検索 | :black_square_button: 未実装 |
| 5 | MTP-021 AI イベントレコメンド | :black_square_button: 未実装 |
| 5 | MTP-022 AI コミュニティレコメンド | :black_square_button: 未実装 |
| 6 | MTP-023 通知一覧取得 | :black_square_button: 未実装 |
| 6 | MTP-024 通知既読 | :black_square_button: 未実装 |
