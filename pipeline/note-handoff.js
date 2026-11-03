// note 原稿の受け渡しページ（非公開の Artifact）を作る
//   使い方: node pipeline/note-handoff.js   … out/note/<日付>.json から out/note/handoff.html を作る
// Routine がこのページを毎朝同じ Artifact の URL に上書き公開し、
// パソコン側の定期タスク（NOTE_POSTING.md）が読み取って note に下書き保存する。
// 読み取り用の目印: meta[name=note-draft-date] / #note-title / #note-body / #note-raw / #note-tags
import fs from "node:fs";
import { p, todayJst } from "./lib.js";

await import("../app/markdown.js");
const md = globalThis.renderMarkdown;
const esc = globalThis.escapeHtml;

export const PAID_LINE = "【ここから有料】";

export function handoffHtml(d) {
  const ready = !!d;
  const date = d?.date || "";
  const plain = ready ? `${d.free}\n\n${PAID_LINE}\n\n${d.paid}` : "";
  const tags = ready ? d.tags.map(t => "#" + t.replace(/\s+/g, "")).join(" ") : "";
  return `<title>note 原稿受け渡し</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="note-draft-date" content="${esc(date)}">
<style>
/* 1カラムの作業用ページ: 上に状態と操作、下に原稿本文 */
:root {
  --bg: #f6f7f5; --panel: #ffffff; --fg: #1d2420; --muted: #5d6862; --line: #dde2de;
  --accent: #2a7a5a; --paid: #a65f12;
  --font-body: "Noto Sans JP", system-ui, sans-serif;
  --font-mono: "IBM Plex Mono", ui-monospace, monospace;
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {
  --bg: #151a17; --panel: #1d2420; --fg: #e4e9e5; --muted: #9aa5a0; --line: #2f3833;
  --accent: #5cc496; --paid: #e6a453; color-scheme: dark } }
:root[data-theme="dark"] {
  --bg: #151a17; --panel: #1d2420; --fg: #e4e9e5; --muted: #9aa5a0; --line: #2f3833;
  --accent: #5cc496; --paid: #e6a453; color-scheme: dark }
body { background: var(--bg); color: var(--fg); font: 15px/1.8 var(--font-body);
  padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); padding-block: 24px 48px }
.wrap { max-width: 760px; margin: 0 auto; display: grid; gap: 20px }
.status { display: flex; flex-wrap: wrap; gap: 8px 16px; align-items: baseline; font-size: 13px; color: var(--muted) }
.status b { color: var(--accent); font-family: var(--font-mono); font-size: 14px }
h1 { font-size: 22px; line-height: 1.45; margin: 0; text-wrap: balance }
.actions { display: flex; flex-wrap: wrap; gap: 8px }
button { font: inherit; font-size: 13px; padding: 6px 14px; border-radius: 6px; border: 1px solid var(--accent);
  background: transparent; color: var(--accent); cursor: pointer }
button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px }
article { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 8px 20px 20px; min-width: 0; overflow-wrap: anywhere }
article h2 { font-size: 19px; margin: 24px 0 6px } article h3 { font-size: 16px; margin: 18px 0 4px }
article a { color: var(--accent) }
article .paid { color: var(--paid); font-weight: 700; border-block: 1px dashed var(--paid); padding: 6px 0; margin: 20px 0 }
.tags { font-family: var(--font-mono); font-size: 13px; color: var(--muted) }
details summary { cursor: pointer; color: var(--muted); font-size: 13px }
textarea { width: 100%; min-height: 240px; font: 12px/1.6 var(--font-mono); color: var(--fg); background: var(--panel);
  border: 1px solid var(--line); border-radius: 6px; padding: 10px; box-sizing: border-box }
.empty { color: var(--muted) }
</style>
<div class="wrap">
  <div class="status"><span>note 原稿</span><b>${ready ? esc(date) : "未作成"}</b><span>${ready ? "毎朝の Routine が更新します" : "次の Routine の実行後に原稿が入ります"}</span></div>
  ${ready ? `<h1 id="note-title">${esc(d.title)}</h1>
  <div class="actions">
    <button type="button" data-copy="note-title-text">タイトルをコピー</button>
    <button type="button" data-copy="note-raw">本文（テキスト）をコピー</button>
    <button type="button" data-copy="note-tags">ハッシュタグをコピー</button>
  </div>
  <article id="note-body">
    ${md(d.free)}
    <p class="paid">${PAID_LINE}</p>
    ${md(d.paid)}
  </article>
  <p class="tags" id="note-tags">${esc(tags)}</p>
  <details><summary>本文のテキスト版</summary>
    <textarea id="note-raw" readonly>${esc(plain)}</textarea>
  </details>
  <span id="note-title-text" hidden>${esc(d.title)}</span>` : `<p class="empty">まだ原稿がありません。</p>`}
</div>
<script>
document.querySelectorAll("[data-copy]").forEach(b => b.addEventListener("click", async () => {
  const el = document.getElementById(b.dataset.copy);
  const text = el.value ?? el.textContent;
  const label = b.textContent;
  try { await navigator.clipboard.writeText(text); b.textContent = "コピーしました"; }
  catch { if (el.select) { el.closest("details").open = true; el.select(); } b.textContent = "選択しました。手動でコピーしてください"; }
  setTimeout(() => { b.textContent = label; }, 2000);
}));
</script>
`;
}

function main() {
  const date = todayJst();
  const src = p("out", "note", `${date}.json`);
  const d = fs.existsSync(src) ? JSON.parse(fs.readFileSync(src, "utf8")) : null;
  if (!d && !process.argv.includes("--empty")) { console.error(`${src} がありません。先に save.js を実行してください`); process.exit(1); }
  fs.mkdirSync(p("out", "note"), { recursive: true });
  fs.writeFileSync(p("out", "note", "handoff.html"), handoffHtml(d));
  console.log("out/note/handoff.html を作りました");
}

if (import.meta.url === `file://${process.argv[1]}`) main();
