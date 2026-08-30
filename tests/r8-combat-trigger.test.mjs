import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  buildAgnesPayload,
  parseAgnesEvent,
} from "../lib/agnes-contract.mjs";
import * as combatSystem from "../public/combat-system.mjs";
import { chooseOfflineEvent } from "../public/game-data.mjs";
import { createNewGame, registerNpcEncounter } from "../public/game-engine.mjs";

const projectUrl = new URL("../", import.meta.url);

const profile = {
  name: "陆归舟",
  gender: "不记",
  age: 18,
  birthplace: "红月城",
  background: "市井孤儿",
  path: "快意恩仇",
  spiritRootGrade: "天灵根",
  rootPrimaryElement: "火",
  rootSecondaryElement: "",
  constitution: "百炼战骨",
  talent: "身轻如燕",
  stats: {
    aptitude: 10,
    insight: 10,
    soul: 10,
    agility: 10,
    martialHeart: 10,
    fortune: 10,
  },
};

function stateFor(seed = 1) {
  return createNewGame(profile, seed);
}

function combatEvent(overrides = {}) {
  return {
    id: "red-moon-road-conflict",
    kind: "combat",
    title: "商道截杀",
    scene: "红月城北门外，商会护卫林玄为追查失窃药箱拦住你，误认你与盗匪同路。",
    canonRefs: ["红月城", "林玄"],
    monthDelta: 1,
    danger: "medium",
    encounter: {
      npcName: "林玄",
      location: "红月城北门商道",
      reason: "追查商会失窃药箱时误认你为同党",
      temperament: "谨慎",
      element: "木",
    },
    choices: [
      { id: "fight", tag: "risk", label: "迎战自证", hint: "本地规则判定胜负", result: "兵刃已经出鞘。", action: "fight", effects: {} },
      { id: "escape", tag: "risk", label: "借林遁走", hint: "按遁速判定", result: "你寻找脱身空隙。", action: "escape", effects: {} },
      { id: "talk", tag: "peace", label: "说明来路", hint: "按名望功德判定", result: "你尝试澄清误会。", action: "negotiate", effects: {} },
      { id: "tribute", tag: "peace", label: "献上元石", hint: "代价由本地计算", result: "你提出以财物消弭争端。", action: "tribute", effects: {} },
    ],
    worldUpdate: "红月城商会仍在追查失窃药箱。",
    ...overrides,
  };
}

test("the persistent command surface cannot manufacture a battle", async () => {
  const [html, app] = await Promise.all([
    readFile(new URL("public/index.html", projectUrl), "utf8"),
    readFile(new URL("public/app.mjs", projectUrl), "utf8"),
  ]);

  assert.equal(/data-command="\/战斗"/.test(html), false);
  assert.equal(/function createEncounter\(|红月城拦路客|command === "\/战斗"/.test(app), false);
  assert.equal(/currentEvent\?\.kind === "combat"[\s\S]*resolveCombatEncounterChoice/.test(app), true);
});

test("offline mainline can originate a contextual combat event", () => {
  const state = stateFor(31);
  const events = [];
  for (let turn = 0; turn < 48; turn += 1) {
    const candidateState = structuredClone(state);
    candidateState.meta.turn = turn;
    events.push(chooseOfflineEvent(candidateState));
  }
  const event = events.find((candidate) => candidate.kind === "combat");

  assert.ok(event, "offline event rotation should include a combat storylet");
  assert.ok(event.encounter.npcName);
  assert.ok(event.encounter.location);
  assert.ok(event.encounter.reason);
  assert.ok(event.choices.length >= 2 && event.choices.length <= 4);
  assert.ok(event.choices.every((choice) => ["fight", "escape", "negotiate", "tribute"].includes(choice.action)));
  assert.ok(event.choices.every((choice) => Object.keys(choice.effects).length === 0));
});

test("Agnes combat contract accepts context but rejects Provider-authored numeric effects", () => {
  const payload = buildAgnesPayload({ player: { name: "陆归舟" } });
  const prompt = payload.messages[0].content;
  assert.equal(/战斗只能由主线|combat/.test(prompt), true);
  assert.equal(/npcName[^\n]*location[^\n]*reason/.test(prompt), true);
  assert.equal(/fight[^\n]*escape[^\n]*negotiate[^\n]*tribute/.test(prompt), true);
  assert.equal(/战斗[^\n]*effects[^\n]*空对象/.test(prompt), true);

  const parsed = parseAgnesEvent(JSON.stringify(combatEvent()), {
    allowedReferences: ["林玄", "红月城"],
  });
  assert.equal(parsed.kind, "combat");
  assert.equal(parsed.encounter.location, "红月城北门商道");
  assert.deepEqual(parsed.choices.map((choice) => choice.action), ["fight", "escape", "negotiate", "tribute"]);

  const unsafe = combatEvent();
  unsafe.choices[0].effects = { vitality: -4 };
  assert.throws(
    () => parseAgnesEvent(JSON.stringify(unsafe), { allowedReferences: ["林玄", "红月城"] }),
    /战斗.*effects|effects.*空/,
  );
});

test("local rules derive encounter numbers from world state instead of always adding one realm", () => {
  assert.equal(typeof combatSystem.createEncounterFromEvent, "function");
  const { createEncounterFromEvent } = combatSystem;
  const state = registerNpcEncounter(stateFor(41), {
    id: "lin-xuan",
    name: "林玄",
    gender: "男",
    species: "人族",
    realmIndex: 2,
    stageIndex: 1,
    goal: "查清商道截杀",
    alive: true,
  }, { eventId: "red-moon-road-conflict", summary: "你在商道遇见林玄。" });
  const knownNpc = state.world.npcs.find((npc) => npc.name === "林玄");
  const knownEncounter = createEncounterFromEvent(state, combatEvent());
  assert.equal(knownEncounter.realmIndex, knownNpc.realmIndex);
  assert.equal(knownEncounter.stageIndex, knownNpc.stageIndex);

  const storyOnly = combatEvent({
    danger: "low",
    encounter: {
      npcName: "商会杂役",
      location: "红月城药仓",
      reason: "误把你的药篓当成失物",
      temperament: "谨慎",
      element: "土",
    },
  });
  const derived = createEncounterFromEvent(state, storyOnly);
  assert.ok(derived.realmIndex <= state.player.realmIndex);
  assert.notEqual(derived.name, "红月城拦路客");
});

test("one combat choice fully resolves once and tribute charges exactly once", () => {
  assert.equal(typeof combatSystem.resolveCombatEncounterChoice, "function");
  const { resolveCombatEncounterChoice } = combatSystem;
  const fightState = stateFor(51);
  const fought = resolveCombatEncounterChoice(fightState, combatEvent(), "fight", { roll: 0 });
  assert.notEqual(fought.outcome.status, "ongoing");
  assert.equal(fightState.player.resources.vitality, 100);
  assert.ok(fought.state.player.resources.vitality <= fightState.player.resources.vitality);

  const tributeState = stateFor(52);
  tributeState.player.resources.spiritStones = 100;
  const paid = resolveCombatEncounterChoice(tributeState, combatEvent(), "tribute", { roll: 0 });
  assert.equal(paid.outcome.status, "appeased");
  assert.equal(paid.state.player.resources.spiritStones, 100 - paid.outcome.cost);
  assert.equal(tributeState.player.resources.spiritStones, 100);
});
