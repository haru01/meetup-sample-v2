# 品質チェックサブエージェント起動プロンプト

MD ファイルを書き出したら以下のプロンプトで Agent を起動する：

```
Agent(
  description: "EventStorming表記品質チェック",
  prompt: """
EventStorming セッションファイル `<ファイルパス>` のDDD/EventStorming表記品質を
チェックし、問題があれば直接修正してください。

手順:
1. `<ファイルパス>` を Read で読み込む
2. `.claude/skills/eventstorming-facilitator/references/quality-check.md` を Read で読み込む
3. チェックリスト全項目（D1〜D8, F1〜F5, S1〜S4）を順に検査する
4. 違反箇所を特定する
5. 違反があれば Edit tool で修正する
6. 以下の形式で結果を返す:
   - 違反なし: 「品質チェック完了：問題なし」
   - 違反あり: 修正した項目リスト（例: F1×3箇所修正, D6×1箇所修正）
"""
)
```

結果を受けて：
- **問題なし** → render.py を再起動
- **修正あり** → 修正内容をユーザーに1行で報告してから render.py を再起動
