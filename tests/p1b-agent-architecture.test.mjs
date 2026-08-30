import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { createNewGame, registerNpcEncounter } from "../public/game-engine.mjs";

function makeGame(seed = 7319) {
  return createNewGame({
    name: "沈砚",
    gender: "男",
    age: 18,
    birthplace: "北境荒村",
    background: "山野遗孤",
    path: "问道飞升",
    spiritRootGrade: "天灵根",
    rootPrimaryElement: "雷",
    rootSecondaryElement: "",
    constitution: "凡体",
    talent: "心志坚韧",
    stats: { aptitude: 10, insight: 10, soul: 10, agility: 10, martialHeart: 10, fortune: 10 },
  }, seed);
}

test("P1-B 1000 effective events keep memory and context bounded", async () => {
  const { recordAgentTurn, buildMemoryAwareContext } = await import("../public/memory-runtime.mjs");
  let state = makeGame();
  let largestContext = 0;
  let lateSmallest = Number.POSITIVE_INFINITY;
  for (let index = 0; index < 1000; index += 1) {
    state = recordAgentTurn(state, {
      event: {
        id: `evt-${index}`,
        type: index % 125 === 0 ? "world" : "ordinary",
        summary: `第${index}次有效事件`,
        importance: index % 125 === 0 ? 0.95 : 0.1,
      },
      usage: { promptTokens: 12000 + (index % 11), completionTokens: 220, totalTokens: 12220 + (index % 11) },
    });
    const context = buildMemoryAwareContext(state, { playerInput: "继续赶路" });
    const size = JSON.stringify(context).length;
    largestContext = Math.max(largestContext, size);
    if (index >= 500) lateSmallest = Math.min(lateSmallest, size);
  }

  assert.ok(state.recentEvents.length <= 40);
  assert.ok(state.memories.length <= 120);
  assert.ok(state.historySummary.length > 0);
  assert.equal(state.agent.usage.promptTokens20.length, 20);
  assert.ok(largestContext - lateSmallest < 12000);
  assert.equal(JSON.stringify(state).includes("第1次有效事件"), false);
});

test("P1-B usage thresholds compact context and fail closed beyond the hard limit", async () => {
  const { recordAgentTurn, getContextPolicy, buildMemoryAwareContext } = await import("../public/memory-runtime.mjs");
  let state = makeGame();
  state = recordAgentTurn(state, { event: { id: "soft", summary: "软阈值", importance: 0.3 }, usage: { promptTokens: 33000 } });
  assert.equal(getContextPolicy(state).mode, "compact");
  state = recordAgentTurn(state, { event: { id: "force", summary: "强制压缩", importance: 0.3 }, usage: { promptTokens: 49000 } });
  assert.equal(getContextPolicy(state).mode, "forced");
  state = recordAgentTurn(state, { event: { id: "hard", summary: "越过硬阈值", importance: 0.3 }, usage: { promptTokens: 65000 } });
  assert.throws(() => buildMemoryAwareContext(state, { playerInput: "继续" }), /context_hard_limit/);
});

test("P1-B NPC perspective exposes acquired knowledge but not hidden player state", async () => {
  const { recordNpcKnowledge, getNpcKnowledge, buildNpcPerspective } = await import("../public/npc-knowledge-service.mjs");
  let state = registerNpcEncounter(makeGame(), {
    id: "npc-scout",
    name: "邢舟",
    gender: "男",
    species: "人族",
    realmIndex: 1,
    stageIndex: 0,
    goal: "查明北线来客",
  }, { eventId: "evt-meet", summary: "在北关照面" });
  state.player.realmIndex = 5;
  state.player.realm = "六合境";
  state.player.inventory.divineCrystal = 3;
  state = recordNpcKnowledge(state, "npc-scout", {
    id: "intel-realm",
    subjectId: "player",
    summary: "此人至少踏入四象境",
    confidence: 0.7,
  });

  const knowledge = getNpcKnowledge(state, "npc-scout");
  const perspective = buildNpcPerspective(state, "npc-scout");
  assert.match(JSON.stringify(knowledge), /至少踏入四象境/);
  assert.equal(JSON.stringify(perspective).includes("六合境"), false);
  assert.equal(JSON.stringify(perspective).includes("divineCrystal"), false);
  assert.throws(() => getNpcKnowledge(state, "never-met"), /npc_not_encountered/);
});

test("P1-B local Tool runtime validates and atomically commits rule results once", async () => {
  const { createGameToolRuntime } = await import("../public/tool-runtime.mjs");
  const original = makeGame();
  const runtime = createGameToolRuntime(original, { random: () => 0.25 });
  const result = await runtime.execute({ name: "resolve_cultivation", arguments: { days: 30 } });

  assert.equal(result.kind, "cultivation");
  assert.equal(original.meta.elapsedDays, 0);
  const committed = runtime.commit();
  assert.equal(committed.meta.elapsedDays, 30);
  assert.ok(committed.player.cultivation > original.player.cultivation);
  assert.throws(() => runtime.commit(), /turn_already_committed/);
});

test("P1-B Random tool uses the injected program RNG and never accepts a model roll", async () => {
  const { createGameToolRuntime } = await import("../public/tool-runtime.mjs");
  const runtime = createGameToolRuntime(makeGame(), { random: () => 0.125 });
  const result = await runtime.execute({ name: "resolve_random_event", arguments: { activity: "主线" } });
  assert.equal(result.randomRoll, 0.125);
  assert.equal(Object.hasOwn(result, "modelRoll"), false);
  const rejected = createGameToolRuntime(makeGame(), { random: () => 0.125 });
  await assert.rejects(
    () => rejected.execute({ name: "resolve_random_event", arguments: { activity: "主线", roll: 0.99 } }),
    /tool_arguments_invalid/,
  );
});

test("P1-B static world knowledge is stored outside GameState and searched with TopK", async () => {
  const { searchWorldKnowledge, WORLD_KNOWLEDGE } = await import("../public/world-knowledge.mjs");
  const assets = ["locations", "factions", "characters", "techniques", "martial_skills", "items", "realms", "events"];
  for (const name of assets) {
    const json = JSON.parse(await readFile(new URL(`../public/assets/world/${name}.json`, import.meta.url), "utf8"));
    assert.ok(Array.isArray(json) && json.length > 0, `${name}.json must contain records`);
  }
  const state = makeGame();
  assert.equal(JSON.stringify(state).includes("WORLD_KNOWLEDGE"), false);
  assert.equal(Object.hasOwn(state.world, "knowledgeBase"), false);
  const matches = searchWorldKnowledge("北境 寒铁", { limit: 3 });
  assert.ok(matches.length > 0 && matches.length <= 3);
  assert.ok(WORLD_KNOWLEDGE.length > matches.length);
});

test("P1-B new GameState initializes long-term memory and NPC knowledge ledgers", () => {
  const state = makeGame();
  assert.deepEqual(state.recentEvents, []);
  assert.deepEqual(state.memories, []);
  assert.deepEqual(state.historySummary, []);
  assert.deepEqual(state.world.npcKnowledge, {});
  assert.equal(state.agent.usage.lastPromptTokens, 0);
});

test("P1-B dynamic registry exposes the settlement tool for each supported action", async () => {
  const { selectToolsForAction } = await import("../public/agent-tools.mjs");
  const names = (action) => selectToolsForAction(action).map((entry) => entry.function.name);
  assert.ok(names("研习落英剑诀十日").includes("resolve_training"));
  assert.ok(names("选择天道突破").includes("resolve_breakthrough"));
  assert.ok(names("与邢舟交涉情报").includes("resolve_social_action"));
});

test("P1-B active event runtime executes NPC knowledge tools and returns updated GameState", async () => {
  const { recordNpcKnowledge } = await import("../public/npc-knowledge-service.mjs");
  const { runEventAgentTurn } = await import("../public/game-agent-runtime.mjs");
  let state = registerNpcEncounter(makeGame(), {
    id: "npc-scout",
    name: "邢舟",
    gender: "男",
    species: "人族",
    realmIndex: 1,
    stageIndex: 0,
    goal: "查明北线来客",
  }, { eventId: "evt-meet", summary: "在北关照面" });
  state = recordNpcKnowledge(state, "npc-scout", {
    id: "intel-one",
    subjectId: "player",
    summary: "玩家曾在北关救人",
    confidence: 0.9,
  });
  let round = 0;
  const provider = {
    async completeDecision() {
      round += 1;
      if (round === 1) return { content: "", toolCalls: [{ id: "k", name: "get_npc_knowledge", arguments: { npc_id: "npc-scout" } }], usage: { promptTokens: 11000, completionTokens: 20, totalTokens: 11020 } };
      if (round === 2) return { content: "", toolCalls: [{ id: "e", name: "resolve_random_event", arguments: {} }], usage: { promptTokens: 11200, completionTokens: 20, totalTokens: 11220 } };
      return { content: "事实已确认", toolCalls: [], usage: { promptTokens: 11400, completionTokens: 20, totalTokens: 11420 } };
    },
    async streamNarrative() {
      return { content: "北关风雪压住了两人的声音。", usage: { promptTokens: 9000, completionTokens: 30, totalTokens: 9030 } };
    },
  };

  const result = await runEventAgentTurn({ provider, gameState: state, action: "调查邢舟是不是在骗我" });
  assert.equal(result.gameState.currentScene.event.id, result.event.id);
  assert.equal(result.gameState.agent.usage.lastPromptTokens, 42600);
  assert.equal(result.gameState.recentEvents.at(-1).id, result.event.id);
  assert.equal(state.currentScene, undefined);
});

test("P1-B Decision retries one definite transient HTTP failure while Narrative never retries", async () => {
  const { AgnesProvider } = await import("../lib/agnes-provider.mjs");
  let decisionCalls = 0;
  const decisionProvider = new AgnesProvider({
    apiKey: "test-only",
    async fetchImpl() {
      decisionCalls += 1;
      if (decisionCalls === 1) return new Response("busy", { status: 503 });
      return new Response(JSON.stringify({
        model: "agnes-2.5-flash",
        choices: [{ message: { role: "assistant", content: "完成" }, finish_reason: "stop" }],
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    },
  });
  await decisionProvider.completeDecision({ messages: [], tools: [] });
  assert.equal(decisionCalls, 2);

  let narrativeCalls = 0;
  const narrativeProvider = new AgnesProvider({
    apiKey: "test-only",
    async fetchImpl() {
      narrativeCalls += 1;
      return new Response("busy", { status: 503 });
    },
  });
  await assert.rejects(() => narrativeProvider.streamNarrative({ messages: [] }), /provider_error/);
  assert.equal(narrativeCalls, 1);
});

test("P1-B Memory GC archives stale passersby but preserves meaningful and dead NPCs", async () => {
  const { recordAgentTurn } = await import("../public/memory-runtime.mjs");
  let state = makeGame();
  const passerby = {
    id: "npc-passerby", name: "路人甲", gender: "男", species: "人族", realmIndex: 0, stageIndex: 0, goal: "赶路", role: "途中所遇",
  };
  const ally = {
    id: "npc-ally", name: "顾青", gender: "女", species: "人族", realmIndex: 1, stageIndex: 0, goal: "守护村寨", role: "主线盟友",
  };
  state = registerNpcEncounter(state, passerby, { eventId: "meet-passerby", summary: "在驿道问路" });
  state = registerNpcEncounter(state, ally, { eventId: "meet-ally", summary: "共同守住村寨" });
  state.player.relationships.find((entry) => entry.npcId === "npc-ally").affection = 40;
  state.world.npcs.find((entry) => entry.id === "npc-passerby").interactions[0].turn = 1;
  state.meta.turn = 260;
  for (let index = 0; index < 25; index += 1) {
    state = recordAgentTurn(state, { event: { id: `gc-${index}`, summary: `近事${index}`, importance: 0.1 }, usage: { promptTokens: 10000 } });
  }
  assert.equal(state.world.npcs.some((npc) => npc.id === "npc-passerby"), false);
  assert.equal(state.world.npcs.some((npc) => npc.id === "npc-ally"), true);
  assert.match(JSON.stringify(state.memories), /路人甲/);
});

test("P1-B browser client carries the validated Agent GameState to the IndexedDB caller", async () => {
  const { streamAgnesEvent } = await import("../public/game-client.mjs");
  const original = makeGame();
  const next = structuredClone(original);
  next.agent.usage.lastPromptTokens = 12345;
  next.currentScene = { event: { id: "evt-agent" } };
  const event = { id: "evt-agent", title: "风雪问路", scene: "风雪压城。", danger: "low", choices: [{ id: "go", label: "前行", result: "继续赶路", effects: {} }] };
  const body = JSON.stringify({ event, gameState: next, rawContent: event.scene, structured: true });
  const result = await streamAgnesEvent(async () => new Response(body, {
    status: 200,
    headers: { "Content-Type": "application/json" },
  }), original, [], "");

  assert.equal(result.agentGameState.agent.usage.lastPromptTokens, 12345);
  assert.equal(result.agentGameState.currentScene.event.id, "evt-agent");
  assert.equal(original.currentScene, undefined);
});

test("P1-B future player-key builds include the complete Agent runtime and static world assets", async () => {
  const { PLAYER_KEY_RUNTIME_FILES } = await import("../scripts/build-taptap-package.mjs");
  for (const path of [
    "public/memory-runtime.mjs",
    "public/npc-knowledge-service.mjs",
    "public/tool-runtime.mjs",
    "public/world-knowledge.mjs",
    "public/assets/world/locations.json",
    "public/assets/world/items.json",
  ]) {
    assert.ok(PLAYER_KEY_RUNTIME_FILES.includes(path), `${path} missing from future player-key runtime`);
  }
});

test("P1-B invalid Tool arguments fail closed without partially changing working state", async () => {
  const { createGameToolRuntime } = await import("../public/tool-runtime.mjs");
  const original = makeGame();
  const runtime = createGameToolRuntime(original, { random: () => 0.5 });
  await assert.rejects(
    () => runtime.execute({ name: "resolve_cultivation", arguments: { days: 99999 } }),
    /tool_arguments_invalid/,
  );
  assert.deepEqual(runtime.state, original);
});

test("P1-B every first-batch settlement and tick Tool executes local rules", async () => {
  const { createGameToolRuntime } = await import("../public/tool-runtime.mjs");
  const { chooseOfflineEvent } = await import("../public/game-data.mjs");

  const training = createGameToolRuntime(makeGame(), { random: () => 0.2 });
  assert.equal((await training.execute({ name: "resolve_training", arguments: { target_id: "basic-palm", days: 3 } })).kind, "training");

  const breakthrough = createGameToolRuntime(makeGame(), { random: () => 0.2 });
  assert.equal((await breakthrough.execute({ name: "resolve_breakthrough", arguments: { route: "human" } })).kind, "breakthrough");

  let socialState = registerNpcEncounter(makeGame(), {
    id: "npc-social", name: "顾青", gender: "女", species: "人族", realmIndex: 0, stageIndex: 0, goal: "守护村寨",
  }, { eventId: "meet-social", summary: "共同守夜" });
  const social = createGameToolRuntime(socialState, { random: () => 0.2 });
  assert.equal((await social.execute({ name: "resolve_social_action", arguments: { npc_id: "npc-social", intent: "交换北境情报" } })).kind, "social");

  const travel = createGameToolRuntime(makeGame(), { random: () => 0.2 });
  assert.equal((await travel.execute({ name: "resolve_travel", arguments: { destination_id: "north-wastes" } })).destinationName, "北境荒原");
  assert.equal((await travel.execute({ name: "world_tick", arguments: {} })).kind, "world_tick");
  assert.equal((await travel.execute({ name: "npc_tick", arguments: {} })).kind, "npc_tick");

  const time = createGameToolRuntime(makeGame(), { random: () => 0.2 });
  assert.equal((await time.execute({ name: "advance_time", arguments: { days: 2 } })).days, 2);

  let combatState = makeGame();
  combatState.meta.turn = 4;
  const combatEvent = chooseOfflineEvent(combatState);
  assert.equal(combatEvent.kind, "combat");
  combatState.currentScene = { event: combatEvent };
  const combat = createGameToolRuntime(combatState, { random: () => 0.1 });
  const combatResult = await combat.execute({
    name: "resolve_combat",
    arguments: { encounter_id: combatEvent.id, action: combatEvent.choices[0].id, skill_id: "basic-palm" },
  });
  assert.equal(combatResult.kind, "combat");
});

test("P1-B active free action commits once and returns a non-settling continuation result", async () => {
  const { runEventAgentTurn } = await import("../public/game-agent-runtime.mjs");
  let round = 0;
  const provider = {
    async completeDecision() {
      round += 1;
      return round === 1
        ? { content: "", toolCalls: [{ id: "cultivate", name: "resolve_cultivation", arguments: { days: 30 } }], usage: { promptTokens: 10000 } }
        : { content: "修炼已由本地规则结算", toolCalls: [], usage: { promptTokens: 10200 } };
    },
    async streamNarrative() {
      return { content: "三十日吐纳毕，你收束气机推门出关。", usage: { promptTokens: 8000 } };
    },
  };
  const original = makeGame();
  const result = await runEventAgentTurn({ provider, gameState: original, action: "闭关三十天" });

  assert.equal(result.event.agentCommitted, true);
  assert.equal(result.event.choices[0].id, "continue-agent-turn");
  assert.equal(result.gameState.meta.elapsedDays, 30);
  assert.equal(original.meta.elapsedDays, 0);
});
