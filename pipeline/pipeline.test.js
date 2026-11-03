import { test } from "node:test";
import assert from "node:assert/strict";
import { parseFeed } from "./rss.js";
import { score, keyOf } from "./collect.js";
import { splitArticle } from "./save.js";
import { parseFrontmatter, toFrontmatter, PAID_MARKER } from "./lib.js";

test("RSS 2.0 をパースできる", () => {
  const xml = `<rss><channel><item><title><![CDATA[NVIDIA、新しい &amp; GR00T を発表]]></title>
    <link>https://example.com/a</link><pubDate>Mon, 12 Oct 2026 01:00:00 GMT</pubDate>
    <description>&lt;p&gt;ヒューマノイド向け&lt;/p&gt;</description><source url="x">日経</source></item></channel></rss>`;
  const [it] = parseFeed(xml);
  assert.equal(it.title, "NVIDIA、新しい & GR00T を発表");
  assert.equal(it.link, "https://example.com/a");
  assert.equal(it.summary, "ヒューマノイド向け");
  assert.equal(it.source, "日経");
});

test("Atom をパースできる", () => {
  const xml = `<feed><entry><title>Humanoid robot paper</title><link href="https://arxiv.org/abs/1"/>
    <updated>2026-10-12T00:00:00Z</updated><summary>VLA model</summary></entry></feed>`;
  const [it] = parseFeed(xml);
  assert.equal(it.link, "https://arxiv.org/abs/1");
  assert.equal(it.summary, "VLA model");
});

test("関連度と重複キー", () => {
  assert.ok(score({ title: "Figure AI humanoid robot", summary: "" }, false) >= 2);
  assert.equal(score({ title: "Stock market today", summary: "" }, false), 0);
  assert.equal(keyOf({ title: "Tesla Optimus 量産へ - 日経新聞" }), keyOf({ title: "Tesla Optimus 量産へ - Reuters" }));
});

test("記事を無料・有料・タグに分割できる", () => {
  const a = splitArticle(`# 今日のタイトル\n\n## 今日の3行まとめ\n- a\n\n${PAID_MARKER}\n\n## 深掘り分析\n本文\n\nTAGS: フィジカルAI, #ロボット`);
  assert.equal(a.title, "今日のタイトル");
  assert.match(a.free, /3行まとめ/);
  assert.doesNotMatch(a.free, /深掘り/);
  assert.match(a.paid, /深掘り分析/);
  assert.deepEqual(a.tags, ["フィジカルAI", "ロボット"]);
});

test("フロントマターの往復", () => {
  const meta = { title: "a: b", tags: ["x"], sources: 3, hasPaid: true };
  assert.deepEqual(parseFrontmatter(toFrontmatter(meta) + "\nbody").meta, meta);
});

import { weightedLength, intentUrl, parseDraft } from "./xpost.js";

test("X の文字数（日本語は2、URLは23）", () => {
  assert.equal(weightedLength("abc"), 3);
  assert.equal(weightedLength("日本語"), 6);
  assert.equal(weightedLength("見て https://example.com/very/long/path?x=1"), 2 * 2 + 1 + 23);
});

test("X の投稿文を本文とリプライに分け、投稿リンクを作る", () => {
  const d = parseDraft("MAIN:\n今日の要点\n#フィジカルAI\n\nREPLY:\n続きはこちら {URL}\n");
  assert.equal(d.main, "今日の要点\n#フィジカルAI");
  assert.equal(d.reply, "続きはこちら {URL}");
  assert.equal(intentUrl("a b#c"), "https://x.com/intent/post?text=a%20b%23c");
});

import { handoffHtml, PAID_LINE } from "./note-handoff.js";

test("note 受け渡しページに日付・本文・有料ラインの目印が入る", () => {
  const html = handoffHtml({ date: "2026-11-03", title: "T<1>", free: "## 無料\n本文", paid: "## 有料\n分析", tags: ["フィジカルAI"] });
  assert.match(html, /name="note-draft-date" content="2026-11-03"/);
  assert.match(html, /id="note-title">T&lt;1&gt;</);
  assert.ok(html.includes(PAID_LINE));
  assert.match(html, /#フィジカルAI/);
  assert.match(handoffHtml(null), /まだ原稿がありません/);
});
