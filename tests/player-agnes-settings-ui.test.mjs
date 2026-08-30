import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { access, mkdir, readFile, rm, stat } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const projectDirectory = fileURLToPath(new URL("../", import.meta.url));

test("both entries expose an accessible player Agnes settings subview", async () => {
  const [rootEntry, publicEntry] = await Promise.all([
    readFile(join(projectDirectory, "index.html"), "utf8"),
    readFile(join(projectDirectory, "public", "index.html"), "utf8"),
  ]);

  for (const html of [rootEntry, publicEntry]) {
    assert.match(html, /id="open-agnes-settings-intro"/);
    assert.match(html, /id="open-agnes-settings"/);
    assert.match(html, /id="agnes-settings-view"/);
    assert.match(html, /id="agnes-key-input"[^>]*type="password"[^>]*autocomplete="off"/);
    assert.match(html, /id="remember-agnes-key"[^>]*type="checkbox"/);
    assert.match(html, /id="toggle-agnes-key-visibility"[^>]*aria-pressed="false"/);
    assert.match(html, /id="save-agnes-settings"/);
    assert.match(html, /id="test-agnes-connection"/);
    assert.match(html, /id="test-taptap-connection"/);
    assert.match(html, /id="agnes-transport-status"/);
    assert.match(html, /id="agnes-connection-diagnostic"/);
    assert.match(html, /当前 Transport/);
    assert.match(html, /TapTap H5/);
    assert.match(html, /扫码真机/);
    assert.match(html, /browser\.fetch/);
    assert.doesNotMatch(html, /最终验收必须以 TapTap 扫码真机的 tap\.request/);
    assert.match(html, /id="request-clear-agnes-key"/);
    assert.match(html, /id="get-agnes-key-link"[^>]*href="https:\/\/platform\.agnes-ai\.cn\/login"/);
    assert.match(html, /id="get-agnes-key-link"[^>]*target="_blank"[^>]*rel="noopener noreferrer"/);
    assert.match(html, /手机浏览器/);
    assert.match(html, /不会出现在公网可访问的游戏页面/);
    assert.match(html, /Key 仅保存在当前设备浏览器/);
    assert.match(html, /直接发送给 Agnes/);
    assert.match(html, /不要在公共设备保存/);
  }
});

test("app loads player Agnes settings in local and player-key modes without an automatic connection call", async () => {
  const app = await readFile(join(projectDirectory, "public", "app.mjs"), "utf8");

  assert.match(app, /const supportsPlayerAgnesSettings = \["local", "player-key"\]\.includes\(apiMode\)/);
  assert.match(app, /if \(supportsPlayerAgnesSettings\)/);
  assert.match(app, /loadPlayerAgnesKey\(\{ sessionStorage, localStorage \}\)/);
  assert.match(app, /savePlayerAgnesKey/);
  assert.match(app, /clearPlayerAgnesKey/);
  assert.match(app, /testPlayerAgnesConnection/);
  assert.match(app, /getPlayerAgnesTransport/);
  assert.match(app, /const playerAgnesTransportPolicy = apiMode === "player-key" \? "browser-fetch" : "auto"/);
  assert.match(app, /transportPolicy:\s*playerAgnesTransportPolicy/);
  assert.doesNotMatch(app, /requireTapRequest:\s*true/);
  assert.match(app, /test-taptap-connection/);
  assert.match(app, /toggle-agnes-key-visibility/);
  assert.match(app, /Agnes 模块加载失败，请更新游戏包后重试。/);
  assert.doesNotMatch(app, /此构建未启用玩家 Key 设置。/);
  assert.doesNotMatch(app, /浏览器无法连接本地游戏服务/);
  assert.match(app, /连接中断，未收到完整的 Agnes 响应/);
  assert.doesNotMatch(app, /console\.(?:log|warn|error)\([^\n]*(?:agnes-key-input|PLAYER_AGNES_|apiKey)/i);
});

test("player-key browser dependency graph avoids unsupported JSON import attributes", async () => {
  const [worldKnowledge, builderSource] = await Promise.all([
    readFile(join(projectDirectory, "public", "world-knowledge.mjs"), "utf8"),
    readFile(join(projectDirectory, "scripts", "build-taptap-package.mjs"), "utf8"),
  ]);

  assert.doesNotMatch(worldKnowledge, /\bwith\s*\{\s*type\s*:\s*["']json["']\s*\}/);
  assert.match(worldKnowledge, /from\s+["']\.\/assets\/world\/world-data\.mjs["']/);
  assert.match(builderSource, /public\/assets\/world\/world-data\.mjs/);
});

test("WebView-compatible world data stays aligned with the canonical JSON assets", async () => {
  const worldDirectory = join(projectDirectory, "public", "assets", "world");
  const jsonFiles = [
    "locations.json",
    "factions.json",
    "characters.json",
    "techniques.json",
    "martial_skills.json",
    "items.json",
    "realms.json",
    "events.json",
  ];
  const canonicalEntries = (await Promise.all(
    jsonFiles.map(async (fileName) => JSON.parse(await readFile(join(worldDirectory, fileName), "utf8"))),
  )).flat();
  const { default: browserEntries } = await import("../public/assets/world/world-data.mjs");
  const byId = (entries) => [...entries].sort((left, right) => left.id.localeCompare(right.id));

  assert.deepEqual(byId(browserEntries), byId(canonicalEntries));
});

test("settings drawer keeps mobile controls readable and touchable", async () => {
  const css = await readFile(join(projectDirectory, "public", "styles.css"), "utf8");

  assert.match(css, /\.agnes-settings-view/);
  assert.match(css, /\.secret-input-row/);
  assert.match(css, /\.agnes-settings-actions/);
  assert.match(css, /\.agnes-key-warning/);
  assert.match(css, /\.agnes-key-source/);
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /overscroll-behavior:\s*contain/);
  assert.doesNotMatch(css, /\.agnes-settings[^}]*transition:\s*all/i);
});

test("builder emits a separate player-key-settings package without embedded secrets", async () => {
  const builder = await import("../scripts/build-taptap-package.mjs");
  const outputDirectory = join(projectDirectory, "output", `player-key-focused-${process.pid}`);
  const extractDirectory = join(outputDirectory, "extracted");
  try {
    const result = await builder.buildTapTapPackage({
      projectDirectory,
      outputDirectory,
      playerKeySettings: true,
      buildId: "focused",
      archive: true,
    });
    assert.match(result.zipPath, /player-key-settings/);
    const zipStat = await stat(result.zipPath);
    assert.ok(zipStat.size > 0 && zipStat.size <= 300 * 1024 * 1024);

    const { stdout } = await execFileAsync("tar.exe", ["-tf", result.zipPath], { encoding: "utf8" });
    const entries = stdout.split(/\r?\n/).map((entry) => entry.trim().replaceAll("\\", "/")).filter(Boolean);
    assert.deepEqual([...new Set(entries.map((entry) => entry.split("/")[0]))], [builder.PRODUCT_DIRECTORY_NAME]);
    assert.ok(entries.includes(`${builder.PRODUCT_DIRECTORY_NAME}/index.html`));
    assert.ok(entries.includes(`${builder.PRODUCT_DIRECTORY_NAME}/public/player-agnes.mjs`));
    assert.ok(entries.includes(`${builder.PRODUCT_DIRECTORY_NAME}/lib/agnes-contract.mjs`));
    assert.ok(entries.every((entry) => !/(?:^|\/)(?:\.env[^/]*|tests?|docs?|deploy|scripts?|pitfalls\.md|server\.mjs)(?:\/|$)/i.test(entry)));

    await mkdir(extractDirectory, { recursive: true });
    await execFileAsync("tar.exe", ["-xf", result.zipPath, "-C", extractDirectory]);
    const productDirectory = join(extractDirectory, builder.PRODUCT_DIRECTORY_NAME);
    const indexHtml = await readFile(join(productDirectory, "index.html"), "utf8");
    assert.match(indexHtml, /<meta name="destiny-api-mode" content="player-key">/);
    for (const match of indexHtml.matchAll(/(?:href|src)="([^"]+)"/g)) {
      const resource = match[1].split("?")[0];
      if (resource.startsWith("./")) await access(resolve(productDirectory, resource));
    }

    const textRuntimeEntries = entries.filter((entry) => /\.(?:html|mjs)$/.test(entry));
    const textRuntimeFiles = await Promise.all(
      textRuntimeEntries.map(async (entry) => ({
        entry,
        text: await readFile(join(extractDirectory, entry), "utf8"),
      })),
    );
    const localModuleSpecifiers = textRuntimeFiles.flatMap(({ entry, text }) =>
      [...text.matchAll(/["']((?:\.\.\/|\.\/|\/)[^"']+\.mjs(?:\?v=[^"']+)?)['"]/g)]
        .map((match) => ({ entry, specifier: match[1] })),
    );
    assert.ok(localModuleSpecifiers.length > 20, "expected the packaged ES module graph to be inspected");
    assert.deepEqual(
      localModuleSpecifiers.filter(({ specifier }) => !specifier.endsWith("?v=focused")),
      [],
      "every packaged local ES module URL must use this package buildId as its cache revision",
    );

    const runtimeText = (await Promise.all(
      entries
        .filter((entry) => !entry.endsWith("/"))
        .map((entry) => readFile(join(extractDirectory, entry), "utf8")),
    )).join("\n");
    assert.doesNotMatch(runtimeText, /AGNES_API_KEY|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i);

    const manifest = JSON.parse(await readFile(result.manifestPath, "utf8"));
    assert.equal(manifest.cacheRevision, "focused");
    assert.equal(manifest.playerKeySettings, true);
    assert.equal(manifest.keyEmbedded, false);
    assert.equal(manifest.apiBaseConfigured, false);
    assert.doesNotMatch(JSON.stringify(manifest), /keyPrefix|keyLength|keyHash|authorization/i);
  } finally {
    const resolvedOutput = resolve(outputDirectory);
    const allowedParent = `${resolve(projectDirectory, "output")}${sep}`;
    assert.ok(resolvedOutput.startsWith(allowedParent));
    await rm(resolvedOutput, { recursive: true, force: true });
  }
});
