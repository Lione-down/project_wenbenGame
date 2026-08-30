import test from "node:test";
import assert from "node:assert/strict";

import {
  buildAgnesPayload,
  parseAgnesEventProposal,
} from "../lib/agnes-contract.mjs";
import { createNewGame, registerNpcEncounter } from "../public/game-engine.mjs";

const allowed = ["location:red-moon-city", "skill:basic-palm", "npc:lin-xuan"];

function proposal(overrides = {}) {
  return {
    schemaVersion: 1,
    kind: "story",
    title: "药路疑云",
    scene: "林玄发现押运灵药的车辙被人刻意抹去，邀你一同追查。",
    canonRefs: [...allowed],
    timeCostDays: 2,
    activityType: "mainline",
    danger: "medium",
    choices: [
      { id: "trace", tag: "risk", label: "追查车辙", hint: "可能遭遇伏击", result: "你找到一枚断裂箭簇。", effects: [{ type: "stat_delta", stat: "insight", value: 2 }] },
      { id: "report", tag: "peace", label: "回城报信", hint: "放弃现场先机", result: "商会开始核对内鬼。", effects: [] },
    ],
    worldUpdate: "商会暗中收紧药材运输路线。",
    ...overrides,
  };
}

test("R9 proposal extracts fenced or surrounded JSON and normalizes typed effects", () => {
  const content = `说明文字\n\`\`\`json\n${JSON.stringify(proposal())}\n\`\`\`\n结束`;
  const parsed = parseAgnesEventProposal(content, { allowedReferences: allowed, allowedSkillIds: ["basic-palm"] });
  assert.equal(parsed.event.title, "药路疑云");
  assert.equal(parsed.event.choices[0].effects.insight, 2);
  assert.deepEqual(parsed.validationErrors, []);
});

test("R9 proposal drops one unknown effect and canon ref while preserving the story", () => {
  const value = proposal({ canonRefs: [...allowed, "npc:invented-immortal"] });
  value.choices[0].effects.push({ type: "skill_learn", skillId: "invented-skill", value: 1 });
  value.choices[0].effects.push({ type: "stat_delta", stat: "luck", value: 999 });
  const parsed = parseAgnesEventProposal(JSON.stringify(value), { allowedReferences: allowed, allowedSkillIds: ["basic-palm"] });
  assert.equal(parsed.event.choices.length, 2);
  assert.deepEqual(parsed.event.canonRefs, allowed);
  assert.equal(parsed.event.choices[0].effects.insight, 2);
  assert.ok(parsed.validationErrors.some((error) => error.path === "canonRefs[3]" && error.code === "UNKNOWN_CANON_REF"));
  assert.ok(parsed.validationErrors.some((error) => error.path.includes("effects") && error.code === "UNAUTHORIZED_SKILL"));
  assert.ok(parsed.validationErrors.some((error) => error.code === "OUT_OF_RANGE"));
});

test("R9 Agnes payload pins assets, learned skills, dead NPCs, pacing and anti-revival rules", () => {
  const initialGame = createNewGame({
    name: "周砚", gender: "男", age: 20, birthplace: "天水国", background: "农家子", path: "守护所爱",
    spiritRootGrade: "真灵根", rootPrimaryElement: "土", rootSecondaryElement: "",
    constitution: "凡体", talent: "过目不忘",
    stats: { aptitude: 10, insight: 10, soul: 10, agility: 10, martialHeart: 10, fortune: 10 },
  }, 9);
  const game = registerNpcEncounter(initialGame, {
    id: "lin-xuan", name: "林玄", gender: "男", species: "人族",
    realmIndex: 0, stageIndex: 0, goal: "追查失窃药箱", alive: true,
  }, { eventId: "payload-fixture", summary: "你在红月城与林玄相识。" });
  game.world.npcs[0].alive = false;
  game.world.npcs[0].deathCause = "寿元耗尽";
  const payload = buildAgnesPayload(game, [], "", { stream: false });
  const text = JSON.stringify(payload);
  assert.match(text, /schemaVersion/);
  assert.match(text, /timeCostDays/);
  assert.match(text, /已学武技|martialSkills/);
  assert.match(text, /死亡|不得复活|回忆/);
  assert.match(text, /危险|反派|线索/);
});

test("R9 Agnes proposal preserves complete encountered NPC identity and rejects resurrection", () => {
  const encounteredNpc = {
    id: "merchant-qiao",
    name: "乔芷",
    gender: "女",
    species: "人族",
    realmIndex: 1,
    stageIndex: 2,
    goal: "追回被劫走的药材",
    alive: true,
  };
  const parsed = parseAgnesEventProposal(JSON.stringify(proposal({ encounterNpcs: [encounteredNpc] })), {
    allowedReferences: allowed,
    allowedSkillIds: ["basic-palm"],
  });
  assert.deepEqual(parsed.event.encounterNpcs, [encounteredNpc]);

  assert.throws(() => parseAgnesEventProposal(JSON.stringify(proposal({ encounterNpcs: [encounteredNpc] })), {
    allowedReferences: allowed,
    allowedSkillIds: ["basic-palm"],
    deadNpcNames: ["乔芷"],
  }), /不得复活/);
});
