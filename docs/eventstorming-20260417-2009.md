# EventStorming 風味のドメインモデリング - ミートアップイベント

- Session: eventstorming-20260417-2009
- Domain: ミートアップイベント
- Status: **フェーズ6完了（新スキル仕様準拠へ再編・2026-04-18）**
- Scope: ドメインモデリング ＋ 実装乖離の解消計画
- Goal: 新スキル仕様の DML（UPSTREAM/DOWNSTREAM・notification BC・Zod スキーマ・用語集）に揃え、実装との整合プランを策定する

---

## 1) Happy Path Story

田中さんは、地域のエンジニアコミュニティで毎月ミートアップを主催している。今月のテーマは「生成AIの実践活用」に決めた。イベント管理ツールを開き、タイトル・開催日時・会場・定員30名・参加費無料を入力する。内容を確認してから公開ボタンを押すと、コミュニティメンバーへの案内が一斉に届いた。

公開から数時間のうちに、常連の鈴木さんをはじめ参加申し込みが次々と入ってくる。田中さんは申し込み一覧を開き、一人ひとりのプロフィールを確認しながら承認していく。承認が完了した参加者には確定通知が自動で届き、イベント前にはリマインダーも送られた。準備を整えながら当日を楽しみに待つ参加者の姿が目に浮かぶ。

イベント当日、30名が続々と会場に到着し、それぞれチェックインを完了させた。活発なトークセッションとネットワーキングが行われ、大盛況のうちに閉会した。

後片付けを終えた田中さんがクローズ操作をおこなうと、全参加者に自動でアンケートが送信された。参加者からの率直なフィードバックが集まり、次回の改善のヒントが見えてくる。こうして月次ミートアップはコミュニティとともに少しずつ成長していく。

---

## 2) 代替シナリオ

### シナリオA：定員超過・キャンセル待ち繰り上がり

参加申し込みのタイミングですでに定員30名が埋まっていた場合、参加者は同じ申込操作のまま**同一トランザクション内でキャンセル待ちに登録**される（別ポリシーではなく、申込シナリオ自身の分岐）。その後、確定済み参加者からキャンセルが発生すると、キャンセル待ちの先頭から自動的に繰り上がり通知が届き、参加が確定する。

### シナリオB：参加者キャンセル

参加確定後に参加者が都合により参加をキャンセルすると、主催者に自動でキャンセル通知が届く。キャンセル待ちがいる場合は繰り上がり処理が走る。

### シナリオC：イベント中止

主催者が開催前にイベントを中止すると、参加確定済みおよびキャンセル待ちの全参加者に中止通知が一括送信される。

### シナリオD：PRIVATE コミュニティへの加入申請

PRIVATE コミュニティにメンバーが加入申請すると PENDING 状態で登録され、主催者が承認するまで ACTIVE にならない。主催者は申請を承認または却下できる。

---

## 3) Event Walkthrough

### ハッピーパス

```event-flow-svg
title: ハッピーパス — イベント企画から参加完了・クローズまで
flow:
|event|: 主催者がイベントを企画・公開する（主催者起動・同期TX）
  @主催者 > !イベントを作成する > [イベントが作成された]
  > !イベントを公開する > [イベントが公開された] >>
|participation|: 参加者が申し込む（EVENTUAL: 公開後・参加者起動）
  @参加者 > ?イベント詳細 > !参加を申し込む > [参加申し込みが完了した]
  > @主催者 > ?申し込み一覧 > !参加を承認する > [参加が確定した] >>
|notification|: 主催者が一括承認する（EVENTUAL: 申し込み後・主催者起動）
  $承認通知 > !承認通知を送る > [承認通知が送信された] >>
|checkin|: 承認通知を送信する（EVENTUAL: ポリシー起動）
  @参加者 > !チェックインする > [チェックインが完了した] >>
|event|: 参加者が当日チェックインする（EVENTUAL: 当日・参加者起動）
  @主催者 > !イベントをクローズする > [イベントがクローズされた] >>
|notification|: 主催者がクローズする（主催者起動）
  $クローズ後アンケート送信 > !アンケートを送る > [アンケートが送信された]
```

---

### 代替シナリオA：定員超過・キャンセル待ち繰り上がり

```event-flow-svg
title: 代替シナリオA — 定員超過（SAME-TX 分岐）＋キャンセル待ち繰り上がり
flow:
|participation|: 定員超過時の申し込み（参加者起動・SAME-TX で WAITLISTED へ分岐）
  @参加者 > ?残席数 > !参加を申し込む > [キャンセル待ちに登録された] >>
|participation|: 確定済み参加者がキャンセルする（EVENTUAL: 参加者起動）
  @参加者 > !参加をキャンセルする > [参加がキャンセルされた] >>
|participation|: キャンセル待ち繰り上がり（EVENTUAL: ポリシー起動）
  $キャンセル繰り上げ > !キャンセル待ちを繰り上げる > [繰り上がりが確定した] >>
|notification|: 繰り上げ通知送信（EVENTUAL: ポリシー起動）
  $繰り上げ通知 > !繰り上げを通知する > [繰り上げ通知が送信された]
```

> **補足**: `!参加を申し込む` は capacity > 0 のとき `[参加申し込みが完了した]`、capacity = 0 のとき `[キャンセル待ちに登録された]` を発火する同一コマンドの SAME-TX 分岐（DML では WHEN 分岐で表現）。

---

### 代替シナリオB：参加者キャンセル

```event-flow-svg
title: 代替シナリオB — 参加者キャンセル＋主催者通知
flow:
|participation|: 参加者がキャンセルする（参加者起動）
  @参加者 > !参加をキャンセルする > [参加がキャンセルされた] >>
|notification|: 主催者への通知（EVENTUAL: ポリシー起動）
  $参加キャンセル通知 > !主催者に通知する > [主催者にキャンセルが通知された]
```

---

### 代替シナリオC：イベント中止

```event-flow-svg
title: 代替シナリオC — イベント中止＋全参加者への通知
flow:
|event|: 主催者がイベントを中止する（主催者起動）
  @主催者 > !イベントを中止する > [イベントが中止された] >>
|notification|: 全参加者への中止通知（EVENTUAL: ポリシー起動）
  $イベント中止通知 > !中止を通知する > [中止が全参加者に通知された]
```

---

### 代替シナリオD：PRIVATE コミュニティ加入申請

```event-flow-svg
title: 代替シナリオD — PRIVATE コミュニティの加入承認フロー
flow:
|community|: メンバーが PRIVATE コミュニティに加入申請する（SAME-TX で PENDING へ分岐）
  @メンバー > !コミュニティに参加する > [加入申請が提出された] >>
|community|: 主催者が承認／却下を判断する（主催者起動）
  @主催者 > !メンバーを承認する > [メンバーが承認された]
```

> **補足**: `!コミュニティに参加する` は visibility=PUBLIC なら即 `[メンバーが加入した]`、visibility=PRIVATE なら `[加入申請が提出された]` を発火する SAME-TX 分岐。却下パスは `@主催者 > !メンバーを却下する > [メンバー申請が却下された]`（PENDING レコード削除）。

---

## 4) コンテキスト候補

### community（コミュニティ）

- 境界の理由: コミュニティ本体とメンバーシップは独立したライフサイクル（作成 / 加入 / 承認 / 脱退）を持ち、他 BC から参照されるのは主に ID のみ
- 含むシナリオ: 主催者がコミュニティを作成する、メンバーがコミュニティに参加する、主催者がメンバー申請を承認する、主催者がメンバー申請を却下する、メンバーがコミュニティから脱退する
- **依存方向**:
  - UPSTREAM: `(none)`
  - DOWNSTREAM: `event`（Customer-Supplier。`CommunityId` を event が参照）
- LANGUAGE:
  - `Community` — このBCでの意味: 同じ興味・目的を持つメンバーが集まるグループ
  - `CommunityMember` — このBCでの意味: コミュニティへの加入メンバー（ロール OWNER/ADMIN/MEMBER × ステータス PENDING/ACTIVE）

---

### event（イベント）

- 境界の理由: イベントの状態（DRAFT/PUBLISHED/CLOSED/CANCELLED）と定員管理は単一の責務として凝集できる。コミュニティとは別ライフサイクル
- 含むシナリオ: 主催者がイベントを作成する、公開する、編集する、クローズする、中止する、システムが開催日接近を検知する
- **依存方向**:
  - UPSTREAM: `community`（Customer-Supplier。`CommunityId` 参照）
  - DOWNSTREAM: `participation`（Customer-Supplier。`EventId` を参照）／`notification`（Customer-Supplier。イベント系通知を受信）
- LANGUAGE: `Event` — このBCでの意味: 主催者が企画・運営するミートアップイベント本体

---

### participation（参加管理）

- 境界の理由: イベント本体（event BC の Event）とは別に、申し込み1件ごとの状態遷移（APPLIED/APPROVED/WAITLISTED/CANCELLED）を独立して管理する
- 含むシナリオ: 参加者が参加申し込みをする、主催者が参加申し込みを一括承認する、参加者が参加をキャンセルする、システムがキャンセル待ち先頭を繰り上げる
- **依存方向**:
  - UPSTREAM: `event`（Customer-Supplier。`EventId`・PUBLISHED 状態・`capacity` を参照）
  - DOWNSTREAM: `checkin`（Customer-Supplier。Participation 承認状態を参照）／`notification`（Customer-Supplier。参加系通知を受信）
- LANGUAGE: `Participation` — このBCでの意味: 参加申し込みエントリー（event BC の Event に対する申込 1 件）

---

### checkin（チェックイン）

- 境界の理由: 当日の来場確認は参加管理・イベント管理と独立したライフサイクルを持つ（当日限定・物理的な操作）
- 含むシナリオ: 参加者がチェックインする
- **依存方向**:
  - UPSTREAM: `participation`（Customer-Supplier。APPROVED 状態の Participation を参照）
  - DOWNSTREAM: `(none)`
- LANGUAGE: `CheckIn` — このBCでの意味: 当日の来場確認・出席記録

---

### notification（通知）

- 境界の理由: 通知種類が 6 種類（APPROVAL / REMINDER / SURVEY / EVENT_CANCELLED / PARTICIPANT_CANCELLED / WAITLIST_PROMOTED）あり、データモデル（`Notification` テーブル）を持つ。新スキル仕様「データモデルあり＋BC 宣言なしは NG」を満たすため BC として明示化
- 含むシナリオ: 通知コンテキストが承認通知を送信する、リマインダーを送信する、アンケートを送信する、中止通知を送信する、主催者通知を送信する、繰り上げ通知を送信する（Q7/Q9 クローズにより実 SCENARIO として追加済み）
- **依存方向**:
  - UPSTREAM: `event`（Customer-Supplier。EventClosed / EventCancelled / EventDateApproached を受信）／`participation`（Customer-Supplier。ParticipationApproved / Cancelled / WaitlistPromoted を受信）
  - DOWNSTREAM: `(none)`
- LANGUAGE: `Notification` — このBCでの意味: 送信済み通知の監査ログ（現状は送信結果を記録するスタブ。将来 SLA・再送・状態管理を追加する余地あり）

---

## 5) 集約候補

### Community

- コンテキスト: `community`
- 関連シナリオ: `主催者がコミュニティを作成する`

#### 属性（Zod）

```ts
export const CommunitySchema = z.object({
  id: CommunityIdSchema,
  name: CommunityNameSchema,               // z.string().min(1).max(100)
  description: CommunityDescriptionSchema, // z.string().max(1000).nullable()
  category: CommunityCategorySchema,       // z.enum(['TECH', 'BUSINESS', 'HOBBY'])
  visibility: CommunityVisibilitySchema,   // z.enum(['PUBLIC', 'PRIVATE'])
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Community = z.infer<typeof CommunitySchema>;
```

#### 不変条件
- コミュニティ名はシステム全体でユニーク
- オーナー（`CommunityMember` の role=OWNER）は必ず存在する
- 説明は最大1000文字、nullable

#### 状態遷移
- ACTIVE（作成と同時に ACTIVE、削除操作は現状なし）

---

### CommunityMember

- コンテキスト: `community`
- 関連シナリオ: `メンバーがコミュニティに参加する`, `主催者がメンバー申請を承認する`, `主催者がメンバー申請を却下する`, `メンバーがコミュニティから脱退する`

#### 属性（Zod）

```ts
export const CommunityMemberSchema = z.object({
  id: CommunityMemberIdSchema,
  communityId: CommunityIdSchema,
  accountId: AccountIdSchema,
  role: CommunityMemberRoleSchema,     // z.enum(['OWNER', 'ADMIN', 'MEMBER'])
  status: CommunityMemberStatusSchema, // z.enum(['PENDING', 'ACTIVE'])
  createdAt: z.date(),
});
export type CommunityMember = z.infer<typeof CommunityMemberSchema>;
```

#### 不変条件
- 同一 `accountId` × `communityId` の組み合わせは 1 レコードのみ
- `role=OWNER` は脱退不可
- PUBLIC コミュニティは加入即 ACTIVE、PRIVATE は PENDING で主催者承認が必要
- 却下は PENDING 状態のレコードの物理削除で表現

#### 状態遷移
- (new) → ACTIVE: JoinCommunity（PUBLIC）
- (new) → PENDING: JoinCommunity（PRIVATE）
- PENDING → ACTIVE: ApproveMember
- PENDING → (deleted): RejectMember
- ACTIVE/PENDING → (deleted): LeaveCommunity（ただし OWNER 不可）

---

### Event

- コンテキスト: `event`
- 関連シナリオ: `主催者がイベントを作成する`, `主催者がイベントを公開する`, `主催者がイベントを編集する`, `主催者がイベントをクローズする`, `主催者がイベントを中止する`

#### 属性（Zod）

```ts
export const EventSchema = z.object({
  id: EventIdSchema,
  communityId: CommunityIdSchema,
  createdBy: AccountIdSchema,
  title: EventTitleSchema,               // z.string().min(1).max(100)
  description: EventDescriptionSchema,   // z.string().max(1000).nullable()
  startsAt: z.date(),
  endsAt: z.date(),
  format: EventFormatSchema,             // z.enum(['ONLINE', 'OFFLINE', 'HYBRID'])
  capacity: EventCapacitySchema,         // z.number().int().min(1).max(1000)
  status: EventStatusSchema,             // z.enum(['DRAFT', 'PUBLISHED', 'CLOSED', 'CANCELLED'])
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Event = z.infer<typeof EventSchema>;
```

#### 不変条件
- 定員は 1〜1000 の整数
- 開催日時 (`startsAt`) は作成時点で未来
- `endsAt` は `startsAt` より後
- 公開できるのは DRAFT 状態のみ
- 編集できるのは DRAFT/PUBLISHED 状態のみ
- 中止できるのは開催前（PUBLISHED）のみ
- クローズできるのは開催済み（PUBLISHED）のみ

#### 状態遷移
- DRAFT → PUBLISHED: PublishEvent
- PUBLISHED → CLOSED: CloseEvent（開催済み後）
- PUBLISHED → CANCELLED: CancelEvent（開催前）

---

### Participation

- コンテキスト: `participation`
- 関連シナリオ: `参加者が参加申し込みをする`, `主催者が参加申し込みを一括承認する`, `参加者が参加をキャンセルする`, `システムがキャンセル待ち先頭を繰り上げる`

#### 属性（Zod）

```ts
export const ParticipationSchema = z.object({
  id: ParticipationIdSchema,
  eventId: EventIdSchema,
  accountId: AccountIdSchema,
  status: ParticipationStatusSchema, // z.enum(['APPLIED', 'APPROVED', 'WAITLISTED', 'CANCELLED'])
  appliedAt: z.date(),
  updatedAt: z.date(),
});
export type Participation = z.infer<typeof ParticipationSchema>;
```

#### 不変条件
- 同一イベントへの二重申込禁止（`eventId` × `accountId` のユニーク）
- 申し込みは公開済みイベントのみ対象
- 承認できるのは APPLIED 状態のみ
- キャンセルできるのは APPLIED/APPROVED 状態のみ
- WAITLISTED からの繰り上げは APPROVED へ遷移

#### 状態遷移
- (new) → APPLIED: ApplyForEvent（capacity > 0 時）
- (new) → WAITLISTED: ApplyForEvent（capacity = 0 時・SAME-TX WHEN 分岐）
- APPLIED → APPROVED: ApproveParticipations
- APPROVED → CANCELLED: CancelParticipation
- APPLIED → CANCELLED: CancelParticipation
- WAITLISTED → APPROVED: PromoteWaitlistEntry

---

### CheckIn

- コンテキスト: `checkin`
- 関連シナリオ: `参加者がチェックインする`

#### 属性（Zod）

```ts
export const CheckInSchema = z.object({
  id: CheckInIdSchema,
  participationId: ParticipationIdSchema,
  eventId: EventIdSchema,
  accountId: AccountIdSchema,
  checkedInAt: z.date(),
});
export type CheckIn = z.infer<typeof CheckInSchema>;
```

#### 不変条件
- チェックインできるのは APPROVED 状態の Participation のみ
- 1 Participation につき 1 CheckIn のみ（重複不可）

#### 状態遷移
- CHECKED_IN（作成時に完了状態・単一状態）

---

### Notification

- コンテキスト: `notification`
- 関連シナリオ: `通知コンテキストが承認通知を送信する`, `リマインダーを送信する`, `アンケートを送信する`, `中止通知を送信する`, `主催者通知を送信する`, `繰り上げ通知を送信する`

#### 属性（Zod）

```ts
export const NotificationSchema = z.object({
  id: NotificationIdSchema,
  type: NotificationTypeSchema, // z.enum(['APPROVAL','REMINDER','SURVEY','EVENT_CANCELLED','PARTICIPANT_CANCELLED','WAITLIST_PROMOTED'])
  recipientId: AccountIdSchema,
  payload: z.string(),
  sentAt: z.date(),
});
export type Notification = z.infer<typeof NotificationSchema>;
```

#### 不変条件
- `type` は 6 種類のいずれか（列挙子で制約）
- `recipientId` は必須（通知先が不明な通知は作成不可）
- 生成後は不変（監査ログ）

#### 状態遷移
- SENT（生成時に完了状態・単一状態。将来 QUEUED / FAILED / RETRYING を追加する余地）

---

## 6) リードモデル候補

### GetEventDetails（イベント詳細）
- **利用者**: 参加者（`参加者が参加申し込みをする` SCENARIO）
- **目的**: 申し込み前にイベント詳細（公開状態・開催日時・定員状況）を確認する
- **ソース**: Event（event BC）
- **算出**: status=PUBLISHED のイベントのみ取得、`EventId` による単一集約ルックアップ ＋ 公開状態のみフィルタ

### GetApplicationList（申し込み一覧）
- **利用者**: 主催者（`主催者が参加申し込みを一括承認する` SCENARIO）
- **目的**: 承認待ち申し込みを一覧で確認し、一括承認対象を選ぶ
- **ソース**: Participation（participation BC）
- **算出**: status=APPLIED でフィルタ、申し込み日時昇順

### GetRemainingCapacity（残席数）
- **利用者**: `参加者が参加申し込みをする` SCENARIO（capacity > 0 / = 0 の WHEN 分岐判定）
- **目的**: 定員 − 承認済み参加者数 = 残席数を計算し、SAME-TX で APPLIED／WAITLISTED を切り替える
- **ソース**: Event BC（`capacity`）＋ Participation BC（APPROVED件数）
- **算出**: `capacity - COUNT(participations WHERE status=APPROVED)`

### AllApprovedParticipations（全承認済み参加者）
- **利用者**: `SendReminder` POLICY、`SendSurveyOnClose` POLICY
- **目的**: BULK 通知（リマインダー・アンケート）の送信対象者を取得
- **ソース**: Participation（participation BC）
- **算出**: status=APPROVED でフィルタ

### AllActiveParticipations（全アクティブ参加者）
- **利用者**: `NotifyEventCancelled` POLICY
- **目的**: 中止通知の対象を承認済み＋キャンセル待ちで横断取得
- **ソース**: Participation（participation BC）
- **算出**: status IN (APPROVED, WAITLISTED) でフィルタ

### NextWaitlistedParticipation（次のキャンセル待ち先頭）
- **利用者**: `PromoteFromWaitlist` POLICY
- **目的**: キャンセル待ちの先頭を取得して繰り上げ対象を決める
- **ソース**: Participation（participation BC）
- **算出**: status=WAITLISTED でフィルタ、登録日時昇順の先頭 1 件

### FindUpcomingEvents（開催日接近イベント）
- **利用者**: `システムが開催日接近を検知する` SCENARIO（EventDateApproached の発火対象選定）
- **目的**: リマインダー送信ウィンドウに入った PUBLISHED イベントを列挙する
- **ソース**: Event（event BC）
- **算出**: status=PUBLISHED かつ `now + windowStartHours <= startsAt <= now + windowEndHours`

---

## 7) オープンクエスチョン

クローズ済み:
- [CLOSED] Q1. キャンセル待ちへの自動登録 vs 明示的登録 → 申込 SCENARIO 内の SAME-TX WHEN 分岐（新スキル仕様で POLICY から降格）
- [CLOSED] Q2. 承認モデルの粒度 → 一括承認（ApproveParticipations で複数件まとめて承認）
- [CLOSED] Q3（2026-04-18）. 通知 BC の扱い → **BC 昇格**（`notification` コンテキストを正式宣言）
- [CLOSED] Q4（2026-04-18）. `CommunityMember` の集約扱い → 別集約として宣言し、加入／承認／却下／脱退の 4 シナリオを追加
- [CLOSED] Q5（2026-04-18）. PRIVATE 加入承認フロー → `JoinCommunity` の WHEN 分岐（PUBLIC→MemberJoined / PRIVATE→MemberApplicationSubmitted）として表現
- [CLOSED] H1〜H7（前セッション）: DRAFT→PUBLISHED の分離・capacity の所有権・通知分離方針など

新規（2026-04-18）:
- [CLOSED] Q6（2026-04-18）. スケジューラー命名整合 → **コードを DML に揃える（A 案）**。`backend/src/event/usecases/commands/send-reminders.command.ts` を `check-upcoming-events.command.ts` にリネームし、`SendRemindersCommand`→`CheckUpcomingEventsCommand`、`SendRemindersInput/Result`→`CheckUpcomingEventsInput/Result` に変更。戻り値は `processed`→`detected` にリネーム（検知件数を正確に表現）。実体の通知送信は POLICY `SendReminder` が担当する現構造を維持
- [CLOSED] Q7（2026-04-18）. 繰り上げ通知の分離 → **独立 POLICY 化**。`NotifyWaitlistPromotion` POLICY（TRIGGER `WaitlistPromoted` → CMD `SendWaitlistPromotionNotification` → EVT `WaitlistPromotionNotified`）として participation BC に追加、対応 SCENARIO を notification BC に追加
- [CLOSED] Q8（2026-04-18）. `NotifyOrganizer` の SCENARIO 所在 → **notification BC 内に SCENARIO を配置**（当初の doc 更新時点で既に追加済み。本日明示的にクローズ）
- [CLOSED] Q9（2026-04-18）. キャンセル待ち繰り上げの業務手順 → 繰り上げは `System` アクターによる独立 SCENARIO（`システムがキャンセル待ち先頭を繰り上げる`）として定義。繰り上げ本人への通知は `NotifyWaitlistPromotion` POLICY（Q7）でカバー。**主催者への副次通知は行わない**（ユーザー判断: 承認通知系とセマンティックが重複するため）

---

## 8) 次のアクション

### ドキュメント側

- [x] 新スキル仕様準拠（UPSTREAM / DOWNSTREAM・Zod スキーマ・用語集・notification BC 昇格・AutoWaitlistIfFull の WHEN 化）
- [ ] Q6〜Q8 を次セッションで解消

### コード側（本ドキュメント末尾の『コード変更計画』を参照）

- [ ] フェーズ1: `backend/src/notification/` ディレクトリ新設（BC 昇格）＋ 既存 `NotificationRepository` 移設
- [ ] フェーズ2: `AutoWaitlistIfFull` の WHEN 分岐実装（既存 `apply-for-event.command.ts` が SAME-TX になっているか確認して整合）
- [ ] フェーズ4: `NotifyWaitlistPromotion` POLICY 実装（Event Bus に `WaitlistPromoted` 追加 ＋ notification BC に UseCase 作成）
- [ ] フェーズ5: `NotifyOrganizer` UseCase 化（`notify-organizer.usecase.ts` を notification BC に作成）
- [ ] フェーズ3: `SendRemindersCommand` → `CheckUpcomingEventsCommand` リネーム（Q6 確定）

---

## 9) DML

```dml
# ================================
# コンテキスト宣言
# ================================

CONTEXT community
  LANGUAGE    Community       = "同じ興味・目的を持つメンバーが集まるグループ"
  LANGUAGE    CommunityMember = "コミュニティへの加入メンバー（OWNER/ADMIN/MEMBER × PENDING/ACTIVE）"
  MODULE      community
  UPSTREAM    (none)
  DOWNSTREAM  event           # Customer-Supplier。CommunityId を event が参照

CONTEXT event
  LANGUAGE    Event = "主催者が企画・運営するミートアップイベント"
  MODULE      event
  UPSTREAM    community       # Customer-Supplier
  DOWNSTREAM  participation   # Customer-Supplier。EventId を participation が参照
  DOWNSTREAM  notification    # Customer-Supplier。イベント系通知を受信

CONTEXT participation
  LANGUAGE    Participation = "参加申し込みエントリー（event BC の Event に対する申込 1 件）"
  MODULE      participation
  UPSTREAM    event           # Customer-Supplier
  DOWNSTREAM  checkin         # Customer-Supplier。Participation を checkin が参照
  DOWNSTREAM  notification    # Customer-Supplier。参加系通知を受信

CONTEXT checkin
  LANGUAGE    CheckIn = "当日の来場確認・出席記録"
  MODULE      checkin
  UPSTREAM    participation   # Customer-Supplier
  DOWNSTREAM  (none)

CONTEXT notification
  LANGUAGE    Notification = "送信済み通知の監査ログ（APPROVAL/REMINDER/SURVEY/EVENT_CANCELLED/PARTICIPANT_CANCELLED/WAITLIST_PROMOTED）"
  MODULE      notification
  UPSTREAM    event           # Customer-Supplier。EventClosed/EventCancelled/EventDateApproached を受信
  UPSTREAM    participation   # Customer-Supplier。ParticipationApproved/Cancelled/WaitlistPromoted を受信
  DOWNSTREAM  (none)

# ================================
# community
# ================================

SCENARIO 主催者がコミュニティを作成する
  ACTOR Organizer
  CMD   CreateCommunity
  EVT   CommunityCreated
  AGG   Community
  # コミュニティ名はシステム全体でユニーク
  RULE  community name must be unique system-wide
  # オーナー（CommunityMember role=OWNER）は必ず同時作成される
  RULE  owner member must be created together with community
  ERR   duplicateName → DuplicateCommunityNameError

SCENARIO メンバーがコミュニティに参加する
  ACTOR Member
  CMD   JoinCommunity
  AGG   CommunityMember
  # 既参加でないこと
  RULE  user must not already be a member of the community
  ERR   alreadyMember → AlreadyMemberError
  # PUBLIC は即 ACTIVE、PRIVATE は PENDING で主催者承認を待つ
  WHEN  visibility = PUBLIC  → EVT MemberJoined
  WHEN  visibility = PRIVATE → EVT MemberApplicationSubmitted

SCENARIO 主催者がメンバー申請を承認する
  ACTOR Organizer
  CMD   ApproveMember
  EVT   MemberApproved
  AGG   CommunityMember
  # PENDING 状態であること
  RULE  member must be in PENDING status
  ERR   alreadyActive → MemberAlreadyActiveError

SCENARIO 主催者がメンバー申請を却下する
  ACTOR Organizer
  CMD   RejectMember
  EVT   MemberRejected
  AGG   CommunityMember
  # 対象メンバーが存在すること（PENDING レコードの物理削除で表現）
  RULE  target member must exist
  ERR   memberNotFound → MemberNotFoundError

SCENARIO メンバーがコミュニティから脱退する
  ACTOR Member
  CMD   LeaveCommunity
  EVT   MemberLeft
  AGG   CommunityMember
  # オーナーは脱退不可
  RULE  owner cannot leave the community
  ERR   ownerCannotLeave → OwnerCannotLeaveError

# ================================
# event
# ================================

SCENARIO 主催者がイベントを作成する
  ACTOR Organizer
  CMD   CreateEvent
  EVT   EventCreated
  AGG   Event
  # 定員は 1〜1000 の整数
  RULE  capacity must be positive integer within [1, 1000]
  # 開催日時は未来であること
  RULE  startsAt must be in the future at creation time
  # 終了時刻は開始時刻より後であること
  RULE  endsAt must be after startsAt
  ERR   invalidCapacity     → InvalidCapacityError
  ERR   eventDateInPast     → EventDateInPastError
  ERR   eventEndBeforeStart → EventEndBeforeStartError

SCENARIO 主催者がイベントを公開する
  ACTOR Organizer
  CMD   PublishEvent
  EVT   EventPublished
  AGG   Event
  # 下書き状態であること
  RULE  event must be in DRAFT status
  ERR   alreadyPublished → EventAlreadyPublishedError

SCENARIO 主催者がイベントを編集する
  ACTOR Organizer
  CMD   UpdateEvent
  EVT   EventUpdated
  AGG   Event
  # DRAFT または PUBLISHED 状態であること（CANCELLED・CLOSED は不可）
  RULE  event must be in DRAFT or PUBLISHED status
  ERR   notEditable → EventNotEditableError

SCENARIO 主催者がイベントをクローズする
  ACTOR Organizer
  CMD   CloseEvent
  EVT   EventClosed
  AGG   Event
  # 公開済みであること（当日終了後にクローズ）
  RULE  event must be in PUBLISHED status
  ERR   notHeld → EventNotYetHeldError
  POL   SendSurveyOnClose

# イベントクローズ時：全承認済み参加者にアンケート送信
POLICY SendSurveyOnClose
  TRIGGER  EventClosed
  QRY      AllApprovedParticipations
  CMD      SendSurvey
  BULK     true
  EVT      SurveySent

SCENARIO 主催者がイベントを中止する
  ACTOR Organizer
  CMD   CancelEvent
  EVT   EventCancelled
  AGG   Event
  # 公開中・開催前であること
  RULE  event must be in PUBLISHED status and not yet occurred
  ERR   alreadyOccurred → EventAlreadyOccurredError
  POL   NotifyEventCancelled

# イベント中止時：参加確定者＋キャンセル待ち者の全員に中止通知
POLICY NotifyEventCancelled
  TRIGGER  EventCancelled
  QRY      AllActiveParticipations
  CMD      SendCancellationNotification
  BULK     true
  EVT      CancellationNotificationSent

SCENARIO システムが開催日接近を検知する
  ACTOR System
  QRY   FindUpcomingEvents
  CMD   CheckUpcomingEvents
  EVT   EventDateApproached
  AGG   Event
  # 公開中イベントのみ対象
  RULE  event must be in PUBLISHED status
  POL   SendReminder

# 開催日接近時：全承認済み参加者にリマインダー送信
POLICY SendReminder
  TRIGGER  EventDateApproached
  QRY      AllApprovedParticipations
  CMD      SendReminderNotification
  BULK     true
  EVT      ReminderSent

# ================================
# participation
# ================================

SCENARIO 参加者が参加申し込みをする
  ACTOR Member
  QRY   GetRemainingCapacity
  CMD   ApplyForEvent
  AGG   Participation
  # 公開済みのイベントであること
  RULE  event must be in PUBLISHED status
  # 同一イベントへの二重申込禁止
  RULE  user must not have existing participation for same event
  ERR   eventNotPublished      → EventNotAvailableError
  ERR   duplicateParticipation → AlreadyAppliedError
  # 定員内なら APPLIED、超過なら WAITLISTED（SAME-TX）
  WHEN  capacity > 0 → EVT ParticipationApplied
  WHEN  capacity = 0 → EVT ParticipationWaitlisted

SCENARIO 主催者が参加申し込みを一括承認する
  ACTOR Organizer
  QRY   GetApplicationList
  CMD   ApproveParticipations
  EVT   ParticipationApproved
  AGG   Participation
  # 対象はすべて APPLIED 状態であること
  RULE  all participations must be in APPLIED status
  ERR   invalidStatus → InvalidStatusTransitionError
  POL   SendApprovalOnApproved

# 承認後：参加者に確定通知を送信
POLICY SendApprovalOnApproved
  TRIGGER  ParticipationApproved
  CMD      SendApprovalNotification
  EVT      ApprovalNotificationSent

SCENARIO 参加者が参加をキャンセルする
  ACTOR Member
  CMD   CancelParticipation
  EVT   ParticipationCancelled
  AGG   Participation
  # APPLIED または APPROVED 状態であること
  RULE  participation must be in APPLIED or APPROVED status
  ERR   invalidStatus → InvalidStatusTransitionError
  POL   PromoteFromWaitlist
  POL   NotifyOrganizerOnCancel

# キャンセル時：キャンセル待ちの先頭を繰り上げ
POLICY PromoteFromWaitlist
  TRIGGER  ParticipationCancelled
  QRY      NextWaitlistedParticipation
  CMD      PromoteWaitlistEntry
  EVT      WaitlistPromoted

# 繰り上げ本体（POLICY PromoteFromWaitlist から起動される System コマンド）
SCENARIO システムがキャンセル待ち先頭を繰り上げる
  ACTOR System
  CMD   PromoteWaitlistEntry
  EVT   WaitlistPromoted
  AGG   Participation
  # WAITLISTED 状態であること
  RULE  participation must be in WAITLISTED status
  ERR   invalidStatus → InvalidStatusTransitionError
  POL   NotifyWaitlistPromotion

# 繰り上げ確定後：繰り上がった本人に確定通知を送信
POLICY NotifyWaitlistPromotion
  TRIGGER  WaitlistPromoted
  CMD      SendWaitlistPromotionNotification
  EVT      WaitlistPromotionNotified

# キャンセル時：主催者へ通知
POLICY NotifyOrganizerOnCancel
  TRIGGER  ParticipationCancelled
  CMD      NotifyOrganizer
  EVT      OrganizerNotifiedOnCancel

# ================================
# checkin
# ================================

SCENARIO 参加者がチェックインする
  ACTOR Member
  CMD   CheckIn
  EVT   CheckedIn
  AGG   CheckIn
  # 参加確定済みであること
  RULE  participation must be in APPROVED status
  # 1 Participation につき 1 CheckIn のみ
  RULE  at most one check-in per participation
  ERR   notApproved      → ParticipationNotApprovedError
  ERR   alreadyCheckedIn → CheckInAlreadyExistsError

# ================================
# notification
# ================================

SCENARIO 通知コンテキストが承認通知を送信する
  ACTOR System
  CMD   SendApprovalNotification
  EVT   ApprovalNotificationSent
  AGG   Notification
  # 通知タイプは APPROVAL
  RULE  notification type must be APPROVAL

SCENARIO 通知コンテキストがリマインダーを送信する
  ACTOR System
  CMD   SendReminderNotification
  EVT   ReminderSent
  AGG   Notification
  # 通知タイプは REMINDER
  RULE  notification type must be REMINDER

SCENARIO 通知コンテキストがアンケートを送信する
  ACTOR System
  CMD   SendSurvey
  EVT   SurveySent
  AGG   Notification
  # 通知タイプは SURVEY
  RULE  notification type must be SURVEY

SCENARIO 通知コンテキストが中止通知を送信する
  ACTOR System
  CMD   SendCancellationNotification
  EVT   CancellationNotificationSent
  AGG   Notification
  # 通知タイプは EVENT_CANCELLED
  RULE  notification type must be EVENT_CANCELLED

SCENARIO 通知コンテキストが主催者通知を送信する
  ACTOR System
  CMD   NotifyOrganizer
  EVT   OrganizerNotifiedOnCancel
  AGG   Notification
  # 通知タイプは PARTICIPANT_CANCELLED
  RULE  notification type must be PARTICIPANT_CANCELLED

SCENARIO 通知コンテキストが繰り上げ通知を送信する
  ACTOR System
  CMD   SendWaitlistPromotionNotification
  EVT   WaitlistPromotionNotified
  AGG   Notification
  # 通知タイプは WAITLIST_PROMOTED
  RULE  notification type must be WAITLIST_PROMOTED
```

---

## 10) 用語集

日本語フロー図ラベルと英語 DML 識別子の対応一覧。新しい CMD / EVT / POLICY / Actor を追加したら必ず本表を更新する。

### アクター
| 日本語（フロー図） | 英語（DML） | 備考 |
|------|------|------|
| 主催者 | Organizer | コミュニティ／イベントの作成・運営 |
| メンバー | Member | コミュニティ加入・参加申し込み・チェックイン |
| 参加者 | Member | フロー図上の別表記。DML 上は `Member` |
| システム | System | スケジューラ・ポリシーなど自動実行 |

### コマンド
| 日本語（フロー図） | 英語（DML） | 備考 |
|------|------|------|
| コミュニティを作成する | CreateCommunity | |
| コミュニティに参加する | JoinCommunity | PUBLIC / PRIVATE で WHEN 分岐 |
| メンバーを承認する | ApproveMember | PENDING→ACTIVE |
| メンバーを却下する | RejectMember | PENDING レコード物理削除 |
| コミュニティから脱退する | LeaveCommunity | OWNER 不可 |
| イベントを作成する | CreateEvent | |
| イベントを公開する | PublishEvent | DRAFT→PUBLISHED |
| イベントを編集する | UpdateEvent | DRAFT / PUBLISHED のみ |
| イベントをクローズする | CloseEvent | PUBLISHED→CLOSED |
| イベントを中止する | CancelEvent | PUBLISHED→CANCELLED |
| 参加を申し込む | ApplyForEvent | WHEN 分岐で WAITLISTED 対応 |
| 参加を承認する | ApproveParticipations | BULK |
| 参加をキャンセルする | CancelParticipation | |
| キャンセル待ちを繰り上げる | PromoteWaitlistEntry | WAITLISTED→APPROVED |
| チェックインする | CheckIn | |
| 承認通知を送る | SendApprovalNotification | |
| リマインダーを送る | SendReminderNotification | BULK |
| アンケートを送る | SendSurvey | BULK |
| 中止を通知する | SendCancellationNotification | BULK |
| 主催者に通知する | NotifyOrganizer | |
| 繰り上げを通知する | SendWaitlistPromotionNotification | |
| 開催日接近を検知する | CheckUpcomingEvents | スケジューラ起動 |

### イベント
| 日本語（フロー図） | 英語（DML） | 備考 |
|------|------|------|
| コミュニティが作成された | CommunityCreated | |
| メンバーが加入した | MemberJoined | PUBLIC 分岐 |
| 加入申請が提出された | MemberApplicationSubmitted | PRIVATE 分岐 |
| メンバーが承認された | MemberApproved | |
| メンバー申請が却下された | MemberRejected | |
| メンバーが脱退した | MemberLeft | |
| イベントが作成された | EventCreated | |
| イベントが公開された | EventPublished | |
| イベントが編集された | EventUpdated | |
| イベントがクローズされた | EventClosed | |
| イベントが中止された | EventCancelled | |
| 開催日が近づいた | EventDateApproached | スケジューラ発火 |
| 参加申し込みが完了した | ParticipationApplied | capacity > 0 分岐 |
| キャンセル待ちに登録された | ParticipationWaitlisted | capacity = 0 分岐 |
| 参加が確定した | ParticipationApproved | |
| 参加がキャンセルされた | ParticipationCancelled | |
| 繰り上がりが確定した | WaitlistPromoted | WAITLISTED→APPROVED |
| 繰り上げ通知が送信された | WaitlistPromotionNotified | |
| チェックインが完了した | CheckedIn | |
| 承認通知が送信された | ApprovalNotificationSent | |
| リマインダーが送信された | ReminderSent | |
| アンケートが送信された | SurveySent | |
| 中止が全参加者に通知された | CancellationNotificationSent | |
| 主催者にキャンセルが通知された | OrganizerNotifiedOnCancel | |

### ポリシー
| 日本語（フロー図） | 英語（DML） | 備考 |
|------|------|------|
| クローズ後アンケート送信 | SendSurveyOnClose | EVENTUAL |
| イベント中止通知 | NotifyEventCancelled | EVENTUAL / BULK |
| 承認通知 | SendApprovalOnApproved | EVENTUAL |
| キャンセル繰り上げ | PromoteFromWaitlist | EVENTUAL |
| 繰り上げ通知 | NotifyWaitlistPromotion | EVENTUAL |
| 参加キャンセル通知 | NotifyOrganizerOnCancel | EVENTUAL |
| リマインダー | SendReminder | EVENTUAL / BULK |

### リードモデル
| 日本語（フロー図） | 英語（DML） | 備考 |
|------|------|------|
| イベント詳細 | GetEventDetails | 単一ルックアップ（公開状態フィルタ含む） |
| 申し込み一覧 | GetApplicationList | status=APPLIED |
| 残席数 | GetRemainingCapacity | capacity − 承認数 |
| 承認済み参加者 | AllApprovedParticipations | BULK 通知用 |
| アクティブ参加者 | AllActiveParticipations | 中止通知用 |
| 次のキャンセル待ち | NextWaitlistedParticipation | 先頭 1 件 |
| 開催日接近イベント | FindUpcomingEvents | スケジューラ用 |

---

## 11) コード変更計画

本セクションは本セッション（2026-04-18）で策定した、DML と実装の整合を取るためのコード変更計画。

### 方針

- **ハイブリッド（C）**: DML に実装分（`CommunityMember` 関連・`notification` BC・PRIVATE 承認・WAITLISTED）を追記済み。コードは DML に合わせて**命名と配置の整合**を取る方向で最小変更
- 既存機能の意味を変える変更（アルゴリズム・受入基準）は含めない
- フェーズを分けて段階的に適用し、各フェーズでテスト・`d bash -c "cd backend && npm run review"` 合格を必須

### フェーズ 1: `notification` BC の昇格（構造整合）

#### 変更対象

| 項目 | 変更内容 |
|------|---------|
| ディレクトリ新設 | `backend/src/notification/` を新設（`models/` `repositories/` `usecases/` `composition.ts`） |
| Repository 移設 | `backend/src/event/repositories/notification.repository.ts` を `backend/src/notification/repositories/notification.repository.ts` に移動 |
| Repository 移設 | `backend/src/participation/repositories/prisma-notification.repository.ts` を `backend/src/notification/repositories/prisma-notification.repository.ts` に統合（同一実装のため 1 本化） |
| Path alias 追加 | `tsconfig.json` に `@notification/*` を追加、`vitest.config.ts` も同様に |
| Import 更新 | event BC・participation BC の composition で `@notification/repositories/...` 経由に変更 |
| Aggregate 定義 | `backend/src/notification/models/notification.ts` ＋ `notification.schema.ts`（セクション 5 の Zod を正準定義として配置） |
| `NotificationType` 単一化 | 現在 Prisma 生成型を直接参照しているが、Zod enum を正準として `NotificationTypeSchema` を定義 |

#### 影響

- event / participation BC から通知 Repository への直接参照を削除。代わりに `NotificationRepository` を composition で注入
- 既存テスト（`scheduler.e2e.test.ts` など）のモックパスが変わる
- Prisma スキーマ（`backend/prisma/schema/notification/notification.prisma`）は現状維持

#### リスク

- import パス差し替えの漏れ → `d bash -c "cd backend && npx tsc --noEmit"` で検出
- 循環依存の可能性 → `event → notification`, `participation → notification` は一方向で問題なし

---

### フェーズ 2: `ApplyForEvent` の WHEN 分岐整合

#### 確認事項

現実装 `backend/src/participation/usecases/commands/apply-for-event.command.ts` が

- (a) 現 DML の POLICY `AutoWaitlistIfFull` 相当として**別 UseCase で WAITLISTED を発行している**のか、
- (b) すでに UseCase 内部で capacity をチェックして APPLIED / WAITLISTED の分岐を**同一トランザクションで**行っているのか、

を読み取り、後者なら命名だけ確認すれば完了。前者なら SAME-TX 化が必要。

#### 想定変更（前者の場合のみ）

- `apply-for-event.command.ts` 内で `GetRemainingCapacity` を呼び、`capacity > 0 ? APPLIED : WAITLISTED` を単一 Repository トランザクションで確定
- `waitlistParticipation` 関数（`participation/models/participation.ts`）はそのまま残し、`apply-for-event` からも利用可能にする
- 既存の E2E テストが「定員超過時に WAITLISTED になる」を検証していることを確認

---

### フェーズ 3: `CheckUpcomingEvents` への命名整合（Q6 クローズ反映）

Q6 方針: **コードを DML に揃える（A 案）**。

#### 変更対象

| 項目 | 変更内容 |
|------|---------|
| ファイル名 | `backend/src/event/usecases/commands/send-reminders.command.ts` → `check-upcoming-events.command.ts` |
| 型名 | `SendRemindersCommand` → `CheckUpcomingEventsCommand` |
| 型名 | `SendRemindersInput` → `CheckUpcomingEventsInput`（フィールド `windowStartHours`・`windowEndHours` はそのまま） |
| 型名 | `SendRemindersResult` → `CheckUpcomingEventsResult`（フィールド `processed` → `detected` に変更：検知件数を正確に表現） |
| ファクトリ名 | `createSendRemindersCommand` → `createCheckUpcomingEventsCommand` |
| 呼び出し元 | `backend/src/event/composition.ts`、`backend/src/event/controllers/*.ts`（スケジューラーエンドポイント・E2E テスト） |
| テスト | `backend/src/event/controllers/__tests__/scheduler.e2e.test.ts` の import・アサート文言を更新 |

#### 注意

- 機能面の変更はなし（`EventDateApproached` publish ＋ POLICY `SendReminder` による非同期通知送信の構造は維持）
- リネームに伴う import 修正は `d bash -c "cd backend && npx tsc --noEmit"` で検出
- スケジューラー起動エンドポイント（REST）のパス名が `/events/send-reminders` などになっているなら `/events/check-upcoming` のようなリネームも検討（API 破壊変更になるため別 Issue）

---

### 現 Reminder 送信処理の責務分離確認（フェーズ 3 補足）

- `CheckUpcomingEventsCommand`（検知＋ publish のみ、event BC）
- POLICY `SendReminder`（購読＋ `AllApprovedParticipations` 取得＋通知送信、notification BC に UseCase として移設）
- フェーズ 1（notification BC 昇格）完了後は、POLICY の通知送信部分を `send-reminder-notification.usecase.ts` に切り出す

---

### フェーズ 4: `NotifyWaitlistPromotion` POLICY の実装（Q7/Q9 クローズ反映）

#### 変更対象

| 項目 | 変更内容 |
|------|---------|
| Event Bus 拡張 | `backend/src/shared/domain-events.ts` の `MeetupDomainEvent` に `WaitlistPromoted` イベントを追加（`participationId` `eventId` `accountId`） |
| Publisher 追加 | `participation/usecases/commands` 内の繰り上げ処理（`cancel-participation.command.ts` か専用 usecase）で WAITLISTED→APPROVED 遷移時に `WaitlistPromoted` を publish |
| Subscriber 追加 | `participation/composition.ts` か `notification/composition.ts` で `WaitlistPromoted` にサブスクライブし、`NotificationRepository.saveMany([{ type: 'WAITLIST_PROMOTED', recipientId: accountId, payload }])` を呼ぶ |
| UseCase 配置 | notification BC 側に `send-waitlist-promotion-notification.usecase.ts` を作成（`SendApprovalNotification` など他通知と同一パターン） |
| E2E テスト | 「キャンセル発生→先頭者が APPROVED に繰り上がる→WAITLIST_PROMOTED 通知レコードが作成される」を検証するテストを追加 |

#### 注意

- 主催者への通知は行わない（Q9 確定方針）
- 繰り上げ失敗時（例: WAITLISTED 対象なし）は POLICY 発火条件（`WaitlistPromoted` イベント）が成立しないため通知も発生しない。追加の例外処理は不要

---

### フェーズ 5: `NotifyOrganizer` の UseCase 整合（Q8 クローズ反映）

#### 変更対象

| 項目 | 変更内容 |
|------|---------|
| UseCase 配置 | notification BC 側に `notify-organizer.usecase.ts` を作成（他通知と同一パターン）。POLICY 内直書きから UseCase 呼び出しに昇格 |
| Subscriber 移設 | `participation/composition.ts` の `NotifyOrganizerOnCancel` サブスクライバ内で UseCase を呼ぶ形に変更（現状が Repository 直書きなら） |

#### 注意

- 既に notification BC には SCENARIO が DML に定義済み。実装は 1 ファイル追加のみで整合
- 影響範囲は限定的。E2E テストは現状の「ParticipationCancelled 時に PARTICIPANT_CANCELLED レコードが作成される」を維持

---

### 実施順

全フェーズの判断が確定したため、下記順序で段階実施する:

1. **フェーズ 1（notification BC 昇格）** — 構造変更のみ、機能影響なし。最優先
2. **フェーズ 2（WHEN 分岐整合）** — 実装確認が先、差分があれば対応
3. **フェーズ 4（繰り上げ通知 POLICY 実装）** — フェーズ 1 完了後に実装（Q7/Q9 確定済）
4. **フェーズ 5（NotifyOrganizer UseCase 化）** — フェーズ 1 完了後に実装（Q8 確定済）
5. **フェーズ 3（`CheckUpcomingEvents` リネーム）** — 命名整合のみ。機能影響なし。最後にまとめて実施（Q6 確定済）

各フェーズ完了後に `d test` ＋ `d bash -c "cd backend && npm run review"` を走らせ、合格を確認する。

---

## 再開ポイント

- フェーズ: **完了（フェーズ6：全クエスチョンクローズ・コード変更計画確定）**
- クローズ済み: Q1〜Q9、H1〜H7（全件）
- 未解消: なし
- 次のアクション: コード変更計画（本ドキュメント §11）の **フェーズ 1（notification BC 昇格）** から順に実装着手
