import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const projectUrl = new URL("../", import.meta.url);

test("game shell contains onboarding, play, chronicle and save surfaces", async () => {
  const html = await readFile(new URL("public/index.html", projectUrl), "utf8");

  for (const id of [
    "character-form",
    "character-name",
    "creation-step-basic",
    "creation-step-build",
    "game-screen",
    "player-panel",
    "event-panel",
    "choice-list",
    "free-action-form",
    "free-action-input",
    "streaming-preview",
    "command-menu",
    "chronicle-panel",
    "provider-status",
    "mobile-nav",
    "save-drawer",
  ]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.doesNotMatch(html, /<title>[^<]*万古至尊/);
  assert.doesNotMatch(html, /作者：|class="author"/);
  assert.match(html, /app\.mjs/);
  assert.match(html, /styles\.css/);
});

test("visual system defines mobile, safe-area and reduced-motion behavior", async () => {
  const css = await readFile(new URL("public/styles.css", projectUrl), "utf8");

  assert.match(css, /@media \(max-width: 719px\)/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /touch-action: manipulation/);
  assert.doesNotMatch(css, /transition:\s*all/);
});

test("visual system uses the authoritative paper palette and readable CJK typography", async () => {
  const css = await readFile(new URL("public/styles.css", projectUrl), "utf8");

  for (const color of ["#FBF8F1", "#6FA698", "#C9A45C", "#3F3A34", "#2B2620", "#C05F55", "#E8E4DC"]) {
    assert.match(css, new RegExp(color, "i"));
  }
  assert.match(css, /color-scheme:\s*light/);
  assert.match(css, /--font-body:[^;]*Noto Sans SC[^;]*Microsoft YaHei/);
  assert.match(css, /body\s*\{[^}]*font-size:\s*16px/s);
  assert.doesNotMatch(css, /--ink-975|color-scheme:\s*dark/);
});

test("compact mobile layout makes creation fields single-column and keeps touch targets readable", async () => {
  const css = await readFile(new URL("public/styles.css", projectUrl), "utf8");

  assert.match(css, /@media\s*\(max-width:\s*359px\)/);
  assert.match(css, /\.field-row[^}]*grid-template-columns:\s*1fr/s);
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /\.intro-story h1\s*\{[^}]*font-size:\s*42px/s);
});

test("major choices are not auto-resolved and free action reaches the streaming Provider client", async () => {
  const app = await readFile(new URL("public/app.mjs", projectUrl), "utf8");

  assert.doesNotMatch(app, /gameState\s*=\s*resolveBreakthrough\(gameState\)\s*;\s*saveLocalGame[^}]*commitChoice/s);
  assert.match(app, /command === "\/突破"[\s\S]*renderBreakthroughPanel\(\)/);
  assert.match(app, /function renderBreakthroughPanel\(\)[\s\S]*attemptBreakthrough\(gameState,/);
  assert.match(app, /streamAgnesEvent\([^)]*action/s);
});

test("mobile game shell uses one dynamic viewport height budget", async () => {
  const [html, css, app] = await Promise.all([
    readFile(new URL("public/index.html", projectUrl), "utf8"),
    readFile(new URL("public/styles.css", projectUrl), "utf8"),
    readFile(new URL("public/app.mjs", projectUrl), "utf8"),
  ]);

  assert.match(html, /interactive-widget=resizes-content/);
  assert.match(css, /--app-height:\s*100svh/);
  assert.match(css, /@supports\s*\(height:\s*100dvh\)/);
  assert.match(css, /--app-height:\s*100dvh/);
  assert.match(css, /\.game-screen\s*\{[^}]*height:\s*var\(--app-height\)/s);
  assert.match(css, /\.game-layout\s*\{[^}]*height:\s*calc\(var\(--app-height\)\s*-\s*var\(--header-height\)\s*-\s*var\(--nav-height\)\)/s);
  assert.match(css, /--header-height:\s*calc\(59px\s*\+\s*env\(safe-area-inset-top\)\)/);
  assert.match(css, /--nav-height:\s*calc\(64px\s*\+\s*env\(safe-area-inset-bottom\)\)/);
  assert.match(app, /history\.scrollRestoration\s*=\s*"manual"/);
  assert.match(app, /classList\.toggle\("has-save",\s*Boolean\(savedGame\)\)/);
  assert.match(css, /\.intro-screen\s*\{[^}]*height:\s*var\(--app-height\)[^}]*overflow-y:\s*auto/s);
});

test("runtime viewport authority recovers from device emulation changes without horizontal panel drift", async () => {
  const [html, css, app] = await Promise.all([
    readFile(new URL("public/index.html", projectUrl), "utf8"),
    readFile(new URL("public/styles.css", projectUrl), "utf8"),
    readFile(new URL("public/app.mjs", projectUrl), "utf8"),
  ]);

  assert.match(html, /styles\.css\?v=20260824-r8/);
  assert.match(html, /app\.mjs\?v=20260824-r8/);
  assert.match(app, /function getEffectiveViewportWidth\(\)/);
  assert.match(app, /classList\.toggle\("compact-viewport"/);
  assert.match(app, /visualViewport\?\.addEventListener\("resize",\s*syncViewportMode/);
  assert.match(app, /addEventListener\("orientationchange",\s*syncViewportMode/);
  assert.match(app, /addEventListener\("pageshow",\s*syncViewportMode/);
  assert.match(app, /scrollLeft\s*=\s*0/);
  assert.match(css, /\.paper-panel\s*\{[^}]*overflow-x:\s*hidden/s);
  assert.match(css, /html\.compact-viewport\s+\.game-layout/);
  assert.match(css, /html\.compact-viewport\s+\.game-layout\[data-mobile-panel="event"\]\s+#event-panel/);
  assert.match(css, /\.event-panel\s*>\s*\*\s*\{[^}]*max-width:\s*100%/s);
  assert.match(css, /\.segmented-options input\s*\{[^}]*width:\s*1px[^}]*min-height:\s*0/s);
});
