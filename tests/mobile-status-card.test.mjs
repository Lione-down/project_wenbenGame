import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const projectUrl = new URL("../", import.meta.url);
const entryUrls = [
  new URL("index.html", projectUrl),
  new URL("public/index.html", projectUrl),
];

const statusIds = [
  "mobile-player-status",
  "mobile-player-name",
  "mobile-player-realm",
  "mobile-player-location",
  "mobile-player-abnormal",
  "mobile-vitality-bar",
  "mobile-vitality-value",
  "mobile-spirit-bar",
  "mobile-spirit-value",
  "mobile-cultivation-bar",
  "mobile-cultivation-value",
  "mobile-cultivation-needed",
];

test("both H5 entries expose the same semantic current-player status card", async () => {
  for (const entryUrl of entryUrls) {
    const html = await readFile(entryUrl, "utf8");
    assert.match(
      html,
      /<aside id="mobile-player-status" class="mobile-player-status" aria-label="当前玩家状态"[^>]*>/,
      entryUrl.pathname,
    );
    for (const id of statusIds) {
      assert.equal((html.match(new RegExp(`id="${id}"`, "g")) || []).length, 1, `${entryUrl.pathname}: ${id}`);
    }
    assert.match(html, /id="mobile-player-status"[\s\S]*此刻命盘[\s\S]*气血[\s\S]*灵力[\s\S]*修为[\s\S]*<\/aside>/);
  }
});

test("shared state rendering keeps the compact card in sync and hides it outside mainline", async () => {
  const app = await readFile(new URL("public/app.mjs", projectUrl), "utf8");

  for (const id of statusIds) {
    assert.match(app, new RegExp(`"${id}"`), id);
  }
  assert.match(app, /elements\["mobile-player-name"\]\.textContent = player\.name/);
  assert.match(app, /elements\["mobile-player-realm"\]\.textContent = `\$\{player\.realm\} · \$\{player\.realmStage\}`/);
  assert.match(app, /elements\["mobile-player-location"\]\.textContent = player\.location/);
  assert.match(app, /elements\["mobile-player-abnormal"\]\.textContent = player\.abnormal/);
  assert.match(app, /elements\["mobile-vitality-bar"\]\.value = resources\.vitality/);
  assert.match(app, /elements\["mobile-spirit-bar"\]\.value = resources\.spirit/);
  assert.match(app, /elements\["mobile-cultivation-bar"\]\.value = Math\.min\(needed, player\.cultivation\)/);
  assert.match(app, /function setMobilePlayerStatusVisible\(isVisible\)/);
  assert.match(app, /function renderEvent\([\s\S]*setMobilePlayerStatusVisible\(true\)/);
  assert.match(app, /function renderResolution\([\s\S]*setMobilePlayerStatusVisible\(false\)/);
  assert.match(app, /function renderSystemPanel\([\s\S]*setMobilePlayerStatusVisible\(false\)/);
});

test("compact portrait height gate fills spare space without changing short or landscape screens", async () => {
  const css = await readFile(new URL("public/styles.css", projectUrl), "utf8");

  assert.match(css, /\.mobile-player-status\s*\{[^}]*display:\s*none/s);
  assert.match(
    css,
    /@media \(orientation:\s*portrait\) and \(min-height:\s*760px\)[\s\S]*html\.compact-viewport \.mobile-player-status:not\(\[hidden\]\)\s*\{[^}]*display:\s*grid/s,
  );
  assert.match(css, /\.mobile-status-resource b\s*\{[^}]*font-size:\s*14px/s);
  assert.match(css, /html\.compact-viewport \.game-layout\[data-mobile-panel="event"\] #event-panel\s*\{[^}]*flex-direction:\s*column/s);
  assert.doesNotMatch(css, /(?:line-clamp|-webkit-line-clamp)/);
});
