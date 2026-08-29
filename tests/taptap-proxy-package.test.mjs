import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { access, mkdir, readFile, rm, stat } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import { createGameServer } from "../server.mjs";

const execFileAsync = promisify(execFile);
const projectDirectory = fileURLToPath(new URL("../", import.meta.url));
const allowedOrigin = "https://game.example.taptap.io";

function applicationSse(complete) {
  return new Response(`event: complete\ndata: ${JSON.stringify(complete)}\n\n`, {
    status: 200,
    headers: { "Content-Type": "text/event-stream; charset=utf-8" },
  });
}

async function listen(server) {
  await new Promise((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolveListen);
  });
  const address = server.address();
  return `http://127.0.0.1:${address.port}`;
}

async function close(server) {
  await new Promise((resolveClose) => server.close(resolveClose));
}

test("external API base accepts production HTTPS and local loopback QA only", async () => {
  const client = await import("../public/game-client.mjs");

  assert.equal(typeof client.configureGameApiBase, "function", "missing external API base authority");
  assert.equal(typeof client.resolveGameApiUrl, "function", "missing API URL resolver");
  assert.equal(
    client.configureGameApiBase("https://proxy.example.com/agnes/", {
      pageUrl: "https://game.example.taptap.io/play",
    }),
    "https://proxy.example.com/agnes",
  );
  assert.equal(client.resolveGameApiUrl("/api/status"), "https://proxy.example.com/agnes/api/status");
  assert.throws(
    () => client.configureGameApiBase("http://proxy.example.com", {
      pageUrl: "https://game.example.taptap.io/play",
    }),
    /secure_https_required/,
  );
  assert.throws(
    () => client.configureGameApiBase("https://user:pass@proxy.example.com"),
    /api_base_credentials_forbidden/,
  );
  assert.equal(
    client.configureGameApiBase("http://127.0.0.1:43123", {
      pageUrl: "http://127.0.0.1:43122/",
    }),
    "http://127.0.0.1:43123",
  );
  client.configureGameApiBase("");
});

test("status fate stream and resolution share the configured proxy origin", async () => {
  const client = await import("../public/game-client.mjs");
  assert.equal(typeof client.requestProviderStatus, "function", "missing status client");
  assert.equal(typeof client.configureGameApiBase, "function", "missing proxy configuration");

  const requestedUrls = [];
  const fetchImpl = async (url) => {
    requestedUrls.push(String(url));
    if (String(url).endsWith("/api/status")) {
      return Response.json({ configured: true, model: "agnes-2.5-flash" });
    }
    if (String(url).endsWith("/api/fate/stream")) {
      return applicationSse({ event: { id: "stream-event" }, rawContent: "stream" });
    }
    if (String(url).endsWith("/api/fate")) {
      return Response.json({ event: { id: "fate-event" }, rawContent: "fate" });
    }
    if (String(url).endsWith("/api/resolution")) {
      return applicationSse({
        resolution: {
          narrative: "主持叙事",
          npcReaction: "NPC 反应",
          consequence: "实际后果",
          nextClue: "后续线索",
        },
        rawContent: "resolution",
      });
    }
    throw new Error(`unexpected URL: ${url}`);
  };
  const state = {
    meta: {
      turn: 1,
      pendingResolution: {
        id: "resolution-1",
        localOutcome: { summary: "本地结算" },
        worldUpdate: "线索",
      },
    },
  };

  client.configureGameApiBase("https://proxy.example.com/game", {
    pageUrl: "https://game.example.taptap.io/play",
  });
  try {
    await client.requestProviderStatus(fetchImpl);
    await client.requestAgnesEvent(fetchImpl, state, [], "");
    await client.streamAgnesEvent(fetchImpl, state, [], "", () => {});
    await client.requestAgnesResolution(fetchImpl, state, () => {});
  } finally {
    client.configureGameApiBase("");
  }

  assert.deepEqual(requestedUrls, [
    "https://proxy.example.com/game/api/status",
    "https://proxy.example.com/game/api/fate",
    "https://proxy.example.com/game/api/fate/stream",
    "https://proxy.example.com/game/api/resolution",
  ]);
});

test("static shell probes only when an external proxy base is configured", async () => {
  const [rootHtml, publicHtml, app] = await Promise.all([
    readFile(join(projectDirectory, "index.html"), "utf8"),
    readFile(join(projectDirectory, "public", "index.html"), "utf8"),
    readFile(join(projectDirectory, "public", "app.mjs"), "utf8"),
  ]);

  const apiBaseMeta = '<meta name="destiny-api-base" content="">';
  assert.match(rootHtml, new RegExp(apiBaseMeta));
  assert.match(publicHtml, new RegExp(apiBaseMeta));
  assert.match(app, /configureGameApiBase/);
  assert.match(app, /requestProviderStatus/);
  assert.match(app, /if \(apiMode === "static" && !apiBaseUrl\)/);
  assert.doesNotMatch(app, /fetch\("\/api\/status"/);
});

test("proxy CORS reflects an exact allowlisted origin and answers preflight", async () => {
  const server = createGameServer({ apiKey: "", allowedOrigins: allowedOrigin });
  const baseUrl = await listen(server);
  try {
    const status = await fetch(`${baseUrl}/api/status`, {
      headers: { Origin: allowedOrigin },
    });
    assert.equal(status.status, 200);
    assert.equal(status.headers.get("access-control-allow-origin"), allowedOrigin);
    assert.match(status.headers.get("vary") || "", /Origin/i);

    const preflight = await fetch(`${baseUrl}/api/resolution`, {
      method: "OPTIONS",
      headers: {
        Origin: allowedOrigin,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type, accept",
      },
    });
    assert.equal(preflight.status, 204);
    assert.match(preflight.headers.get("access-control-allow-methods") || "", /POST/);
    assert.match(preflight.headers.get("access-control-allow-headers") || "", /Content-Type/i);
  } finally {
    await close(server);
  }
});

test("proxy CORS rejects unknown origins and wildcard configuration", async () => {
  assert.throws(
    () => createGameServer({ apiKey: "", allowedOrigins: "*" }),
    /cors_wildcard_forbidden/,
  );

  const server = createGameServer({ apiKey: "", allowedOrigins: allowedOrigin });
  const baseUrl = await listen(server);
  try {
    const response = await fetch(`${baseUrl}/api/status`, {
      headers: { Origin: "https://untrusted.example" },
    });
    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), { error: "origin_not_allowed" });
    assert.equal(response.headers.get("access-control-allow-origin"), null);
  } finally {
    await close(server);
  }
});

test("builder emits a sub-300MB ZIP with one product root and runtime files only", async () => {
  let builder;
  try {
    builder = await import("../scripts/build-taptap-package.mjs");
  } catch (error) {
    assert.fail(`TapTap packager module is missing: ${error.code || error.message}`);
  }
  assert.equal(typeof builder.buildTapTapPackage, "function");

  const outputDirectory = join(projectDirectory, "output", `taptap-focused-${process.pid}`);
  const extractDirectory = join(outputDirectory, "extracted");
  try {
    const result = await builder.buildTapTapPackage({
      projectDirectory,
      outputDirectory,
      apiBaseUrl: "",
      buildId: "focused",
      archive: true,
    });
    const zipStat = await stat(result.zipPath);
    assert.ok(zipStat.size > 0 && zipStat.size <= 300 * 1024 * 1024);

    const { stdout } = await execFileAsync("tar.exe", ["-tf", result.zipPath], { encoding: "utf8" });
    const entries = stdout.split(/\r?\n/).map((entry) => entry.trim()).filter(Boolean);
    const roots = new Set(entries.map((entry) => entry.split(/[\\/]/)[0]));
    assert.deepEqual([...roots], [builder.PRODUCT_DIRECTORY_NAME]);
    assert.ok(entries.some((entry) => entry.replaceAll("\\", "/") === `${builder.PRODUCT_DIRECTORY_NAME}/index.html`));
    assert.ok(entries.every((entry) => !/(?:^|\/)(?:\.env[^/]*|tests?|docs?|deploy|scripts?|pitfalls\.md|server\.mjs)(?:\/|$)/i.test(entry.replaceAll("\\", "/"))));
    assert.ok(entries.every((entry) => !/(?:^|\/)public\/index\.html$/i.test(entry.replaceAll("\\", "/"))));
    assert.ok(entries.every((entry) => !/(?:^|\/)\.\.(?:\/|$)/.test(entry.replaceAll("\\", "/"))));

    await mkdir(extractDirectory, { recursive: true });
    await execFileAsync("tar.exe", ["-xf", result.zipPath, "-C", extractDirectory]);
    const productDirectory = join(extractDirectory, builder.PRODUCT_DIRECTORY_NAME);
    const indexHtml = await readFile(join(productDirectory, "index.html"), "utf8");
    for (const match of indexHtml.matchAll(/(?:href|src)="([^"]+)"/g)) {
      const resource = match[1].split("?")[0];
      if (!resource.startsWith("./")) continue;
      await access(resolve(productDirectory, resource));
    }
    assert.doesNotMatch(indexHtml, /(?:AGNES_API_KEY|Bearer\s+[A-Za-z0-9._-]{12,}|https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?\/api)/i);

    const manifest = JSON.parse(await readFile(result.manifestPath, "utf8"));
    assert.equal(manifest.apiBaseConfigured, false);
    assert.equal(manifest.productDirectory, builder.PRODUCT_DIRECTORY_NAME);
    assert.equal(manifest.zipSha256, result.zipSha256);
    await assert.rejects(access(result.stagingDirectory));
  } finally {
    const resolvedOutput = resolve(outputDirectory);
    const allowedParent = `${resolve(projectDirectory, "output")}${sep}`;
    assert.ok(resolvedOutput.startsWith(allowedParent));
    await rm(resolvedOutput, { recursive: true, force: true });
  }
});

test("builder injects a proxy base while limiting insecure HTTP to explicit loopback QA", async () => {
  let builder;
  try {
    builder = await import("../scripts/build-taptap-package.mjs");
  } catch (error) {
    assert.fail(`TapTap packager module is missing: ${error.code || error.message}`);
  }

  const outputDirectory = join(projectDirectory, "output", `taptap-config-${process.pid}`);
  try {
    await assert.rejects(
      builder.buildTapTapPackage({
        projectDirectory,
        outputDirectory,
        apiBaseUrl: "http://proxy.example.com",
        buildId: "remote-http",
        archive: false,
      }),
      /secure_https_required/,
    );

    const result = await builder.buildTapTapPackage({
      projectDirectory,
      outputDirectory,
      apiBaseUrl: "http://127.0.0.1:43123",
      allowInsecureLoopback: true,
      buildId: "loopback-qa",
      archive: false,
    });
    const indexHtml = await readFile(join(result.productDirectory, "index.html"), "utf8");
    assert.match(indexHtml, /<meta name="destiny-api-base" content="http:\/\/127\.0\.0\.1:43123">/);
  } finally {
    const resolvedOutput = resolve(outputDirectory);
    const allowedParent = `${resolve(projectDirectory, "output")}${sep}`;
    assert.ok(resolvedOutput.startsWith(allowedParent));
    await rm(resolvedOutput, { recursive: true, force: true });
  }
});

test("proxy deployment descriptor keeps secrets in environment variables", async () => {
  const dockerfilePath = join(projectDirectory, "deploy", "agnes-proxy", "Dockerfile");
  const guidePath = join(projectDirectory, "deploy", "agnes-proxy", "README.md");
  let dockerfile;
  let guide;
  try {
    [dockerfile, guide] = await Promise.all([
      readFile(dockerfilePath, "utf8"),
      readFile(guidePath, "utf8"),
    ]);
  } catch (error) {
    assert.fail(`proxy deployment artifact is missing: ${error.code || error.message}`);
  }

  assert.match(dockerfile, /COPY --chown=node:node package\.json server\.mjs/);
  assert.match(dockerfile, /COPY --chown=node:node lib \.\/lib/);
  assert.doesNotMatch(dockerfile, /COPY[^\n]*\.env/i);
  assert.match(guide, /AGNES_API_KEY/);
  assert.match(guide, /AGNES_ALLOWED_ORIGINS/);
  assert.match(guide, /HTTPS/);
  assert.match(guide, /--api-base-url/);
  assert.doesNotMatch(guide, /AGNES_API_KEY\s*=\s*[A-Za-z0-9._-]{12,}/);
});
