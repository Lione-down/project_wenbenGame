import test from "node:test";
import assert from "node:assert/strict";

import { parseAgnesEvent } from "../lib/agnes-contract.mjs";
import { createNewGame, exportGame } from "../public/game-engine.mjs";

const fakeKey = ["qa", "player", "credential"].join("-");

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

async function loadPlayerAgnesModule() {
  try {
    return await import("../public/player-agnes.mjs");
  } catch (error) {
    assert.fail(`player Agnes browser module is missing: ${error.code || error.message}`);
  }
}

function playerState() {
  return createNewGame({
    name: "验收修士",
    gender: "不记",
    age: 18,
    birthplace: "红月城",
    background: "市井孤儿",
    path: "随心所欲",
    spiritRootGrade: "地灵根",
    rootPrimaryElement: "火",
    rootSecondaryElement: "",
    constitution: "凡体",
    talent: "气运加身",
    stats: { aptitude: 10, insight: 10, soul: 10, agility: 10, martialHeart: 10, fortune: 10 },
  }, 73);
}

function providerStream(content) {
  const frames = [
    `data: ${JSON.stringify({
      model: "agnes-2.5-flash",
      choices: [{ delta: { content }, finish_reason: null }],
    })}\n\n`,
    "data: [DONE]\n\n",
  ].join("");
  return new Response(frames, {
    status: 200,
    headers: { "Content-Type": "text/event-stream; charset=utf-8" },
  });
}

function validEvent() {
  return {
    kind: "story",
    title: "红月验印",
    scene: "红月城的验印石亮起微光，守门人示意你亲自确认这次直连结果。",
    canonRefs: ["红月城"],
    monthDelta: 1,
    danger: "low",
    choices: [
      { id: "confirm", tag: "peace", label: "确认印记", hint: "记录本次结果", result: "你确认了验印石。", effects: { insight: 1 } },
      { id: "leave", tag: "peace", label: "暂且离开", hint: "不触碰印记", result: "你暂且离开验印石。", effects: { martialHeart: 1 } },
    ],
    worldUpdate: "红月城的验印石恢复平静。",
  };
}

function validResolution() {
  return {
    narrative: "你把手掌按在验印石上，微光沿着纹路逐层亮起。守门人没有催促，只在光芒稳定后收起名册，让你亲眼确认本轮结果已经写入命簿。石台旁的铜铃随风轻响，围观者依次退开，城门登记官又核对了一遍日期与姓名，才把这页记录郑重封存。",
    npcReaction: "守门人确认印记稳定，并提醒你妥善保管自己的凭证。",
    consequence: "本地规则已经完成结算，主持叙事没有增加任何额外数值。",
    nextClue: "下一次行动仍由你亲自决定。",
  };
}

test("player key defaults to session storage and remembered save switches authority", async () => {
  const module = await loadPlayerAgnesModule();
  const sessionStorage = memoryStorage();
  const localStorage = memoryStorage();

  module.savePlayerAgnesKey({ sessionStorage, localStorage, key: fakeKey, remember: false });
  assert.deepEqual(module.loadPlayerAgnesKey({ sessionStorage, localStorage }), {
    key: fakeKey,
    remember: false,
  });
  assert.equal(localStorage.getItem(module.PLAYER_AGNES_LOCAL_KEY), null);

  module.savePlayerAgnesKey({ sessionStorage, localStorage, key: fakeKey, remember: true });
  assert.deepEqual(module.loadPlayerAgnesKey({ sessionStorage, localStorage }), {
    key: fakeKey,
    remember: true,
  });
  assert.equal(sessionStorage.getItem(module.PLAYER_AGNES_SESSION_KEY), null);

  module.clearPlayerAgnesKey({ sessionStorage, localStorage });
  assert.deepEqual(module.loadPlayerAgnesKey({ sessionStorage, localStorage }), { key: "", remember: false });
  assert.equal(exportGame(playerState()).includes(fakeKey), false);
});

test("connection test makes exactly one minimal explicit Provider request", async () => {
  const module = await loadPlayerAgnesModule();
  let calls = 0;
  let hasAuthorization = false;
  const fetchImpl = async (_url, request) => {
    calls += 1;
    hasAuthorization = typeof request.headers.Authorization === "string"
      && request.headers.Authorization.startsWith("Bearer ");
    const payload = JSON.parse(request.body);
    assert.equal(payload.model, "agnes-2.5-flash");
    assert.equal(payload.stream, false);
    assert.equal(payload.max_tokens, 1);
    return Response.json({
      model: "agnes-2.5-flash",
      choices: [{ finish_reason: "stop", message: { role: "assistant", content: "好" } }],
    });
  };

  assert.equal(calls, 0, "no Provider request happens before the explicit test action");
  await module.testPlayerAgnesConnection(fetchImpl, fakeKey);
  assert.equal(calls, 1);
  assert.equal(hasAuthorization, true);
});

test("connection test accepts a valid one-token completion envelope when content is length-limited", async () => {
  const module = await loadPlayerAgnesModule();
  let calls = 0;
  const result = await module.testPlayerAgnesConnection(async (_url, request) => {
    calls += 1;
    const payload = JSON.parse(request.body);
    assert.equal(payload.max_tokens, 1);
    assert.equal(payload.stream, false);
    return Response.json({
      model: "agnes-2.5-flash",
      choices: [{ finish_reason: "length", message: { role: "assistant", content: "" } }],
    });
  }, fakeKey);

  assert.equal(calls, 1);
  assert.deepEqual(result, { connected: true, model: "agnes-2.5-flash" });
});

test("Provider recovery treats a missing effects object as no state change while strict parsing stays closed", async () => {
  const module = await loadPlayerAgnesModule();
  const drifted = validEvent();
  delete drifted.choices[0].effects;
  assert.throws(() => parseAgnesEvent(JSON.stringify(drifted)), /choices\.effects/);

  let calls = 0;
  const result = await module.streamPlayerAgnesEvent(
    async () => {
      calls += 1;
      return providerStream(JSON.stringify(drifted));
    },
    fakeKey,
    playerState(),
    [],
    "",
    () => {},
  );

  assert.equal(calls, 1);
  assert.equal(result.structured, true);
  assert.deepEqual(result.event.choices[0].effects, {});
});

test("Provider recovery trims over-budget display text while strict parsing keeps the original limits", async () => {
  const module = await loadPlayerAgnesModule();
  const drifted = validEvent();
  drifted.scene = `红月城${"风".repeat(80)}`;
  drifted.choices[0].result = `你确认了验印石，${"余".repeat(100)}`;
  assert.throws(() => parseAgnesEvent(JSON.stringify(drifted)), /长度无效|个字/);

  const result = await module.streamPlayerAgnesEvent(
    async () => providerStream(JSON.stringify(drifted)),
    fakeKey,
    playerState(),
    [],
    "",
    () => {},
  );

  assert.equal(result.structured, true);
  assert.equal(Array.from(result.event.scene).length, 72);
  assert.equal(Array.from(result.event.choices[0].result).length, 96);
  assert.equal(result.event.canonRefs.includes("红月城"), true);
});

test("direct fate stream uses the strict event contract without retry", async () => {
  const module = await loadPlayerAgnesModule();
  const state = playerState();
  let calls = 0;
  const fetchImpl = async (_url, request) => {
    calls += 1;
    assert.equal(JSON.parse(request.body).stream, true);
    return providerStream(JSON.stringify(validEvent()));
  };

  const result = await module.streamPlayerAgnesEvent(fetchImpl, fakeKey, state, [], "", () => {});
  assert.equal(calls, 1);
  assert.equal(result.structured, true);
  assert.equal(result.event.title, "红月验印");

  calls = 0;
  const drift = await module.streamPlayerAgnesEvent(
    async () => {
      calls += 1;
      return providerStream("这段原文不是可结算 JSON");
    },
    fakeKey,
    state,
    [],
    "",
    () => {},
  );
  assert.equal(calls, 1);
  assert.equal(drift.structured, false);
  assert.equal(drift.event, null);
  assert.ok(drift.rawContent);
});

test("direct resolution stream keeps local settlement behind the strict contract", async () => {
  const module = await loadPlayerAgnesModule();
  const state = playerState();
  state.meta.pendingResolution = {
    id: "pending-player-key",
    turn: 1,
    event: { id: "opening", kind: "story", title: "灵根初鸣", scene: "验收场景", source: "offline" },
    choice: { id: "confirm", label: "确认印记" },
    localOutcome: { status: "settled", summary: "本地结算已经完成。", stateDelta: { insight: 1 } },
    worldUpdate: "红月城的验印石恢复平静。",
  };
  let calls = 0;
  const result = await module.streamPlayerAgnesResolution(
    async () => {
      calls += 1;
      return providerStream(JSON.stringify(validResolution()));
    },
    fakeKey,
    state,
    () => {},
  );

  assert.equal(calls, 1);
  assert.equal(result.structured, true);
  assert.deepEqual(result.resolution, validResolution());
});

test("direct Provider authentication failure is classified without retry", async () => {
  const module = await loadPlayerAgnesModule();
  let calls = 0;
  await assert.rejects(
    module.testPlayerAgnesConnection(async () => {
      calls += 1;
      return Response.json({ error: { message: "denied" } }, { status: 401 });
    }, fakeKey),
    (error) => error.code === "authentication" && error.status === 401,
  );
  assert.equal(calls, 1);
});
