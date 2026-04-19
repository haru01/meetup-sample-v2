# Result<T, E> を全ドメイン関数／UseCase の戻り型として採用し、例外を投げない

日付: 2026-04-19
種類: arch
ステータス: 承認済み

## コンテキスト

バックエンドの失敗ハンドリングには「例外を throw する」「Result 型を返す」「Either / Promise ラッパーライブラリを使う」など複数の選択肢がある。

本プロジェクトでは当初から次の課題があった:

- ドメイン関数（集約の factory / 状態遷移）、UseCase、Repository が失敗する可能性を型で表現したい。失敗種別（バリデーション違反・重複・未検出・認可失敗）が戻り値型に現れない構造では、呼び出し側が対応を忘れたり、controllers の HTTP マッピングで取りこぼす
- 各 BC（community / event / participation / checkin / notification）が独自のエラー種別を持ち、discriminated union（`{ type: 'NotFound' }` 形式）で表現するため、呼び出し側は網羅的な `switch` で HTTP へマップしたい
- 例外を投げるスタイルでは、どの関数が何をスローするかが型から見えず、BC を跨ぐオーケストレーションで「想定外の例外が controllers を飛び越えて 500 に化ける」事故が起きやすい
- 一方で、関数型ライブラリ（fp-ts 等）を導入するとチームの学習コストが上がり、TypeScript の標準機能で書けるものに比べてオンボーディングが重くなる

結果として、**「ドメイン層と UseCase 層では例外を投げず、失敗を型で表現する」**という強い規律を敷く必要があった。この規律は一度広がるとコードベース全域に浸透するため、後から部分的に緩めるのは困難で、明文化して判断基準を固定する価値が高い。

## 決定

**ドメイン関数（factory / 状態遷移）、UseCase、Repository は失敗を throw せず、自作の `Result<T, E>` を返す。** 実装は [`backend/src/shared/result.ts`](../../backend/src/shared/result.ts) に一元化する。

具体的な規律:

| 層 | 失敗の扱い |
|----|-----------|
| **models**（factory `create*()` / 状態遷移関数） | `Result<Entity, DomainError>` を返す。throw しない |
| **UseCases** | `Result<Output, UseCaseError>` を返す。throw しない。各 Result 値は `isErr` で短絡するか、`flatMap` で合成する |
| **repositories** | 成功系は値／`null`／配列を返す。インフラ例外（接続断など）は UseCase 側で `try/catch` せず、未ハンドルのままミドルウェアで 500 応答にする |
| **controllers** | UseCase の Err を `*-error-mappings.ts` の discriminated union `switch` で HTTP ステータスへマップする。controllers 自体は throw しない |
| **middleware / framework 境界** | Express のエラーハンドラと `express-openapi-validator` の検証失敗は例外で流してよい（層の都合。ドメインの内側には持ち込まない） |

エラー型は BC ごとに `errors/` ディレクトリで discriminated union として定義する:

```ts
export type CommunityError =
  | { type: 'NotFound'; communityId: CommunityId }
  | { type: 'AlreadyExists'; name: string }
  | { type: 'Forbidden'; reason: string };
```

Result の API は標準ヘルパー（`ok` / `err` / `isOk` / `isErr` / `map` / `mapErr` / `flatMap` / `unwrapOr`）のみで、過剰な combinator は追加しない。

## 理由と代替案

**採用した理由:**

- 失敗種別が戻り型に現れるため、controllers の HTTP マッピングで漏れると TypeScript が網羅性違反を検出できる（`switch` の `exhaustive check`）
- BC 境界で明示的にエラー情報を受け渡すため、「どこが何で失敗し得るか」がコードから読み取れる
- 標準の TypeScript だけで書けるため、オンボーディングコストが低い。Result 型自体はわずか 84 行で、チームメンバー全員が実装を読める
- throw と違い、try/catch のネストや「どこの catch で拾われるか」を考える必要がなく、制御フローが線形になる
- `Ok`/`Err` は単なるオブジェクトで、シリアライズ・ログ・デバッグが容易（スタックトレース付きの Error オブジェクトより扱いやすい）

**検討した代替案:**

- **代替案A: 素の `throw` とカスタム Error クラス階層** — NestJS / 多くの Express アプリで一般的。`class NotFoundError extends Error` 等を定義し、ミドルウェアで一括 HTTP マップ → 選ばなかった理由: 失敗種別が関数シグネチャに現れず、呼び出し側が catch を書き漏らしても型チェックで検出できない。BC 間で例外が伝播すると、想定外の例外が controllers を飛び越えて 500 に化けるリスクが高い。`instanceof` ベースのマッピングは、テスト・モックで Error クラス同士の混線を起こしやすい
- **代替案B: `neverthrow` ライブラリ** — `Result<T, E>` / `ResultAsync<T, E>` / `.andThen` / `.mapErr` などを提供する広く使われた TS ライブラリ → 選ばなかった理由: 本プロジェクトが必要とする API は `ok` / `err` / `map` / `flatMap` 程度に限定されており、外部依存を増やすほどの表面積ではない。`ResultAsync` のような専用抽象は学習コストを増やす。自作 84 行で全ユースケースを賄え、将来必要になれば差し替え可能
- **代替案C: `fp-ts` の `Either<E, A>` / `TaskEither`** — 本格的な関数型スタイル → 選ばなかった理由: `pipe` / `E.chain` / カリー化などのスタイルが非 FP 経験者に重すぎる。Either は引数順が `Either<E, A>`（エラーが左）で、本プロジェクトの自然な感覚（成功が先）と逆。学習コストが投資対効果に見合わない
- **代替案D: 何もしない（layer ごとに慣習に任せる）** — → 選ばなかった理由: BC が 5 個ある状況で規律を敷かないと、層や BC ごとにエラー表現がバラバラになり、controllers の HTTP マップ側が各種例外・戻り値の混成を扱うことになる。レビュー基準も毎回ブレる

## 影響

**ポジティブ:**

- エラー種別が型で可視化され、controllers の error mapping で網羅性違反がコンパイラに捕捉される（将来 BC や error variant を追加した際、マップ漏れを自動検出）
- ドメイン層の関数が純粋に近くなる（入力 → Result の変換で、副作用は repository / event bus に閉じる）
- Result 型の実装は自作 84 行で、チームが完全に把握できる。ブラックボックスが存在しない
- テストが書きやすい。`expect(result.ok).toBe(false); expect(result.error.type).toBe('NotFound')` のように Err の中身を直接アサートできる
- UseCase の合成（複数の Result を順に扱う）は `isErr` での早期 return ＋ `flatMap` で線形に書ける

**ネガティブ・リスク:**

- 新規メンバーが「Result を返すのになぜ throw したくなるのを我慢するのか」の規律を理解するまで時間がかかる。レビューで throw の混入を捕捉し続ける必要がある
- 非同期処理の合成で `Result<T, E>` と `Promise` を組み合わせた際、`async` 関数の戻り値が `Promise<Result<T, E>>` になり、ネストが深くなるケースがある（モナド合成ライブラリを入れていないため）
- `express-openapi-validator` / Prisma / JWT ライブラリなど外部のものが throw するため、境界で `try/catch` → `err(...)` への変換は手書きで書く必要がある
- 将来、非同期合成が頻出する場合に `neverthrow` や自作の `flatMapAsync` を追加する判断は残しておく必要がある。その時点で再評価する
