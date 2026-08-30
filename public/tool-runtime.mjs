import {
  advanceAntagonistPlans,
  advanceGameTime,
  assessWorldDanger,
  attemptBreakthrough,
  calculateMonthlyCultivation,
} from "./game-engine.mjs";
import { resolveCombatEncounterChoice } from "./combat-system.mjs";
import { chooseOfflineEvent } from "./game-data.mjs";
import { getNpcKnowledge } from "./npc-knowledge-service.mjs";
import { searchWorldKnowledge } from "./world-knowledge.mjs";

const SETTLEMENT_TOOLS = new Set([
  "resolve_cultivation",
  "resolve_training",
  "resolve_breakthrough",
  "resolve_combat",
  "resolve_travel",
  "resolve_social_action",
  "advance_time",
]);

const TOOL_ARGUMENT_SPECS = Object.freeze({
  get_player_state: { allowed: [] },
  get_npc_state: { allowed: ["npc_id"], required: ["npc_id"] },
  get_npc_knowledge: { allowed: ["npc_id"], required: ["npc_id"] },
  get_world_state: { allowed: [] },
  get_location_state: { allowed: ["location_id"], required: ["location_id"] },
  get_faction_state: { allowed: ["faction_id"], required: ["faction_id"] },
  search_memory: { allowed: ["query"], required: ["query"] },
  search_world_knowledge: { allowed: ["query"], required: ["query"] },
  resolve_cultivation: { allowed: ["days"], required: ["days"] },
  resolve_training: { allowed: ["target_id", "days"], required: ["target_id", "days"] },
  resolve_breakthrough: { allowed: ["route"], required: ["route"] },
  resolve_combat: { allowed: ["encounter_id", "action", "skill_id"], required: ["encounter_id", "action"] },
  resolve_travel: { allowed: ["destination_id"], required: ["destination_id"] },
  resolve_social_action: { allowed: ["npc_id", "intent"], required: ["npc_id", "intent"] },
  resolve_random_event: { allowed: ["activity"] },
  advance_time: { allowed: ["days"], required: ["days"] },
  world_tick: { allowed: [] },
  npc_tick: { allowed: [] },
});

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function safeArguments(call) {
  return call?.arguments && typeof call.arguments === "object" && !Array.isArray(call.arguments)
    ? call.arguments
    : {};
}

function assertToolArguments(name, args) {
  const spec = TOOL_ARGUMENT_SPECS[name];
  if (!spec) return;
  if (Object.keys(args).some((key) => !spec.allowed.includes(key))) throw new Error(`tool_arguments_invalid:${name}`);
  if ((spec.required || []).some((key) => !Object.hasOwn(args, key))) throw new Error(`tool_arguments_invalid:${name}`);
  const stringKeys = ["npc_id", "location_id", "faction_id", "query", "target_id", "route", "encounter_id", "action", "skill_id", "destination_id", "intent", "activity"];
  if (stringKeys.some((key) => Object.hasOwn(args, key) && (typeof args[key] !== "string" || !args[key].trim()))) {
    throw new Error(`tool_arguments_invalid:${name}`);
  }
  if (Object.hasOwn(args, "days")) {
    const maximum = name === "resolve_training" ? 365 : 3650;
    if (!Number.isInteger(args.days) || args.days < 1 || args.days > maximum) throw new Error(`tool_arguments_invalid:${name}`);
  }
  if (name === "resolve_breakthrough" && !new Set(["human", "earth", "heaven"]).has(args.route)) {
    throw new Error(`tool_arguments_invalid:${name}`);
  }
}

function playerState(state) {
  return {
    name: state.player.name,
    realm: state.player.realm,
    realmStage: state.player.realmStage,
    location: state.player.location,
    abnormal: state.player.abnormal,
    cultivation: state.player.cultivation,
    resources: structuredClone(state.player.resources),
    learnedSkills: structuredClone(state.player.martialSkills || []),
  };
}

function npcState(state, npcId) {
  const npc = state.world.npcs.find((candidate) => candidate.id === npcId);
  if (!npc) throw new Error("npc_not_encountered");
  return structuredClone(npc);
}

function validateState(previous, next) {
  if (!next?.meta || !next?.player || !next?.world) throw new Error("invalid_turn_result");
  if (next.meta.schemaVersion !== previous.meta.schemaVersion) throw new Error("invalid_turn_result_schema");
  if (!Number.isInteger(next.meta.elapsedDays) || next.meta.elapsedDays < previous.meta.elapsedDays) {
    throw new Error("invalid_turn_result_time");
  }
  if (Object.hasOwn(next.world, "knowledgeBase")) throw new Error("static_world_must_not_enter_state");
  const previousNpcs = new Map((previous.world.npcs || []).map((npc) => [npc.id, npc]));
  for (const npc of next.world.npcs || []) {
    if (previousNpcs.get(npc.id)?.alive === false && npc.alive !== false) throw new Error("dead_npc_resurrection");
  }
}

function updateRelationship(state, npcId, intent) {
  const npc = state.world.npcs.find((candidate) => candidate.id === npcId && candidate.alive);
  if (!npc) throw new Error("npc_not_available");
  const next = structuredClone(state);
  const relationship = next.player.relationships.find((entry) => entry.npcId === npcId);
  if (!relationship) throw new Error("npc_relationship_missing");
  const change = /威胁|欺骗|敌/u.test(String(intent || "")) ? -5 : 4;
  relationship.affection = clamp((Number(relationship.affection) || 0) + change, -100, 120);
  npcState(next, npcId).interactions;
  const record = next.world.npcs.find((entry) => entry.id === npcId);
  record.interactions.push({
    turn: next.meta.turn,
    year: next.world.year,
    month: next.world.month,
    day: next.world.day,
    eventId: `agent-social-${next.meta.turn}`,
    context: "current",
    summary: String(intent || "与玩家交谈").slice(0, 160),
  });
  return { next, change, npc };
}

export function createGameToolRuntime(gameState, {
  random = Math.random,
  worldSearch = searchWorldKnowledge,
} = {}) {
  if (typeof random !== "function") throw new TypeError("random service is required");
  const original = structuredClone(gameState);
  let working = structuredClone(gameState);
  let authoritativeResult = null;
  let isCommitted = false;
  let hasSettlement = false;
  let elapsedThisTurn = 0;

  function stage(next, result) {
    validateState(working, next);
    working = next;
    authoritativeResult = structuredClone(result);
    return structuredClone(result);
  }

  return {
    get result() {
      return authoritativeResult ? structuredClone(authoritativeResult) : null;
    },
    get state() {
      return structuredClone(working);
    },
    async execute(call) {
      const name = String(call?.name || "");
      const args = safeArguments(call);
      assertToolArguments(name, args);
      if (SETTLEMENT_TOOLS.has(name)) {
        if (hasSettlement) throw new Error("multiple_settlement_tools_not_allowed");
        hasSettlement = true;
      }
      switch (name) {
        case "get_player_state":
          return playerState(working);
        case "get_npc_state":
          return npcState(working, String(args.npc_id || ""));
        case "get_npc_knowledge":
          return { npcId: String(args.npc_id || ""), knowledge: getNpcKnowledge(working, String(args.npc_id || "")) };
        case "get_world_state":
          return {
            year: working.world.year,
            month: working.world.month,
            day: working.world.day,
            latest: working.world.latest,
            danger: structuredClone(working.world.danger),
          };
        case "get_location_state": {
          const locationId = String(args.location_id || "");
          return {
            static: worldSearch(locationId, { limit: 1 })[0] || null,
            dynamic: structuredClone(working.world.locationStates?.[locationId] || null),
          };
        }
        case "get_faction_state": {
          const factionId = String(args.faction_id || "");
          return {
            static: worldSearch(factionId, { limit: 1 })[0] || null,
            dynamic: structuredClone(working.world.factionStates?.[factionId] || null),
          };
        }
        case "search_memory": {
          const query = String(args.query || "").trim();
          return {
            matches: (working.memories || []).filter((entry) => String(entry.summary || "").includes(query)).slice(0, 8),
          };
        }
        case "search_world_knowledge":
          return { matches: worldSearch(String(args.query || ""), { limit: 8 }) };
        case "resolve_random_event": {
          const randomRoll = clamp(Number(random()) || 0, 0, 0.999999999);
          const eventState = structuredClone(working);
          eventState.meta.seed = (eventState.meta.seed + Math.floor(randomRoll * 0xffffffff)) >>> 0;
          const event = chooseOfflineEvent(eventState);
          authoritativeResult = structuredClone(event);
          return {
            kind: "event",
            title: event.title,
            danger: event.danger,
            choices: event.choices,
            randomRoll,
          };
        }
        case "resolve_cultivation": {
          const days = clamp(Math.floor(Number(args.days) || 0), 1, 3650);
          const calculation = calculateMonthlyCultivation(working, { mode: days >= 30 ? "closedDoor" : "normal" });
          const next = advanceGameTime(working, {
            durationDays: days,
            activityType: "retreat",
            eventTitle: "闭关修炼",
            result: "依照本地修炼规则完成吐纳与淬炼。",
          });
          elapsedThisTurn = days;
          return stage(next, { kind: "cultivation", days, cultivationGain: next.player.cultivation - working.player.cultivation, calculation });
        }
        case "resolve_training": {
          const days = clamp(Math.floor(Number(args.days) || 0), 1, 365);
          const targetId = String(args.target_id || "");
          if (!(working.player.martialSkills || []).some((skill) => skill.id === targetId)) throw new Error("training_target_not_learned");
          let next = advanceGameTime(working, { durationDays: days, activityType: "retreat", eventTitle: "研习武技", result: "依照本地训练规则打磨已学武技。" });
          const skill = next.player.martialSkills.find((entry) => entry.id === targetId);
          const masteryGain = Math.max(1, Math.floor(days / 3));
          skill.mastery = clamp((Number(skill.mastery) || 0) + masteryGain, 0, 100);
          elapsedThisTurn = days;
          return stage(next, { kind: "training", targetId, days, masteryGain });
        }
        case "resolve_breakthrough": {
          const roll = () => clamp(Number(random()) || 0, 0, 1);
          const resolved = attemptBreakthrough(working, String(args.route || ""), {
            insight: roll(), success: roll(), thunder: roll(), heartDemon: roll(), fate: roll(),
          });
          elapsedThisTurn = 30;
          return stage(resolved.state, { kind: "breakthrough", ...resolved.outcome });
        }
        case "resolve_combat": {
          const event = working.currentScene?.event || working.meta.pendingCombatEvent;
          if (!event) throw new Error("combat_encounter_not_found");
          const resolved = resolveCombatEncounterChoice(working, event, String(args.action || ""), {
            skillId: args.skill_id ? String(args.skill_id) : undefined,
            roll: clamp(Number(random()) || 0, 0, 1),
          });
          return stage(resolved.state, { kind: "combat", encounter: resolved.encounter, ...resolved.outcome });
        }
        case "resolve_travel": {
          const destinationId = String(args.destination_id || "");
          const destination = worldSearch(destinationId, { limit: 1 })[0];
          if (!destination || destination.type !== "region" && destination.type !== "city") throw new Error("travel_destination_unknown");
          const days = 2 + Math.floor(clamp(Number(random()) || 0, 0, 0.999999) * 6);
          const next = advanceGameTime(working, { durationDays: days, activityType: "travel", eventTitle: `前往${destination.name}`, result: `按本地路程规则抵达${destination.name}。` });
          next.player.location = destination.name;
          elapsedThisTurn = days;
          return stage(next, { kind: "travel", destinationId, destinationName: destination.name, days });
        }
        case "resolve_social_action": {
          const npcId = String(args.npc_id || "");
          const social = updateRelationship(working, npcId, args.intent);
          const next = advanceGameTime(social.next, { durationDays: 1, activityType: "dialogue", eventTitle: `与${social.npc.name}交谈`, result: String(args.intent || "双方交换了有限信息。") });
          elapsedThisTurn = 1;
          return stage(next, { kind: "social", npcId, affectionChange: social.change, days: 1 });
        }
        case "advance_time": {
          const days = clamp(Math.ceil(Number(args.days) || 0), 1, 3650);
          const next = advanceGameTime(working, { durationDays: days, activityType: "mainline" });
          elapsedThisTurn = days;
          return stage(next, { kind: "time", days });
        }
        case "world_tick": {
          let next = advanceAntagonistPlans(working);
          next.world.danger = assessWorldDanger(next);
          working = next;
          return { kind: "world_tick", danger: structuredClone(next.world.danger) };
        }
        case "npc_tick": {
          const months = Math.floor(elapsedThisTurn / 30);
          if (months > 0) {
            const next = structuredClone(working);
            for (const npc of next.world.npcs) npc.ageMonths += months;
            working = next;
          }
          return { kind: "npc_tick", elapsedDays: elapsedThisTurn };
        }
        default:
          throw new Error(`tool_not_implemented:${name}`);
      }
    },
    commit() {
      if (isCommitted) throw new Error("turn_already_committed");
      validateState(original, working);
      isCommitted = true;
      return structuredClone(working);
    },
  };
}
