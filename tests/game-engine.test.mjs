import test from "node:test";
import assert from "node:assert/strict";

import {
  applyChoice,
  createNewGame,
  importGame,
  resolveBreakthrough,
} from "../public/game-engine.mjs";

const profile = {
  name: "顾长离",
  gender: "男",
  age: 18,
  birthplace: "北境边城",
  background: "农家子",
  path: "问道飞升",
  spiritRootGrade: "真灵根",
  rootPrimaryElement: "木",
  rootSecondaryElement: "",
  constitution: "凡体",
  talent: "天资聪颖",
  stats: {
    aptitude: 10,
    insight: 10,
    soul: 10,
    agility: 10,
    martialHeart: 10,
    fortune: 10,
  },
};

test("createNewGame produces the same measured spirit root for the same seed", () => {
  const first = createNewGame(profile, 240824);
  const second = createNewGame(profile, 240824);

  assert.equal(first.player.name, "顾长离");
  assert.equal(first.player.age, 18);
  assert.deepEqual(first.player.spiritRoot, second.player.spiritRoot);
  assert.equal("martialSoul" in first.player, false);
  assert.equal(first.meta.schemaVersion, 3);
  assert.equal(first.player.path, "问道飞升");
  assert.equal(first.player.constitution, "凡体");
  assert.equal(first.player.resources.spirit, 100);
  assert.equal(first.player.resources.merit, 0);
  assert.equal(first.player.resources.karma, 0);
  assert.equal(first.world.month, 1);
});

test("applyChoice advances exactly one month and only ages after twelve turns", () => {
  const state = createNewGame(profile, 8);
  const event = {
    id: "border-fire",
    title: "烽火照夜",
    scene: "北关烽燧连燃三座。",
    monthDelta: 1,
    worldUpdate: "北境商路暂时断绝。",
    choices: [
      {
        id: "escort",
        label: "护送百姓出关",
        result: "你把最后一辆木车推出了风雪。",
        effects: { martialHeart: 6, vitality: -4, reputation: 3 },
      },
    ],
  };

  let next = applyChoice(state, event, "escort");

  assert.equal(next.player.age, 18);
  assert.equal(next.world.year, state.world.year);
  assert.equal(next.world.month, 2);
  assert.equal(next.chronicle.length, 2);
  assert.equal(state.chronicle.length, 1);
  assert.equal(next.chronicle.at(-1).eventTitle, "烽火照夜");

  for (let turn = 1; turn < 12; turn += 1) {
    next = applyChoice(next, event, "escort");
  }
  assert.equal(next.player.age, 19);
  assert.equal(next.world.year, state.world.year + 1);
  assert.equal(next.world.month, 1);
});

test("applyChoice clamps unsafe generated effects to player stat bounds", () => {
  const state = createNewGame(profile, 13);
  const event = {
    id: "wild-power",
    title: "失控元潮",
    scene: "元潮越过经脉承受极限。",
    monthDelta: 1,
    worldUpdate: "山谷灵脉暂时沉寂。",
    choices: [
      {
        id: "endure",
        label: "强行承受",
        result: "经脉留下了灼痕。",
        effects: { vitality: -800, wound: 900, fortune: -500 },
      },
    ],
  };

  const next = applyChoice(state, event, "endure");

  assert.equal(next.player.resources.vitality, 0);
  assert.equal(next.player.resources.wound, 100);
  assert.equal(next.player.stats.fortune, 1);
  assert.equal(next.meta.status, "dead");
});

test("resolveBreakthrough without a route cannot bypass major breakthrough selection", () => {
  const state = createNewGame(profile, 21);
  state.player.cultivation = 125;
  state.player.stats.martialHeart = 14;

  const next = resolveBreakthrough(state);

  assert.equal(next.player.realmIndex, 0);
  assert.equal(next.player.realm, "武徒");
  assert.equal(next.player.cultivation, state.player.cultivation);
});

test("applyChoice never performs a major breakthrough on the player's behalf", () => {
  const state = createNewGame(profile, 24);
  state.player.cultivation = 999;
  const event = {
    title: "月下静修",
    scene: "红月城外灵气平稳。",
    monthDelta: 1,
    worldUpdate: "红月城迎来新月。",
    choices: [{ id: "rest", label: "收功", result: "你没有贸然破境。", effects: {} }],
  };

  const next = applyChoice(state, event, "rest");

  assert.equal(next.player.realmIndex, 0);
  assert.equal(next.player.realm, "武徒");
  assert.equal(next.player.cultivation, 999);
});

test("createNewGame enforces the documented sixty-point six-dimension budget", () => {
  const invalid = structuredClone(profile);
  invalid.stats.fortune = 9;
  assert.throws(() => createNewGame(invalid, 1), /60/);
});

test("importGame rejects saves from an unknown schema", () => {
  assert.throws(
    () => importGame(JSON.stringify({ meta: { schemaVersion: 99 } })),
    /存档版本/,
  );
});

test("applyChoice records an NPC relationship and learns a technique once", () => {
  const state = createNewGame(profile, 55);
  const event = {
    id: "mountain-mentor",
    title: "石坪试招",
    scene: "山中散修只出了一招。",
    monthDelta: 1,
    worldUpdate: "古天河重新在北境现身。",
    choices: [
      {
        id: "learn",
        label: "记下剑势",
        result: "你记住的不是剑招，而是出剑前的静。",
        effects: { insight: 2 },
        gainTechnique: "《听雨剑式》",
        npc: {
          name: "古天河",
          role: "隐世剑修",
          stance: "审视",
          goal: "寻找能承受败果的传人",
          relationDelta: 12,
        },
      },
    ],
  };

  const first = applyChoice(state, event, "learn");
  const second = applyChoice(first, event, "learn");

  assert.equal(second.player.npcs.length, 1);
  assert.equal(second.player.npcs[0].relation, 24);
  assert.equal(
    second.player.techniques.filter((name) => name === "《听雨剑式》").length,
    1,
  );
});
