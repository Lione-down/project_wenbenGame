import { exportGame, importGame } from "./game-engine.mjs";
import { EVENT_CONTENT_LIMITS } from "./event-rules.mjs";

export const SAVE_KEY = "destiny-beyond.save.v1";

let configuredApiBaseUrl = "";
let configuredPlayerAgnes = null;

export function configurePlayerAgnesDirect(playerAgnesModule, key = "") {
  const credential = typeof key === "string" ? key.trim() : "";
  configuredPlayerAgnes = credential && playerAgnesModule
    ? { module: playerAgnesModule, key: credential }
    : null;
  return Boolean(configuredPlayerAgnes);
}

function isLoopbackHostname(hostname) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

export function configureGameApiBase(value, { pageUrl = globalThis.location?.href || "" } = {}) {
  const candidateValue = String(value ?? "").trim();
  if (!candidateValue) {
    configuredApiBaseUrl = "";
    return configuredApiBaseUrl;
  }

  let candidate;
  try {
    candidate = new URL(candidateValue);
  } catch {
    throw new Error("invalid_api_base_url");
  }
  if (candidate.username || candidate.password) {
    throw new Error("api_base_credentials_forbidden");
  }
  if (candidate.search || candidate.hash) {
    throw new Error("api_base_query_forbidden");
  }
  if (candidate.protocol !== "https:") {
    let page;
    try {
      page = new URL(pageUrl);
    } catch {
      page = null;
    }
    const isLocalQa = candidate.protocol === "http:"
      && isLoopbackHostname(candidate.hostname)
      && page?.protocol === "http:"
      && isLoopbackHostname(page.hostname);
    if (!isLocalQa) throw new Error("secure_https_required");
  }

  configuredApiBaseUrl = candidate.href.replace(/\/+$/, "");
  return configuredApiBaseUrl;
}

export function resolveGameApiUrl(pathname) {
  const apiPath = String(pathname || "");
  if (apiPath !== "/api" && !apiPath.startsWith("/api/")) {
    throw new Error("invalid_api_path");
  }
  return configuredApiBaseUrl ? `${configuredApiBaseUrl}${apiPath}` : apiPath;
}

export class ProviderRequestError extends Error {
  constructor(code, status) {
    super(code);
    this.name = "ProviderRequestError";
    this.code = code;
    this.status = status;
  }
}

export async function requestProviderStatus(fetchImpl) {
  let response;
  try {
    response = await fetchImpl(resolveGameApiUrl("/api/status"), {
      headers: { Accept: "application/json" },
    });
  } catch {
    throw new ProviderRequestError("network_unavailable", 0);
  }
  let body;
  try {
    body = await response.json();
  } catch {
    throw new ProviderRequestError("provider_error", response.status);
  }
  if (!response.ok) {
    throw new ProviderRequestError(body.error || "provider_error", response.status);
  }
  return body;
}

export function createDisplayOnlyFateEvent(rawContent, turn = 0) {
  return {
    id: `agnes-display-${Number.isInteger(turn) ? turn : 0}`,
    kind: "story",
    title: "Agnes 原文",
    scene: "本次原文未通过游戏状态合同，仅供阅读，不会改写角色状态。",
    canonRefs: [],
    monthDelta: 1,
    danger: "low",
    choices: [
      {
        id: "use-offline-engine",
        tag: "peace",
        label: "改用命簿引擎",
        hint: "不结算这段原文",
        result: "你改用本地命簿继续推演。",
        effects: {},
      },
      {
        id: "stay-display-only",
        tag: "peace",
        label: "留在原文页",
        hint: "不推进月份",
        result: "你继续阅读这段原文。",
        effects: {},
      },
    ],
    worldUpdate: "本月尚未因这段原文发生变化。",
    source: "agnes",
    displayOnly: true,
    providerRawContent: String(rawContent ?? ""),
  };
}

export function createSafeResolutionFallback(pendingResolution) {
  const summary = String(pendingResolution?.localOutcome?.summary || "本地结算已经完成。").slice(0, 240);
  const worldUpdate = String(pendingResolution?.worldUpdate || "下一步仍由玩家决定。").slice(0, 200);
  return {
    narrative: "Agnes 原文只在当前页面临时展示；由于结构未通过可信合同，它不会写入存档或参与状态结算。",
    npcReaction: "未从未验证原文中提取 NPC 反应。",
    consequence: `本地确定结果保持不变：${summary}`,
    nextClue: worldUpdate,
  };
}

export function saveLocalGame(storage, state) {
  storage.setItem(SAVE_KEY, exportGame(state));
}

export function loadLocalGame(storage) {
  const serialized = storage.getItem(SAVE_KEY);
  return serialized ? importGame(serialized) : null;
}

export function clearLocalGame(storage) {
  storage.removeItem(SAVE_KEY);
}

export async function requestAgnesEvent(fetchImpl, state, history, action = "") {
  let response;
  try {
    response = await fetchImpl(resolveGameApiUrl("/api/fate"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        game: state,
        history: history.slice(-6),
        action: typeof action === "string" ? action.trim().slice(0, EVENT_CONTENT_LIMITS.freeAction) : "",
      }),
    });
  } catch {
    throw new ProviderRequestError("network_unavailable", 0);
  }
  let body;
  try {
    body = await response.json();
  } catch {
    throw new ProviderRequestError("provider_error", response.status);
  }
  if (!response.ok) {
    throw new ProviderRequestError(body.error || "provider_error", response.status);
  }
  if (body.event && typeof body.event === "object") {
    return typeof body.rawContent === "string"
      ? { ...body.event, providerRawContent: body.rawContent }
      : body.event;
  }
  if (typeof body.rawContent === "string" && body.rawContent.trim()) {
    return createDisplayOnlyFateEvent(body.rawContent, state?.meta?.turn);
  }
  throw new ProviderRequestError("provider_error", response.status);
}

function requestBody(state, history, action) {
  return JSON.stringify({
    game: state,
    history: history.slice(-6),
    action: typeof action === "string" ? action.trim().slice(0, EVENT_CONTENT_LIMITS.freeAction) : "",
  });
}

function findSseBoundary(buffer) {
  const match = /\r?\n\r?\n/.exec(buffer);
  return match ? { index: match.index, length: match[0].length } : null;
}

async function consumeApplicationSse(response, onDelta) {
  if (!response.body || typeof response.body.getReader !== "function") {
    throw new ProviderRequestError("provider_error", response.status);
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let completeData = null;

  const consumeFrame = (frame) => {
    let eventName = "message";
    const dataLines = [];
    for (const line of frame.split(/\r?\n/)) {
      if (line.startsWith("event:")) eventName = line.slice(6).trim();
      if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart());
    }
    if (dataLines.length === 0) return;
    let data;
    try {
      data = JSON.parse(dataLines.join("\n"));
    } catch {
      throw new ProviderRequestError("provider_error", response.status);
    }
    if (eventName === "delta") {
      if (typeof data.text !== "string") {
        throw new ProviderRequestError("provider_error", response.status);
      }
      onDelta(data.text);
      return;
    }
    if (eventName === "complete") {
      completeData = data;
      return;
    }
    if (eventName === "error") {
      throw new ProviderRequestError(data.error || "provider_error", response.status);
    }
  };

  while (!completeData) {
    let result;
    try {
      result = await reader.read();
    } catch {
      throw new ProviderRequestError("network_unavailable", 0);
    }
    buffer += decoder.decode(result.value, { stream: !result.done });
    let boundary = findSseBoundary(buffer);
    while (boundary) {
      const frame = buffer.slice(0, boundary.index);
      buffer = buffer.slice(boundary.index + boundary.length);
      consumeFrame(frame);
      if (completeData) break;
      boundary = findSseBoundary(buffer);
    }
    if (result.done) break;
  }
  if (!completeData) {
    throw new ProviderRequestError("network_unavailable", 0);
  }
  return completeData;
}

export async function streamAgnesEvent(
  fetchImpl,
  state,
  history,
  action = "",
  onDelta = () => {},
) {
  if (configuredPlayerAgnes) {
    const result = await configuredPlayerAgnes.module.streamPlayerAgnesEvent(
      fetchImpl,
      configuredPlayerAgnes.key,
      state,
      history,
      action,
      onDelta,
    );
    if (result.event) {
      return typeof result.rawContent === "string"
        ? { ...result.event, providerRawContent: result.rawContent }
        : result.event;
    }
    if (typeof result.rawContent === "string" && result.rawContent.trim()) {
      return createDisplayOnlyFateEvent(result.rawContent, state?.meta?.turn);
    }
    throw new ProviderRequestError("provider_error", 502);
  }
  const serialized = requestBody(state, history, action);
  let response;
  try {
    response = await fetchImpl(resolveGameApiUrl("/api/fate/stream"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
      body: serialized,
    });
  } catch {
    throw new ProviderRequestError("network_unavailable", 0);
  }
  if (!response.ok) {
    if ([404, 405, 501].includes(response.status)) {
      return requestAgnesEvent(fetchImpl, state, history, action);
    }
    let body = {};
    try {
      body = await response.json();
    } catch {
      // The HTTP status remains the authoritative failure when no JSON is available.
    }
    throw new ProviderRequestError(body.error || "provider_error", response.status);
  }
  const complete = await consumeApplicationSse(response, onDelta);
  if (complete.event && typeof complete.event === "object") {
    return typeof complete.rawContent === "string"
      ? { ...complete.event, providerRawContent: complete.rawContent }
      : complete.event;
  }
  if (typeof complete.rawContent === "string" && complete.rawContent.trim()) {
    return createDisplayOnlyFateEvent(complete.rawContent, state?.meta?.turn);
  }
  throw new ProviderRequestError("provider_error", response.status);
}

export async function requestAgnesResolution(fetchImpl, state, onDelta = () => {}) {
  const pendingResolution = state?.meta?.pendingResolution;
  if (!pendingResolution) {
    throw new ProviderRequestError("invalid_resolution_state", 400);
  }
  if (configuredPlayerAgnes) {
    const result = await configuredPlayerAgnes.module.streamPlayerAgnesResolution(
      fetchImpl,
      configuredPlayerAgnes.key,
      state,
      onDelta,
    );
    return {
      resolution: result.resolution,
      rawContent: result.rawContent,
      structured: result.structured,
      fallback: !result.structured,
    };
  }
  let response;
  try {
    response = await fetchImpl(resolveGameApiUrl("/api/resolution"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify({ game: state, resolution: pendingResolution }),
    });
  } catch {
    throw new ProviderRequestError("network_unavailable", 0);
  }
  if (!response.ok) {
    let body = {};
    try {
      body = await response.json();
    } catch {
      // The HTTP status remains authoritative when the server cannot provide JSON.
    }
    throw new ProviderRequestError(body.error || "provider_error", response.status);
  }
  const complete = await consumeApplicationSse(response, onDelta);
  if (typeof complete.rawContent !== "string" || !complete.rawContent.trim()) {
    throw new ProviderRequestError("provider_error", response.status);
  }
  if (complete.resolution !== null && typeof complete.resolution !== "object") {
    throw new ProviderRequestError("provider_error", response.status);
  }
  return {
    resolution: complete.resolution,
    rawContent: complete.rawContent,
    structured: Boolean(complete.resolution),
    fallback: Boolean(complete.fallback),
  };
}
