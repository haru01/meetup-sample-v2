---
name: japanese-commit
description: Git コミットメッセージを Conventional Commits prefix 付き・日本語で生成するスキル。コミット作成時、`/commit` 実行時、または「コミットして」「commit して」等の依頼時に必ず使用する。差分の内容を分析し、適切な prefix を選び、日本語でタイトルとボディを記述し、末尾にスコープタグを付ける。
---

# Japanese Commit — 日本語コミットメッセージ生成

Git の差分を分析し、Conventional Commits 形式の prefix + 日本語タイトル + スコープタグで日本語コミットメッセージを生成する。

## コミットメッセージのフォーマット

```
<prefix>: <日本語タイトル> (<ドメイン>,<レイヤー>)

<日本語ボディ（任意）>

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
```

スコープタグはタイトル行の末尾に `()` で付ける。`git log --grep=meetup` や `--grep=copilot-cli` で横断検索しやすくするため。

## Prefix の選び方

差分の「意図」を読み取って選ぶ。ファイル拡張子やパスだけで機械的に判断しない。

| prefix | いつ使うか | 例 |
|--------|-----------|-----|
| `feat` | ユーザーに見える新機能の追加 | 新しい API エンドポイント、UI コンポーネント |
| `fix` | バグ修正 | 既存の振る舞いが壊れていたのを直す |
| `refactor` | 振る舞いを変えないコード改善 | 型をスキーマ由来に統一、関数の分割 |
| `docs` | ドキュメントのみの変更 | README、CLAUDE.md、JSDoc のみ |
| `test` | テストのみの追加・修正 | テストファイルだけの変更 |
| `chore` | ビルド、CI、依存関係などの雑務 | package.json、tsconfig、CI 設定 |
| `style` | フォーマットのみ（セミコロン、空白など） | Prettier 適用のみ |
| `perf` | パフォーマンス改善 | クエリ最適化、キャッシュ追加 |

**判断に迷ったら**: 複数の prefix が当てはまる場合は、変更の主な目的を表す prefix を選ぶ。例えば「リファクタリングしつつバグも直した」→ メインの意図が修正なら `fix`。

## スコープタグの付け方

タイトル行の末尾に `(<ドメイン>,<レイヤー>)` を付ける。

### 構成要素

| 位置 | 種類 | 値の例 | 説明 |
|------|------|--------|------|
| 1 | ドメイン | `auth`, `meetup`, `shared` | 変更対象のドメインコンテキスト |
| 2 | レイヤー | `back`, `front`, `e2e` | 変更対象のレイヤー。複数可 |

### 例

- `feat: ログイン機能を追加 (auth,back)`
- `fix: メンバー一覧の表示崩れを修正 (meetup,front)`
- `refactor: インラインリテラル型をスキーマ由来の型に統一 (meetup,back)`
- `refactor: API レスポンス型を統一 (meetup,front,back)`
- `test: メンバー承認の E2E テストを追加 (meetup,e2e)`
- `docs: スキーマ由来型パターンを追記 (claude)`
- `chore: 依存関係を更新 (deps)`

### 省略ルール

- ドメインやレイヤーが自明でない場合（CLAUDE.md、CI 設定など）は省略してよい

## タイトル行のルール

- **日本語で書く**（英語禁止）
- **50文字以内を目安に**簡潔に（スコープタグを除いて数える）
- **「何をしたか」ではなく「何のためにしたか」**を書く
  - 良い例: `refactor: インラインリテラル型をスキーマ由来の型に統一 (meetup,back,copilot-cli)`
  - 悪い例: `refactor: ファイルを編集 (meetup,back,copilot-cli)`
- 末尾のスコープタグの前にスペースを1つ入れる
- 句点（。）を付けない
- 体言止めか動詞の終止形で終わる

## ボディのルール

- 変更が単純で自明ならボディは省略してよい
- 複数の変更をまとめてコミットする場合は、箇条書きで変更内容を列挙する
- 「なぜこの変更が必要だったか」の背景があれば含める
- 行は72文字程度で折り返す

## 実際の手順

1. `git status` と `git diff`（ステージ済み＋未ステージ）で変更内容を把握する
2. `git log --oneline -5` で直近のコミットスタイルも確認する
3. 差分を分析し、prefix・タイトル・スコープタグ・ボディを決める
4. 関連ファイルをステージングする（`git add` で個別指定、`-A` は避ける）
5. HEREDOC 形式でコミットする:

```bash
git commit -m "$(cat <<'EOF'
<prefix>: <日本語タイトル> (<ドメイン>,<レイヤー>)

<日本語ボディ（任意）>

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

6. `git status` で成功を確認する

## 例

**例 1: バックエンドのリファクタリング**
```
refactor: インラインリテラル型をスキーマ由来の型に統一 (meetup,back)

- CommunityMember の role/status を CommunityMemberRole/CommunityMemberStatus 型に変更
- controller の as キャストをスキーマ型に置換
- OpenAPI 定義でドメインスキーマを再利用し制約の重複を排除

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
```

**例 2: フロント・バック両方の機能追加**
```
feat: ログインレスポンスにアカウント情報を追加 (auth,front,back)

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
```

**例 3: ドキュメント更新**
```
docs: スキーマ由来型パターンを CLAUDE.md に追記 (claude)

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
```
