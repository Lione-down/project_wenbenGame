import {
  AGNES_CHAT_COMPLETIONS_URL,
  AGNES_MODEL,
  classifyProviderFailure,
} from "../lib/agnes-contract.mjs";
import { sanitizeGameSnapshot } from "../lib/agnes-game-snapshot.mjs";
import {
  buildAgnesResolutionPayload,
  parseAgnesResolution,
} from "../lib/agnes-resolution-contract.mjs";
import { AgnesProvider } from "../lib/agnes-provider.mjs";
import { runEventAgentTurn } from "./game-agent-runtime.mjs";

export const PLAYER_AGNES_SESSION_KEY = "destiny-beyond.player-agnes.session.v1";
export const PLAYER_AGNES_LOCAL_KEY = "destiny-beyond.player-agnes.local.v1";

export class PlayerAgnesError extends Error {
  constructor(code, status = 0, transport = null) {
    super(code);
    this.name = "PlayerAgnesError";
    this.code = code;
    this.status = status;
    if (transport) this.transport = transport;
  }
}

function normalizedKey(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function savePlayerAgnesKey({ sessionStorage, localStorage, key, remember = false }) {
  const value = normalizedKey(key);
  if (!value) throw new PlayerAgnesError("key_required", 0);
  if (remember) {
    localStorage.setItem(PLAYER_AGNES_LOCAL_KEY, value);
    sessionStorage.removeItem(PLAYER_AGNES_SESSION_KEY);
  } else {
    sessionStorage.setItem(PLAYER_AGNES_SESSION_KEY, value);
    localStorage.removeItem(PLAYER_AGNES_LOCAL_KEY);
  }
}

export function loadPlayerAgnesKey({ sessionStorage, localStorage }) {
  const sessionKey = normalizedKey(sessionStorage.getItem(PLAYER_AGNES_SESSION_KEY));
  if (sessionKey) return { key: sessionKey, remember: false };
  const localKey = normalizedKey(localStorage.getItem(PLAYER_AGNES_LOCAL_KEY));
  return localKey ? { key: localKey, remember: true } : { key: "", remember: false };
}

export function clearPlayerAgnesKey({ sessionStorage, localStorage }) {
  sessionStorage.removeItem(PLAYER_AGNES_SESSION_KEY);
  localStorage.removeItem(PLAYER_AGNES_LOCAL_KEY);
}

function providerHeaders(key) {
  return {
    Authorization: `Bearer ${normalizedKey(key)}`,
    "Content-Type": "application/json",
  };
}

function redactDiagnosticValue(value, secrets = [], field = "", seen = new WeakSet()) {
  if (/authorization|credential|api.?key|token|secret/i.test(field)) return "[REDACTED]";
  if (typeof value === "string") {
    let safe = value.replace(/Bearer\s+[^\s,;]+/gi, "Bearer [REDACTED]");
    for (const secret of secrets.filter(Boolean)) safe = safe.split(secret).join("[REDACTED]");
    return safe;
  }
  if (!value || typeof value !== "object") return value;
  if (seen.has(value)) return "[Circular]";
  seen.add(value);
  if (Array.isArray(value)) return value.map((entry) => redactDiagnosticValue(entry, secrets, field, seen));
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [
    key,
    redactDiagnosticValue(entry, secrets, key, seen),
  ]));
}

function tapTransport(result, phase, secrets = [], overrides = {}) {
  return {
    channel: "tap.request",
    name: "tap.request",
    phase: String(phase || "provider"),
    stage: "HTTP",
    errno: result?.errno ?? 0,
    errMsg: redactDiagnosticValue(result?.errMsg ?? "", secrets, "errMsg"),
    statusCode: Number(result?.statusCode) || 0,
    profile: redactDiagnosticValue(result?.profile ?? null, secrets, "profile"),
    ...overrides,
  };
}

function classifyTapRequestFailure(error, phase, secrets = [], forcedStage = "") {
  const errno = Number(error?.errno);
  const safeErrno = Number.isFinite(errno) ? errno : 0;
  const message = typeof error?.errMsg === "string" ? error.errMsg.toLowerCase() : "";
  let reason = "network";
  let code = "network_unavailable";
  let status = 0;
  if (/timeout|timed out|\u8d85\u65f6/u.test(message)) {
    reason = "timeout";
    code = "provider_uncertain";
    status = 504;
  } else if (/domain list|not in domain|\u5408\u6cd5\u57df\u540d|\u57df\u540d.*\u4e0d/u.test(message)) {
    reason = "host-policy";
  } else if (/dns|resolve host|name resolution/u.test(message)) {
    reason = "dns";
  } else if (/\btls\b|\bssl\b|certificate|cert\b/u.test(message)) {
    reason = "tls";
  }
  const stage = forcedStage || ({ "host-policy": "bridge", dns: "DNS", tls: "TLS" }[reason] || "HTTP");
  return new PlayerAgnesError(code, status, tapTransport(error, phase, secrets, {
    errno: safeErrno,
    reason,
    stage,
  }));
}

function createTapRequestFetch(tapApi) {
  return (url, request = {}) => new Promise((resolve, reject) => {
    const authorization = request.headers?.Authorization || request.headers?.authorization || "";
    const secret = String(authorization).replace(/^Bearer\s+/i, "").trim();
    let data = request.body;
    try {
      if (typeof data === "string") {
        const payload = JSON.parse(data);
        payload.stream = false;
        data = JSON.stringify(payload);
      } else if (data && typeof data === "object") {
        data = { ...data, stream: false };
      }
      tapApi.request({
        url: String(url),
        method: request.method || "GET",
        header: request.headers || {},
        data,
        dataType: "json",
        responseType: "text",
        timeout: 120000,
        success(result) {
          const status = Number(result?.statusCode) || 0;
          resolve({
            ok: status >= 200 && status < 300,
            status,
            headers: result?.header || {},
            transport: tapTransport(result, request.diagnosticPhase, [secret]),
            async json() {
              if (typeof result?.data === "string") return JSON.parse(result.data);
              return result?.data;
            },
          });
        },
        fail(error) {
          reject(classifyTapRequestFailure(error, request.diagnosticPhase, [secret]));
        },
      });
    } catch (error) {
      reject(classifyTapRequestFailure(error, request.diagnosticPhase, [secret], "bridge"));
    }
  });
}

function browserTransport(phase, statusCode = 0, stage = "HTTP") {
  return {
    channel: "browser.fetch",
    name: "browser.fetch",
    phase: String(phase || "provider"),
    stage,
    statusCode: Number(statusCode) || 0,
  };
}

function createBrowserFetch(fetchImpl) {
  return async (url, request = {}) => {
    try {
      const response = await fetchImpl(url, request);
      response.transport = browserTransport(request.diagnosticPhase, response.status);
      return response;
    } catch (error) {
      if (error instanceof PlayerAgnesError) throw error;
      const isTimeout = error?.name === "AbortError" || error?.name === "TimeoutError";
      throw new PlayerAgnesError(
        isTimeout ? "provider_uncertain" : "network_unavailable",
        isTimeout ? 504 : 0,
        browserTransport(request.diagnosticPhase),
      );
    }
  };
}

function normalizeTransportPolicy(transportPolicy, requireTapRequest = false) {
  if (requireTapRequest || transportPolicy === "tap-request") return "tap-request";
  if (transportPolicy === "browser-fetch") return "browser-fetch";
  return "auto";
}

export function getPlayerAgnesTransport({ transportPolicy = "auto", requireTapRequest = false } = {}) {
  const policy = normalizeTransportPolicy(transportPolicy, requireTapRequest);
  if (policy === "browser-fetch") {
    return { name: "browser.fetch", available: typeof globalThis.fetch === "function", policy };
  }
  const tapApi = globalThis.tap;
  if (tapApi && typeof tapApi.request === "function") return { name: "tap.request", available: true, policy };
  if (policy === "tap-request" || Object.prototype.hasOwnProperty.call(globalThis, "tap")) {
    return { name: "tap.request", available: false, policy };
  }
  return { name: "browser.fetch", available: typeof globalThis.fetch === "function", policy };
}

function resolvePlayerAgnesFetch(fetchImpl, {
  transportPolicy = "auto",
  requireTapRequest = false,
  diagnosticPhase = "provider",
} = {}) {
  const transport = getPlayerAgnesTransport({ transportPolicy, requireTapRequest });
  if (transport.name === "tap.request") {
    if (!transport.available) {
      throw new PlayerAgnesError("network_unavailable", 0, tapTransport(null, diagnosticPhase, [], {
        stage: "bridge",
        reason: "bridge-unavailable",
      }));
    }
    return createTapRequestFetch(globalThis.tap);
  }
  return createBrowserFetch(fetchImpl);
}

function classifyResponseStatus(status, transport) {
  const classified = classifyProviderFailure({ status });
  return new PlayerAgnesError(classified.code, classified.status, {
    ...(transport || browserTransport("provider", status)),
    stage: status === 401 || status === 403 ? "auth" : "HTTP",
    statusCode: Number(status) || 0,
  });
}

async function providerFetch(fetchImpl, key, payload, {
  phase = "provider",
  transportPolicy = "auto",
  requireTapRequest = false,
} = {}) {
  if (!normalizedKey(key)) throw new PlayerAgnesError("key_required", 0);
  let response;
  try {
    response = await resolvePlayerAgnesFetch(fetchImpl, { transportPolicy, requireTapRequest, diagnosticPhase: phase })(AGNES_CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: providerHeaders(key),
      body: JSON.stringify(payload),
      signal: typeof AbortSignal?.timeout === "function" ? AbortSignal.timeout(120000) : undefined,
      diagnosticPhase: phase,
    });
  } catch (error) {
    if (error instanceof PlayerAgnesError) throw error;
    if (error?.name === "AbortError" || error?.name === "TimeoutError") {
      throw new PlayerAgnesError("provider_uncertain", 504);
    }
    throw new PlayerAgnesError("network_unavailable", 0);
  }
  if (!response.ok) throw classifyResponseStatus(response.status, response.transport);
  return response;
}

export async function testPlayerAgnesConnection(fetchImpl, key, {
  transportPolicy = "auto",
  requireTapRequest = false,
} = {}) {
  const response = await providerFetch(fetchImpl, key, {
    model: AGNES_MODEL,
    messages: [{ role: "user", content: "请只回复一个字：好" }],
    temperature: 0,
    max_tokens: 1,
    stream: false,
  }, { phase: "connection-test", transportPolicy, requireTapRequest });
  let body;
  try {
    body = await response.json();
  } catch {
    throw new PlayerAgnesError("provider_error", response.status || 502, {
      ...(response.transport || browserTransport("connection-test", response.status)),
      stage: "response-parse",
    });
  }
  const choice = Array.isArray(body?.choices) ? body.choices[0] : null;
  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    !choice ||
    !choice.message ||
    typeof choice.message !== "object" ||
    choice.message.role !== "assistant"
  ) {
    throw new PlayerAgnesError("provider_error", response.status || 502, {
      ...(response.transport || browserTransport("connection-test", response.status)),
      stage: "model-contract",
    });
  }
  return {
    connected: true,
    model: typeof body.model === "string" ? body.model : null,
    transport: response.transport || browserTransport("connection-test", response.status),
  };
}

export async function streamPlayerAgentTurn(
  fetchImpl,
  key,
  game,
  history,
  action = "",
  onDelta = () => {},
  { transportPolicy = "auto" } = {},
) {
  if (!normalizedKey(key)) throw new PlayerAgnesError("key_required", 0);
  try {
    return await runEventAgentTurn({
      provider: new AgnesProvider({
        fetchImpl: resolvePlayerAgnesFetch(fetchImpl, { transportPolicy, diagnosticPhase: "decision" }),
        apiKey: key,
        narrativeResponseMode: "json",
      }),
      gameState: game,
      history,
      action,
      onDelta,
    });
  } catch (error) {
    if (error instanceof PlayerAgnesError) throw error;
    if (error?.code) throw new PlayerAgnesError(error.code, error.status || 0, error.transport);
    throw new PlayerAgnesError("provider_error", error?.status || 502);
  }
}

export async function streamPlayerAgnesResolution(
  fetchImpl,
  key,
  game,
  onDelta = () => {},
  { transportPolicy = "auto" } = {},
) {
  const pendingResolution = game?.meta?.pendingResolution;
  if (!pendingResolution) throw new PlayerAgnesError("invalid_resolution_state", 400);
  const snapshot = sanitizeGameSnapshot(game);
  const payload = buildAgnesResolutionPayload(snapshot, pendingResolution, { stream: false });
  let rawContent;
  try {
    ({ content: rawContent } = await new AgnesProvider({
      fetchImpl: resolvePlayerAgnesFetch(fetchImpl, { transportPolicy, diagnosticPhase: "resolution" }),
      apiKey: key,
      narrativeResponseMode: "json",
      diagnosticPhase: "resolution",
    }).streamNarrative({
      messages: payload.messages,
      onDelta,
    }));
  } catch (error) {
    throw new PlayerAgnesError(error?.code || "provider_error", error?.status || 502, error?.transport);
  }
  try {
    return {
      resolution: parseAgnesResolution(rawContent),
      rawContent,
      structured: true,
      validationReason: null,
    };
  } catch {
    return { resolution: null, rawContent, structured: false, validationReason: "resolution_contract_drift" };
  }
}
