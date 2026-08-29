import {
  AGNES_CHAT_COMPLETIONS_URL,
  AGNES_MODEL,
  buildAgnesPayload,
  classifyProviderFailure,
  parseAgnesEventWithRecovery,
} from "../lib/agnes-contract.mjs";
import { sanitizeGameSnapshot } from "../lib/agnes-game-snapshot.mjs";
import {
  buildAgnesResolutionPayload,
  parseAgnesResolution,
} from "../lib/agnes-resolution-contract.mjs";

export const PLAYER_AGNES_SESSION_KEY = "destiny-beyond.player-agnes.session.v1";
export const PLAYER_AGNES_LOCAL_KEY = "destiny-beyond.player-agnes.local.v1";

export class PlayerAgnesError extends Error {
  constructor(code, status = 0) {
    super(code);
    this.name = "PlayerAgnesError";
    this.code = code;
    this.status = status;
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

function classifyResponseStatus(status) {
  const classified = classifyProviderFailure({ status });
  return new PlayerAgnesError(classified.code, classified.status);
}

async function providerFetch(fetchImpl, key, payload) {
  if (!normalizedKey(key)) throw new PlayerAgnesError("key_required", 0);
  let response;
  try {
    response = await fetchImpl(AGNES_CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: providerHeaders(key),
      body: JSON.stringify(payload),
      signal: typeof AbortSignal?.timeout === "function" ? AbortSignal.timeout(120000) : undefined,
    });
  } catch (error) {
    if (error instanceof PlayerAgnesError) throw error;
    if (error?.name === "AbortError" || error?.name === "TimeoutError") {
      throw new PlayerAgnesError("provider_uncertain", 504);
    }
    throw new PlayerAgnesError("network_unavailable", 0);
  }
  if (!response.ok) throw classifyResponseStatus(response.status);
  return response;
}

export async function testPlayerAgnesConnection(fetchImpl, key) {
  const response = await providerFetch(fetchImpl, key, {
    model: AGNES_MODEL,
    messages: [{ role: "user", content: "请只回复一个字：好" }],
    temperature: 0,
    max_tokens: 1,
    stream: false,
  });
  let body;
  try {
    body = await response.json();
    const choice = Array.isArray(body?.choices) ? body.choices[0] : null;
    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body) ||
      body.model !== AGNES_MODEL ||
      !choice ||
      !choice.message ||
      typeof choice.message !== "object" ||
      choice.message.role !== "assistant"
    ) {
      throw new Error("invalid_connection_completion");
    }
  } catch {
    throw new PlayerAgnesError("provider_error", response.status || 502);
  }
  return { connected: true, model: AGNES_MODEL };
}

function findSseBoundary(buffer) {
  const match = /\r?\n\r?\n/.exec(buffer);
  return match ? { index: match.index, length: match[0].length } : null;
}

async function consumeProviderStream(response, onDelta) {
  if (!response.body || typeof response.body.getReader !== "function") {
    throw new PlayerAgnesError("provider_error", response.status || 502);
  }
  const reader = response.body.getReader();
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
      throw new PlayerAgnesError("provider_error", response.status || 502);
    }
    if (chunk?.model && chunk.model !== AGNES_MODEL) {
      throw new PlayerAgnesError("provider_error", response.status || 502);
    }
    const choice = Array.isArray(chunk?.choices) ? chunk.choices[0] : null;
    if (choice?.finish_reason === "length") {
      throw new PlayerAgnesError("provider_error", response.status || 502);
    }
    const delta = typeof choice?.delta?.content === "string" ? choice.delta.content : "";
    if (!delta) return;
    content += delta;
    if (content.length > 24000) throw new PlayerAgnesError("provider_error", response.status || 502);
    onDelta(delta);
  };

  while (!isDone) {
    let result;
    try {
      result = await reader.read();
    } catch {
      throw new PlayerAgnesError("network_unavailable", 0);
    }
    buffer += decoder.decode(result.value, { stream: !result.done });
    let boundary = findSseBoundary(buffer);
    while (boundary) {
      const frame = buffer.slice(0, boundary.index);
      buffer = buffer.slice(boundary.index + boundary.length);
      consumeFrame(frame);
      if (isDone) break;
      boundary = findSseBoundary(buffer);
    }
    if (result.done) break;
  }
  if (!isDone || !content.trim()) throw new PlayerAgnesError("provider_error", response.status || 502);
  return content;
}

function snapshotReferences(snapshot) {
  const player = snapshot.player;
  return [
    player.location,
    player.sect?.name,
    ...(Array.isArray(player.techniques) ? player.techniques : []),
    ...(Array.isArray(player.techniqueBuild?.known) ? player.techniqueBuild.known : []),
    ...(Array.isArray(player.npcs) ? player.npcs.map((npc) => npc?.name) : []),
    ...(Array.isArray(player.relationships) ? player.relationships.map((entry) => entry?.name) : []),
    ...(Array.isArray(snapshot.world?.npcs) ? snapshot.world.npcs.map((npc) => npc?.name) : []),
  ].filter((value) => typeof value === "string" && value.trim());
}

export async function streamPlayerAgnesEvent(
  fetchImpl,
  key,
  game,
  history,
  action = "",
  onDelta = () => {},
) {
  const snapshot = sanitizeGameSnapshot(game);
  const response = await providerFetch(fetchImpl, key, buildAgnesPayload(snapshot, history, action, { stream: true }));
  const rawContent = await consumeProviderStream(response, onDelta);
  try {
    return {
      event: parseAgnesEventWithRecovery(rawContent, {
        allowedReferences: snapshotReferences(snapshot),
        deadNpcNames: snapshot.world.npcs.filter((npc) => !npc.alive).map((npc) => npc.name),
      }),
      rawContent,
      structured: true,
      validationReason: null,
    };
  } catch {
    return { event: null, rawContent, structured: false, validationReason: "event_contract_drift" };
  }
}

export async function streamPlayerAgnesResolution(fetchImpl, key, game, onDelta = () => {}) {
  const pendingResolution = game?.meta?.pendingResolution;
  if (!pendingResolution) throw new PlayerAgnesError("invalid_resolution_state", 400);
  const snapshot = sanitizeGameSnapshot(game);
  const response = await providerFetch(
    fetchImpl,
    key,
    buildAgnesResolutionPayload(snapshot, pendingResolution, { stream: true }),
  );
  const rawContent = await consumeProviderStream(response, onDelta);
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
