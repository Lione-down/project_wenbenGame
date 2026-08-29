import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const projectUrl = new URL("../", import.meta.url);
const rootEntryUrl = new URL("index.html", projectUrl);
const staticModeMeta = '<meta name="destiny-api-mode" content="static">';

test("package root entry loads public assets through package-relative paths", async () => {
  const html = await readFile(rootEntryUrl, "utf8");

  assert.match(html, /<title>天命之外<\/title>/);
  assert.match(html, /href="\.\/public\/styles\.css\?v=20260824-r8"/);
  assert.match(html, /src="\.\/public\/app\.mjs\?v=20260824-r8-static405"/);
  assert.doesNotMatch(html, /(?:href|src)="\/(?:styles\.css|app\.mjs)/);
  assert.doesNotMatch(html, /(?:AGNES_API_KEY|\.env(?:\.local)?|secret[-_ ]?(?:key|token))/i);
});

test("package root entry matches the Node server entry after path normalization", async () => {
  const [rootHtml, publicHtml] = await Promise.all([
    readFile(rootEntryUrl, "utf8"),
    readFile(new URL("public/index.html", projectUrl), "utf8"),
  ]);
  const normalizedRootHtml = rootHtml
    .replace(`    ${staticModeMeta}\n`, "")
    .replace("app.mjs?v=20260824-r8-static405", "app.mjs?v=20260824-r8")
    .replaceAll('href="./public/', 'href="/')
    .replaceAll('src="./public/', 'src="/');

  assert.equal(normalizedRootHtml, publicHtml);
});

test("package root entry declares static API mode", async () => {
  const html = await readFile(rootEntryUrl, "utf8");

  assert.match(html, new RegExp(staticModeMeta));
});

test("shared app fails closed in static mode unless an external proxy is configured", async () => {
  const app = await readFile(new URL("public/app.mjs", projectUrl), "utf8");

  assert.match(app, /const apiMode = document\.querySelector\('[^']*destiny-api-mode[^']*'\)\?\.content \|\| "local"/);
  assert.match(app, /configureGameApiBase/);
  assert.match(app, /if \(apiMode === "static" && !apiBaseUrl\)/);
  assert.match(app, /const status = await requestProviderStatus\(fetch\)/);
  assert.doesNotMatch(app, /fetch\("\/api\/status"/);
});
