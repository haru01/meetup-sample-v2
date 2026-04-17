# EventStorming 風味のドメインモデリング - ミートアップイベント

- Session: eventstorming-20260417-2009
- Domain: ミートアップイベント
- Status: **フェーズ6完了**（スキルの整合性チェック＋DML 出力フェーズまで完了）
- Scope: ドメインモデリングのみ。実装着手は別トラック
- Goal: 要件整理（仕様書・バックログ作成の前処理）

---

## 1) Happy Path Story

田中さんは、地域のエンジニアコミュニティで毎月ミートアップを主催している。今月のテーマは「生成AIの実践活用」に決めた。イベント管理ツールを開き、タイトル・開催日時・会場・定員30名・参加費無料を入力する。内容を確認してから公開ボタンを押すと、コミュニティメンバーへの案内が一斉に届いた。

公開から数時間のうちに、常連の鈴木さんをはじめ参加申し込みが次々と入ってくる。田中さんは申し込み一覧を開き、一人ひとりのプロフィールを確認しながら承認していく。承認が完了した参加者には確定通知が自動で届き、イベント前にはリマインダーも送られた。準備を整えながら当日を楽しみに待つ参加者の姿が目に浮かぶ。

イベント当日、30名が続々と会場に到着し、それぞれチェックインを完了させた。活発なトークセッションとネットワーキングが行われ、大盛況のうちに閉会した。

後片付けを終えた田中さんがクローズ操作をおこなうと、全参加者に自動でアンケートが送信された。参加者からの率直なフィードバックが集まり、次回の改善のヒントが見えてくる。こうして月次ミートアップはコミュニティとともに少しずつ成長していく。

---

## 2) 代替シナリオ

### シナリオA：定員超過・キャンセル待ち繰り上がり

参加申し込みのタイミングですでに定員30名が埋まっていた場合、参加者はキャンセル待ちとして登録される。その後、確定済み参加者からキャンセルが発生すると、キャンセル待ちの先頭から自動的に繰り上がり通知が届き、参加が確定する。

### シナリオB：参加者キャンセル

参加確定後に参加者が都合により参加をキャンセルすると、主催者に自動でキャンセル通知が届く。キャンセル待ちがいる場合は繰り上がり処理が走る。

### シナリオC：イベント中止

主催者が開催前にイベントを中止すると、参加確定済みの全参加者に中止通知が一括送信される。

---

## 3) Event Walkthrough

### ハッピーパス

:::diagram-svg event_flow
title: ハッピーパス — イベント企画から参加完了・クローズまで
flow:
|event|: 主催者がイベントを企画・公開する（主催者起動・同期TX）
  @主催者 > !イベントを作成する > [イベントが作成された] > !イベントを公開する > [イベントが公開された] >>
|participation|: 参加者が申し込む（EVENTUAL: 公開後・参加者起動）
  @参加者 > ?イベント詳細 > !参加を申し込む > [参加申し込みが完了した] >>
|participation|: 主催者が承認する（EVENTUAL: 申し込み後・主催者起動）
  @主催者 > !参加を承認する > [参加が確定した] >>
|checkin|: 参加者が当日チェックインする（EVENTUAL: 当日・参加者起動）
  @参加者 > !チェックインする > [チェックインが完了した] >>
|event|: 主催者がクローズする（主催者起動）
  @主催者 > !イベントをクローズする > [イベントがクローズされた] >>
|event|: アンケート自動送信（EVENTUAL: クローズ後・ポリシー起動）
  $クローズ後アンケート送信 > !アンケートを送信する > [アンケートが送信された]
:::

---

### 代替シナリオA：定員超過・キャンセル待ち繰り上がり

:::diagram-svg event_flow
title: 代替シナリオA — 定員超過・キャンセル待ち繰り上がり
flow:
|participation|: 定員超過時の申し込み（参加者起動・自動キャンセル待ち）
  @参加者 > ?イベント詳細 > !参加を申し込む > [参加申し込みが完了した] >> $定員超過自動キャンセル待ち > !キャンセル待ちに登録する > [キャンセル待ちに登録された] >>
|participation|: 確定済み参加者がキャンセルする（EVENTUAL: 参加者起動）
  @参加者 > !参加をキャンセルする > [参加がキャンセルされた] >>
|participation|: キャンセル待ち繰り上がり自動処理（EVENTUAL: ポリシー起動）
  $キャンセル繰り上げ > !キャンセル待ちを繰り上げる > [繰り上がりが通知された]
:::

---

### 代替シナリオB：参加者キャンセル

:::diagram-svg event_flow
title: 代替シナリオB — 参加者キャンセル
flow:
|participation|: 参加者がキャンセルする（参加者起動）
  @参加者 > !参加をキャンセルする > [参加がキャンセルされた] >>
|participation|: 主催者への通知（EVENTUAL: ポリシー起動）
  $参加キャンセル通知 > !主催者に通知する > [主催者にキャンセルが通知された]
:::

---

### 代替シナリオC：イベント中止

:::diagram-svg event_flow
title: 代替シナリオC — イベント中止
flow:
|event|: 主催者がイベントを中止する（主催者起動）
  @主催者 > !イベントを中止する > [イベントが中止された] >>
|participation|: 全参加者への中止通知（EVENTUAL: ポリシー起動）
  $イベント中止通知 > !中止を通知する > [中止が全参加者に通知された]
:::

---

## 4) コンテキスト候補

### community（コミュニティ）
- 境界の理由: コミュニティ固有の識別・メンバーシップ管理はイベント運営と独立して変化する
- 含む集約: Community
- 含むシナリオ: 主催者がコミュニティを作成する、メンバーがコミュニティに参加する
- LANGUAGE: `Community` — このBCでの意味: 同じ興味・目的を持つメンバーが集まるグループ

### event（イベント）
- 境界の理由: イベントの状態（DRAFT/PUBLISHED/CLOSED/CANCELLED）と定員管理は単一の責務として凝集できる
- 含む集約: Event
- 含むシナリオ: 主催者がイベントを作成する、公開する、編集する、クローズする、中止する
- LANGUAGE: `Event` — このBCでの意味: 主催者が企画・運営するミートアップイベント本体

### participation（参加管理）
- 境界の理由: イベント本体（event BC の Event）とは別に、申し込み1件ごとの状態遷移（APPLIED/APPROVED/WAITLISTED/CANCELLED）を独立して管理する必要がある
- 含む集約: Participation
- 含むシナリオ: 参加者が申し込む、主催者が一括承認する、参加者がキャンセルする
- LANGUAGE: `Participation` — このBCでの意味: 参加申し込みエントリー（event BC の Event に対する申込 1 件）

### checkin（チェックイン）
- 境界の理由: 当日の来場確認は参加管理・イベント管理と独立したライフサイクルを持つ（当日限定・物理的な操作）
- 含む集約: CheckIn
- 含むシナリオ: 参加者がチェックインする
- LANGUAGE: `CheckIn` — このBCでの意味: 当日の来場確認・出席記録

---

## 5) 集約候補

### Community
- コンテキスト: `community`
- 関連シナリオ: `主催者がコミュニティを作成する`, `メンバーがコミュニティに参加する`

#### 不変条件
- コミュニティ名はシステム全体でユニーク
- オーナー（主催者）は必ず存在する

#### 状態遷移
- ACTIVE（作成と同時にACTIVE）

---

### Event
- コンテキスト: `event`
- 関連シナリオ: `主催者がイベントを作成する`, `主催者がイベントを公開する`, `主催者がイベントを編集する`, `主催者がイベントをクローズする`, `主催者がイベントを中止する`

#### 不変条件
- 定員は正の整数
- 公開できるのはDRAFT状態のみ
- 編集できるのはDRAFT/PUBLISHED状態のみ
- 中止できるのは開催前（PUBLISHED）のみ
- クローズできるのは開催済み（当日チェックイン後）のみ

#### 状態遷移
- DRAFT → PUBLISHED: PublishEvent
- PUBLISHED → CLOSED: CloseEvent（開催済み後）
- PUBLISHED → CANCELLED: CancelEvent（開催前）

---

### Participation
- コンテキスト: `participation`
- 関連シナリオ: `参加者が参加申し込みをする`, `主催者が参加申し込みを一括承認する`, `参加者が参加をキャンセルする`

#### 不変条件
- 同一イベントへの二重申込禁止
- 申し込みは公開済みイベントのみ対象
- 承認できるのはAPPLIED状態のみ
- キャンセルできるのはAPPLIED/APPROVED状態のみ

#### 状態遷移
- APPLIED → APPROVED: ApproveParticipations
- APPLIED → WAITLISTED: AutoWaitlistIfFull（定員超過時）
- APPROVED → CANCELLED: CancelParticipation
- APPLIED → CANCELLED: CancelParticipation
- WAITLISTED → APPROVED: PromoteWaitlistEntry

---

### CheckIn
- コンテキスト: `checkin`
- 関連シナリオ: `参加者がチェックインする`

#### 不変条件
- チェックインできるのはAPPROVED状態の参加者のみ
- 1参加者につき1チェックインのみ（重複不可）

#### 状態遷移
- CHECKED_IN（チェックイン完了）

---

## 6) リードモデル候補

### GetApplicationList（申し込み一覧）
- **利用者**: 主催者（`主催者が参加申し込みを一括承認する` SCENARIO）
- **目的**: 承認待ち申し込みを一覧で確認し、一括承認対象を選ぶ
- **ソース**: Participation（participation BC）
- **算出**: status=APPLIED でフィルタ、申し込み日時昇順

### GetRemainingCapacity（残席数）
- **利用者**: `AutoWaitlistIfFull` ポリシー（capacity=0 か判断）
- **目的**: 定員 − 承認済み参加者数 = 残席数を計算してキャンセル待ちに移行するか判断
- **ソース**: Event BC（capacity）+ Participation BC（APPROVED件数）
- **算出**: `capacity - COUNT(participations WHERE status=APPROVED)`

### AllApprovedParticipations（全承認済み参加者）
- **利用者**: `SendReminder` ポリシー、`SendSurveyOnClose` ポリシー
- **目的**: BULK通知（リマインダー・アンケート）の送信対象者を取得
- **ソース**: Participation（participation BC）
- **算出**: status=APPROVED でフィルタ

### AllActiveParticipations（全アクティブ参加者）
- **利用者**: `NotifyEventCancelled` ポリシー
- **目的**: 中止通知の対象を承認済み＋キャンセル待ちで横断取得
- **ソース**: Participation（participation BC）
- **算出**: status IN (APPROVED, WAITLISTED) でフィルタ

### NextWaitlistedParticipation（次のキャンセル待ち先頭）
- **利用者**: `PromoteFromWaitlist` ポリシー
- **目的**: キャンセル待ちの先頭を取得して繰り上げ対象を決める
- **ソース**: Participation（participation BC）
- **算出**: status=WAITLISTED でフィルタ、登録日時昇順の先頭 1 件

---

## 7) オープンクエスチョン

クローズ済み:
- [CLOSED] Q1. キャンセル待ちへの自動登録 vs 明示的登録 → 自動移行（AutoWaitlistIfFullポリシーで処理）
- [CLOSED] Q2. 承認モデルの粒度 → 一括承認（ApproveParticipationsで複数件まとめて承認）
- [CLOSED] H1. CreateEvent/PublishEventは別操作か → 別操作。DRAFT保存→後から公開。公開後も編集可能
- [CLOSED] H2. capacity所有権 → Event集約が定員を所有
- [CLOSED] H3. 承認通知とリマインダーは1ポリシーか別か → 別ポリシー（通知種類が増える・独立再試行必要）
- [CLOSED] H4. リマインダートリガー → スケジューラー起動（EventDateApproached / イベント前日）
- [CLOSED] H5. 繰り上がり通知の分離 → PromoteFromWaitlistに包含
- [CLOSED] H6. 中止通知の対象範囲 → 承認済み＋キャンセル待ちの全員（AllActiveParticipations）
- [CLOSED] H7. 通知BCへの分離 → 現状は各BCのポリシーのまま（将来の通知量増加時に再検討）

---

## 8) 次のアクション

- バックログ化：各SCENARIOを1ユーザーストーリーに変換（11件）
- API設計：CMD → REST/gRPC エンドポイントへのマッピング
- 実装優先度：ハッピーパス（event + participation + checkin）から着手し、通知系は後回し
- 要検討：通知BCへの分離タイミング（通知種類が3〜4種になった時点で再評価）

---

## 9) DML

```dml
# ================================
# コンテキスト宣言
# ================================

CONTEXT community
  LANGUAGE  Community = "同じ興味・目的を持つメンバーが集まるグループ"
  MODULE    community

CONTEXT event
  LANGUAGE  Event    = "主催者が企画・運営するミートアップイベント"
  MODULE    event

CONTEXT participation
  LANGUAGE  Event    = "参加申し込みの対象となるエントリー"
  MODULE    participation

CONTEXT checkin
  LANGUAGE  CheckIn  = "当日の来場確認・出席記録"
  MODULE    checkin

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
  # オーナーは必ず存在する
  RULE  owner must always exist
  ERR   duplicateName → DuplicateCommunityNameError

SCENARIO メンバーがコミュニティに参加する
  ACTOR Member
  CMD   JoinCommunity
  EVT   MemberJoined
  AGG   Community
  # 公開コミュニティであること
  RULE  community must be publicly accessible
  # 既参加でないこと
  RULE  user must not already be a member
  ERR   alreadyMember → AlreadyMemberError

# ================================
# event
# ================================

SCENARIO 主催者がイベントを作成する
  ACTOR Organizer
  CMD   CreateEvent
  EVT   EventCreated
  AGG   Event
  # 定員は正の整数
  RULE  capacity must be positive integer
  ERR   invalidCapacity → InvalidCapacityError

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
  # 開催済みであること
  RULE  event must have been held
  ERR   notHeld → EventNotYetHeldError
  POL   SendSurveyOnClose

SCENARIO 主催者がイベントを中止する
  ACTOR Organizer
  CMD   CancelEvent
  EVT   EventCancelled
  AGG   Event
  # 開催前であること
  RULE  event must not have already occurred
  ERR   alreadyOccurred → EventAlreadyOccurredError
  POL   NotifyEventCancelled

# イベントクローズ時：全参加者にアンケート送信
POLICY SendSurveyOnClose
  TRIGGER  EventClosed
  QRY      AllApprovedParticipations
  CMD      SendSurvey
  BULK     true
  TX       EVENTUAL
  EVT      SurveySent

# イベント中止時：参加確定者＋キャンセル待ち者の全員に中止通知
POLICY NotifyEventCancelled
  TRIGGER  EventCancelled
  QRY      AllActiveParticipations
  CMD      SendCancellationNotification
  BULK     true
  TX       EVENTUAL
  EVT      CancellationNotificationSent

# スケジューラーがイベント前日に EventDateApproached を発火 → 全承認済み参加者にリマインダー送信
# 発火源は event BC 外のスケジューラー基盤（本モデルではシステムトリガー扱い）
POLICY SendReminder
  TRIGGER  EventDateApproached
  QRY      AllApprovedParticipations
  CMD      SendReminder
  BULK     true
  TX       EVENTUAL
  EVT      ReminderSent

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
  ERR   notApproved → ParticipationNotApprovedError

# ================================
# participation
# ================================

SCENARIO 参加者が参加申し込みをする
  ACTOR Member
  QRY   GetEventDetails
  CMD   ApplyForEvent
  EVT   ParticipationApplied
  AGG   Participation
  # 公開済みのイベントであること
  RULE  event must be published
  # 同一イベントへの二重申込禁止
  RULE  user must not have existing participation for same event
  ERR   eventNotPublished → EventNotAvailableError
  ERR   duplicateParticipation → AlreadyAppliedError
  POL   AutoWaitlistIfFull

# 申し込み後：定員超過ならキャンセル待ちに自動移行
POLICY AutoWaitlistIfFull
  TRIGGER  ParticipationApplied
  QRY      GetRemainingCapacity
  WHEN     capacity = 0 → CMD WaitlistParticipation → EVT WaitlistJoined
  TX       SAME

SCENARIO 主催者が参加申し込みを一括承認する
  ACTOR Organizer
  QRY   GetApplicationList
  CMD   ApproveParticipations
  EVT   ParticipationApproved
  AGG   Participation
  # 対象はすべて申込済み（APPLIED）状態であること
  RULE  all participations must be in APPLIED status
  ERR   invalidStatus → InvalidStatusTransitionError
  POL   SendApprovalNotification

# 承認後：参加者に確定通知を送信
POLICY SendApprovalNotification
  TRIGGER  ParticipationApproved
  CMD      SendApprovalNotification
  TX       EVENTUAL
  EVT      ApprovalNotificationSent

SCENARIO 参加者が参加をキャンセルする
  ACTOR Member
  CMD   CancelParticipation
  EVT   ParticipationCancelled
  AGG   Participation
  # 申込済みまたは承認済み状態であること
  RULE  participation must be in APPLIED or APPROVED status
  ERR   invalidStatus → InvalidStatusTransitionError
  POL   PromoteFromWaitlist
  POL   NotifyOrganizerOnCancel

# 参加キャンセル時：キャンセル待ちを繰り上げ＋繰り上がり者へ通知（通知込み）
POLICY PromoteFromWaitlist
  TRIGGER  ParticipationCancelled
  QRY      NextWaitlistedParticipation
  CMD      PromoteWaitlistEntry
  TX       EVENTUAL
  EVT      WaitlistPromoted

# 参加キャンセル時：主催者へ通知
POLICY NotifyOrganizerOnCancel
  TRIGGER  ParticipationCancelled
  CMD      NotifyOrganizer
  TX       EVENTUAL
  EVT      OrganizerNotifiedOnCancel
```

---

## 再開ポイント

- フェーズ: **完了（フェーズ6）**
- 全ホットスポット・クエスチョンクローズ済み（H1〜H7、Q1〜Q2）
- 次のアクション: 実装タスクは本ドキュメントを正として別途バックログ化
