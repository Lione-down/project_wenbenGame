import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateMonthlyCultivation,
  createNewGame,
} from "../public/game-engine.mjs";
import {
  CRAFT_RECIPES,
  RELATIONSHIP_STAGES,
  SECT_RANKS,
  buyMarketItem,
  equipTechnique,
  getRelationshipStage,
  interactWithNpc,
  joinSect,
  plantCaveCrop,
  practiceCraft,
  promoteSect,
  runSectTask,
  sellMarketItem,
  tendCaveCrop,
  upgradeCave,
} from "../public/life-systems.mjs";

const profile = {
  name: "谢听澜",
  gender: "男",
  age: 20,
  birthplace: "红月城",
  background: "商贾之家",
  path: "逍遥长生",
  spiritRootGrade: "地灵根",
  rootPrimaryElement: "火",
  rootSecondaryElement: "木",
  constitution: "纯阳之体",
  talent: "气运加身",
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

test("market buy and sell update real inventory and spirit-stone balances", () => {
  const state = stateFor();
  state.player.resources.spiritStones = 500;

  const bought = buyMarketItem(state, "herb", 2);
  assert.equal(bought.state.player.inventory.herb, state.player.inventory.herb + 2);
  assert.equal(bought.state.player.resources.spiritStones, 464);
  assert.equal(bought.cost, 36);

  const sold = sellMarketItem(bought.state, "herb", 1);
  assert.equal(sold.state.player.inventory.herb, bought.state.player.inventory.herb - 1);
  assert.equal(sold.revenue, 10);
  assert.equal(sold.state.player.resources.spiritStones, 474);
  assert.equal(state.player.resources.spiritStones, 500);
});

test("market transactions fail closed on insufficient currency or inventory", () => {
  const state = stateFor(2);
  state.player.resources.spiritStones = 0;
  const snapshot = structuredClone(state);

  assert.throws(() => buyMarketItem(state, "breakthroughPill", 1), /元石不足/);
  assert.throws(() => sellMarketItem(state, "daoFragment", 1), /库存不足/);
  assert.deepEqual(state, snapshot);
});

test("technique build enforces one main and at most two distinct supports", () => {
  const state = stateFor(3);
  state.player.techniqueBuild.known.push("太古天辰诀", "碑痕运劲法", "残卷药理", "听雨剑式");
  const baseline = calculateMonthlyCultivation(state).monthlyGain;

  const withMain = equipTechnique(state, "太古天辰诀", "main");
  const withFirstSupport = equipTechnique(withMain, "碑痕运劲法", "support");
  const withSecondSupport = equipTechnique(withFirstSupport, "残卷药理", "support");

  assert.equal(withSecondSupport.player.techniqueBuild.main, "太古天辰诀");
  assert.deepEqual(withSecondSupport.player.techniqueBuild.supports, ["碑痕运劲法", "残卷药理"]);
  assert.ok(calculateMonthlyCultivation(withSecondSupport).monthlyGain > baseline);
  assert.throws(() => equipTechnique(withSecondSupport, "听雨剑式", "support"), /两个辅助槽/);
  assert.throws(() => equipTechnique(withSecondSupport, "未习得功法", "main"), /尚未习得/);
});

test("all six crafts have recipes and a successful craft consumes materials for a persistent product", () => {
  assert.deepEqual(Object.keys(CRAFT_RECIPES).sort(), [
    "alchemy", "beast", "forging", "formation", "planting", "talisman",
  ]);
  assert.ok(Object.values(CRAFT_RECIPES).every((recipe) => Object.keys(recipe.materials).length > 0));

  const state = stateFor(4);
  const result = practiceCraft(state, "alchemy", { roll: 0 });

  assert.equal(result.outcome.status, "success");
  assert.equal(result.state.player.inventory.herb, state.player.inventory.herb - 2);
  assert.equal(result.state.player.inventory.breakthroughPill, 1);
  assert.equal(result.state.player.crafts.alchemy.experience, 10);
  assert.equal(result.state.meta.turn, 1);
  assert.match(result.state.chronicle.at(-1).eventTitle, /炼丹/);
});

test("craft failure destroys committed materials and still records practice", () => {
  const state = stateFor(5);
  const result = practiceCraft(state, "forging", { roll: 1 });

  assert.equal(result.outcome.status, "failed");
  assert.equal(result.state.player.inventory.ore, state.player.inventory.ore - 2);
  assert.equal(result.state.player.inventory.artifact ?? 0, 0);
  assert.equal(result.state.player.crafts.forging.experience, 4);
  assert.equal(result.state.meta.turn, 1);
});

test("sect membership, monthly contribution tasks and promotion form a playable progression", () => {
  const state = joinSect(stateFor(6), "青岚宗");
  assert.equal(state.player.sect.position, SECT_RANKS[0].name);

  const first = runSectTask(state, "gathering");
  const second = runSectTask(first.state, "patrol");
  assert.equal(second.state.meta.turn, 2);
  assert.ok(second.state.player.sect.contribution >= 80);

  const promoted = promoteSect(second.state);
  assert.equal(promoted.player.sect.position, "内门弟子");
  assert.equal(promoted.player.sect.name, "青岚宗");
});

test("cave upgrades consume resources and spirit-field crops require real months to harvest", () => {
  const state = stateFor(7);
  state.player.resources.spiritStones = 1000;
  state.player.inventory.ore = 10;
  const upgraded = upgradeCave(state, "aura");

  assert.equal(upgraded.player.cave.auraLevel, 2);
  assert.ok(upgraded.player.resources.spiritStones < state.player.resources.spiritStones);
  assert.ok(upgraded.player.inventory.ore < state.player.inventory.ore);

  const planted = plantCaveCrop(upgraded);
  assert.ok(planted.player.cave.crop);
  assert.equal(planted.player.inventory.spiritSeed, upgraded.player.inventory.spiritSeed - 1);

  const tended = tendCaveCrop(planted);
  const harvested = tendCaveCrop(tended.state);
  assert.equal(harvested.outcome.status, "harvested");
  assert.equal(harvested.state.player.cave.crop, null);
  assert.ok(harvested.state.player.inventory.herb > planted.player.inventory.herb);
  assert.equal(harvested.state.meta.turn, planted.meta.turn + 2);
});

test("relationship stages and romance are independent of player and NPC gender", () => {
  assert.deepEqual(RELATIONSHIP_STAGES.map((stage) => stage.name), [
    "陌生", "相识", "知己", "暧昧", "道侣", "生死相许",
  ]);
  assert.equal(getRelationshipStage(0), "陌生");
  assert.equal(getRelationshipStage(20), "相识");
  assert.equal(getRelationshipStage(100), "生死相许");

  const state = stateFor(8);
  const target = state.world.npcs.find((npc) => npc.gender === "男");
  const result = interactWithNpc(state, target.id, {
    kind: "romance",
    giftItem: "herb",
  });
  const relationship = result.state.player.relationships.find((item) => item.npcId === target.id);

  assert.equal(result.state.player.gender, "男");
  assert.equal(target.gender, "男");
  assert.equal(relationship.bond, "情缘");
  assert.equal(relationship.romanceEnabled, true);
  assert.ok(relationship.affection >= 20);
  assert.equal(relationship.stage, getRelationshipStage(relationship.affection));
  assert.equal(result.state.meta.turn, 1);
});
