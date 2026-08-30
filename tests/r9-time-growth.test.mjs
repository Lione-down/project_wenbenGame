import test from "node:test";
import assert from "node:assert/strict";

import {
  TIME_ACTIVITY_CONFIG,
  advanceGameTime,
  convertExperienceDuringRetreat,
  createNewGame,
  getGrowthPacingStatus,
} from "../public/game-engine.mjs";
import { getOpeningEvent } from "../public/game-data.mjs";

function profile(overrides = {}) {
  return {
    name: "顾临川",
    gender: "男",
    age: 18,
    birthplace: "天水国",
    background: "猎户之后",
    path: "问道飞升",
    spiritRootGrade: "真灵根",
    rootPrimaryElement: "火",
    rootSecondaryElement: "木",
    constitution: "凡体",
    talent: "天生道心",
    stats: { aptitude: 10, insight: 10, soul: 10, agility: 10, martialHeart: 10, fortune: 10 },
    ...overrides,
  };
}

test("R9 uses decision-specific days instead of forcing every event to consume one month", () => {
  const state = createNewGame(profile(), 41);
  const opening = getOpeningEvent(state);
  assert.ok(Number.isFinite(opening.timeCostDays));
  assert.ok(opening.timeCostDays > 0 && opening.timeCostDays < 30);

  const next = advanceGameTime(state, { durationDays: opening.timeCostDays, activityType: opening.activityType });
  assert.equal(next.world.month, 1);
  assert.equal(next.world.day, 1 + opening.timeCostDays);
  assert.equal(next.meta.turn, 1);
});

test("R9 activity time grants bounded passive cultivation and four-track growth", () => {
  const state = createNewGame(profile(), 42);
  const next = advanceGameTime(state, { durationDays: 30, activityType: "mainline" });
  assert.ok(TIME_ACTIVITY_CONFIG.mainline.passiveCultivation > 0);
  assert.ok(next.player.cultivation > state.player.cultivation);
  assert.ok(next.player.growth.martialInsight > 0);
  assert.ok(next.player.growth.techniqueUnderstanding > 0);
  assert.ok(next.player.growth.martialMind > 0);
  assert.ok(next.player.growth.adventureAccumulation > 0);
});

test("R9 retreat remains stronger and converts accumulated experience without erasing it twice", () => {
  let state = createNewGame(profile(), 43);
  state = advanceGameTime(state, { durationDays: 360, activityType: "mainline" });
  const activeGain = state.player.cultivation;
  const converted = convertExperienceDuringRetreat(state, { durationDays: 30 });
  assert.ok(converted.convertedCultivation > 0);
  assert.ok(converted.state.player.growth.adventureAccumulation < state.player.growth.adventureAccumulation);
  const second = convertExperienceDuringRetreat(converted.state, { durationDays: 30 });
  assert.ok(second.convertedCultivation < converted.convertedCultivation);

  const retreatOnly = advanceGameTime(createNewGame(profile(), 43), { durationDays: 360, activityType: "retreat" });
  assert.ok(retreatOnly.player.cultivation > activeGain);
});

test("R9 severe injury can stop passive growth and pacing monitor explains the reason", () => {
  const state = createNewGame(profile(), 44);
  state.player.resources.wound = 90;
  state.player.abnormal = "垂死";
  const next = advanceGameTime(state, { durationDays: 180, activityType: "healing" });
  assert.equal(next.player.cultivation, state.player.cultivation);
  const pacing = getGrowthPacingStatus(next);
  assert.equal(pacing.isWarning, false);
  assert.match(pacing.reason, /重伤|垂死|合理停滞/);
});

test("R9 randomized openings are reproducible but respond to different character settings", () => {
  const first = getOpeningEvent(createNewGame(profile(), 100));
  const same = getOpeningEvent(createNewGame(profile(), 100));
  const other = getOpeningEvent(createNewGame(profile({ background: "术炼师公会学徒", path: "逍遥长生" }), 101));
  assert.deepEqual(first, same);
  assert.notEqual(first.id, other.id);
  assert.notDeepEqual(first.choices.map((choice) => choice.id), other.choices.map((choice) => choice.id));
});
