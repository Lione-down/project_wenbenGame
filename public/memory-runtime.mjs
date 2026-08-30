import { buildTurnContext } from "./context-builder.mjs";

const RECENT_EVENT_LIMIT = 40;
const MEMORY_LIMIT = 120;
const HISTORY_LIMIT = 80;
const USAGE_WINDOW = 20;

function normalizedUsage(usage = {}) {
  return {
    promptTokens: Math.max(0, Math.floor(Number(usage.promptTokens) || 0)),
    completionTokens: Math.max(0, Math.floor(Number(usage.completionTokens) || 0)),
    totalTokens: Math.max(0, Math.floor(Number(usage.totalTokens) || 0)),
  };
}

function ensureMemoryShape(state) {
  state.recentEvents ??= [];
  state.memories ??= [];
  state.historySummary ??= [];
  state.agent ??= {};
  state.agent.usage ??= {};
  state.agent.usage.lastPromptTokens ??= 0;
  state.agent.usage.promptTokens20 ??= [];
  state.agent.usage.avgPromptTokens20 ??= 0;
  state.agent.usage.maxPromptTokens ??= 0;
  state.agent.effectiveEventCount ??= 0;
}

function isPermanentEvent(event) {
  return event?.type === "world" || event?.type === "death" || Number(event?.importance) >= 0.8;
}

function asMemory(event) {
  return {
    id: `mem-${event.id || crypto.randomUUID()}`,
    type: event.type || "event",
    gameTime: event.gameTime || null,
    entityIds: Array.isArray(event.entityIds) ? event.entityIds.slice(0, 8) : [],
    summary: String(event.summary || "发生了一件值得记住的事").slice(0, 240),
    importance: Math.min(1, Math.max(0, Number(event.importance) || 0.5)),
  };
}

function archiveStalePassersby(state) {
  const playerNpcs = new Map((state.player?.npcs || []).map((npc) => [npc.id, npc]));
  const relationships = new Map((state.player?.relationships || []).map((entry) => [entry.npcId, entry]));
  const removedIds = new Set();
  state.world.npcs = (state.world.npcs || []).filter((npc) => {
    const playerNpc = playerNpcs.get(npc.id);
    const relationship = relationships.get(npc.id);
    const lastTurn = Math.max(0, ...(npc.interactions || []).map((entry) => Number(entry.turn) || 0));
    const isStalePasserby = npc.alive !== false
      && playerNpc?.role === "途中所遇"
      && (npc.interactions || []).length <= 1
      && (Number(relationship?.affection) || 0) === 0
      && state.meta.turn - lastTurn >= 200;
    if (!isStalePasserby) return true;
    removedIds.add(npc.id);
    state.memories.push({
      id: `mem-passerby-${npc.id}`,
      type: "encounter",
      gameTime: null,
      entityIds: ["player", npc.id],
      summary: `曾在旅途中遇见${npc.name}，此后再无重要交集。`,
      importance: 0.45,
    });
    return false;
  });
  if (removedIds.size === 0) return;
  state.player.npcs = (state.player.npcs || []).filter((npc) => !removedIds.has(npc.id));
  state.player.relationships = (state.player.relationships || []).filter((entry) => !removedIds.has(entry.npcId));
  for (const npcId of removedIds) delete state.world.npcKnowledge?.[npcId];
}

function consolidateInPlace(state, keepRecent = RECENT_EVENT_LIMIT) {
  const overflow = state.recentEvents.splice(0, Math.max(0, state.recentEvents.length - keepRecent));
  for (const event of overflow) {
    if (isPermanentEvent(event)) {
      state.historySummary.push(asMemory(event));
    } else if (Number(event.importance) >= 0.45) {
      state.memories.push(asMemory(event));
    }
  }
  archiveStalePassersby(state);
  state.memories = state.memories
    .sort((left, right) => (Number(right.importance) || 0) - (Number(left.importance) || 0))
    .slice(0, MEMORY_LIMIT);
  state.historySummary = state.historySummary.slice(-HISTORY_LIMIT);
}

export function initializeAgentMemoryState(gameState) {
  const next = structuredClone(gameState);
  ensureMemoryShape(next);
  return next;
}

export function getContextPolicy(gameState) {
  const promptTokens = Number(gameState?.agent?.usage?.lastPromptTokens) || 0;
  if (promptTokens > 64000) return { mode: "blocked", recentLimit: 0, memoryLimit: 0, worldLimit: 0 };
  if (promptTokens > 48000) return { mode: "forced", recentLimit: 5, memoryLimit: 3, worldLimit: 3 };
  if (promptTokens > 32000) return { mode: "compact", recentLimit: 8, memoryLimit: 5, worldLimit: 5 };
  return { mode: "normal", recentLimit: 10, memoryLimit: 8, worldLimit: 8 };
}

export function recordAgentTurn(gameState, { event, usage } = {}) {
  const next = initializeAgentMemoryState(gameState);
  if (event) {
    next.recentEvents.push(structuredClone(event));
    next.agent.effectiveEventCount += 1;
  }
  const currentUsage = normalizedUsage(usage);
  next.agent.usage.lastPromptTokens = currentUsage.promptTokens;
  next.agent.usage.promptTokens20.push(currentUsage.promptTokens);
  next.agent.usage.promptTokens20 = next.agent.usage.promptTokens20.slice(-USAGE_WINDOW);
  next.agent.usage.avgPromptTokens20 = Math.round(
    next.agent.usage.promptTokens20.reduce((sum, value) => sum + value, 0) /
    Math.max(1, next.agent.usage.promptTokens20.length),
  );
  next.agent.usage.maxPromptTokens = Math.max(next.agent.usage.maxPromptTokens, currentUsage.promptTokens);

  const policy = getContextPolicy(next);
  const isGcTurn = next.agent.effectiveEventCount > 0 && next.agent.effectiveEventCount % 25 === 0;
  if (isGcTurn || policy.mode === "compact" || policy.mode === "forced" || next.recentEvents.length > RECENT_EVENT_LIMIT) {
    consolidateInPlace(next, policy.mode === "forced" ? 10 : policy.mode === "compact" ? 20 : RECENT_EVENT_LIMIT);
  }
  return next;
}

export function buildMemoryAwareContext(gameState, {
  playerInput = "",
  npcId = null,
  worldKnowledge = [],
} = {}) {
  const state = initializeAgentMemoryState(gameState);
  const policy = getContextPolicy(state);
  if (policy.mode === "blocked") throw new Error("context_hard_limit");
  const context = buildTurnContext(state, {
    playerInput,
    memories: state.memories,
    worldKnowledge,
    limits: policy,
    npcId,
  });
  context.historySummary = state.historySummary.slice(-Math.max(2, policy.memoryLimit));
  context.contextPolicy = policy.mode;
  return context;
}
