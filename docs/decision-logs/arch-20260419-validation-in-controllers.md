## 入力バリデーションはコントローラー層で検証、スキーマ定義は models 層

日付: 2026-04-19
種類: arch
ステータス: 承認済み

## コンテキスト

本プロジェクトでは Zod と `express-openapi-validator` を用いた OpenAPI-driven validation を既に採用しており、`models/schemas/*.schema.ts` にドメインスキーマを置き、`controllers/*-openapi.ts` で `.openapi()` メタデータを付与して OpenAPI に登録、ミドルウェアで自動検証する構成になっている（[AGENTS.md](../../AGENTS.md) の Core Patterns / Coding Conventions に記載済）。

一方で、レビュー時の判断基準として「バリデーションをどこで行うか」「スキーマをどこに定義するか」が暗黙知のままで、以下のブレが生じるリスクがあった:

- controllers 内で `z.object({...})` を直接定義し、models のスキーマと二重定義される
- UseCase 層で引数型の再検証（`safeParse`）を行い、同じ制約が複数箇所に散らばる
- models のスキーマに HTTP 由来の関心事（例: `example`, `description`）が混入する

今後の追加機能（event / participation / checkin / notification などの各 BC）でも同じ判断を繰り返すことになるため、規約として明文化し、コードレビューの基準を固定する必要があった。

## 決定

**入力バリデーションの「実行ポイント」はコントローラー層に置き、「スキーマ定義」は models 層にドメイン知識として置く。**

具体的には:

| 関心事 | 配置場所 | 責務 |
|--------|----------|------|
| ドメイン制約を表現した Zod スキーマ | `models/schemas/*.schema.ts` | 属性の型・長さ・enum・必須性などドメインの不変条件を一元管理（Single Source of Truth） |
| OpenAPI メタデータ付与 | `controllers/*-openapi.ts` | `models` のスキーマを import し、`.openapi({ description, example })` のみ追加。制約の再定義（min/max/nullable など）は禁止 |
| 実際のリクエスト検証 | `controllers/` (express-openapi-validator ミドルウェア経由) | HTTP 境界での入力検証を行い、失敗時は 400 を返す |
| UseCase / models の関数引数 | UseCase / models | 既に検証済みの型（`z.infer<typeof Schema>`）を受け取る。UseCase 内での再検証は行わない |

`.openapi()` は HTTP 層固有の関心事（API ドキュメント）なので controllers に置く。ドメイン制約は models に閉じる。

## 理由と代替案

**採用した理由:**

- バリデーションは「HTTP 境界で 1 回」に集約され、UseCase 以降は検証済みの型を信頼できる（Result 型の責務も「ドメインルール違反」に集中できる）
- スキーマ定義を models に置くことで、制約そのものはドメイン知識として凝集する（controllers は表現の違い＝ description / example だけを持つ）
- OpenAPI ドキュメントとランタイム検証が同じ Zod スキーマから導出されるため、ドキュメントと実装の乖離が起きない
- `z.infer<typeof Schema>` により型と検証ロジックが一致し、手書きの型定義の二重管理が不要になる

**検討した代替案:**

- **代替案A: controllers で独自 Zod スキーマを定義（models と二重定義）** → 選ばなかった理由: 制約変更時に 2 箇所を同時更新する必要があり、片方だけ変更されるドリフトが発生する。ドメイン制約が HTTP 層にも漏れ、ドメインルールの所在が曖昧になる。テストでも両方を検証する必要が生じ、コストに見合わない
- **代替案B: UseCase 層でバリデーションを行う** → 選ばなかった理由: UseCase は「Orchestration only」と既に定めており（[AGENTS.md](../../AGENTS.md)）、入力の型検証はそこより手前で完了しているべき。UseCase で再検証するとレイヤーの責務が混濁し、controllers を経由しない経路（将来の CLI / ジョブなど）では検証忘れが起きる。また、HTTP の 400 応答とドメインエラーの 422/409 の区別が付けにくくなる

## 影響

**ポジティブ:**

- バリデーションの実行ポイントが HTTP 境界に一元化され、「どこで弾くか」の判断がコードレビューで揺れない
- スキーマがドメイン層に凝集し、BC 追加時も「models にスキーマ、controllers に OpenAPI メタデータ」のテンプレートをそのまま適用できる
- OpenAPI と実装が常に一致し、`express-openapi-validator` による自動検証で controller コードからボイラープレートが消える
- 既存コード（auth / community / event / participation の各 `*-openapi.ts` と `models/schemas/*.schema.ts`）は既にこの方針に従っており、追加の移行コストはゼロ

**ネガティブ・リスク:**

- 複数フィールド間のクロスフィールド検証（例: `startAt < endAt`）を Zod の `.refine()` で models に書くか、UseCase でドメインルール違反として扱うかの判断は個別に必要。本 ADR のスコープ外とし、ケースバイケースで判断する（原則: 単純な構文上の整合性は schema の `.refine()`、ビジネスルールに属する制約は UseCase + Result エラー）
- controllers 以外のエントリーポイント（将来の CLI / バッチ / gRPC）を追加する際は、そのエントリーポイントでも入力検証を行う必要がある点を都度確認する
- 新メンバーが `.openapi()` に `min` / `max` などの制約を書き加えてしまうアンチパターンを、コードレビューで指摘し続ける必要がある（将来的には lint ルールまたは CI での検出余地）
