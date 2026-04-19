# BC 間連携に In-Memory Event Bus を採用（学習用途としての妥当性）

日付: 2026-04-19
種類: arch
ステータス: 承認済み

## コンテキスト

本プロジェクトは 5 つの境界づけられたコンテキスト（community / event / participation / checkin / notification）に分割されており、BC 間で副作用を伝播させる必要がある。典型例:

- `ParticipationCancelled` → `participation` BC で繰り上げ処理（`WaitlistPromoted`）→ `notification` BC で繰り上げ通知を記録
- `EventCancelled` → `notification` BC で中止通知を記録
- `EventDateApproached` → `notification` BC でリマインダーを記録
- `ParticipationApproved` → `notification` BC で承認通知を記録

BC を厳格に分離する以上、`participation` UseCase から `notification` のリポジトリを直接呼び出すのは Customer-Supplier 境界を破るため許容できない。何らかの非同期結合機構が必要になる。

一方、本リポジトリは**学習・検証用のサンプル**であり、以下の制約がある:

- チームメンバーがローカルですぐに動かせること（`docker compose up` 一発で完結させたい）
- Kafka / Redis / RabbitMQ などのミドルウェアを立てる運用コストを払いたくない
- 本番運用を前提にしていないため、スケール・可用性・メッセージ永続性の要件は低い
- 代わりに、将来「実案件に持ち込むならここをどう替えるか」の設計意図は明確に残しておきたい

このため、「今は軽量で済ませるが、将来の差し替えポイントを明示する」という意思決定を明文化する必要がある。

## 決定

**単一プロセス内 pub/sub の `InMemoryEventBus<TEvent>` を採用し、全 BC の連携を discriminated union 型の `MeetupDomainEvent` 経由で行う。**

実装: [`backend/src/shared/event-bus.ts`](../../backend/src/shared/event-bus.ts) / [`backend/src/shared/domain-events.ts`](../../backend/src/shared/domain-events.ts)

運用規約:

| 項目 | 方針 |
|------|------|
| **メッセージ配送** | 同一プロセス内 `Map<eventType, handlers[]>`。`publish()` は登録ハンドラを `for await` で直列実行 |
| **イベント型** | `MeetupDomainEvent` 型の discriminated union（`type` フィールドで分岐）。`subscribe(eventType, handler)` で該当 type のみ受ける |
| **配信保証** | At-most-once（プロセスクラッシュでロスト）。永続化・リトライ・dead-letter はなし |
| **BC 間の依存** | 上流 BC は `eventBus.publish(event)` のみ呼ぶ。下流 BC は `composition.ts` で `eventBus.subscribe(...)` する |
| **トランザクション** | DB コミット後に publish するのが原則（UseCase 内で Repository 書き込み成功後に `publish`）。Event Bus と DB を跨ぐ整合性は保証しない |
| **テスト** | 各 BC の `composition.ts` 単位で subscribe／publish の配線をユニットテストで確認する |

## 理由と代替案

**採用した理由:**

- **学習リポジトリとして最小セットアップで動くことを最優先**した。ミドルウェアを増やすとローカル起動・CI・新規参加者のオンボーディングのすべてが重くなる
- BC 分離と Event-Driven 設計の**教材価値**は、Kafka を噛ませても In-Memory でも変わらない。学ぶべきは「どこで publish し、どの BC が subscribe するか」の設計判断
- 実装 70 行で完結し、チーム全員が実装を読める。ブラックボックスがない
- `MeetupDomainEvent` が discriminated union なので、`subscribe(eventType, ...)` の第 2 引数の型が自動で絞り込まれ、型安全性を失わない
- 将来の差し替え時も、`EventBus` インタフェースを抽象化するだけで外部メッセージブローカーに置換できる（実装は単純な pub/sub のため）

**検討した代替案:**

- **代替案A: BC 間の同期直接呼び出し（Repository や Service を直接 import）** → 選ばなかった理由: Customer-Supplier 境界を物理的に破り、BC 分離の規律（ADR「境界づけられたコンテキストの 5 分割採用」）が成立しなくなる。circular dependency やレイヤー依存チェック違反が日常化し、BC を分けた意味が失われる。学習用途でもアンチパターンを見せたくない
- **代替案B: Kafka / Redis Streams / RabbitMQ などの外部メッセージブローカー** → 選ばなかった理由: 学習用途では運用コスト（ミドルウェアの起動・ローカル／CI 環境の用意・設定ファイル・ヘルスチェック）が教材価値に見合わない。Docker Compose への追加サービス、スキーマレジストリ、Consumer group 管理、DLQ などが発生し、「DDD × Event-Driven の学習」のノイズになる。本番案件に持ち込む時に導入を検討する
- **代替案C: Outbox パターン（イベントを DB に書き込み、ポーリングワーカーが publish）** → 選ばなかった理由: DB と Event Bus の分散トランザクション問題を解決する堅牢な手法だが、ワーカープロセス・ポーリング間隔・冪等性設計・重複排除テーブルなどの実装負担が学習用途では重すぎる。本番採用時に改めて検討する
- **代替案D: ライブラリ（`eventemitter3` / `mitt` など）を使う** → 選ばなかった理由: 実装が 70 行で収まるため外部依存を増やすメリットが薄い。`TypedEventBus` 相当の型安全な pub/sub を自前で持つほうが、学習者が「中で何が起きているか」を追いやすい

## 影響

**ポジティブ:**

- ローカル・CI 環境が軽量に保たれる（Docker Compose は backend + frontend のみ）
- 実装が小さく、「なぜこの Event は何を trigger するか」を読者がコードだけで追える
- discriminated union の型安全性が保たれる
- BC 間の結合点が `publish` / `subscribe` に明示化され、「どの BC がどのイベントを発火・購読するか」が `composition.ts` に一元化される
- 将来差し替える際も、`InMemoryEventBus` のインタフェースを踏襲した外部ブローカーアダプタを書けば済む

**ネガティブ・リスク（本番転用時には致命的）:**

- **メッセージ永続性なし**: プロセスクラッシュで in-flight なイベントはロスト。本番化の際は Outbox パターンまたは外部ブローカーが必須
- **水平スケール不可**: 単一プロセス前提のため、アプリケーションサーバーを複数台にすると BC 間連携が成立しない
- **配信保証なし**: ハンドラ側の例外はイベント単位でリトライされない。失敗通知の再送などが実装されていない
- **バックプレッシャなし**: ハンドラを直列実行するため、遅いハンドラが次の publish を詰まらせる
- **トランザクション境界の脆さ**: DB コミット後に publish する運用だが、コミット成功・publish 失敗の組み合わせは現在のコードでは補償されない。学習用途として許容しているが、運用化時には要補強
- 本番案件に持ち込む場合は、**Outbox パターン + 外部ブローカー（Kafka / Redis Streams など）への移行が必須**。その時点でこの ADR は `Superseded` とし、移行 ADR を新設する

## 再評価のトリガー

以下のいずれかが発生したら、本決定を再評価する:

- 本リポジトリを本番系に転用する方針が立ったとき
- 単一プロセスで捌けない負荷／可用性要件が現れたとき
- 永続性・再送・Dead-letter の要件が発生したとき
- BC を別プロセス／別サービスに分割する選択肢が検討対象になったとき
