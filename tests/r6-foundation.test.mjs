import test from "node:test";
import assert from "node:assert/strict";

import {
  REALMS,
  SIX_DIMENSION_LABELS,
  SPIRIT_ROOT_GRADES,
  createNewGame,
  exportGame,
  importGame,
} from "../public/game-engine.mjs";

const profile = {
  name: "沈青璃",
  gender: "自定义",
  age: 19,
  birthplace: "红月城外",
  background: "书香门第",
  path: "问道飞升",
  spiritRootGrade: "地灵根",
  rootPrimaryElement: "水",
  rootSecondaryElement: "木",
  constitution: "玄阴之体",
  talent: "过目不忘",
  stats: {
    aptitude: 10,
    insight: 10,
    soul: 10,
    agility: 10,
    martialHeart: 10,
    fortune: 10,
  },
};

test("R6 keeps the canonical realm names and order unchanged", () => {
  assert.deepEqual(REALMS, [
    "武徒", "一元境", "二分境", "三才境", "四象境", "五行境", "六合境",
    "七宿境", "八荒境", "九天境", "归真境", "掌天境", "虚极境",
    "造化境", "百劫界王", "千界之主", "天外至尊",
  ]);
});

test("R6 exposes the Ask Immortality six-dimension semantics", () => {
  assert.deepEqual(SIX_DIMENSION_LABELS, {
    aptitude: "资质",
    insight: "悟性",
    soul: "神识",
    agility: "遁速",
    martialHeart: "道心",
    fortune: "仙缘",
  });
});

test("new games persist spirit-root grade, elements and complete foundation state", () => {
  const state = createNewGame(profile, 60824);

  assert.equal(state.meta.schemaVersion, 3);
  assert.deepEqual(state.player.spiritRoot, {
    grade: "地灵根",
    elements: ["水", "木"],
    primaryElement: "水",
    coefficient: 1.6,
  });
  assert.equal("martialSoul" in state.player, false);
  assert.match(state.chronicle[0].result, /地灵根/);
  assert.match(state.chronicle[0].result, /水/);
  assert.doesNotMatch(state.chronicle[0].result, /武魂|觉醒[^。]*(石胎|古印|天剑|孤狼|魔莲)/);
  assert.equal(state.player.progression.stageIndex, 0);
  assert.equal(state.player.progression.stage, "初期");
  assert.equal(state.player.progression.breakthroughCooldown, 0);
  assert.deepEqual(state.player.progression.scars, []);
  assert.ok(Object.values(state.player.inventory).every((quantity) => Number.isInteger(quantity) && quantity >= 0));
  assert.equal(state.player.techniqueBuild.main, "基础引气诀");
  assert.deepEqual(state.player.techniqueBuild.supports, []);
  assert.deepEqual(Object.keys(state.player.crafts).sort(), [
    "alchemy", "beast", "forging", "formation", "planting", "talisman",
  ]);
  assert.equal(state.player.cave.auraLevel, 1);
  assert.equal(state.player.sect.contribution, 0);
  assert.ok(Array.isArray(state.player.relationships));
  assert.ok(Array.isArray(state.world.npcs));
  assert.ok(state.world.npcs.length >= 3);
  assert.ok(Object.values(state.world.market.prices).every((price) => Number.isInteger(price) && price > 0));

  assert.deepEqual(importGame(exportGame(state)), state);
});

test("R6 rejects unknown spirit-root grades instead of guessing", () => {
  assert.ok(SPIRIT_ROOT_GRADES.includes("天灵根"));
  const invalid = structuredClone(profile);
  invalid.spiritRootGrade = "至尊灵根";

  assert.throws(() => createNewGame(invalid, 1), /灵根品级/);
});

test("version two saves migrate martial-soul affinity into a safe version three root", () => {
  const legacyProfile = {
    ...profile,
    soulAttribute: "冰",
  };
  const legacy = createNewGame(legacyProfile, 12);
  legacy.meta.schemaVersion = 2;
  legacy.player.martialSoul = {
    name: "霜牙孤狼",
    grade: "灵品",
    attribute: "冰",
    gift: "旧存档武魂",
  };
  delete legacy.player.spiritRoot;
  delete legacy.player.progression;
  delete legacy.player.inventory;
  delete legacy.player.techniqueBuild;
  delete legacy.player.crafts;
  delete legacy.player.cave;
  delete legacy.player.relationships;
  delete legacy.world.npcs;
  delete legacy.world.market;
  delete legacy.player.sect.contribution;

  const migrated = importGame(JSON.stringify(legacy));

  assert.equal(migrated.meta.schemaVersion, 3);
  assert.equal(migrated.player.spiritRoot.primaryElement, "冰");
  assert.deepEqual(migrated.player.spiritRoot.elements, ["冰"]);
  assert.equal("martialSoul" in migrated.player, false);
  assert.ok(Object.keys(migrated.player.inventory).length > 0);
  assert.ok(migrated.world.npcs.every((npc) => typeof npc.alive === "boolean"));
});
