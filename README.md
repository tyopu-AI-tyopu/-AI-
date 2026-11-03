# フィジカルAI デイリー

フィジカルAIのニュースを**毎日自動で集め、AIで記事（ノート）にし、サイトとnoteで公開して収益化する**ための仕組みです。

## 全体の流れ

| 時刻（日本時間） | 担当 | 内容 |
|---|---|---|
| 6:47 | GitHub Actions | **収集**（`pipeline/collect.js`）: Google ニュース、The Robot Report、IEEE Spectrum、NVIDIA Blog、arXiv などのRSSから、フィジカルAI関連のニュースを集めて `data/raw/<日付>.json` にコミット |
| 7:40 | Claude の Routine | **記事化**: 収集データを読み、Web検索で補って、無料部分＋有料部分の記事を書く。公開用の記事を `content/daily/<日付>.md` に push |
| push 直後 | GitHub Actions | **公開**（`pipeline/build.js`）: サイトを作り直して GitHub Pages にデプロイ |

- Routine の作業手順は [`ROUTINE.md`](ROUTINE.md) に書いてあります。記事の構成や書き方を変えたいときは、このファイルを編集してください。
- 記事の**無料部分**は、今日の3行まとめと注目ニュース（出典リンク付き）です。**有料部分**は、深掘り分析、ビジネス・投資への示唆、日本企業への影響、今後のウォッチポイントです。
- 公開サイトには、トップページ（最新号とバックナンバー）、各日の記事ページ、RSSフィード、ノートアプリ（`/app/`）があります。ノートアプリでは「日次ノートを取り込む」で毎日の記事をノートとして保存できます。
- **note 用の完全版の原稿**（有料部分を含む）は、Routine のセッションの最終返信に全文で載ります。

## 収益化の仕組み

| 収益源 | 仕組み | 設定項目（`config/monetization.json`） |
|---|---|---|
| note の有料記事 | 完全版の原稿を note に投稿し、有料ラインより下を販売。サイトの各記事に「続きを読む」ボタンを表示 | `noteProfileUrl`, `paidPriceYen` |
| note メンバーシップ | 毎日の深掘り分析を月額で読める導線を表示 | `noteMembershipUrl` |
| ニュースレター | 無料登録への導線（読者リストを育てる） | `newsletterUrl` |
| 広告 | Google AdSense の広告枠を記事下に表示 | `adsenseClientId` |
| アフィリエイト | 関連書籍・講座などのリンク枠 | `affiliateLinks`（`{"label","url","note"}` の配列） |
| スポンサー | フッターに広告掲載の問い合わせ先を表示 | `sponsorContactUrl` |

空欄の項目は表示されません。各記事のフロントマターに `noteUrl: "https://note.com/..."` を追記すると、その日の「続きを読む」ボタンはその記事に直接リンクします（未設定ならプロフィールへリンク）。

> **有料部分の扱い**: 既定（`"commitPaidContent": false`）では、有料部分はリポジトリにもサイトにも載せず、Routine のセッションの返信にだけ出します。リポジトリが公開状態だと有料部分も誰でも読めてしまうためです。リポジトリを非公開にしていて、サイトでも全文を見せたい場合だけ `true` にしてください。

## セットアップ

1. **GitHub Pages**: Settings → Pages の Source を「GitHub Actions」にします。
2. **収益化の設定**: `config/monetization.json` に、note のURLなどを記入します。公開URLが決まったら `siteUrl` も入れてください（RSS と canonical に使います）。
3. **Routine**: Claude の Routine「フィジカルAI 朝刊」が、毎朝 7:40 に専用セッション「フィジカルAI 朝刊（Routine 実行用）」へ作業を依頼します。このセッションにはリポジトリと、このブランチへの push 権限が付いています。毎日同じセッションで続けて作業するため、セッションを削除・アーカイブしないでください。一覧・停止・時刻の変更は claude.ai の Routines 画面から行えます。

Claude API キーは不要です（記事は Routine の中で Claude が書きます）。

## 毎日の運用（note への投稿）

1. 毎朝、完了通知が届きます。専用セッション「フィジカルAI 朝刊（Routine 実行用）」を開きます（その日の分は一番下にあります）。
2. 最終返信にある原稿の1行目をタイトルに、残りを note の本文に貼り付けます。
3. 「▼ ここから有料」の位置に有料エリアの線を引き、価格を設定して公開します。
4. （任意）`content/daily/<日付>.md` のフロントマターに `noteUrl: "https://note.com/..."` を追記すると、サイトから直接その記事に誘導できます。

note には記事を自動投稿できる公式APIがないため、投稿だけは手作業です。

## note への下書き保存の自動化（パソコン側）

毎朝の Routine は、note 用の完全版原稿を非公開の受け渡しページ（https://claude.ai/artifact/3LotAWRYeUCFpZA6UkS1Vz 、持ち主だけが開けます）に載せます。
持ち主のパソコンの Claude デスクトップアプリの定期タスクが、Claude in Chrome で note を操作し、この原稿を**下書き保存**します。手順は [`NOTE_POSTING.md`](NOTE_POSTING.md) にあります。
有料エリアの設定と公開は、持ち主が行います。

## ローカルで動かす

```sh
npm test                              # パーサーなどのテスト
npm run collect                       # RSS から今日のニュースを収集
node pipeline/save.js article.md      # 書いた記事を保存（形式は ROUTINE.md）
npm run build && npx serve site       # サイトを生成して確認
```

- `DATE=2026-10-12` のように指定すると、その日付で実行できます。
- 収集元やキーワードは `pipeline/sources.js` で変更できます。

## コスト

GitHub Actions と GitHub Pages は、公開リポジトリなら無料枠の範囲で動きます。Routine は Claude のプランの利用枠を使います。

## そのほかのファイル

- `report/physical-ai-report.md` — フィジカルAIの調査レポート（2026年10月時点）
- `app/` — ノートアプリ。`app/index.html` をブラウザで直接開いても使えます。ノートはブラウザの中に保存されます。レポートを更新したら `npm run seed` で、アプリに埋め込むデータを作り直してください。
