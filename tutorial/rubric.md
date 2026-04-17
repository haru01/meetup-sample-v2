# AI 駆動開発ワークショップ — ルーブリック

## 概要

本ルーブリックは、Claude Code を用いた AI 駆動開発の習熟度を **7 つの能力軸 x 4 段階** で評価する。
Claude Code 公式ベストプラクティス（[Best Practices](https://code.claude.com/docs/en/best-practices) / [Common Workflows](https://code.claude.com/docs/en/common-workflows)）を根拠とし、meetup-sample リポジトリを教材に 3 日間で段階的に習得する。

### 対象者

- プログラミング経験はあるが AI 駆動開発は初めて、または試し始めたばかりの方
- **ワークショップ目標: 全軸 L2〜L3**（L2 を確実に押さえ、L3 に手が届く状態を目指す）
- L4 はワークショップ後の自律的な実践で到達する領域として参考掲載

---

## 評価軸と到達レベル

### 1. モードの理解と使い分け

AI との対話モードの違いを理解し、タスクに応じて適切に選択できる。

> **公式根拠**: [Plan Mode](https://code.claude.com/docs/en/common-workflows#use-plan-mode-for-safe-code-analysis) — 読み取り専用で調査・計画。[Auto Mode](https://code.claude.com/docs/en/permission-modes#eliminate-prompts-with-auto-mode) — 承認を自動化。公式推奨フロー: Explore → Plan → Implement → Commit

| レベル | 基準 |
|--------|------|
| **L1 — 初学** | Claude Code を起動してプロンプトを入力できる。モードの違いを意識していない |
| **L2 — 基礎** | Plan Mode（Shift+Tab）と Normal Mode の違いを説明できる。Plan Mode で調査し、Normal Mode で実装するという流れを実践できる |
| **L3 — 実践** | タスクの性質に応じてモードを意図的に切り替えられる。小さな修正は直接実行し、複数ファイルにまたがる変更は Plan → Implement で進められる |
| **L4 — 応用** | Auto Mode、Permission 設定、Worktree 分離を組み合わせた自律実行ワークフローを設計できる。`claude -p` による非対話実行を CI やスクリプトに組み込める |

---

### 2. 意図の伝達

修正意図や要求を AI に的確に伝え、フロントエンド・バックエンドの変更を実現できる。意図が伝わらなかったとき、その要因を診断して改善できる。

> **公式根拠**: [Provide specific context](https://code.claude.com/docs/en/best-practices#provide-specific-context-in-your-prompts) — ファイル指定、制約、既存パターン参照。[Let Claude interview you](https://code.claude.com/docs/en/best-practices#let-claude-interview-you) — AI に質問させて要件を明確化。[Develop your intuition](https://code.claude.com/docs/en/best-practices#develop-your-intuition) — 「Claude が苦戦したとき、なぜかを問え。コンテキストがノイズだらけだったか? プロンプトが曖昧すぎたか? タスクが大きすぎたか?」

| レベル | 基準 |
|--------|------|
| **L1 — 初学** | 「〇〇を直して」のような曖昧な指示しかできない。期待する結果を説明できない |
| **L2 — 基礎** | What（何を変えたいか）を伝えられる。`@ファイル名` でコンテキストを与える、スクリーンショットを貼るなどの手段を使える |
| **L3 — 実践** | What + Why + 受入基準 + 既存パターンへの参照を組み合わせて伝えられる。AI の出力が期待と異なったとき、「プロンプトが曖昧だったか / コンテキストが不足していたか / タスクが大きすぎたか」を切り分けて次のプロンプトを改善できる |
| **L4 — 応用** | 「インタビューして」と AI に質問させ、仕様を SPEC.md に書き出してから新しいセッションで実装する — という公式推奨フローを実践できる。うまくいったプロンプトの構造（スコープ、コンテキスト提供方法、モード選択）を言語化し、再現可能な知見として蓄積できる |

---

### 3. コードリーディングと軌道修正

AI が生成したコードを読み解き、問題を発見したら早期に軌道修正できる。期待と異なる出力の原因を分析し、次のアクションを改善できる。

> **公式根拠**: [Give Claude a way to verify](https://code.claude.com/docs/en/best-practices#give-claude-a-way-to-verify-its-work) — テスト・期待出力で自己検証させる（最もレバレッジが高い）。[Course-correct early](https://code.claude.com/docs/en/best-practices#course-correct-early-and-often) — Esc で中断、/rewind で巻き戻し。[Develop your intuition](https://code.claude.com/docs/en/best-practices#develop-your-intuition) — 良い出力が出たときも悪い出力が出たときも「なぜか」を観察する

| レベル | 基準 |
|--------|------|
| **L1 — 初学** | AI の出力をそのまま受け入れる。diff を確認しない |
| **L2 — 基礎** | 生成コードの diff を読み、何が変わったか把握できる。テストを実行して動作確認できる。明らかな問題（命名、重複）を指摘できる |
| **L3 — 実践** | プロジェクト規約への準拠を確認できる。問題を見つけたら Esc で即座に止め、具体的なリファクタリング指示を出せる。2 回修正して直らなければ「コンテキストが汚れた」と判断し `/clear` して再出発できる。なぜ期待と違ったか（コンテキスト不足? 指示の曖昧さ? タスク粒度?）を振り返り、次のプロンプトに反映できる |
| **L4 — 応用** | 検証手段込み（テスト → 実装 → テスト実行）で依頼できる。`/rewind` で別アプローチを試す判断ができる。良い出力が出たときも「何が効いたか（プロンプト構造、モード、コンテキスト量）」を観察し、成功パターンを再現できる |

---

### 4. AI 出力の安定化（プロジェクト設定）

CLAUDE.md / hooks / skills を活用し、AI 出力の品質と一貫性を向上させられる。

> **公式根拠**: [Write an effective CLAUDE.md](https://code.claude.com/docs/en/best-practices#write-an-effective-claudemd) — 短く、検証可能に、定期的にレビュー。[Set up hooks](https://code.claude.com/docs/en/best-practices#set-up-hooks) — 例外なく毎回実行されるべきアクション。[Create skills](https://code.claude.com/docs/en/best-practices#create-skills) — オンデマンドのドメイン知識

| レベル | 基準 |
|--------|------|
| **L1 — 初学** | プロジェクト設定ファイルの存在を知らない。毎回同じ注意事項を手動で伝える |
| **L2 — 基礎** | CLAUDE.md の役割を理解している。`/init` で生成し、既存の設定を読んで AI がどのルールに従っているか説明できる。「CLAUDE.md に書くべきもの / 書かないもの」の区別がつく |
| **L3 — 実践** | 過去の AI 出力の問題パターンから、CLAUDE.md にルールを追加・修正できる。「Claude が正しくやっているなら削除」「重要度の高いルールには IMPORTANT を付与」という運用ができる。hooks で lint や format を自動実行する設定ができる |
| **L4 — 応用** | CLAUDE.md の階層構造（グローバル / プロジェクト / ディレクトリ）を設計できる。skills でオンデマンドのワークフローを定義し、CLAUDE.md の肥大化を防げる。subagent 定義（`.claude/agents/`、[公式ドキュメント参照](https://code.claude.com/docs/en/sub-agents)）でレビューや調査を自動化できる |

---

### 5. AI を使った学習と理解の深化

AI にコードを書かせるだけでなく、ドメイン・技術・AI 活用法の 3 層で理解を深められる。AI 任せで学びが止まる「学習障害」を自覚し、意図的に学習を設計できる。

> **公式根拠**: [Ask codebase questions](https://code.claude.com/docs/en/best-practices#ask-codebase-questions) — シニアエンジニアに聞くように質問する。[Explore first, then plan](https://code.claude.com/docs/en/best-practices#explore-first-then-plan-then-code) — 実装の前にまず理解する。[Develop your intuition](https://code.claude.com/docs/en/best-practices#develop-your-intuition) — うまくいったときも苦戦したときも「なぜか」を観察する

**学習の 3 層:**

| 層 | 問いの例 | 学べること |
|----|----------|-----------|
| **ドメイン理解** | 「なぜメンバーシップに OWNER / ADMIN / MEMBER の 3 ロールがあるのか?」 | ビジネスルール、ユーザーの課題、設計の背景にある意図 |
| **技術理解** | 「Result 型を使う利点は? 例外を throw するのと何が違う?」 | アーキテクチャパターン、言語機能、ライブラリの仕組み |
| **AI 活用理解** | 「さっきのプロンプトでなぜ良い出力が出たのか?」 | プロンプト設計、モード選択、コンテキスト管理の勘所 |

**AI 任せの学習障害サイン:**
- AI が生成したコードの意味を説明できない
- 同じ種類のタスクを何度依頼しても自分では書けない
- エラーが出ると考える前に AI に丸投げする
- 「動いたからOK」で理解を省略する

| レベル | 基準 |
|--------|------|
| **L1 — 初学** | AI を「答えを出す道具」としてのみ使う。生成されたコードの意味を問わず、動けば OK で終わる |
| **L2 — 基礎** | **ドメイン層**: 「この機能はどういうユーザーの課題を解決している?」と質問できる。**技術層**: 「ログイン処理をフロントから DB までトレースして」とシニアエンジニアに聞くように質問できる。AI の回答を読んで理解しようとする |
| **L3 — 実践** | **3 層すべて**で掘り下げられる。「なぜ A ではなく B を選んだ?」「このパターンのトレードオフは?」「さっきのプロンプトはなぜうまくいった?」。AI の説明を自分の言葉で他者に伝えられる。学習障害サインに自覚的で、理解が浅い部分は意図的に伴奏モードで学ぶ判断ができる |
| **L4 — 応用** | AI の説明を批判的に検証できる（git history, 実コード, 公式ドキュメントとの照合）。学んだ概念を別の文脈に応用し、AI なしでも設計判断ができる。「この部分は AI に任せても学びがない」「この部分は自分で考えないと成長しない」の線引きを意識的にできる |

---

### 6. 伴奏と委託の使い分け

対話的な協働（伴奏）と自律的な委任（委託）を場面に応じて選択できる。

> **公式根拠**: [Use subagents for investigation](https://code.claude.com/docs/en/best-practices#use-subagents-for-investigation) — 調査をサブエージェントに委譲しメインコンテキストを保護。[Run multiple sessions](https://code.claude.com/docs/en/best-practices#run-multiple-claude-sessions) — Writer/Reviewer パターン。[Manage context aggressively](https://code.claude.com/docs/en/best-practices#manage-context-aggressively) — コンテキストウィンドウは最重要リソース

| レベル | 基準 |
|--------|------|
| **L1 — 初学** | 使い分けの概念がない。すべて同じ方法で依頼する |
| **L2 — 基礎** | 伴奏（ステップバイステップで一緒に進める）と委託（まとめて任せる）の違いを説明できる。コンテキストウィンドウが最重要リソースであることを理解している |
| **L3 — 実践** | 不慣れな領域は伴奏で学びながら進め、定型作業は委託する。`/clear` でタスク間のコンテキストをリセットする習慣がある。「サブエージェントを使って調査して」とメインコンテキストを保護する指示ができる |
| **L4 — 応用** | Writer/Reviewer パターン（実装セッションとレビューセッションの分離）を実践できる。Worktree で並列作業し、subagent に検証を委譲し、完了後にマージする — という一連のワークフローを設計・実行できる |

---

### 7. 計画レビューと出力レビュー

AI が提案する計画や生成したコードを適切なタイミングでレビューし、品質を担保できる。

> **公式根拠**: [Explore first, then plan, then code](https://code.claude.com/docs/en/best-practices#explore-first-then-plan-then-code) — 計画レビューは実装前、Ctrl+G でエディタで編集。[Avoid common failure patterns](https://code.claude.com/docs/en/best-practices#avoid-common-failure-patterns) — 5 つの失敗パターン。[Course-correct early](https://code.claude.com/docs/en/best-practices#course-correct-early-and-often) — 最初の出力でずれに気づく

**レビュータイミングの指針:**
- **計画レビュー**: Plan Mode で計画が出た直後、実装に移る前（Ctrl+G で編集 → 承認）
- **中間レビュー**: 実装中に最初のファイル変更が出たタイミング（方向性の確認）
- **出力レビュー**: 実装完了後、コミット前（diff 確認、テスト実行、規約チェック）
- **振り返り**: セッション終了時（うまくいった点・改善点の言語化）

| レベル | 基準 |
|--------|------|
| **L1 — 初学** | AI の提案をレビューせずに承認する。失敗パターンに陥っていることに気づかない |
| **L2 — 基礎** | Plan Mode の計画を読み、ステップの妥当性を確認できる。Ctrl+G でエディタで計画を編集してから実行に移れる。コミット前に diff を確認する習慣がある。5 つの公式失敗パターンを知っている |
| **L3 — 実践** | 上記 4 つのタイミングでレビューを実践できる。計画の抜け漏れ（エッジケース、セキュリティ、テスト不足）を指摘できる。出力レビューで規約違反やアーキテクチャ逸脱を発見し、修正を指示できる。自分が今どの失敗パターンに陥りかけているか自覚できる |
| **L4 — 応用** | レビュー観点をサブエージェント（code-reviewer, security-reviewer）に委譲し、体系的なレビュープロセスを構築できる。レビューで繰り返し発見される問題を CLAUDE.md や hooks にフィードバックして再発を防止できる |

---

## 公式失敗パターンと対応軸

| 失敗パターン | 意味 | 主に学ぶ軸 |
|-------------|------|-----------|
| **Kitchen sink session** | 無関係なタスクを同じセッションに詰め込む | 6（伴奏と委託）|
| **繰り返し修正** | 2 回直しても治らないのに同じセッションで粘る | 3（軌道修正）|
| **過剰な CLAUDE.md** | ルールが多すぎて重要な指示が埋もれる | 4（出力安定化）|
| **Trust-then-verify gap** | 検証なしで AI の出力を信頼する | 3（コードリーディング）, 7（出力レビュー）|
| **Infinite exploration** | スコープなしの調査でコンテキストを消費する | 6（委託 / サブエージェント）|

---

## 3 日間ワーク対応表

あとで

---

## 総合到達レベル

| 総合レベル | 目安 | ワークショップとの関係 |
|------------|------|----------------------|
| **Beginner** | 全軸 L1-L2。AI ツールの基本操作ができる | Day 1 終了時点 |
| **Intermediate** | 全軸 L2 以上、過半数で L3。実務で AI 駆動開発を実践できる | **Day 3 終了時点の目標** |
| **Advanced** | 全軸 L3 以上、複数軸で L4。チームに AI 駆動開発を導入・指導できる | ワークショップ後の自律的実践で到達 |

---

## 公式ドキュメント参照リンク

| リソース | URL |
|----------|-----|
| Best Practices | https://code.claude.com/docs/en/best-practices |
| Common Workflows | https://code.claude.com/docs/en/common-workflows |
| How Claude Code Works | https://code.claude.com/docs/en/how-claude-code-works |
| Context Window | https://code.claude.com/docs/en/context-window |
| CLAUDE.md (Memory) | https://code.claude.com/docs/en/memory |
| Subagents | https://code.claude.com/docs/en/sub-agents |
| Skills | https://code.claude.com/docs/en/skills |
| Hooks Guide | https://code.claude.com/docs/en/hooks-guide |
| Permission Modes | https://code.claude.com/docs/en/permission-modes |
