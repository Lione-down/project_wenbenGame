import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const projectUrl = new URL("../", import.meta.url);

test("runtime viewport authority combines effective width and height", async () => {
  const app = await readFile(new URL("public/app.mjs", projectUrl), "utf8");

  assert.match(app, /function getEffectiveViewportHeight\(\)/);
  assert.match(app, /window\.visualViewport\?\.height/);
  assert.match(app, /shouldUseCompactViewport\(getEffectiveViewportWidth\(\),\s*getEffectiveViewportHeight\(\)\)/);
});

test("the root shell fills the viewport while long content scrolls only inside its surface", async () => {
  const css = await readFile(new URL("public/styles.css", projectUrl), "utf8");

  assert.match(css, /#main-content\s*\{[^}]*width:\s*100%[^}]*height:\s*var\(--app-height\)[^}]*overflow:\s*hidden/s);
  assert.match(css, /\.intro-screen\s*\{[^}]*width:\s*100%[^}]*max-width:\s*100%[^}]*overflow-x:\s*hidden[^}]*overflow-y:\s*auto/s);
  assert.match(css, /\.game-screen\s*\{[^}]*width:\s*100%[^}]*max-width:\s*100%[^}]*height:\s*var\(--app-height\)[^}]*overflow:\s*hidden/s);
  assert.match(css, /html\.compact-viewport\s+\.game-layout\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/s);
  assert.match(css, /\.paper-panel\s*\{[^}]*overflow-x:\s*hidden[^}]*overflow-y:\s*auto/s);
});
