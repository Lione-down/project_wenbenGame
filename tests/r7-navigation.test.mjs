import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const projectUrl = new URL("../", import.meta.url);

test("every local system panel exposes a dedicated route back to the current mainline", async () => {
  const [html, app] = await Promise.all([
    readFile(new URL("public/index.html", projectUrl), "utf8"),
    readFile(new URL("public/app.mjs", projectUrl), "utf8"),
  ]);

  assert.match(html, /id="return-to-mainline"[^>]*>返回当前主线</);
  assert.match(app, /function returnToMainline\(\)/);
  assert.match(app, /canResumeMainline\(currentEvent,\s*currentEventTurn,\s*gameState\.meta\.turn\)/);
  assert.match(app, /renderEvent\(currentEvent\)/);
  assert.match(app, /elements\["return-to-mainline"\]\.addEventListener\("click",\s*returnToMainline\)/);

  const systemPanelBody = app.match(/function renderSystemPanel\([\s\S]*?\n}\n\nfunction renderCultivationPanel/)?.[0] ?? "";
  assert.ok(systemPanelBody, "renderSystemPanel should remain present");
  assert.doesNotMatch(systemPanelBody, /currentEvent\s*=\s*null/);
});
