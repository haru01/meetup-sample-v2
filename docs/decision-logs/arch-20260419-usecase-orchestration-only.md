# UseCase は Orchestration only — ドメインロジックは models に閉じ込める

日付: 2026-04-19
種類: arch
ステータス: 承認済み

## コンテキスト

DDD の層構造（controllers → usecases → models / repositories / services）を採用しているが、UseCase 層には「どこまで書いて良いか」の判断が常につきまとう。現場で揺れやすい例:

- エンティティ生成時の `createdAt` は UseCase で `new Date()` するのか、入力として受け取るのか
- 新しい集約の ID は UseCase が `createCommunityId()` を直接呼ぶのか、controllers で生成して渡すのか
- 集約の部分更新（例: コミュニティ名の変更）で UseCase が `{ ...community, name, updatedAt: new Date() }` と spread で組み立てて良いのか

これらを個別に決めないと、UseCase に少しずつドメイン知識が滲み出し、結果として:

- 同じ不変条件（「name 変更時は updatedAt も動かす」など）が UseCase と models の両方に書かれる（DRY 違反）
- もしくは UseCase だけに書かれて models が貧血症（anemic domain model）になり、ドメイン層がただのデータ構造に退化する
- 時刻や ID が UseCase 内部で生成されるとテストで差し替え不能になり、`vi.useFakeTimers()` や UUID のモック合戦が始まる

本リポジトリは BC が 5 個（community / event / participation / checkin / notification）あり、UseCase も 20 本以上ある。規律が最初に揺らぐと、後から全 UseCase を直して回るコストが跳ね上がる。そこで、**UseCase に書いて良いこと／書いてはいけないこと**の判断基準を固定する必要がある。

## 決定

**UseCase は Orchestration only（調整役）に徹する。** ドメインの不変条件・状態遷移・生成ロジックは `models/` に置く。

UseCase で **禁止する** 操作:

| 禁止事項 | 代わりにどうするか |
|----------|-------------------|
| `new Date()` の直接呼び出し | controllers または composition root で `new Date()` し、UseCase の入力（`createdAt: Date` など）として受け取る。UseCase は受け取った値を models の factory / 遷移関数に渡すだけ |
| `randomUUID()` や `createXxxId()` の直接呼び出し | controllers で `createCommunityId()` 等を呼び、`id: CommunityId` を入力として受け取る |
| 集約の部分更新を spread で組み立てる（`{ ...community, name: newName, updatedAt: now }`） | `models/` に遷移関数（例: `renameCommunity(community, newName, now): Result<Community, E>`）を置き、UseCase はそれを呼ぶだけにする |

UseCase に**置いて良い**こと:

- Repository / Service の呼び出しと結果の組み立て（`findById` → Result 型で分岐 → `save` → `eventBus.publish`）
- ユースケース固有の前提条件チェック（重複チェック、上限チェックなど）でドメイン不変条件に属さないもの
- BC を跨ぐイベント発行（`eventBus.publish(event)`）

実例: [create-community.command.ts](../../backend/src/community/usecases/commands/create-community.command.ts) は、重複チェック → 上限チェック → `createCommunity(...)` factory 呼び出し → repository save → event publish の**流れだけ**を記述している。`new Date()` も ID 生成も UseCase 内にはない（[community.controller.ts:49-52](../../backend/src/community/controllers/community.controller.ts#L49-L52) で生成して UseCase に注入）。

## 理由と代替案

**採用した理由:**

- **テスタビリティ**: `new Date()` と ID 生成を UseCase から排除すると、ユースケーステストは入力 `createdAt` / `id` を固定値として渡すだけで決定的になる。`vi.useFakeTimers()` や UUID モックが不要になる
- **不変条件の所在が一点に定まる**: 「name 変更時は updatedAt も動く」のような不変条件を models の遷移関数に閉じ込めれば、UseCase 側で同じロジックを書く誘惑が消える
- **貧血症ドメインモデルの回避**: 遷移関数を models に書く習慣がつくと、ドメイン層が行動を持つようになる。UseCase はオーケストレーション、models はビジネスルール、という責務分離が物理的に保たれる
- **レビュー負荷の低減**: UseCase の PR で「`new Date()`・ID 生成・spread」を機械的に検出でき、議論の前に客観的な指摘ができる
- **既存実装がすでにこの規律に従っている**: 現状のコードベースで違反はなく、明文化するだけで以降の回帰を防げる

**検討した代替案:**

- **代替案A: UseCase にドメインロジックを書くことを許容する（伝統的な "Application Service" 流）** → 選ばなかった理由: 一度許すと境界線が流動的になり、レビューで「これは UseCase に書くべき？models に書くべき？」の議論が毎回発生する。結果として同じ不変条件が重複して書かれる・UseCase が 200 行を超えて肥大化する等の劣化が発生しやすい
- **代替案B: Clock / IdGenerator インタフェースを DI する** → 選ばなかった理由: 抽象化を増やして UseCase がそれを呼ぶ構造は、「時刻取得・ID 生成を UseCase の責務にする」点で本決定と哲学が逆方向。DI で隠すより、controllers が入力として明示的に渡すほうが、UseCase のテストが引数だけで決定できて単純
- **代替案C: Active Record / Rich Entity にすべて寄せる** → 選ばなかった理由: 本プロジェクトは `readonly interface` ベースでエンティティを定義しており、メソッドを持たない。クラスベースの Rich Entity に切り替えるのは別問題（別 ADR の範疇）
- **代替案D: 規約を明文化せず AGENTS.md の一文で済ませる** → 選ばなかった理由: 既に AGENTS.md には「UseCases are orchestration only」と書かれているが、具体的な禁止事項 3 点（`new Date()` / ID 生成 / spread）は CLAUDE.md に分散して記載されているのみ。理由を含めた判断根拠がなければ、レビューで「なぜダメなのか」の議論が再発する

## 影響

**ポジティブ:**

- UseCase のテストが決定的になる（入力を固定値で渡すだけ、時刻や UUID のモック不要）
- ドメイン不変条件の所在が `models/` に一元化され、仕様変更時の影響範囲が局所化する
- レビューで「`new Date()` / `randomUUID()` / spread」を発見したら即指摘できる、客観的な基準ができる
- 新規 BC 追加時も、UseCase のテンプレート（入力受け取り → 前提チェック → factory 呼び出し → save → publish）が再利用できる
- `models/` に遷移関数が集まることで、ドメイン層の読みやすさが向上する（「この集約が何をできるか」が models を読めば分かる）

**ネガティブ・リスク:**

- controllers の責務が少し増える（`new Date()` と ID 生成のコード行）。ただし controllers は HTTP 境界の薄い層で、そこに数行追加する影響は小さい
- 「UseCase 固有の前提条件チェック（重複チェック、上限チェック）」と「ドメイン不変条件」の境界はケースバイケースで判断が必要。本 ADR では「リポジトリ問い合わせが必要な前提条件は UseCase、純粋関数で表現できる不変条件は models」を目安とするが、微妙なケースは個別判断
- spread 禁止の徹底には、models 側に遷移関数を用意する初期コストがかかる。ただし一度書けば BC 内の全ユースケースで再利用できる
- 将来、`models/` に遷移関数が増えすぎて肥大化した場合は、集約ごとにファイル分割やサブディレクトリ化を検討する必要がある（現時点では未発生）

## 再評価のトリガー

以下のいずれかが発生したら、本決定を再評価する:

- `models/` のファイルが 800 行を超え、集約単位での分割が必要になったとき
- 「UseCase 固有の前提条件」vs「ドメイン不変条件」の境界判断が繰り返しブレるユースケースが現れたとき
- Clock / IdGenerator の DI が必要になる特殊な要件（分散時刻同期、ID 予約など）が発生したとき
