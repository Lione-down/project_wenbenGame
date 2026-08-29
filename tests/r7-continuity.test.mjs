import test from "node:test";
import assert from "node:assert/strict";

import { buildAgnesPayload, parseAgnesEvent } from "../lib/agnes-contract.mjs";
import { createNewGame } from "../public/game-engine.mjs";
import { sanitizeGameSnapshot } from "../server.mjs";

const profile = {
  name: "顾照临",
  gender: "雌雄同体的妖族",
  age: 20,
  birthplace: "炎武城",
  background: "妖族后裔",
  path: "随心所欲",
  spiritRootGrade: "真灵根",
  rootPrimaryElement: "木",
  rootSecondaryElement: "水",
  constitution: "凡体",
  talent: "天生道心",
  stats: {
    aptitude: 10,
    insight: 10,
    soul: 10,
    agility: 10,
    martialHeart: 10,
    fortune: 10,
  },
};

function deadNpcState() {
  const state = createNewGame(profile, 71);
  state.world.npcs[0].alive = false;
  state.world.npcs[0].deathCause = "寿元耗尽";
  state.world.ecologyLog = Array.from({ length: 20 }, (_, index) => ({
    turn: index + 1,
    year: 1127 + Math.floor(index / 12),
    month: index % 12 + 1,
    type: index === 19 ? "death" : "setback",
    npcId: state.world.npcs[0].id,
    text: index === 19 ? "林玄寿尽坐化。" : "林玄破境受阻，修为回落。",
  }));
  return state;
}

function eventAboutLinXuan(scene) {
  return {
    title: "故人旧迹",
    scene,
    canonRefs: ["林玄"],
    monthDelta: 1,
    danger: "low",
    choices: [
      {
        id: "stay",
        tag: "peace",
        label: "停留片刻",
        hint: "听完这段往事",
        result: "你记住了林玄留下的遗言。",
        effects: { martialHeart: 1 },
      },
      {
        id: "leave",
        tag: "peace",
        label: "转身离开",
        hint: "不扰故人安眠",
        result: "你离开了林玄的墓碑。",
        effects: {},
      },
    ],
    worldUpdate: "红月城仍有人祭奠已故的林玄。",
  };
}

test("sanitized snapshots retain a bounded death ledger and recent ecology narrative", () => {
  const snapshot = sanitizeGameSnapshot(deadNpcState());
  const deadNpc = snapshot.world.npcs.find((npc) => npc.name === "林玄");

  assert.equal(deadNpc.alive, false);
  assert.equal(deadNpc.deathCause, "寿元耗尽");
  assert.ok(Array.isArray(snapshot.world.ecologyLog));
  assert.equal(snapshot.world.ecologyLog.length, 12);
  assert.equal(snapshot.world.ecologyLog.at(-1).text, "林玄寿尽坐化。");
  assert.ok(snapshot.world.ecologyLog.every((entry) => entry.text.length <= 120));
});

test("Agnes payload explicitly carries dead NPCs and cross-turn ecology continuity", () => {
  const snapshot = sanitizeGameSnapshot(deadNpcState());
  const payload = buildAgnesPayload(snapshot, [], "去林玄墓前祭奠");
  const systemPrompt = payload.messages[0].content;
  const userPrompt = JSON.parse(payload.messages[1].content);

  assert.match(systemPrompt, /已故 NPC 不得[^。]*(说话|行动)/);
  assert.match(systemPrompt, /choice\.npc/);
  assert.deepEqual(userPrompt.continuityLedger.deadNpcs, [
    { id: "lin-xuan", name: "林玄", deathCause: "寿元耗尽" },
  ]);
  assert.equal(userPrompt.continuityLedger.recentEcology.length, 12);
  assert.equal(userPrompt.continuityLedger.recentEcology.at(-1).text, "林玄寿尽坐化。");
});

test("strict parsing rejects a dead NPC acting in the current turn", () => {
  const activeDead = eventAboutLinXuan("林玄推门而入，笑着邀请你一同前往红月城商会。之后他会亲自带路。");

  assert.throws(
    () => parseAgnesEvent(JSON.stringify(activeDead), {
      allowedReferences: ["林玄", "红月城"],
      deadNpcNames: ["林玄"],
    }),
    /已故 NPC.*林玄/,
  );
});

test("strict parsing allows explicit memorial context but never a dead choice NPC", () => {
  const memorial = eventAboutLinXuan("你在红月城外祭奠已故的林玄，墓碑前仍放着他生前留下的旧剑。你只能追忆往事。" );
  const parsed = parseAgnesEvent(JSON.stringify(memorial), {
    allowedReferences: ["林玄", "红月城"],
    deadNpcNames: ["林玄"],
  });
  assert.equal(parsed.title, "故人旧迹");

  const invalidNpc = structuredClone(memorial);
  invalidNpc.choices[0].npc = {
    name: "林玄",
    role: "故人",
    stance: "友善",
    goal: "与你同行",
    relationDelta: 2,
  };
  assert.throws(
    () => parseAgnesEvent(JSON.stringify(invalidNpc), {
      allowedReferences: ["林玄", "红月城"],
      deadNpcNames: ["林玄"],
    }),
    /已故 NPC.*choice\.npc.*林玄/,
  );
});
