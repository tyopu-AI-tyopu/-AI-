// Routine が書いた記事（Markdown）を保存する
//   使い方: node pipeline/save.js <記事ファイル.md>
//   - content/daily/<日付>.md … サイトで公開する記事（既定では無料部分のみ）
//   - out/note/<日付>.md       … note.com に貼り付ける完全版の原稿（有料部分を含む。コミットしない）
// 記事ファイルの形式は ROUTINE.md を参照（# タイトル、<!-- PAID --> 区切り、最終行に TAGS:）
import fs from "node:fs";
import { p, todayJst, readJson, writeFile, loadConfig, toFrontmatter, PAID_MARKER } from "./lib.js";

export function splitArticle(text) {
  let tags = [];
  const lines = text.split("\n");
  const ti = lines.findLastIndex(l => /^TAGS:/i.test(l.trim()));
  if (ti >= 0) {
    tags = lines[ti].replace(/^\s*TAGS:/i, "").split(/[,、]/).map(s => s.trim().replace(/^#/, "")).filter(Boolean);
    lines.splice(ti, 1);
  }
  const body = lines.join("\n").trim();
  const titleLine = body.split("\n").find(l => /^# /.test(l));
  const title = titleLine ? titleLine.slice(2).trim() : "フィジカルAI ニュース";
  const withoutTitle = titleLine ? body.replace(titleLine, "").trim() : body;
  const [free, ...rest] = withoutTitle.split(PAID_MARKER);
  return { title, tags, free: free.trim(), paid: rest.join("\n").trim() };
}

export function noteDraft({ title, tags, free, paid }, config) {
  const price = config.paidPriceYen ? `（有料ライン: ${config.paidPriceYen}円）` : "";
  return `${title}

${free}

---
▼ ここから有料${price} ― note の編集画面でこの位置に「有料エリア設定」の線を引いてください
---

${paid}

${tags.map(t => "#" + t.replace(/\s+/g, "")).join(" ")}
`;
}

function main() {
  const file = process.argv[2];
  if (!file) { console.error("使い方: node pipeline/save.js <記事ファイル.md>"); process.exit(1); }
  const date = todayJst();
  const art = splitArticle(fs.readFileSync(file, "utf8"));
  if (!art.free) { console.error("記事の無料部分が空です"); process.exit(1); }
  if (!art.paid) console.warn(`! ${PAID_MARKER} が見つからないため、有料部分なしで保存します`);

  const config = loadConfig();
  const urls = [...new Set((art.free + "\n" + art.paid).match(/https?:\/\/[^)\s]+/g) || [])];
  const raw = readJson(p("data", "raw", `${date}.json`), null);
  const meta = {
    title: art.title, date, tags: art.tags,
    sources: urls.length, collected: raw?.items.length ?? 0,
    generator: "routine", hasPaid: !!art.paid,
  };
  const publicBody = config.commitPaidContent && art.paid ? `${art.free}\n\n${PAID_MARKER}\n\n${art.paid}` : art.free;
  writeFile(p("content", "daily", `${date}.md`), toFrontmatter(meta) + "\n" + publicBody + "\n");
  writeFile(p("out", "note", `${date}.md`), noteDraft(art, config));
  writeFile(p("out", "note", `${date}.json`), JSON.stringify({ date, ...art }, null, 2) + "\n");
  console.log(`保存しました: content/daily/${date}.md（公開用）, out/note/${date}.md（note用の完全版）`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
