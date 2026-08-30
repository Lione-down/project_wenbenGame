function encounteredNpc(state, npcId) {
  const npc = state?.world?.npcs?.find((candidate) => candidate.id === npcId);
  if (!npc) throw new Error("npc_not_encountered");
  return npc;
}

function knowledgeLedger(state, npcId) {
  state.world.npcKnowledge ??= {};
  state.world.npcKnowledge[npcId] ??= [];
  return state.world.npcKnowledge[npcId];
}

export function recordNpcKnowledge(gameState, npcId, intel = {}) {
  encounteredNpc(gameState, npcId);
  const next = structuredClone(gameState);
  const ledger = knowledgeLedger(next, npcId);
  const id = String(intel.id || `intel-${next.meta.turn}-${ledger.length}`).slice(0, 64);
  const record = {
    id,
    subjectId: String(intel.subjectId || "world").slice(0, 64),
    summary: String(intel.summary || "").trim().slice(0, 240),
    confidence: Math.min(1, Math.max(0, Number(intel.confidence) || 0)),
    acquiredTurn: next.meta.turn,
    source: String(intel.source || "observed").slice(0, 40),
  };
  if (!record.summary) throw new Error("npc_knowledge_summary_required");
  const existing = ledger.findIndex((entry) => entry.id === id);
  if (existing >= 0) ledger[existing] = record;
  else ledger.push(record);
  next.world.npcKnowledge[npcId] = ledger.slice(-80);
  return next;
}

export function getNpcKnowledge(gameState, npcId) {
  encounteredNpc(gameState, npcId);
  return structuredClone(gameState.world.npcKnowledge?.[npcId] || []);
}

export function buildNpcPerspective(gameState, npcId) {
  const npc = encounteredNpc(gameState, npcId);
  return {
    npc: {
      id: npc.id,
      name: npc.name,
      alive: npc.alive,
      goal: npc.goal,
      realmIndex: npc.realmIndex,
      stageIndex: npc.stageIndex,
    },
    knowledge: getNpcKnowledge(gameState, npcId),
  };
}
