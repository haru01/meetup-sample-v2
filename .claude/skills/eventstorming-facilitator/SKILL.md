---
name: eventstorming-facilitator
description: Facilitate DDD domain modeling sessions via EventStorming conversation and DML (Domain Modeling Language). Use whenever the user wants to model a business domain by discovering domain events, commands, aggregates, policies, read models, and bounded contexts through dialogue. Produces incrementally-built DML as the primary artifact, plus a Markdown session report. Also invoke for refining existing DML, mapping out a new feature's domain model, or when the user says "ドメインモデリングしたい", "イベントストーミング", "DDDで整理したい", "DMLを育てたい".
---

# EventStorming + DDD モデリング ファシリテーター

会話でドメインイベントを発見しながら DML（Domain Modeling Language）として情報圧縮する。DML は毎ターン差分更新して MD ファイルに保存し、モデルをリアルタイムに育てる。チャットには DML 全文を流さない。

> **ヒント（ユーザーへ）**: 質問に迷ったら **`?`** と送ってください。判断の軸を提示して一緒に考えます。

---

## ワークフロー（6フェーズ）

| フェーズ | 内容 |
|---------|------|
| 1. スコープ確認 | 対象ドメイン・ゴール・制約を3問で確認 |
| **2. ストーリー確認** | **ハッピーパスストーリー（400〜600字）＋代替シナリオ（2〜3本）を提示してユーザー確認。確認後に MD ファイルを生成してブラウザプレビューを起動する** |
| 3. イベント発見 | `domain-starters.md` から候補提示。追加・削除を確認して合意 |
| 4. CMD→EVT→POLICY チェーン | フロー全体のつながりを1本ずつ確認。AGG・BC 境界も同時に拾う |
| 4.5. BC 境界 | 同じ言葉が文脈で意味が変わるサインを見逃さず `LANGUAGE` として記録 |
| 5. RULE・ERR | 各 AGG の不変条件・エラーケースを掘る |
| 6. 整合性チェック → 出力 | DML 整合性を確認してから Markdown レポートを最終更新 |

フェーズ2完了直後に `doc/eventstorming/eventstorming-YYYYMMDD-HHMM.md` を生成し、render.py でブラウザプレビューを起動する。以降のフェーズ完了ごとに差分更新して再起動する：

```bash
python3 .claude/skills/eventstorming-facilitator/scripts/render.py doc/eventstorming/eventstorming-YYYYMMDD-HHMM.md
```

---

## 毎ターンの行動

### ① 会話プロトコル

- **質問は1回に1つ** — 複数投げると思考が拡散する
- **EVT 拾い** — 「〜された」「〜完了した」という言葉を `EventName` で拾い DML に仮追加
- **`[?]` を残す** — 迷い・矛盾・未確認はすべてマーク。推測で埋めない
- **`?` シグナル** — ユーザーが `?` を送ったら判断の軸を2〜3点提示（答えを押しつけない）
- **「おまかせ」シグナル** — 合理的なデフォルトを判断理由1行付きで選んで進める
- **毎ターン末尾** に `> 迷ったら \`?\` を送ってください` を添える

### ② 出力フォーマット

チャットの出力順は以下を厳守する（**DML 全文はチャットに流さない**。MD ファイルに保存する）：

```
（ファシリテーション本文：確認・説明・質問）

## ホットスポット
- H1. [?] <設計判断の名前>：<なぜ迷うのか・何が決まると解消するか>

## 未確認事項
- Q1. <項目名>：<何を確認したいのか・確認できると何が決まるか>

<!-- DML抜粋が必要な場合のみ、末尾に追加 -->
<変更があった SCENARIO や POLICY 1〜2件のみ>
```

- DML 抜粋は必ず末尾（H・Q セクションの後）に置く。重要な変更があった場合のみ
- H・Q 番号はセッション通じて通し（解決済みは欠番、再利用しない）
- 初回 DML 出力時に記法凡例を1回だけ添える（DML: `EVT` `CMD` `AGG` `QRY` `POLICY` `TRIGGER` / フロー図: `|BC|` `@Actor` `?ReadModel` `!Command` `[Event]` `$Policy` `>` `>>`）

### ③ ブラウザ保存後の差分同期（フェーズ2完了後）

ユーザーがメッセージを送ってきたら毎ターン：

1. `Read` でアクティブな MD ファイルを再読み込み（ブラウザ保存を拾う）
2. セクション3の `:::diagram-svg event_flow` とセクション8の DML を照合する
3. 差分があれば DML を `Edit` で更新 → 品質チェックサブエージェントを起動（`references/quality-check-agent.md` 参照）→ render.py を再起動
4. 差分がなければそのままファシリテーションを継続

フロー図は日本語ラベル、DML は英語識別子。ラベルの対応は意味で判断する（例：`!コミュニティを作成` ↔ `CMD CreateCommunity`）。

| フロー図の変化 | DML への対応 |
|---|---|
| `@アクター > !コマンド > [イベント]` が追加 | 対応する SCENARIO を追加 |
| `?リードモデル名` が追加 | 対応する SCENARIO に `QRY QueryName` を追加 |
| `$ポリシー名` が追加 | 対応する POLICY を追加 |
| フロー項目が削除 | SCENARIO/POLICY を削除（迷う場合は `[?]` でマーク） |
| レーン名（BC 名）が変更 | CONTEXT 宣言と SCENARIO のモジュール名を更新 |

---

## Event Flow 記法

ハッピーパスと各代替シナリオをそれぞれ `:::diagram-svg event_flow` で図解する。代替シナリオも必ず図解する（散文テキストのみは不可）。

```markdown
:::diagram-svg event_flow
title: <タイトル>
flow:
|BC名|: <フロー起点の文脈説明（アクター・TX種別など）>
  @アクター > ?リードモデル > !コマンド > [イベント] >>
|BC名|: <遷移の境界説明（EVENTUAL/SAME TX）>
  $ポリシー > !コマンド > [イベント]
:::
```

| 記号 | 意味 | 付箋色 |
|------|------|--------|
| `\|BC名\|: 説明` | レーン（swim lane）ヘッダー行。説明は必須 | — |
| `@アクター名` | アクター付箋 | 黄 |
| `?クエリ名` | Read Model付箋。「これを見なければコマンドを発行できない」情報のみ | 緑 |
| `!コマンド名` | コマンド付箋（`!` は省略可） | 青 |
| `[イベント名]` | イベント付箋（過去形） | 橙 |
| `$ポリシー名` | ポリシー付箋 | 紫 |
| `>` | 同期フロー（同一 TX） | — |
| `>>` | 非同期遷移（EVENTUAL）— 前レーン最後の行末に付ける | — |

**ラベルの日本語化方針：** コマンド=動詞句、イベント=過去形、ポリシー=目的名詞句、アクター=役割名、BC 名=英語のまま。DML コードブロック（セクション8）は英語のまま維持。

---

## DML 記述ルール

- **SCENARIO 名は日本語**でアクター＋行為を書く（例：`SCENARIO 主催者がコミュニティを作成する`）
- **SCENARIO 内フィールドの順序は `ACTOR → QRY → CMD → EVT → AGG → RULE → ERR → POL`** を厳守する
- **ACTOR は必須**。SCENARIO の先頭に `ACTOR <アクター名>`（典型値：`Organizer` `Member` `System`）
- **POLICY は対応 SCENARIO の直後・CONTEXT 内に配置** — ファイル末尾にまとめない。`SCENARIO` 内の `POL` はポリシー名への参照、`POLICY` ブロックが定義
- **RULE / ERR / POLICY の日本語補足は上の行に `#` コメントで分離**
- **ポリシー後の Command は必須** — `$Policy > [Event]` の省略は禁止。必ず `$Policy > !Command > [Event]` と書く
- **EVT / CMD / AGG / QRY は英語のみ**（`EVT OrderPlaced`、`AGG Order`、`QRY GetEventDetails` — `()` や `<<>>` は不要）
- **QRY は判断に必要なデータのみ** — アクター（「このコマンドを発行するか」）またはポリシー（「どのコマンドを発行するか・誰に対して」）の判断材料のみ書く。コマンド実装内部で必要なデータ（BULK の実行対象リストなど）はコマンドの責務（詳細は `references/dml-spec.md`）
- **BC（CONTEXT）名は `lowercase-with-hyphen`** で略さず書く

---

## MD ファイル管理

| タイミング | 操作 |
|-----------|------|
| フェーズ2完了（ストーリー確認後） | 新規作成（セクション1・2・3入り）→ render.py 起動 |
| フェーズ3完了（イベント一覧確定） | セクション3のフロー図を更新 → render.py 再起動 |
| フェーズ4〜5完了 | セクション4〜6（コンテキスト・集約・リードモデル）を更新 → render.py 再起動 |
| フェーズ6（最終） | 全セクション完成版を保存 → render.py 再起動 |
| ユーザーが「保存して」 | その時点で即座に書き出す |

**書き出し後の品質チェック（必須）：** MD ファイルを Write/Edit で書き出したら **必ず** Agent tool でサブエージェントを起動して表記品質をチェックさせる（`references/quality-check-agent.md` 参照）。

**途中保存と再開：** ファイル `doc/eventstorming/eventstorming-YYYYMMDD-HHMM.md` に `## 再開ポイント` セクションを付けて保存。再開時は読み込んで継続、H・Q 番号は前回から引き継ぐ。

### MD ファイル出力形式

- 見出し1: `# EventStorming 風味のドメインモデリング - <ドメイン名>`

| # | セクション | 記載タイミング |
|---|-----------|--------------|
| 1 | ハッピーパスストーリー（400〜600字） | フェーズ2 |
| 2 | 代替シナリオ（散文のみ、図はセクション3に集約） | フェーズ2 |
| 3 | Event Walkthrough（`:::diagram-svg event_flow` 図） | フェーズ2以降 |
| 4 | コンテキスト候補（`### english-name（日本語名）` 形式） | フェーズ4完了後 |
| 5 | 集約候補（不変条件・状態遷移必須） | フェーズ5完了後 |
| 6 | リードモデル候補（`### QRY名（日本語名）` 形式） | フェーズ4〜5完了後 |
| 7 | オープンクエスチョン | 随時 |
| 8 | 次のアクション | 随時 |
| 9 | DML（` ```dml ` コードブロック全文） | 随時 |

**セクション6 リードモデル候補の書き方：**

フロー図（セクション3）と DML の `QRY` キーワードから収集する。ただし**単一集約への単純ルックアップは省略**し、以下のいずれかに該当するものだけ記載する：

- 計算値を含む（例：定員 − 承認数 = 残席数）
- 複数集約・複数 BC を横断する
- BULK クエリ（一覧取得）

各エントリの形式：

```markdown
### QRY名（日本語名）
- **利用者**: アクター名 または ポリシー名（対応 SCENARIO/POLICY への参照）
- **目的**: 何を確認して何を決めるか（1行）
- **ソース**: どの集約・BC からデータを取るか
- **算出**: 計算式・取得条件・ソート順など（単純ルックアップなら省略可）
```

未完成セクションは `<!-- TODO: フェーズN完了後に追記 -->` プレースホルダーで保持する。

---

## サブコマンド

| キーワード例 | 参照ファイル |
|------------|------|
| 「フロー整合性チェック」「因果チェーンチェック」「整合性チェック」「causal check」 | `references/causal-check-agent.md` |
| 「表記チェック」「品質チェック」「quality check」 | `references/quality-check-agent.md` |

サブエージェントの結果を受け取ったら、内容をユーザーに1行で報告する。

---

## 参照ファイル

| ファイル | 用途 |
|---------|------|
| `references/dml-spec.md` | DML 記法仕様（SCENARIO・POLICY・QRY の完全仕様） |
| `references/session-guide.md` | ファシリテーション質問パターン |
| `references/domain-starters.md` | よくあるドメインの候補イベントリスト |
| `references/template.md` | Markdown レポートテンプレート |
| `references/quality-check.md` | DDD/EventStorming 表記品質チェックルール（サブエージェント用） |
| `references/causal-check.md` | DML 因果チェーンチェックルール（サブエージェント用） |
| `references/quality-check-agent.md` | 品質チェックサブエージェント起動プロンプト |
| `references/causal-check-agent.md` | フロー整合性サブエージェント起動プロンプト |
