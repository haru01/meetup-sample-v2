# EventStorming / DDD 表記品質チェックリスト

MDファイルを書き出した後、サブエージェントがこのチェックリストに従って検査・修正する。

---

## 1. DML記法チェック（セクション8の ```dml ブロック）

| # | ルール | NG例 | OK例 |
|---|-------|------|------|
| D1 | `EVT`/`CMD`/`AGG` 名は英語PascalCaseのみ | `EVT 注文確定` | `EVT OrderConfirmed` |
| D2 | `EVT` 名は過去形 | `EVT PlaceOrder` | `EVT OrderPlaced` |
| D3 | `CMD` 名は命令形 | `CMD OrderPlaced` | `CMD PlaceOrder` |
| D4 | `SCENARIO` 名は日本語でアクター＋行為 | `SCENARIO OrderFlow` | `SCENARIO 顧客が注文を確定する` |
| D5 | 各 `SCENARIO` 内に `ACTOR` 行がある | （ACTOR行なし） | `ACTOR Customer` |
| D6 | `CONTEXT` 名は `lowercase-with-hyphen` | `CONTEXT OrderManagement` | `CONTEXT order-management` |
| D7 | `RULE`/`ERR`/`POLICY` の日本語補足は直上の `#` コメント行に書く | `RULE 在庫数 >= 0` | `# 在庫数は0以上`<br>`RULE StockNonNegative` |
| D8 | `EVT`/`CMD`/`AGG` に `()` `<<>>` を付けない | `EVT (OrderPlaced)` | `EVT OrderPlaced` |

---

## 2. event_flow 図チェック（セクション2・3の `:::diagram-svg event_flow` ブロック）

| # | ルール | NG例 | OK例 |
|---|-------|------|------|
| F1 | `$Policy` の直後に必ず `!Command` がある（`$Policy > [Event]` は禁止） | `$在庫確認ポリシー > [在庫が不足した]` | `$在庫確認ポリシー > !在庫を確認 > [在庫が不足した]` |
| F2 | イベントは `[日本語過去形]` で表記 | `[在庫不足]` | `[在庫が不足した]` |
| F3 | コマンドは `!動詞句（日本語）` で表記 | `[注文確定]` や `OrderConfirm` | `!注文を確定` |
| F4 | BC名は `|lowercase-with-hyphen|` | `|OrderManagement|` | `|order-management|` |
| F5 | アクターは `@役割名（日本語）` で表記 | `@Customer` | `@顧客` |
| F6 | `?ReadModel` は**操作対象集約以外**からのデータ取得にのみ付ける。同一集約の参照には付けない。順序は `@Actor > ?ReadModel > !Command` | 書き込む集約と同じデータを `?ビュー` で表記する | 別集約の残席数を確認する `?残席数 > !参加申込` |

---

## 3. セクション完全性チェック

| # | ルール |
|---|-------|
| S1 | セクション1（ハッピーパスストーリー）が400〜600字で記述されているか |
| S2 | セクション2（代替シナリオ）は**テキストのみ**。`:::diagram-svg` ブロックがあれば削除する（図はセクション3に集約） |
| S3 | セクション3（Event Walkthrough）に **ハッピーパス図が最初** に来ているか |
| S4 | セクション3の代替シナリオにも `:::diagram-svg event_flow` 図があるか（ハッピーパス図の後） |

---

## 検査・修正手順

1. MDファイルを `Read` で読み込む
2. 上記チェックリスト全項目を順に検査する
3. 違反箇所をリストアップする
4. 違反があれば `Edit` tool で直接修正する
5. 結果を返す：
   - 違反なし → `「品質チェック完了：問題なし」`
   - 違反あり → 修正した項目リスト（`F1: $Policy後の!Command追加 ×3箇所` など）
