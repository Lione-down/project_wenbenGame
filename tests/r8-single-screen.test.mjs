import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { buildAgnesPayload, parseAgnesEvent } from "../lib/agnes-contract.mjs";
import { chooseOfflineEvent, getOpeningEvent } from "../public/game-data.mjs";
import { createNewGame } from "../public/game-engine.mjs";

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
  stats: { aptitude: 10, insight: 10, soul: 10, agility: 10, martialHeart: 10, fortune: 10 },
};

function allOfflineEvents() {
  const state = createNewGame(profile, 83);
  const events = [getOpeningEvent(state)];
  const seen = new Set(events.map((event) => event.id));
  for (let realmIndex = 0; realmIndex <= 16; realmIndex += 1) {
    for (let turn = 0; turn < 96; turn += 1) {
      const candidateState = structuredClone(state);
      candidateState.player.realmIndex = realmIndex;
      candidateState.meta.turn = turn;
      const event = chooseOfflineEvent(candidateState);
      if (!seen.has(event.id)) {
        seen.add(event.id);
        events.push(event);
      }
    }
  }
  return events;
}

test("one shared budget bounds Agnes and every offline pre-choice event", async () => {
  const eventRules = await import("../public/event-rules.mjs");
  assert.deepEqual(eventRules.EVENT_CONTENT_LIMITS, {
    title: 18,
    scene: 72,
    label: 12,
    hint: 18,
    result: 96,
    worldUpdate: 80,
    freeAction: 120,
  });
  assert.equal(typeof eventRules.assertEventContentBudget, "function");
  for (const event of allOfflineEvents()) {
    assert.doesNotThrow(() => eventRules.assertEventContentBudget(event), event.id);
  }

  const prompt = buildAgnesPayload({ player: { name: "陆归舟" } }).messages[0].content;
  assert.equal(/scene 不超过 72 个字/.test(prompt), true);
  const oversized = {
    kind: "story",
    title: "红月城旧案",
    scene: `红月城${"风".repeat(72)}`,
    canonRefs: ["红月城"],
    monthDelta: 1,
    danger: "low",
    choices: [
      { id: "stay", tag: "peace", label: "留下查问", hint: "先问清来路", result: "你留下查问。", effects: {} },
      { id: "leave", tag: "peace", label: "转身离开", hint: "不卷入旧案", result: "你转身离开。", effects: {} },
    ],
    worldUpdate: "红月城仍在追查旧案。",
  };
  assert.throws(() => parseAgnesEvent(JSON.stringify(oversized)), /scene/);
});

test("persistent systems live behind one compact 44px entry", async () => {
  const [html, css, app] = await Promise.all([
    readFile(new URL("public/index.html", projectUrl), "utf8"),
    readFile(new URL("public/styles.css", projectUrl), "utf8"),
    readFile(new URL("public/app.mjs", projectUrl), "utf8"),
  ]);
  assert.equal(/<details id="command-drawer"[\s\S]*<summary[^>]*>更多操作<\/summary>[\s\S]*<nav id="command-menu"/.test(html), true);
  assert.equal(/id="free-action-input"[^>]*maxlength="120"/.test(html), true);
  assert.equal(/\.command-drawer\s*>\s*summary\s*\{[^}]*min-height:\s*44px/s.test(css), true);
  assert.equal(/\.choice-slip\s*\{[^}]*min-height:\s*44px/s.test(css), true);
  assert.equal(/\.free-action-form button\s*\{[^}]*min-height:\s*44px/s.test(css), true);
  assert.equal(/Object\.entries\(choice\.effects \|\| \{\}\)\.slice\(0, 2\)/.test(app), true);
});

test("compact pre-choice layout has dense portrait and two-column phone landscape rules", async () => {
  const css = await readFile(new URL("public/styles.css", projectUrl), "utf8");
  assert.equal(/html\.compact-viewport \.event-panel\s*\{[^}]*padding:\s*10px 12px/s.test(css), true);
  assert.equal(/html\.compact-viewport \.event-scene\s*\{[^}]*font-size:\s*14px[^}]*line-height:\s*1\.5/s.test(css), true);
  assert.equal(/@media \(orientation:\s*landscape\) and \(max-height:\s*500px\)[\s\S]*#event-panel\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\) minmax\(0,\s*1fr\)/s.test(css), true);
  assert.equal(/(?:line-clamp|-webkit-line-clamp)/.test(css), false);
});
