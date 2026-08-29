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
    assert.match(html, /id="request-clear-agnes-key"/);
    assert.match(html, /Key 仅保存在当前设备浏览器/);
    assert.match(html, /直接发送给 Agnes/);
    assert.match(html, /不要在公共设备保存/);
  }
});

test("app treats player-key mode as local credential authority without an automatic connection call", async () => {
  const app = await readFile(join(projectDirectory, "public", "app.mjs"), "utf8");

  assert.match(app, /apiMode === "player-key"/);
  assert.match(app, /loadPlayerAgnesKey\(\{ sessionStorage, localStorage \}\)/);
  assert.match(app, /savePlayerAgnesKey/);
  assert.match(app, /clearPlayerAgnesKey/);
  assert.match(app, /testPlayerAgnesConnection/);
  assert.match(app, /toggle-agnes-key-visibility/);
  assert.doesNotMatch(app, /console\.(?:log|warn|error)\([^\n]*(?:agnes-key-input|PLAYER_AGNES_|apiKey)/i);
});

test("settings drawer keeps mobile controls readable and touchable", async () => {
  const css = await readFile(join(projectDirectory, "public", "styles.css"), "utf8");

  assert.match(css, /\.agnes-settings-view/);
  assert.match(css, /\.secret-input-row/);
  assert.match(css, /\.agnes-settings-actions/);
  assert.match(css, /\.agnes-key-warning/);
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

    const runtimeText = (await Promise.all(
      entries
        .filter((entry) => !entry.endsWith("/"))
        .map((entry) => readFile(join(extractDirectory, entry), "utf8")),
    )).join("\n");
    assert.doesNotMatch(runtimeText, /AGNES_API_KEY|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i);

    const manifest = JSON.parse(await readFile(result.manifestPath, "utf8"));
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
