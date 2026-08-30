import { buildNpcPerspective } from "./npc-knowledge-service.mjs";

function highestImportance(entries, limit) {
  return (Array.isArray(entries) ? entries : [])
    .slice()
    .sort((left, right) => (Number(right.importance) || 0) - (Number(left.importance) || 0))
    .slice(0, limit)
    .map((entry) => structuredClone(entry));
}

export function buildTurnContext(gameState, {
  playerInput = "",
  memories = [],
  worldKnowledge = [],
  limits = {},
  npcId = null,
} = {}) {
  if (!gameState?.player || !gameState?.world) throw new Error("invalid_game_state");
  const recentLimit = Math.min(10, Math.max(1, Number(limits.recentLimit) || 10));
  const memoryLimit = Math.min(8, Math.max(1, Number(limits.memoryLimit) || 8));
  const worldLimit = Math.min(8, Math.max(1, Number(limits.worldLimit) || 8));
  return {
    playerState: {
      name: gameState.player.name,
      realm: gameState.player.realm,
      realmStage: gameState.player.realmStage,
      location: gameState.player.location,
      abnormal: gameState.player.abnormal,
      resources: structuredClone(gameState.player.resources),
      learnedSkills: structuredClone(gameState.player.martialSkills || []),
    },
    currentScene: structuredClone(gameState.currentScene || null),
    relevantNpcs: (gameState.world.npcs || []).slice(-8).map((npc) => ({
      id: npc.id,
      name: npc.name,
      alive: npc.alive,
      goal: npc.goal,
      interactions: (npc.interactions || []).slice(-3),
    })),
    recentEvents: (gameState.recentEvents?.length ? gameState.recentEvents : gameState.chronicle || [])
      .slice(-recentLimit).map((entry) => structuredClone(entry)),
    memories: highestImportance(memories, memoryLimit),
    worldKnowledge: highestImportance(worldKnowledge, worldLimit),
    ...(npcId ? { npcPerspective: buildNpcPerspective(gameState, npcId) } : {}),
    playerInput: String(playerInput || "").slice(0, 120),
  };
}
