# 境界づけられたコンテキストの 5 分割採用

日付: 2026-04-06（初版） / 2026-04-19（現状反映のため改訂）
種類: arch
ステータス: 承認済み

> **改訂履歴 (2026-04-19)**:
> 本 ADR は当初 `community` / `participation` の 2 分割として起票されたが、
> 2026-04-17 の EventStorming セッション（[eventstorming-20260417-2009.md](../eventstorming-20260417-2009.md)）で
> `community` / `event` / `participation` / `checkin` の 4 BC に発展し、
> さらに 2026-04-18 のフェーズ 6 で `notification` BC が昇格して現在の 5 BC 構成に至った。
> 本版では現状構成を単一の ADR として書き直し、2 分割／4 分割の経緯は「代替案」および「経緯」として集約している。

## コンテキスト

ミートアップ運営ドメインは当初、マネージャ向け（コミュニティ・イベント運営）と参加者向け（参加登録）という 2 つの責務に分割して開始した。

その後、EventStorming セッションを通じて次の観点から分割の再検討が必要になった:

- イベント本体（定員・公開状態・開催前後のライフサイクル）と参加申し込み 1 件ごとの状態遷移（APPLIED/APPROVED/WAITLISTED/CANCELLED）は、変更頻度も集約の一貫性境界も異なる
- 当日のチェックイン（物理的な来場確認・単発操作）は、参加管理・イベント管理と寿命が異なり、独立して追加・撤去できる
- 通知は種類が 6 種類（APPROVAL / REMINDER / SURVEY / EVENT_CANCELLED / PARTICIPANT_CANCELLED / WAITLIST_PROMOTED）に増え、独自のデータモデル（`Notification` テーブル）を持つようになった。新スキル仕様「データモデルありの機能を BC 宣言なしに抱えるのは不可」を満たすため、明示的な BC 化が必要

結果として、マネージャ／参加者の 2 分割では責務が混在し、凝集度が下がる見込みとなったため、ドメインの実態に即した細粒度の分割に踏み切った。

## 決定

以下 5 つの境界づけられたコンテキストに分割する。依存方向はすべて Customer-Supplier（上流→下流は ID と公開イベントのみを受け渡し）。

| BC | 責務 | UPSTREAM | DOWNSTREAM |
|----|------|----------|------------|
| **community** | コミュニティ本体 ＋ メンバーシップ（加入／承認／却下／脱退、PUBLIC/PRIVATE） | (none) | event |
| **event** | イベント本体（DRAFT/PUBLISHED/CLOSED/CANCELLED、定員管理、開催日接近検知） | community | participation / notification |
| **participation** | 参加申し込み 1 件ごとの状態遷移（APPLIED/APPROVED/WAITLISTED/CANCELLED、キャンセル待ち繰り上げ） | event | checkin / notification |
| **checkin** | 当日の来場確認・出席記録 | participation | (none) |
| **notification** | 送信済み通知の監査ログ（6 種類の通知タイプ、BULK 送信、将来の再送・状態管理余地） | event / participation | (none) |

コンテキスト間の結合は以下で実現する:

- 上流から下流への参照は Branded Type の ID（`CommunityId` / `EventId` / `ParticipationId` / `AccountId`）のみ
- 非同期の副作用（承認通知、繰り上げ通知、アンケート送信等）は In-Memory Event Bus の POLICY として通知 BC が購読
- 共有カーネル（Result 型、Zod スキーマ基盤、Event Bus、ミドルウェア）は `shared/` に集約

## 理由と代替案

**採用した理由:**

- EventStorming で抽出した各 BC がそれぞれ独立した集約ライフサイクルと不変条件を持つ（Community / CommunityMember / Event / Participation / CheckIn / Notification）
- `event` と `participation` は変更頻度・複雑さが大きく異なる（マネージャ視点の公開／中止フロー vs 参加者視点の申込／繰り上げフロー）ため、凝集度を保つには分離が適切
- `checkin` は当日限定の短命な操作で、将来 QR コード認証・座席管理など独自発展させたい領域。分離しておくことで influence が他 BC に漏れない
- `notification` は BULK 送信（アンケート・リマインダー・中止通知）・外部連携（メール・Push）・再送制御など将来拡張が見込まれる。独自の監査ログを持つ以上、データモデルありの機能は BC として明示化する（新スキル仕様準拠）
- 結合は Customer-Supplier ＋ ID 参照 ＋ Event Bus に限定しており、コンテキスト間の調整コストは許容範囲内

**検討した代替案:**

- **代替案A: 2 BC 分割（community+event+checkin / participation+notification）** — 本 ADR の初版方針。community コンテキストにイベント管理とチェックインを包含する構成 → 選ばなかった理由: イベントと参加は変更頻度・観点が大きく異なり、同一 BC だと参加管理のドメインロジック（定員・繰り上げ）がイベント管理に混入する。通知は 6 種類に増えた時点で独立した監査ログを持つため参加管理と同居させると凝集度が下がる
- **代替案B: 3 BC 分割（community / event+participation+checkin / notification）** — イベント運営系を 1 つにまとめる折衷案 → 選ばなかった理由: `event` と `participation` は集約ルートの一貫性境界が明確に異なり、WAITLISTED 繰り上げなどの独自の状態遷移機械を持つ。一緒にすると 1 集約が肥大化し、テストの分離も困難
- **代替案C: 4 BC 分割（community / event / participation / checkin、notification を BC 化しない）** — 2026-04-17 の中間形態。通知は event / participation BC 内の Repository として保持 → 選ばなかった理由: 通知タイプが 6 種類に増え、独自データモデル（Notification テーブル）を持つに至った段階で、新スキル仕様「データモデルあり＋BC 宣言なし」は禁止。また通知は将来 SLA・再送・状態管理を加えたい拡張余地があり、独立 BC 化しておく方が追加時の影響範囲が狭い
- **代替案D: 分割しない（単一 meetup コンテキスト）** — 初期構成 → 選ばなかった理由: マネージャ視点と参加者視点、イベント本体と申込エントリ、通知と監査ログがすべて 1 つの文脈に押し込まれ、変更時の影響範囲が全域に広がる

## 影響

**ポジティブ:**

- 各 BC が独立してテスト・開発できる（UseCase・Repository・E2E が BC ごとに閉じる）
- 各集約の不変条件が BC 境界内に閉じ込められ、変更の影響範囲が局所化する
- `notification` BC を独立化したことで、将来の通知拡張（メール統合、Push、SLA、再送）が他 BC に波及しない
- 新規 BC 追加（例: `survey`・`payment`）時の接続点が Event Bus ＋ ID 参照に統一されており、設計パターンが再利用できる
- Path alias（`@community/*` `@event/*` `@participation/*` `@checkin/*` `@notification/*` `@shared/*`）が境界の物理的強制になっており、レイヤー依存チェック（`npm run review`）で違反を自動検出できる

**ネガティブ・リスク:**

- BC 数が増えたことで、ID 型・Zod スキーマ・Event 型の共有コスト（shared / 各 BC の境界設計）が増加
- In-Memory Event Bus 上で POLICY が増え、発火チェーンの把握が難しくなる（例: `ParticipationCancelled → PromoteFromWaitlist → WaitlistPromoted → NotifyWaitlistPromotion`）。テストでの統合確認と命名規律が不可欠
- コンテキスト間の横断処理（残席数計算: Event BC の capacity ＋ Participation BC の承認件数）は QueryService として跨ぐ必要があり、所有権の明確化が継続課題
- リネーム・移設に伴う過去コミット・ドキュメントへの参照切れ対応（`meetup` → `community` / `notification` リポジトリ移設）

## 経緯

| 日付 | 出来事 |
|------|--------|
| 2026-04-06 | 2 BC（community / participation）で初版 ADR 起票 |
| 2026-04-17 | EventStorming セッション（[eventstorming-20260417-2009.md](../eventstorming-20260417-2009.md)）で 4 BC（community / event / participation / checkin）に拡張 |
| 2026-04-18 | フェーズ 6 で `notification` BC を昇格、現在の 5 BC 構成が確定 |
| 2026-04-19 | 本 ADR を現状反映のため書き直し |
