# DML（Domain Modeling Language）記法仕様

DDDモデリングのための情報圧縮ミニ言語。
EVT（起きた事実）を起点にして、CMD・AGG・RULE・ERR・POLをシナリオとして記述する。

**記法の原則**
- キーワード（SCENARIO, ACTOR, EVT, CMD, AGG, RULE, ERR, POL, POLICY, CONTEXT 等）は英語
- **SCENARIO名は日本語**で、アクター＋行為を書く（例：`SCENARIO 主催者がコミュニティを作成する`）
- **RULE / ERR の条件は英語**で書き、**日本語補足は上の行に `#` コメント**で分離する
- **POLICY の日本語補足**も上の行に `#` コメントで分離する
- **EVT / CMD / AGG** は英語のみ（キーワードで種別が伝わる）
- BC（CONTEXT）名は `lowercase-with-hyphen` 形式、略さずに書く

---

## BC・コンテキスト宣言

```dml
CONTEXT <lowercase-with-hyphen-name>
  LANGUAGE  <EnglishTerm> = "<この文脈での意味（日本語可）>"
  MODULE    <module-name>
```

`LANGUAGE` でユビキタス言語を定義する。
**同じ言葉が別CONTEXTで意味が違う場合、それぞれのCONTEXTで別々に定義する**。
この差異がBounded Context（BC）の境界を示す。

例：
```dml
CONTEXT community-events
  LANGUAGE  Event = "コミュニティが主催する集会・勉強会"
  MODULE    community-events

CONTEXT participation
  LANGUAGE  Event = "参加申込の対象となるエントリー"
  MODULE    participation
```

---

## シナリオ定義（EVT起点で書く）

```dml
SCENARIO <アクター>が<何をする>
  ACTOR <アクター名>
  QRY   QueryName            # 省略可。CMD発行前にアクターが参照するRead Model
  CMD   CommandName
  EVT   EventName
  AGG   AggregateName
  # <日本語で不変条件を説明>
  RULE  <invariant in English>
  ERR   <condition> → <ErrorType>
  POL   <PolicyName>
```

**集約が複数イベントを発火しうる場合（WHEN分岐）：**
コマンドの処理結果に応じて発火イベントが変わる場合、`EVT` の代わりに `WHEN` で分岐を書く。
後続ポリシーが分岐ごとに異なる場合は `→ POL` を inline で付ける：

```dml
SCENARIO システムが在庫を確保する
  ACTOR System
  CMD   ReserveInventory(orderId, items)
  AGG   Inventory
  # 確保数は在庫数以内
  RULE  reserved quantity must not exceed available stock
  WHEN  stock >= requested → EVT InventoryReserved    → POL ConfirmOrder
  WHEN  stock < requested  → EVT InventoryInsufficient → POL CancelOnOutOfStock
```

`WHEN` を使う場合、トップレベルの `EVT` と `POL` は省略する。

**SCENARIO名は日本語：** アクター（主催者/参加者/システム）＋行為を日本語で書く。
「誰が何をするシナリオか」が一目でわかり、BCの責務やユーザーロールとの対応も明確になる。

**ACTORは必須：** コマンドを発行するアクターを明記する。典型的な値は `Organizer`（主催者）、`Member`（参加者）、`System`（システム/ポリシー）。
Event Flow 図解やアクセス制御の設計で「誰がこの操作を行うか」が機械的に参照できる。

**RULE の日本語補足は上の行に分離：** インラインコメントではなく、RULE行の直前に `#` コメント行として書く。

**なぜEVT起点か？**
「起きた事実」から始めることで、実装の都合（コマンドの存在・APIの形）に引きずられず、
ビジネスの本質的な流れを先に把握できる。

---

## ポリシー定義（SCENARIOの直後・CONTEXT内に配置）

```dml
# <日本語でポリシーの目的を説明>
POLICY <Name>
  TRIGGER  EventName
  WHEN     <condition>             # 省略可。発火条件
  QRY      <QueryName>             # 省略可。事前にクエリが必要な場合
  CMD      CommandName
  BULK     true                    # × n の場合（省略時はfalse）
  TX       SAME | EVENTUAL
  EVT      EventName               # 省略可。このポリシーが生成するイベント
```

`TX: SAME` = 同じトランザクション内（強整合性）
`TX: EVENTUAL` = 別トランザクション（結果整合性）

### WHEN 分岐（条件による分岐）

QRYの結果に応じて異なるCMDを発行する場合、`WHEN` を複数書いて分岐を表現する：

```dml
# 定員内なら自動承認、超過ならキャンセル待ち
POLICY AutoApproveOrWaitlist
  TRIGGER  ParticipationApplied
  QRY      GetRemainingCapacity
  WHEN     capacity > 0 → CMD ApproveParticipation → EVT ParticipationApproved
  WHEN     capacity = 0 → CMD WaitlistParticipation → EVT ParticipationWaitlisted
  TX       SAME
```

`WHEN` を使う場合、`CMD` と `EVT` は各 `WHEN` 行に inline で書く（トップレベルの `CMD` / `EVT` は省略する）。

---

## 記号の意味

### DML キーワード

| 記号 | 意味 | 付箋色 |
|------|------|--------|
| `EventName` | ドメインイベント（起きた事実・過去形） | 橙 |
| `CommandName(...)` | コマンド（操作・意図） | 青 |
| `AggregateName` | 集約（状態を保持し変化させるもの） | 黄 |
| `QRY QueryName` | Read Model（アクターがCMD発行前に参照するビュー） | 緑 |
| `ERR: ...` | エラー（不変条件違反） | 薄赤 |
| `[?]` | 未確認・迷い・設計判断が必要な箇所 | — |

### `:::diagram-svg event_flow` フロー図記法

| 記号 | 意味 | 付箋色 |
|------|------|--------|
| `\|BC名\|:` | Bounded Context レーン（ヘッダー行。説明を続けて書く） | — |
| `@アクター名` | アクター付箋 | 黄 |
| `?クエリ名` | Read Model付箋（アクターがCMD発行前に参照するビュー） | 緑 |
| `[イベント名]` | イベント付箋 | 橙 |
| `$ポリシー名` | ポリシー付箋 | 紫 |
| `!コマンド名` | コマンド付箋（`!` 省略可） | 青 |
| `>` | 同期フロー（同一TX）、フロー行内でアイテムをつなぐ | — |
| `>>` | 非同期フロー（EVENTUAL）。**前レーン最後のフロー行の末尾**に付ける | — |

---

## [?] の使い方

確信が低い箇所や設計判断が必要な箇所に付ける。理由も一緒に書く。

```dml
SCENARIO 参加者がイベントに参加申込する
  # 定員チェック [?] Event集約とParticipation集約どちらが持つ？
  RULE  capacity check
```

---

## 記述ルール

1. **SCENARIOのフィールド順は `ACTOR → QRY → CMD → EVT → AGG → RULE → ERR → POL`** を厳守する
2. **POLICYはCONTEXT内・対応SCENARIOの直後に書く**: ファイル末尾にまとめない。`POL` はポリシー名の参照、`POLICY` ブロックが定義
3. **省略可能フィールド**: `WHEN`・`QRY`・`BULK` は必要なときだけ書く
4. **QRYは「判断に必要なデータ」にのみ書く**: アクター（「このコマンドを発行するか」）またはポリシー（「どのコマンドを発行するか・誰に対して」）が判断するために必要なデータのみ。コマンドの実装内部で必要なデータ（BULKの実行対象リストなど）はコマンド実装の責務であり `QRY` に書かない
5. **ERRは積極的に書く**: 「起きない条件」を毎回確認してERRに記録する — ERRがAGGの不変条件を明らかにする
6. **コメントは `#` で**: `RULE`・`ERR`・`POLICY` の日本語補足は、対象行の**上の行**に `#` コメント行として書く

---

## フル例（コミュニティイベント参加ドメイン）

```dml
# ================================
# コンテキスト宣言
# ================================

CONTEXT community-events
  LANGUAGE  Event    = "コミュニティが主催する集会・勉強会"
  LANGUAGE  Capacity = "イベントの定員（最大参加者数）"
  MODULE    community-events

CONTEXT participation
  LANGUAGE  Event    = "参加申込の対象となるエントリー"
  LANGUAGE  Capacity = "参加ステータスの枠（pending含む）"  [?] capacityの責務はどちら？
  MODULE    participation

# ================================
# community-events
# ================================

SCENARIO 主催者がコミュニティを作成する
  ACTOR Organizer
  CMD   CreateCommunity
  EVT   CommunityCreated
  AGG   Community
  # コミュニティ名はシステム全体でユニーク
  RULE  communityName must be unique system-wide
  # 名前・説明は空にできない
  RULE  name and description must not be empty
  # 主催者は必ず存在する
  RULE  owner must always exist
  ERR   duplicateName → DuplicateCommunityNameError
  ERR   emptyName → InvalidCommunityDataError
  ERR   emptyDescription → InvalidCommunityDataError

SCENARIO 主催者がイベントを作成する
  ACTOR Organizer
  CMD   CreateEvent
  EVT   EventCreated
  AGG   Event
  # 既存コミュニティに紐づくこと
  RULE  event must belong to an existing community
  # 定員は正の整数
  RULE  capacity must be positive integer
  ERR   communityNotFound → CommunityNotFoundError
  ERR   invalidCapacity → InvalidCapacityError

SCENARIO 主催者がイベントを公開する
  ACTOR Organizer
  CMD   PublishEvent
  EVT   EventPublished
  AGG   Event
  # 下書き状態であること
  RULE  event must be in DRAFT status
  ERR   alreadyPublished → EventAlreadyPublishedError

SCENARIO 主催者がイベントをキャンセルする
  ACTOR Organizer
  CMD   CancelEvent
  EVT   EventCancelled
  AGG   Event
  # 開催済みイベントはキャンセル不可
  RULE  event must not have already occurred
  ERR   eventAlreadyOccurred → EventAlreadyOccurredError
  POL   NotifyEventCancelled

# イベントキャンセル時に参加者へ通知
POLICY NotifyEventCancelled
  TRIGGER  EventCancelled
  QRY      AllApprovedParticipations
  CMD      SendCancellationNotification
  BULK     true
  TX       EVENTUAL
  EVT      CancellationNotificationSent

# ================================
# participation
# ================================

SCENARIO 参加者がイベントに参加申込する
  ACTOR Member
  CMD   ApplyForEvent
  EVT   ParticipationApplied
  AGG   Participation
  # 公開済みのイベントであること
  RULE  event must be published
  # 同一イベントへの二重申込禁止
  RULE  user must not have existing participation for same event
  # 定員チェック [?] Event集約とParticipation集約どちらが行う？
  RULE  capacity must not be exceeded
  ERR   eventNotPublished → EventNotAvailableError
  ERR   duplicateParticipation → AlreadyAppliedError
  ERR   capacityFull → CapacityExceededError
  POL   AutoApproveOrWaitlist

# 定員内なら自動承認、超過ならキャンセル待ち
POLICY AutoApproveOrWaitlist
  TRIGGER  ParticipationApplied
  QRY      GetRemainingCapacity
  WHEN     capacity > 0 → CMD ApproveParticipation → EVT ParticipationApproved
  WHEN     capacity = 0 → CMD WaitlistParticipation → EVT ParticipationWaitlisted
  TX       SAME

SCENARIO システムが参加を承認する
  ACTOR System
  CMD   ApproveParticipation
  EVT   ParticipationApproved
  AGG   Participation
  # 申込済みまたはキャンセル待ち状態であること
  RULE  participation must be in PENDING or WAITLISTED status
  ERR   invalidStatus → InvalidStatusTransitionError

SCENARIO 参加者が参加をキャンセルする
  ACTOR Member
  CMD   CancelParticipation
  EVT   ParticipationCancelled
  AGG   Participation
  # キャンセル可能な状態であること
  RULE  participation must be in PENDING or APPROVED status
  ERR   invalidStatus → InvalidStatusTransitionError
  POL   WaitlistPromotion

# キャンセル時にキャンセル待ちを繰り上げ
POLICY WaitlistPromotion
  TRIGGER  ParticipationCancelled
  QRY      NextWaitlistedParticipation
  CMD      ApproveParticipation
  BULK     true
  TX       EVENTUAL
  EVT      ParticipationApproved
```
