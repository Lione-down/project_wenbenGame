import test from "node:test";
import assert from "node:assert/strict";

import {
  STAGES,
  advanceOneMonth,
  applyChoice,
  createNewGame,
  getRealmCurve,
} from "../public/game-engine.mjs";
import {
  getCombatForecast,
  getElementMultiplier,
  resolveCombatAction,
} from "../public/combat-system.mjs";

const profile = {
  name: "陆归舟",
  gender: "不记",
  age: 18,
  birthplace: "北境边城",
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

function enemy(realmIndex, overrides = {}) {
  return {
    id: `enemy-${realmIndex}`,
    name: "拦路武者",
    realmIndex,
    stageIndex: 0,
    element: "金",
    vitality: 100,
    maxVitality: 100,
    temperament: "冷酷",
    ...overrides,
  };
}

test("every elapsed month ages and cultivates living NPCs independently", () => {
  const state = stateFor(11);
  const before = state.world.npcs.map((npc) => ({
    id: npc.id,
    ageMonths: npc.ageMonths,
    cultivation: npc.cultivation,
  }));

  const next = advanceOneMonth(state, { eventTitle: "静观一月" });

  for (const previous of before) {
    const current = next.world.npcs.find((npc) => npc.id === previous.id);
    assert.equal(current.ageMonths, previous.ageMonths + 1);
    assert.ok(current.cultivation > previous.cultivation || current.stageIndex > 0 || current.realmIndex > 0);
  }
  assert.ok(Array.isArray(next.world.ecologyLog));
});

test("NPCs can break through a small stage or die when lifespan is exhausted", () => {
  const breakthroughState = stateFor(12);
  const cultivator = breakthroughState.world.npcs[0];
  cultivator.realmIndex = 0;
  cultivator.stageIndex = 0;
  cultivator.cultivation = getRealmCurve(0).stageRequirement - 1;
  const advanced = advanceOneMonth(breakthroughState, { eventTitle: "闭门一月" });
  const advancedNpc = advanced.world.npcs.find((npc) => npc.id === cultivator.id);
  assert.equal(advancedNpc.stageIndex, 1);
  assert.equal(advancedNpc.stage, STAGES[1]);

  const lifespanState = stateFor(13);
  const elder = lifespanState.world.npcs[0];
  elder.ageMonths = elder.lifespan * 12 - 1;
  const ended = advanceOneMonth(lifespanState, { eventTitle: "又是一月" });
  const endedNpc = ended.world.npcs.find((npc) => npc.id === elder.id);
  assert.equal(endedNpc.alive, false);
  assert.equal(endedNpc.deathCause, "寿元耗尽");
  assert.ok(ended.world.ecologyLog.some((entry) => entry.npcId === elder.id && entry.type === "death"));
});

test("NPCs form their own bonds while the player spends months elsewhere", () => {
  let state = stateFor(14);
  for (let month = 0; month < 6; month += 1) {
    state = advanceOneMonth(state, { eventTitle: "远行" });
  }

  const bonds = state.world.npcs.flatMap((npc) => npc.bonds);
  assert.ok(bonds.some((bond) => bond.npcId && bond.bond === "同道"));
  assert.ok(state.world.ecologyLog.some((entry) => entry.type === "bond"));
});

test("ordinary event choices also advance the NPC ecosystem", () => {
  const state = stateFor(15);
  const before = state.world.npcs[0].ageMonths;
  const event = {
    title: "旧桥问路",
    scene: "你在旧桥停留。",
    monthDelta: 1,
    choices: [{ id: "wait", label: "等一个月", result: "雪化了。", effects: {} }],
  };
  const next = applyChoice(state, event, "wait");

  assert.equal(next.world.npcs[0].ageMonths, before + 1);
});

test("combat forecast distinguishes same realm, one-realm suppression and two-realm death risk", () => {
  const state = stateFor(20);
  const same = getCombatForecast(state, enemy(0));
  const oneAbove = getCombatForecast(state, enemy(1));
  const twoAbove = getCombatForecast(state, enemy(2));

  assert.equal(same.playerDamageMultiplier, 1);
  assert.equal(oneAbove.playerDamageMultiplier, 0.4);
  assert.equal(oneAbove.enemyDamageMultiplier, 1.6);
  assert.equal(twoAbove.playerDamageMultiplier, 0);
  assert.ok(twoAbove.winChance <= 0.05);
  assert.match(twoAbove.warning, /送死|无法伤及/);
});

test("forcing an attack two realms upward can deal no damage and kill the player", () => {
  const state = stateFor(21);
  state.player.resources.vitality = 45;
  const target = enemy(2);
  const result = resolveCombatAction(state, target, "attack", { roll: 0.5 });

  assert.equal(result.encounter.vitality, target.vitality);
  assert.equal(result.state.meta.status, "dead");
  assert.equal(result.outcome.status, "defeat");
  assert.match(result.outcome.summary, /境界压制/);
});

test("escape and negotiation remain real alternatives to a stronger opponent", () => {
  const state = stateFor(22);
  state.player.resources.reputation = 40;
  state.player.resources.merit = 20;
  const target = enemy(1, { temperament: "谨慎" });

  const escaped = resolveCombatAction(state, target, "escape", { roll: 0 });
  assert.equal(escaped.outcome.status, "escaped");
  assert.equal(escaped.state.meta.status, "active");

  const negotiated = resolveCombatAction(state, target, "negotiate", { roll: 0 });
  assert.equal(negotiated.outcome.status, "negotiated");
  assert.equal(negotiated.state.meta.status, "active");
});

test("five-element restraint applies the documented 1.3 and 0.8 multipliers", () => {
  assert.equal(getElementMultiplier("火", "金"), 1.3);
  assert.equal(getElementMultiplier("金", "火"), 0.8);
  assert.equal(getElementMultiplier("木", "木"), 1);
});
