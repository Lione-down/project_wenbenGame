import { exportGame, importGame } from "./game-engine.mjs";
import { EVENT_CONTENT_LIMITS } from "./event-rules.mjs";

export const SAVE_KEY = "destiny-beyond.save.v1";

let configuredApiBaseUrl = "";
let configuredPlayerAgnes = null;

export function configurePlayerAgnesDirect(playerAgnesModule, key = "", { transportPolicy = "auto" } = {}) {
  const credential = typeof key === "string" ? key.trim() : "";
  const normalizedTransportPolicy = ["auto", "browser-fetch", "tap-request"].includes(transportPolicy)
    ? transportPolicy
    : "auto";
  configuredPlayerAgnes = credential && playerAgnesModule
    ? { module: playerAgnesModule, key: credential, transportPolicy: normalizedTransportPolicy }
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
        id: "retry-agnes-generation",
        tag: "opportunity",
        label: "重新生成",
        hint: "重新请求本次命途，不结算原文",
        result: "你要求 Agnes 重新生成本次命途。",
        effects: {},
      },
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

async function consumeApplicationJson(response) {
  let body;
  try {
    body = await response.json();
  } catch {
    throw new ProviderRequestError("provider_error", response.status);
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ProviderRequestError("provider_error", response.status);
  }
  return body;
}

export async function streamAgnesEvent(
  fetchImpl,
  state,
  history,
  action = "",
  onDelta = () => {},
) {
  if (configuredPlayerAgnes) {
    const result = await configuredPlayerAgnes.module.streamPlayerAgentTurn(
      fetchImpl,
      configuredPlayerAgnes.key,
      state,
      history,
      action,
      onDelta,
      { transportPolicy: configuredPlayerAgnes.transportPolicy },
    );
    if (result.event) {
      return {
        ...result.event,
        ...(typeof result.rawContent === "string" ? { providerRawContent: result.rawContent } : {}),
        ...(result.gameState ? { agentGameState: structuredClone(result.gameState) } : {}),
      };
    }
    if (typeof result.rawContent === "string" && result.rawContent.trim()) {
      return createDisplayOnlyFateEvent(result.rawContent, state?.meta?.turn);
    }
    throw new ProviderRequestError("provider_error", 502);
  }
  const serialized = requestBody(state, history, action);
  let response;
  try {
    response = await fetchImpl(resolveGameApiUrl("/api/agent/stream"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: serialized,
    });
  } catch {
    throw new ProviderRequestError("network_unavailable", 0);
  }
  if (!response.ok) {
    let body = {};
    try {
      body = await response.json();
    } catch {
      // The HTTP status remains the authoritative failure when no JSON is available.
    }
    throw new ProviderRequestError(body.error || "provider_error", response.status);
  }
  const complete = await consumeApplicationJson(response);
  if (complete.event && typeof complete.event === "object") {
    return {
      ...complete.event,
      ...(typeof complete.rawContent === "string" ? { providerRawContent: complete.rawContent } : {}),
      ...(complete.gameState ? { agentGameState: structuredClone(complete.gameState) } : {}),
    };
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
      { transportPolicy: configuredPlayerAgnes.transportPolicy },
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
    response = await fetchImpl(resolveGameApiUrl("/api/agent/resolution"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
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
  const complete = await consumeApplicationJson(response);
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
