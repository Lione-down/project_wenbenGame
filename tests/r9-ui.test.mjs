import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

test("R9 system pages provide category tabs and multi-grid content without modal overflow", async () => {
  const [app, css] = await Promise.all([source("public/app.mjs"), source("public/styles.css")]);
  assert.match(app, /system-category-tabs/);
  assert.match(app, /data-system-category/);
  assert.match(css, /\.system-category-tabs\s*\{/);
  assert.match(css, /\.system-grid\s*\{[^}]*grid-template-columns/s);
  assert.doesNotMatch(css, /transition:\s*all/);
});

test("R9 breakthrough UI explicitly renders held and missing materials", async () => {
  const app = await source("public/app.mjs");
  assert.match(app, /missingMaterialLabels/);
  assert.match(app, /缺少/);
  assert.match(app, /持有/);
});

test("R9 NPC ecology uses clickable names and an inline dossier with death details", async () => {
  const [html, app, css] = await Promise.all([
    source("public/index.html"), source("public/app.mjs"), source("public/styles.css"),
  ]);
  assert.match(html, /id="npc-dossier"/);
  assert.match(app, /getNpcDossier/);
  assert.match(app, /npc-dossier-trigger/);
  assert.match(css, /\.npc-dossier/);
  assert.match(app, /deathCause|死因/);
});

test("R9 generation and resolution failures expose explicit retry buttons", async () => {
  const html = await source("public/index.html");
  const app = await source("public/app.mjs");
  assert.match(html, /id="retry-generation"/);
  assert.match(html, /id="retry-resolution"/);
  assert.match(app, /retry-generation/);
  assert.match(app, /retry-resolution/);
});
