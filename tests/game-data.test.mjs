import test from "node:test";
import assert from "node:assert/strict";

import { chooseOfflineEvent, getOpeningEvent } from "../public/game-data.mjs";
import { createNewGame } from "../public/game-engine.mjs";

const state = createNewGame(
  {
    name: "沈砚秋",
    gender: "女",
    age: 18,
    birthplace: "临川旧渡",
    background: "书香门第",
    path: "逍遥长生",
    spiritRootGrade: "真灵根",
    rootPrimaryElement: "水",
    rootSecondaryElement: "木",
    constitution: "凡体",
    talent: "过目不忘",
    stats: { aptitude: 10, insight: 10, soul: 10, agility: 10, martialHeart: 10, fortune: 10 },
  },
  31,
);

test("getOpeningEvent turns the measured spirit root into the first meaningful choice", () => {
  const event = getOpeningEvent(state);

  assert.match(event.scene, new RegExp(state.player.spiritRoot.grade));
  assert.match(event.scene, new RegExp(state.player.spiritRoot.primaryElement));
  assert.doesNotMatch(event.scene, /武魂/);
  assert.equal(event.choices.length, 3);
  assert.equal(event.monthDelta, 1);
  assert.equal(event.source, "offline");
});

test("chooseOfflineEvent is deterministic for the same turn and seed", () => {
  const first = chooseOfflineEvent(state);
  const second = chooseOfflineEvent(state);

  assert.equal(first.id, second.id);
  assert.ok(first.choices.length >= 2);
  assert.equal(first.monthDelta, 1);
  assert.ok(first.choices.every((choice) => typeof choice.tag === "string"));
});

test("chooseOfflineEvent excludes events above the player realm", () => {
  const event = chooseOfflineEvent(state);

  assert.ok(event.minimumRealm <= state.player.realmIndex);
});

test("early offline turns expose supplied world resources without replacing the player", () => {
  const references = new Set();
  for (let turn = 0; turn < 18; turn += 1) {
    const turnState = structuredClone(state);
    turnState.meta.turn = turn;
    const event = chooseOfflineEvent(turnState);
    for (const reference of event.canonRefs ?? []) references.add(reference);
  }

  assert.ok(["化神海", "红月城", "天盟"].some((name) => references.has(name)));
  assert.ok(["李云霄", "洛云裳", "宁可云"].some((name) => references.has(name)));
  assert.ok(["《大衍神诀》", "《太古天辰诀》", "《万药宝典》"].some((name) => references.has(name)));
});
