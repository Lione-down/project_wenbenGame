import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";

import {
  AGNES_BASE_URL,
  AGNES_CHAT_COMPLETIONS_URL,
  AGNES_MODEL,
  buildAgnesPayload,
  classifyProviderFailure,
  extractChatCompletionText,
  parseAgnesEventWithRecovery,
} from "./lib/agnes-contract.mjs";
import {
  buildAgnesResolutionPayload,
  parseAgnesResolution,
} from "./lib/agnes-resolution-contract.mjs";
import { sanitizeGameSnapshot } from "./lib/agnes-game-snapshot.mjs";

export { sanitizeGameSnapshot } from "./lib/agnes-game-snapshot.mjs";

const MODULE_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const DEFAULT_PUBLIC_DIRECTORY = resolve(MODULE_DIRECTORY, "public");
const MAX_REQUEST_BYTES = 64 * 1024;
const CONTENT_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

function normalizeAllowedOrigin(value) {
  const originValue = String(value || "").trim();
  if (!originValue) return "";
  if (originValue === "*") throw new Error("cors_wildcard_forbidden");
  let parsed;
  try {
    parsed = new URL(originValue);
  } catch {
    throw new Error("invalid_cors_origin");
  }
  if (!["http:", "https:"].includes(parsed.protocol)
    || parsed.username
    || parsed.password
    || parsed.pathname !== "/"
    || parsed.search
    || parsed.hash) {
    throw new Error("invalid_cors_origin");
  }
  return parsed.origin;
}

export function parseAllowedOrigins(value) {
  const entries = Array.isArray(value) ? value : String(value || "").split(",");
  return new Set(entries.map(normalizeAllowedOrigin).filter(Boolean));
}

function isSameHostOrigin(request, origin) {
  try {
    return new URL(origin).host === request.headers.host;
  } catch {
    return false;
  }
}

function applyApiCors(request, response, allowedOrigins) {
  const origin = String(request.headers.origin || "").trim();
  if (!origin) return true;
  if (!isSameHostOrigin(request, origin) && !allowedOrigins.has(origin)) return false;
  response.setHeader("Access-Control-Allow-Origin", origin);
  response.setHeader("Vary", "Origin");
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");
  response.setHeader("Access-Control-Max-Age", "600");
  return true;
}

function sendJson(response, status, body) {
  const serialized = JSON.stringify(body);
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(serialized),
    "Cache-Control": "no-store",
  });
  response.end(serialized);
}

function readJson(request) {
  return new Promise((resolveBody, reject) => {
    let size = 0;
    const chunks = [];
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_REQUEST_BYTES) {
        reject(Object.assign(new Error("request_too_large"), { status: 413 }));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => {
      try {
        resolveBody(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(Object.assign(new Error("invalid_json"), { status: 400 }));
      }
    });
    request.on("error", reject);
  });
}

function providerHeaders(apiKey) {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "X-Trace-ID": randomUUID(),
  };
}

function snapshotReferences(snapshot) {
  const player = snapshot.player;
  return [
    player.location,
    player.sect?.name,
    ...(Array.isArray(player.techniques) ? player.techniques : []),
    ...(Array.isArray(player.techniqueBuild?.known) ? player.techniqueBuild.known : []),
    ...(Array.isArray(player.npcs) ? player.npcs.map((npc) => npc?.name) : []),
    ...(Array.isArray(player.relationships) ? player.relationships.map((relationship) => relationship?.name) : []),
    ...(Array.isArray(snapshot.world?.npcs) ? snapshot.world.npcs.map((npc) => npc?.name) : []),
  ].filter((value) => typeof value === "string" && value.trim());
}

function parseFateProviderContent(content, snapshot) {
  try {
    return {
      event: parseAgnesEventWithRecovery(content, {
        allowedReferences: snapshotReferences(snapshot),
        deadNpcNames: snapshot.world.npcs.filter((npc) => !npc.alive).map((npc) => npc.name),
      }),
      rawContent: content,
      structured: true,
      validationReason: null,
    };
  } catch {
    return {
      event: null,
      rawContent: content,
      structured: false,
      validationReason: "event_contract_drift",
    };
  }
}

function parseResolutionProviderContent(content) {
  try {
    return {
      resolution: parseAgnesResolution(content),
      rawContent: content,
      structured: true,
      validationReason: null,
    };
  } catch {
    return {
      resolution: null,
      rawContent: content,
      structured: false,
      validationReason: "resolution_contract_drift",
    };
  }
}

async function requestAgnes({ apiKey, endpoint, fetchImpl, game, history, action }) {
  const snapshot = sanitizeGameSnapshot(game);
  const payload = buildAgnesPayload(snapshot, history, action, { stream: false });
  const response = await fetchImpl(endpoint, {
    method: "POST",
    headers: providerHeaders(apiKey),
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(120000),
  });
  if (!response.ok) {
    throw Object.assign(new Error("agnes_http_error"), { status: response.status });
  }
  const body = await response.json();
  const content = extractChatCompletionText(body);
  return parseFateProviderContent(content, snapshot);
}

async function requestAgnesResolution({ apiKey, endpoint, fetchImpl, game, resolution }) {
  const snapshot = sanitizeGameSnapshot(game);
  const payload = buildAgnesResolutionPayload(snapshot, resolution, { stream: false });
  const response = await fetchImpl(endpoint, {
    method: "POST",
    headers: providerHeaders(apiKey),
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(120000),
  });
  if (!response.ok) {
    throw Object.assign(new Error("agnes_resolution_http_error"), { status: response.status });
  }
  const body = await response.json();
  const content = extractChatCompletionText(body);
  return parseResolutionProviderContent(content);
}

function findSseBoundary(buffer) {
  const match = /\r?\n\r?\n/.exec(buffer);
  return match ? { index: match.index, length: match[0].length } : null;
}

async function consumeProviderStream(providerResponse, onDelta) {
  if (!providerResponse.body || typeof providerResponse.body.getReader !== "function") {
    throw new Error("Agnes Streaming 响应没有可读 body");
  }
  const reader = providerResponse.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";
  let isDone = false;

  const consumeFrame = (frame) => {
    const data = frame
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n")
      .trim();
    if (!data) return;
    if (data === "[DONE]") {
      isDone = true;
      return;
    }
    let chunk;
    try {
      chunk = JSON.parse(data);
    } catch {
      throw new Error("Agnes Streaming data 不是有效 JSON");
    }
    if (chunk?.model && chunk.model !== AGNES_MODEL) {
      throw new Error("Agnes Streaming 响应模型不匹配");
    }
    const choice = Array.isArray(chunk?.choices) ? chunk.choices[0] : null;
    if (choice?.finish_reason === "length") {
      throw new Error("Agnes Streaming 响应因 length 截断");
    }
    const delta = typeof choice?.delta?.content === "string" ? choice.delta.content : "";
    if (!delta) return;
    content += delta;
    if (content.length > 24000) {
      throw new Error("Agnes Streaming 响应过长");
    }
    onDelta(delta);
  };

  while (!isDone) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    let boundary = findSseBoundary(buffer);
    while (boundary) {
      const frame = buffer.slice(0, boundary.index);
      buffer = buffer.slice(boundary.index + boundary.length);
      consumeFrame(frame);
      if (isDone) break;
      boundary = findSseBoundary(buffer);
    }
    if (done) break;
  }
  if (isDone) {
    try {
      await reader.cancel();
    } catch {
      // The Provider may have closed the stream immediately after [DONE].
    }
  }
  if (!isDone) {
    throw new Error("Agnes Streaming 响应未收到 DONE");
  }
  if (!content.trim()) {
    throw new Error("Agnes Streaming 响应没有 content token");
  }
  return content;
}

async function requestAgnesStream({
  apiKey,
  endpoint,
  fetchImpl,
  game,
  history,
  action,
  onDelta,
}) {
  const snapshot = sanitizeGameSnapshot(game);
  const payload = buildAgnesPayload(snapshot, history, action, { stream: true });
  const response = await fetchImpl(endpoint, {
    method: "POST",
    headers: providerHeaders(apiKey),
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(120000),
  });
  if (!response.ok) {
    throw Object.assign(new Error("agnes_stream_http_error"), {
      status: response.status,
      streamRejected: true,
    });
  }
  const content = await consumeProviderStream(response, onDelta);
  return parseFateProviderContent(content, snapshot);
}

async function requestAgnesResolutionStream({
  apiKey,
  endpoint,
  fetchImpl,
  game,
  resolution,
  onDelta,
}) {
  const snapshot = sanitizeGameSnapshot(game);
  const payload = buildAgnesResolutionPayload(snapshot, resolution, { stream: true });
  const response = await fetchImpl(endpoint, {
    method: "POST",
    headers: providerHeaders(apiKey),
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(120000),
  });
  if (!response.ok) {
    throw Object.assign(new Error("agnes_resolution_stream_http_error"), {
      status: response.status,
      streamRejected: true,
    });
  }
  const content = await consumeProviderStream(response, onDelta);
  return parseResolutionProviderContent(content);
}

function startSse(response) {
  if (response.headersSent) return;
  response.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-store, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
}

function sendSse(response, event, body) {
  startSse(response);
  response.write(`event: ${event}\ndata: ${JSON.stringify(body)}\n\n`);
}

function classifyRequestError(error) {
  return error?.message === "invalid_game_state"
    ? { code: "invalid_game_state", status: 400 }
    : error?.message === "invalid_json"
      ? { code: "invalid_json", status: 400 }
      : classifyProviderFailure(error);
}

function endpointFromEnvironment() {
  if (process.env.AGNES_CHAT_COMPLETIONS_URL) {
    return process.env.AGNES_CHAT_COMPLETIONS_URL;
  }
  const baseUrl = (process.env.AGNES_BASE_URL || AGNES_BASE_URL).replace(/\/+$/, "");
  return `${baseUrl}/chat/completions`;
}

function serveStatic(request, response, publicDirectory, pathname) {
  const requestedPath = pathname === "/" ? "/index.html" : pathname;
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(requestedPath);
  } catch {
    sendJson(response, 400, { error: "invalid_path" });
    return;
  }
  const resolvedRoot = resolve(publicDirectory);
  const filePath = resolve(resolvedRoot, `.${decodedPath}`);
  if (filePath !== resolvedRoot && !filePath.startsWith(`${resolvedRoot}${sep}`)) {
    sendJson(response, 403, { error: "path_forbidden" });
    return;
  }
  try {
    const fileStat = statSync(filePath);
    if (!fileStat.isFile()) {
      throw new Error("not_file");
    }
    const contentType = CONTENT_TYPES[extname(filePath).toLowerCase()] || "application/octet-stream";
    response.writeHead(200, {
      "Content-Type": contentType,
      "Content-Length": fileStat.size,
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'self'; connect-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; base-uri 'none'; frame-ancestors 'none'",
    });
    if (request.method === "HEAD") {
      response.end();
      return;
    }
    createReadStream(filePath).pipe(response);
  } catch {
    sendJson(response, 404, { error: "not_found" });
  }
}

export function createGameServer({
  apiKey = process.env.AGNES_API_KEY || "",
  allowedOrigins = process.env.AGNES_ALLOWED_ORIGINS || "",
  endpoint = endpointFromEnvironment() || AGNES_CHAT_COMPLETIONS_URL,
  fetchImpl = globalThis.fetch,
  publicDirectory = DEFAULT_PUBLIC_DIRECTORY,
} = {}) {
  const corsOrigins = parseAllowedOrigins(allowedOrigins);
  return createServer(async (request, response) => {
    const url = new URL(request.url || "/", "http://localhost");
    const isApiRequest = url.pathname === "/api" || url.pathname.startsWith("/api/");
    if (isApiRequest && !applyApiCors(request, response, corsOrigins)) {
      sendJson(response, 403, { error: "origin_not_allowed" });
      return;
    }
    if (isApiRequest && request.method === "OPTIONS") {
      response.writeHead(204, { "Cache-Control": "no-store" });
      response.end();
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/status") {
      sendJson(response, 200, { configured: Boolean(apiKey), model: AGNES_MODEL });
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/fate") {
      if (!apiKey) {
        sendJson(response, 503, { error: "agnes_not_configured" });
        return;
      }
      try {
        const body = await readJson(request);
        const result = await requestAgnes({
          apiKey,
          endpoint: String(endpoint),
          fetchImpl,
          game: body.game,
          history: body.history,
          action: typeof body.action === "string" ? body.action.trim().slice(0, 120) : "",
        });
        if (!result.structured) console.warn("Agnes 内容合同漂移：event_contract_drift");
        sendJson(response, 200, result);
      } catch (error) {
        const classification = classifyRequestError(error);
        sendJson(response, classification.status, { error: classification.code });
      }
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/resolution") {
      if (!apiKey) {
        sendJson(response, 503, { error: "agnes_not_configured" });
        return;
      }
      let hasDelta = false;
      try {
        const body = await readJson(request);
        const requestOptions = {
          apiKey,
          endpoint: String(endpoint),
          fetchImpl,
          game: body.game,
          resolution: body.resolution,
        };
        let result;
        let fallback = false;
        try {
          result = await requestAgnesResolutionStream({
            ...requestOptions,
            onDelta(delta) {
              hasDelta = true;
              sendSse(response, "delta", { text: delta });
            },
          });
        } catch (error) {
          const fallbackStatuses = new Set([400, 404, 405, 415, 422, 501]);
          if (!hasDelta && error?.streamRejected && fallbackStatuses.has(Number(error.status))) {
            result = await requestAgnesResolution(requestOptions);
            fallback = true;
          } else {
            throw error;
          }
        }
        if (!result.structured) console.warn("Agnes 内容合同漂移：resolution_contract_drift");
        sendSse(response, "complete", { ...result, fallback });
        response.end();
      } catch (error) {
        const classification = classifyRequestError(error);
        const isRequestError = new Set(["invalid_game_state", "invalid_json", "request_too_large"])
          .has(error?.message);
        if (!response.headersSent && isRequestError) {
          sendJson(response, classification.status, { error: classification.code });
        } else {
          sendSse(response, "error", { error: classification.code });
          response.end();
        }
      }
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/fate/stream") {
      if (!apiKey) {
        sendJson(response, 503, { error: "agnes_not_configured" });
        return;
      }
      let hasDelta = false;
      try {
        const body = await readJson(request);
        const requestOptions = {
          apiKey,
          endpoint: String(endpoint),
          fetchImpl,
          game: body.game,
          history: body.history,
          action: typeof body.action === "string" ? body.action.trim().slice(0, 120) : "",
        };
        let result;
        let fallback = false;
        try {
          result = await requestAgnesStream({
            ...requestOptions,
            onDelta(delta) {
              hasDelta = true;
              sendSse(response, "delta", { text: delta });
            },
          });
        } catch (error) {
          const fallbackStatuses = new Set([400, 404, 405, 415, 422, 501]);
          if (!hasDelta && error?.streamRejected && fallbackStatuses.has(Number(error.status))) {
            result = await requestAgnes(requestOptions);
            fallback = true;
          } else {
            throw error;
          }
        }
        if (!result.structured) console.warn("Agnes 内容合同漂移：event_contract_drift");
        sendSse(response, "complete", { ...result, fallback });
        response.end();
      } catch (error) {
        const classification = classifyRequestError(error);
        if (!response.headersSent && (classification.status === 400 || classification.status === 413)) {
          sendJson(response, classification.status, { error: classification.code });
        } else {
          sendSse(response, "error", { error: classification.code });
          response.end();
        }
      }
      return;
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
      sendJson(response, 405, { error: "method_not_allowed" });
      return;
    }
    serveStatic(request, response, publicDirectory, url.pathname);
  });
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (import.meta.url === invokedPath) {
  const port = Number(process.env.PORT) || 4173;
  const host = process.env.HOST || "127.0.0.1";
  const server = createGameServer();
  server.listen(port, host, () => {
    console.log(`《天命之外》运行于 http://${host}:${port}`);
    console.log(process.env.AGNES_API_KEY ? `Agnes: ${AGNES_MODEL}` : "Agnes: 未配置，使用命簿引擎");
  });
}
