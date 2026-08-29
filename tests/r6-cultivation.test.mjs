import test from "node:test";
import assert from "node:assert/strict";

import {
  REALMS,
  STAGES,
  attemptBreakthrough,
  calculateMonthlyCultivation,
  createNewGame,
  cultivateOneMonth,
  getBreakthroughOptions,
  getRealmCurve,
  resolveBreakthrough,
} from "../public/game-engine.mjs";

const profile = {
  name: "顾问心",
  gender: "女",
  age: 18,
  birthplace: "北境边城",
  background: "商贾之家",
  path: "问道飞升",
  spiritRootGrade: "地灵根",
  rootPrimaryElement: "木",
  rootSecondaryElement: "火",
  constitution: "凡体",
  talent: "神识过人",
  stats: {
    aptitude: 10,
    insight: 10,
    soul: 10,
    agility: 10,
    martialHeart: 10,
    fortune: 10,
  },
};

function readyState({ realmIndex = 0, stageIndex = 3 } = {}) {
  const state = createNewGame(profile, 240824 + realmIndex);
  state.player.realmIndex = realmIndex;
  state.player.realm = REALMS[realmIndex];
  state.player.progression.stageIndex = stageIndex;
  state.player.progression.stage = STAGES[stageIndex];
  state.player.realmStage = STAGES[stageIndex];
  state.player.cultivation = getRealmCurve(realmIndex).stageRequirement;
  return state;
}

function grantMaterials(state, option) {
  for (const [itemId, quantity] of Object.entries(option.materials)) {
    state.player.inventory[itemId] = quantity;
  }
}

test("realm curve slows monthly growth and raises stage requirements without renaming realms", () => {
  const first = getRealmCurve(0);
  const last = getRealmCurve(REALMS.length - 1);

  assert.equal(first.monthlyBase, 10);
  assert.equal(first.stageRequirement, 100);
  assert.ok(last.monthlyBase < first.monthlyBase);
  assert.ok(last.stageRequirement > first.stageRequirement * 20);
  assert.equal(first.realm, "武徒");
  assert.equal(last.realm, "天外至尊");
});

test("monthly cultivation uses aptitude, spirit root, technique, aura and mind multipliers", () => {
  const state = createNewGame(profile, 1);
  const result = calculateMonthlyCultivation(state, { mode: "normal" });

  assert.equal(result.base, 10);
  assert.equal(result.aptitudeCoefficient, 1.5);
  assert.equal(result.rootCoefficient, 1.6);
  assert.equal(result.techniqueCoefficient, 1);
  assert.equal(result.auraCoefficient, 1);
  assert.equal(result.mindCoefficient, 1);
  assert.equal(result.monthlyGain, 24);
  assert.equal(calculateMonthlyCultivation(state, { mode: "closedDoor" }).monthlyGain, 48);
});

test("cultivation advances exactly one month and persists the calculated gain", () => {
  const state = createNewGame(profile, 2);
  const result = cultivateOneMonth(state, { mode: "normal" });

  assert.equal(result.state.world.month, 2);
  assert.equal(result.state.meta.turn, 1);
  assert.equal(result.state.player.cultivation, result.monthlyGain);
  assert.equal(state.player.cultivation, 0);
  assert.match(result.state.chronicle.at(-1).result, /修为/);
});

test("small-stage breakthroughs use a real check and never invoke thunder tribulation", () => {
  const successState = readyState({ stageIndex: 0 });
  const success = attemptBreakthrough(successState, "minor", { insight: 0.01 });

  assert.equal(success.outcome.status, "success");
  assert.equal(success.outcome.kind, "minor");
  assert.equal(success.outcome.thunderTribulation, false);
  assert.equal(success.state.player.progression.stage, "中期");

  const failureState = readyState({ stageIndex: 1 });
  const failure = attemptBreakthrough(failureState, "minor", { insight: 0.99 });
  assert.equal(failure.outcome.status, "failed");
  assert.equal(failure.state.player.cultivation, Math.floor(getRealmCurve(0).stageRequirement * 0.7));
  assert.ok(failure.state.player.progression.breakthroughCooldown > 0);
});

test("major breakthrough options disclose routes, materials, odds, thunder, heart demon and failure consequence", () => {
  const state = readyState();
  const options = getBreakthroughOptions(state);

  assert.deepEqual(options.map((option) => option.route), ["human", "earth", "heaven"]);
  assert.ok(options.every((option) => Object.keys(option.materials).length > 0));
  assert.ok(options.every((option) => option.materialLabels.length === Object.keys(option.materials).length));
  assert.ok(options.every((option) => option.successRate > 0 && option.successRate < 1));
  assert.ok(options.every((option) => option.thunderRisk > 0));
  assert.ok(options.every((option) => option.heartDemonRisk > 0));
  assert.ok(options.every((option) => option.failureConsequence.length > 0));
  assert.ok(options.find((option) => option.route === "heaven").materials.rootOrb > 0);
});

test("major breakthrough fails closed when route materials are missing", () => {
  const state = readyState();
  const result = attemptBreakthrough(state, "heaven", {
    success: 0,
    thunder: 0.99,
    heartDemon: 0.99,
  });

  assert.equal(result.outcome.status, "blocked");
  assert.match(result.outcome.reason, /材料不足/);
  assert.deepEqual(result.state, state);
});

test("successful major breakthrough consumes materials and records the chosen route", () => {
  const state = readyState();
  const option = getBreakthroughOptions(state).find((candidate) => candidate.route === "earth");
  grantMaterials(state, option);

  const result = attemptBreakthrough(state, "earth", {
    success: 0,
    thunder: 0.99,
    heartDemon: 0.99,
  });

  assert.equal(result.outcome.status, "success");
  assert.equal(result.state.player.realmIndex, 1);
  assert.equal(result.state.player.realm, "一元境");
  assert.equal(result.state.player.progression.stage, "初期");
  assert.equal(result.state.player.progression.lastBreakthrough.route, "earth");
  for (const itemId of Object.keys(option.materials)) {
    assert.equal(result.state.player.inventory[itemId], 0);
  }
});

test("early major failure causes severe injury and cooldown without silently killing", () => {
  const state = readyState({ realmIndex: 1 });
  const option = getBreakthroughOptions(state).find((candidate) => candidate.route === "human");
  grantMaterials(state, option);

  const result = attemptBreakthrough(state, "human", {
    success: 0.99,
    thunder: 0.99,
    heartDemon: 0.99,
  });

  assert.equal(result.outcome.status, "failed");
  assert.equal(result.state.meta.status, "active");
  assert.ok(result.state.player.resources.wound >= 40);
  assert.ok(result.state.player.progression.breakthroughCooldown >= 6);
});

test("middle major failure regresses a stage and leaves a permanent scar", () => {
  const state = readyState({ realmIndex: 7 });
  const option = getBreakthroughOptions(state).find((candidate) => candidate.route === "earth");
  grantMaterials(state, option);

  const result = attemptBreakthrough(state, "earth", {
    success: 0.99,
    thunder: 0.99,
    heartDemon: 0.99,
  });

  assert.equal(result.outcome.status, "failed");
  assert.equal(result.state.player.progression.stage, "后期");
  assert.ok(result.state.player.progression.scars.length > 0);
  assert.ok(result.state.player.resources.maxSpirit < state.player.resources.maxSpirit);
});

test("high-realm major failure can truthfully end the character", () => {
  const state = readyState({ realmIndex: 12 });
  const option = getBreakthroughOptions(state).find((candidate) => candidate.route === "heaven");
  grantMaterials(state, option);

  const result = attemptBreakthrough(state, "heaven", {
    success: 0.99,
    thunder: 0.01,
    heartDemon: 0.01,
    fate: 0.1,
  });

  assert.equal(result.outcome.status, "failed");
  assert.equal(result.state.meta.status, "dead");
  assert.match(result.outcome.failureConsequence, /陨落/);
});

test("merit reduces and karma increases heavenly tribulation risk", () => {
  const protectedState = readyState({ realmIndex: 5 });
  protectedState.player.resources.merit = 30;
  const burdenedState = structuredClone(protectedState);
  burdenedState.player.resources.merit = 0;
  burdenedState.player.resources.karma = 30;

  const protectedOption = getBreakthroughOptions(protectedState).find((option) => option.route === "heaven");
  const burdenedOption = getBreakthroughOptions(burdenedState).find((option) => option.route === "heaven");

  assert.ok(protectedOption.thunderRisk < burdenedOption.thunderRisk);
  assert.ok(protectedOption.successRate > burdenedOption.successRate);
});

test("legacy no-route resolveBreakthrough can no longer grant a guaranteed major realm", () => {
  const state = readyState();
  state.player.inventory.breakthroughPill = 9;
  const next = resolveBreakthrough(state);

  assert.equal(next.player.realmIndex, state.player.realmIndex);
  assert.equal(next.player.cultivation, state.player.cultivation);
});
