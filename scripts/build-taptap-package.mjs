import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { access, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const PRODUCT_DIRECTORY_NAME = "tianming-zhiwai";

export const RUNTIME_FILES = Object.freeze([
  "index.html",
  "public/styles.css",
  "public/app.mjs",
  "public/character-options.mjs",
  "public/combat-system.mjs",
  "public/event-rules.mjs",
  "public/game-client.mjs",
  "public/game-data.mjs",
  "public/game-engine.mjs",
  "public/life-systems.mjs",
  "public/ui-presenters.mjs",
  "public/viewport-rules.mjs",
  "public/world-canon.mjs",
]);

export const PLAYER_KEY_RUNTIME_FILES = Object.freeze([
  "public/player-agnes.mjs",
  "lib/agnes-contract.mjs",
  "lib/agnes-game-snapshot.mjs",
  "lib/agnes-resolution-contract.mjs",
]);

const MAX_PACKAGE_BYTES = 300 * 1024 * 1024;
const API_BASE_META = '<meta name="destiny-api-base" content="">';
const API_MODE_META = '<meta name="destiny-api-mode" content="static">';
const forbiddenRuntimeText = [
  /AGNES_API_KEY/i,
  /Bearer\s+[A-Za-z0-9._-]{12,}/i,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i,
];

function isLoopback(hostname) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

function normalizeApiBase(value, { allowInsecureLoopback = false } = {}) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("api_base_invalid");
  }
  if (parsed.username || parsed.password) throw new Error("api_base_credentials_forbidden");
  if (parsed.search || parsed.hash) throw new Error("api_base_query_or_hash_forbidden");
  if (parsed.protocol !== "https:") {
    if (!(allowInsecureLoopback && parsed.protocol === "http:" && isLoopback(parsed.hostname))) {
      throw new Error("secure_https_required");
    }
  }
  return parsed.href.replace(/\/$/, "");
}

function assertInside(candidate, parent, label) {
  const resolvedCandidate = resolve(candidate);
  const resolvedParent = resolve(parent);
  if (resolvedCandidate === resolvedParent || !resolvedCandidate.startsWith(`${resolvedParent}${sep}`)) {
    throw new Error(`${label}_outside_allowed_directory`);
  }
  return resolvedCandidate;
}

function sanitizeBuildId(value) {
  const buildId = String(value ?? "").trim();
  if (!/^[A-Za-z0-9-]+$/.test(buildId)) throw new Error("build_id_invalid");
  return buildId;
}

function escapeHtmlAttribute(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

async function pathExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function runTar(args) {
  const result = spawnSync("tar.exe", args, {
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`tar_failed:${result.stderr || result.stdout || result.status}`);
  }
  return result.stdout;
}

function validateArchiveEntries(entries) {
  if (entries.length === 0) throw new Error("archive_empty");
  const normalizedEntries = entries.map((entry) => entry.replaceAll("\\", "/").replace(/^\.\//, ""));
  const roots = new Set(normalizedEntries.map((entry) => entry.split("/")[0]));
  if (roots.size !== 1 || !roots.has(PRODUCT_DIRECTORY_NAME)) throw new Error("archive_root_invalid");
  if (!normalizedEntries.includes(`${PRODUCT_DIRECTORY_NAME}/index.html`)) throw new Error("archive_entry_missing");
  if (normalizedEntries.some((entry) => entry.split("/").includes(".."))) throw new Error("archive_traversal_forbidden");
  return normalizedEntries;
}

function defaultBuildId() {
  return new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
}

export async function buildTapTapPackage({
  projectDirectory = fileURLToPath(new URL("../", import.meta.url)),
  outputDirectory = join(projectDirectory, "output", "taptap"),
  apiBaseUrl = "",
  playerKeySettings = false,
  allowInsecureLoopback = false,
  buildId = defaultBuildId(),
  archive = true,
} = {}) {
  const resolvedProject = resolve(projectDirectory);
  const outputRoot = resolve(resolvedProject, "output");
  const resolvedOutput = assertInside(outputDirectory, outputRoot, "output");
  const normalizedApiBase = normalizeApiBase(apiBaseUrl, { allowInsecureLoopback });
  if (playerKeySettings && normalizedApiBase) throw new Error("player_key_api_base_conflict");
  const safeBuildId = sanitizeBuildId(buildId);
  const variant = playerKeySettings ? "player-key-settings" : normalizedApiBase ? "online" : "proxy-ready";
  const runtimeFiles = playerKeySettings
    ? [...RUNTIME_FILES, ...PLAYER_KEY_RUNTIME_FILES]
    : RUNTIME_FILES;
  const fileBase = `${PRODUCT_DIRECTORY_NAME}-taptap-${variant}-${safeBuildId}`;
  const stagingDirectory = assertInside(join(resolvedOutput, `.build-${safeBuildId}-${process.pid}`), resolvedOutput, "staging");
  const productDirectory = assertInside(join(stagingDirectory, PRODUCT_DIRECTORY_NAME), stagingDirectory, "product");
  const zipPath = assertInside(join(resolvedOutput, `${fileBase}.zip`), outputRoot, "zip");
  const manifestPath = assertInside(join(resolvedOutput, `${fileBase}.manifest.json`), outputRoot, "manifest");

  await mkdir(resolvedOutput, { recursive: true });
  if (await pathExists(stagingDirectory)) throw new Error("staging_already_exists");
  if (archive && (await pathExists(zipPath) || await pathExists(manifestPath))) {
    throw new Error("package_output_already_exists");
  }

  const decoder = new TextDecoder("utf-8", { fatal: true });
  const runtime = [];
  let shouldCleanStaging = archive;
  try {
    await mkdir(productDirectory, { recursive: true });
    for (const relativePath of runtimeFiles) {
      if (/(?:^|\/)(?:\.env[^/]*|tests?|docs?|deploy|scripts?)(?:\/|$)/i.test(relativePath)) {
        throw new Error(`runtime_path_forbidden:${relativePath}`);
      }
      const sourcePath = assertInside(join(resolvedProject, relativePath), resolvedProject, "runtime_source");
      const destinationPath = assertInside(join(productDirectory, relativePath), productDirectory, "runtime_destination");
      const sourceBuffer = await readFile(sourcePath);
      let text = decoder.decode(sourceBuffer);
      if (relativePath === "index.html") {
        const matches = text.split(API_BASE_META).length - 1;
        if (matches !== 1) throw new Error("api_base_meta_contract_drift");
        text = text.replace(
          API_BASE_META,
          `<meta name="destiny-api-base" content="${escapeHtmlAttribute(normalizedApiBase)}">`,
        );
        const modeMatches = text.split(API_MODE_META).length - 1;
        if (modeMatches !== 1) throw new Error("api_mode_meta_contract_drift");
        text = text.replace(
          API_MODE_META,
          `<meta name="destiny-api-mode" content="${playerKeySettings ? "player-key" : "static"}">`,
        );
      }
      for (const forbidden of forbiddenRuntimeText) {
        if (forbidden.test(text)) throw new Error(`runtime_secret_pattern:${relativePath}`);
      }
      if (!allowInsecureLoopback && /https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?\/api/i.test(text)) {
        throw new Error(`runtime_localhost_api_forbidden:${relativePath}`);
      }
      await mkdir(dirname(destinationPath), { recursive: true });
      await writeFile(destinationPath, text, "utf8");
      runtime.push({ path: relativePath, bytes: Buffer.byteLength(text, "utf8"), sha256: sha256(text) });
    }

    const baseManifest = {
      schemaVersion: 1,
      productDirectory: PRODUCT_DIRECTORY_NAME,
      playerKeySettings: Boolean(playerKeySettings),
      keyEmbedded: false,
      apiBaseConfigured: Boolean(normalizedApiBase),
      apiBaseUrl: normalizedApiBase || null,
      runtime,
    };

    if (!archive) {
      shouldCleanStaging = false;
      return {
        ...baseManifest,
        stagingDirectory,
        productDirectory,
        zipPath: null,
        manifestPath: null,
        zipSha256: null,
      };
    }

    runTar(["-a", "-c", "-f", zipPath, "-C", stagingDirectory, PRODUCT_DIRECTORY_NAME]);
    const zipStat = await stat(zipPath);
    if (zipStat.size <= 0 || zipStat.size > MAX_PACKAGE_BYTES) throw new Error("archive_size_invalid");
    const entries = validateArchiveEntries(
      runTar(["-tf", zipPath]).split(/\r?\n/).map((entry) => entry.trim()).filter(Boolean),
    );
    const zipSha256 = sha256(await readFile(zipPath));
    const manifest = {
      ...baseManifest,
      archive: {
        fileName: zipPath.slice(zipPath.lastIndexOf(sep) + 1),
        bytes: zipStat.size,
        entryCount: entries.length,
      },
      zipSha256,
    };
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    return {
      ...manifest,
      stagingDirectory,
      productDirectory,
      zipPath,
      manifestPath,
      zipSha256,
    };
  } finally {
    if (shouldCleanStaging) await rm(stagingDirectory, { recursive: true, force: true });
  }
}

function parseCliArgs(argv) {
  const options = {};
  for (const argument of argv) {
    if (argument.startsWith("--api-base-url=")) options.apiBaseUrl = argument.slice("--api-base-url=".length);
    else if (argument.startsWith("--build-id=")) options.buildId = argument.slice("--build-id=".length);
    else if (argument === "--player-key-settings") options.playerKeySettings = true;
    else if (argument === "--offline-safe") options.apiBaseUrl = "";
    else if (argument === "--allow-insecure-loopback") options.allowInsecureLoopback = true;
    else throw new Error(`unknown_argument:${argument}`);
  }
  return options;
}

const isCli = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isCli) {
  const result = await buildTapTapPackage(parseCliArgs(process.argv.slice(2)));
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
