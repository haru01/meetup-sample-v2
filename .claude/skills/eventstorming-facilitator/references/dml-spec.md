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
  LANGUAGE    <EnglishTerm> = "<この文脈での意味（日本語可）>"
  MODULE      <module-name>
  UPSTREAM    <context-name>    # 関係タイプ（Customer-Supplier | Conformist | Shared-Kernel | ACL）
  DOWNSTREAM  <context-name>    # 関係タイプ
```

`LANGUAGE` でユビキタス言語を定義する。
**同じ言葉が別CONTEXTで意味が違う場合、それぞれのCONTEXTで別々に定義する**。
この差異がBounded Context（BC）の境界を示す。

`UPSTREAM` / `DOWNSTREAM` で BC 間の依存方向を明示する（必須）。

- `UPSTREAM`: この BC が**依存する**側（= このコードが参照するモデル所有者）
- `DOWNSTREAM`: この BC に**依存される**側（= このモデルを参照する下流 BC）
- 複数の UPSTREAM/DOWNSTREAM は行を分けて複数行記述
- 関係タイプは行末に `# Customer-Supplier | Conformist | Shared-Kernel | ACL` の形で記述
- 依存がない場合は `UPSTREAM  (none)` `DOWNSTREAM (none)` と明示

例：
```dml
CONTEXT community-events
  LANGUAGE    Event = "コミュニティが主催する集会・勉強会"
  MODULE      community-events
  UPSTREAM    (none)
  DOWNSTREAM  participation   # Customer-Supplier。Event を下流 BC が参照

CONTEXT participation
  LANGUAGE    Event = "参加申込の対象となるエントリー"
  MODULE      participation
  UPSTREAM    community-events # Customer-Supplier。Event の情報を参照
  DOWNSTREAM  checkin          # Customer-Supplier。Participation を checkin が参照

CONTEXT checkin
  LANGUAGE    CheckIn = "当日の来場確認"
  MODULE      checkin
  UPSTREAM    participation    # Customer-Supplier
  DOWNSTREAM  (none)
```

---

## インフラ系ドメインの扱い（通知・スケジューラ・決済・メール等）

業務ドメインと独立した技術基盤（通知・バッチ・外部 API 連携）は、**BC に昇格する**か**POLICY 内に留める**かを毎回判断する。デフォルト判断基準：

### POLICY 留置で十分なサイン
- 通知 / 連携が 1 種類のみ（例：承認通知のみ）
- 送信結果の監査・再送 / 失敗管理が不要
- 状態を持たない（送ったら完了で追跡しない）
- 他 BC から参照されない

→ 既存 BC 内の `POLICY` ブロックとして記述する。専用 CONTEXT は作らない。

### BC に昇格すべきサイン
- 複数種類の通知 / 連携を統一的に管理（例：APPROVAL / REMINDER / SURVEY / CANCELLATION など）
- 送信状態（QUEUED / SENT / FAILED / RETRYING）を持つ
- SLA・再送ポリシー・失敗時のフォールバックが業務要件
- 他 BC から「どの通知を送ったか」を参照される（監査ログ兼用など）

→ 新規 `CONTEXT` を宣言し、`UPSTREAM` / `DOWNSTREAM` で他 BC との関係を明示する。

迷う場合は `[?]` で保留し、後続フェーズで再評価する。
**「データモデル（テーブル）は存在するが BC として宣言していない」状態は原則 NG**（今回のような実装とドキュメントの乖離を生む）。

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

## ポリシー定義（EVENTUAL-TX 専用・SCENARIOの直後・CONTEXT内に配置）

`POLICY` ブロックは **EVENTUAL-TX（非同期・別トランザクション）限定**で使用する。
同一トランザクションで処理される分岐（SAME-TX）は、発行元 SCENARIO の `WHEN` としてインラインで書く（後述）。

```dml
# <日本語でポリシーの目的を説明>
POLICY <Name>
  TRIGGER  EventName
  QRY      <QueryName>             # BULK の場合は必須。単一宛先なら省略可
  CMD      CommandName
  BULK     true                    # × n の場合（省略時はfalse）
  EVT      EventName               # 省略可。このポリシーが生成するイベント
```

- `TX` フィールドは記述しない（EVENTUAL 固定）
- `QRY` 必須基準: `BULK true` のときは必須（送信対象リストを明示するため）。単一宛先が TRIGGER ペイロードから決まる場合は省略可

### SAME-TX 分岐（コマンド内の条件分岐）

同一トランザクション内でコマンドの結果が条件により変わる場合、**独立した `POLICY` ブロックを作らず**、発行元 SCENARIO の中で `WHEN` として分岐を表現する：

```dml
# 定員超過なら同一トランザクションで WAITLISTED に落とす
SCENARIO 参加者が参加申し込みをする
  ACTOR Member
  CMD   ApplyForEvent
  AGG   Participation
  QRY   GetRemainingCapacity
  RULE  event must be published
  WHEN  capacity > 0 → EVT ParticipationApplied
  WHEN  capacity = 0 → EVT ParticipationWaitlisted
```

**判定基準：**

| TX | 書き方 | 根拠 |
|----|-------|------|
| SAME | SCENARIO の `WHEN` 分岐 | コマンド内の同期処理。Repository のトランザクション境界内で完結 |
| EVENTUAL | `POLICY` ブロック | EventBus 経由の非同期処理。別トランザクションで発火 |

WHEN 分岐で別ポリシーに接続する場合のみ `→ POL <PolicyName>` を付ける（EVENTUAL ポリシーへの接続時）：

```dml
SCENARIO システムが在庫を確保する
  ACTOR System
  CMD   ReserveInventory(orderId, items)
  AGG   Inventory
  WHEN  stock >= requested → EVT InventoryReserved     → POL ConfirmOrder
  WHEN  stock < requested  → EVT InventoryInsufficient → POL CancelOnOutOfStock
```

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

### `` ```event-flow-svg `` フロー図記法

（旧記法 `:::diagram-svg event_flow` … `:::` もレンダラーは後方互換で受け付ける。新規作成時は `` ```event-flow-svg `` を使う。）

| 記号 | 意味 | 付箋色 |
|------|------|--------|
| `\|BC名\|:` | Bounded Context レーン（ヘッダー行。説明を続けて書く） | — |
| `@アクター名` | アクター付箋 | 黄 |
| `?クエリ名` | Read Model付箋（アクターがCMD発行前に参照するビュー） | 緑 |
| `[イベント名]` | イベント付箋 | 橙 |
| `$ポリシー名` | ポリシー付箋 | 紫 |
| `!コマンド名` | コマンド付箋（`!` 省略可） | 青 |
| `>` | 同期フロー（直接連鎖）、フロー行内でアイテムをつなぐ | — |
| `>>` | 非同期遷移（レーン切り替え）。**前レーン最後のフロー行の末尾**に付ける | — |

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
  LANGUAGE    Event    = "コミュニティが主催する集会・勉強会"
  LANGUAGE    Capacity = "イベントの定員（最大参加者数）"
  MODULE      community-events
  UPSTREAM    (none)
  DOWNSTREAM  participation   # Customer-Supplier

CONTEXT participation
  LANGUAGE    Event    = "参加申込の対象となるエントリー"
  LANGUAGE    Capacity = "参加ステータスの枠（pending含む）"  [?] capacityの責務はどちら？
  MODULE      participation
  UPSTREAM    community-events # Customer-Supplier
  DOWNSTREAM  (none)

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
  QRY   GetRemainingCapacity
  CMD   ApplyForEvent
  AGG   Participation
  # 公開済みのイベントであること
  RULE  event must be published
  # 同一イベントへの二重申込禁止
  RULE  user must not have existing participation for same event
  ERR   eventNotPublished → EventNotAvailableError
  ERR   duplicateParticipation → AlreadyAppliedError
  # 定員内なら APPLIED、超過なら WAITLISTED（同一トランザクション）
  WHEN  capacity > 0 → EVT ParticipationApplied
  WHEN  capacity = 0 → EVT ParticipationWaitlisted

SCENARIO 主催者が参加申込を承認する
  ACTOR Organizer
  CMD   ApproveParticipation
  EVT   ParticipationApproved
  AGG   Participation
  # 申込済み状態であること
  RULE  participation must be in APPLIED status
  ERR   invalidStatus → InvalidStatusTransitionError

SCENARIO 参加者が参加をキャンセルする
  ACTOR Member
  CMD   CancelParticipation
  EVT   ParticipationCancelled
  AGG   Participation
  # キャンセル可能な状態であること
  RULE  participation must be in APPLIED or APPROVED status
  ERR   invalidStatus → InvalidStatusTransitionError
  POL   WaitlistPromotion

# キャンセル時にキャンセル待ちを繰り上げ（非同期・別トランザクション）
POLICY WaitlistPromotion
  TRIGGER  ParticipationCancelled
  QRY      NextWaitlistedParticipation
  CMD      PromoteWaitlistEntry
  EVT      WaitlistPromoted
```
