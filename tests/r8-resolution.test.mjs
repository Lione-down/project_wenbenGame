import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { readFile } from "node:fs/promises";

import { createGameServer } from "../server.mjs";
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

function storyEvent() {
  return {
    id: "red-moon-ledger",
    kind: "story",
    title: "红月城药单",
    scene: "红月城商会请你核对一张染血药单，林玄守在门边等你表态。",
    canonRefs: ["红月城", "林玄"],
    monthDelta: 1,
    danger: "medium",
    choices: [
      { id: "check", tag: "risk", label: "接过药单", hint: "会卷入追查", result: "你接过染血药单。", effects: { vitality: -5, reputation: 2 } },
      { id: "leave", tag: "peace", label: "婉拒离开", hint: "暂避这场因果", result: "你没有接下药单。", effects: { martialHeart: 1 } },
    ],
    worldUpdate: "红月城商会仍在追查药单来源。",
    source: "offline",
  };
}

function validNarrative() {
  return {
    narrative: "你伸手接过药单，纸角尚带着潮湿血气。林玄没有松开刀柄，只侧身让出半步，示意你先看末尾被刮去的名字。你逐行比对药材与交付时辰，发现其中一笔墨迹比其余字迹新了整整一日。门外忽然传来急促脚步，商会管事却在门槛外停住，没有立刻进来。",
    npcReaction: "林玄盯着那笔新墨，低声承认自己先前误判了你的来路，但仍要求你留在视线之内。",
    consequence: "你已经承受了本地确定的气血损失并获得两点声望；除此之外，主持叙事没有增删任何数值或物品。",
    nextClue: "被刮去的名字与北门药仓昨夜更换的守卫有关。",
  };
}

async function settledState() {
  const engine = await import("../public/game-engine.mjs");
  return engine.settleEventChoice(createNewGame(profile, 101), storyEvent(), "check", {
    localOutcome: { status: "settled", summary: "你接过染血药单，气血损失与声望变化已经确定。" },
  });
}

async function withServer(options, callback) {
  const server = createGameServer(options);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  try {
    await callback(`http://127.0.0.1:${address.port}`);
  } finally {
    server.close();
    await once(server, "close");
  }
}

function providerResponse(content) {
  return new Response(JSON.stringify({
    id: "chatcmpl_resolution",
    object: "chat.completion",
    model: "agnes-2.5-flash",
    choices: [{
      index: 0,
      message: { role: "assistant", content },
      finish_reason: "stop",
    }],
  }), { status: 200, headers: { "Content-Type": "application/json" } });
}

function providerStreamResponse(content, { includeDone = true } = {}) {
  const first = content.slice(0, Math.ceil(content.length / 2));
  const second = content.slice(first.length);
  const frames = [first, second].map((text) => `data: ${JSON.stringify({
    id: "chatcmpl_resolution",
    object: "chat.completion.chunk",
    model: "agnes-2.5-flash",
    choices: [{ index: 0, delta: { content: text }, finish_reason: null }],
  })}\n\n`).join("") + (includeDone ? "data: [DONE]\n\n" : "");
  return new Response(frames, { status: 200, headers: { "Content-Type": "text/event-stream" } });
}

function parseSseEvents(text) {
  return text
    .split(/\r?\n\r?\n/)
    .filter(Boolean)
    .map((frame) => {
      let event = "message";
      const data = [];
      for (const line of frame.split(/\r?\n/)) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
      }
      return { event, data: JSON.parse(data.join("\n")) };
    });
}

test("local settlement is atomic, idempotent and advances time only after continue", async () => {
  const engine = await import("../public/game-engine.mjs");
  assert.equal(typeof engine.settleEventChoice, "function");
  assert.equal(typeof engine.continueAfterResolution, "function");
  const state = createNewGame(profile, 101);
  const beforeChronicle = state.chronicle.length;
  const settled = engine.settleEventChoice(state, storyEvent(), "check", {
    localOutcome: { status: "settled", summary: "药单已接，后果已确定。" },
  });

  assert.equal(settled.meta.turn, state.meta.turn);
  assert.equal(settled.world.month, state.world.month);
  assert.equal(settled.player.resources.vitality, state.player.resources.vitality - 5);
  assert.equal(settled.player.resources.reputation, state.player.resources.reputation + 2);
  assert.equal(settled.chronicle.length, beforeChronicle + 1);
  assert.equal(settled.meta.pendingResolution.localOutcome.stateDelta.resources.vitality, -5);
  assert.throws(() => engine.settleEventChoice(settled, storyEvent(), "check"), /已经结算|等待继续/);

  const continued = engine.continueAfterResolution(settled);
  assert.equal(continued.meta.turn, state.meta.turn + 1);
  assert.equal(continued.world.month, state.world.month + 1);
  assert.equal(continued.meta.pendingResolution, null);
  assert.equal(settled.meta.turn, state.meta.turn);
});

test("strict resolution contract allows rich narration but rejects malformed, long and unknown output", async () => {
  const contract = await import("../lib/agnes-resolution-contract.mjs");
  assert.equal(typeof contract.buildAgnesResolutionPayload, "function");
  assert.equal(typeof contract.parseAgnesResolution, "function");
  const state = await settledState();
  const payload = contract.buildAgnesResolutionPayload(state, state.meta.pendingResolution, { stream: true });
  const prompt = payload.messages[0].content;
  assert.equal(/只能叙述本地已经确定的结果/.test(prompt), true);
  assert.equal(/不得增删数值|不得修改数值/.test(prompt), true);
  assert.equal(payload.stream, true);
  assert.deepEqual(contract.parseAgnesResolution(JSON.stringify(validNarrative())), validNarrative());
  assert.throws(() => contract.parseAgnesResolution("not-json"), /JSON/);
  assert.throws(() => contract.parseAgnesResolution(JSON.stringify({ ...validNarrative(), effects: { vitality: 9 } })), /未知字段/);
  assert.throws(() => contract.parseAgnesResolution(JSON.stringify({ ...validNarrative(), narrative: "长".repeat(1601) })), /narrative/);
});

test("resolution client consumes delta and complete in exactly one SSE request", async () => {
  const client = await import("../public/game-client.mjs");
  assert.equal(typeof client.requestAgnesResolution, "function");
  const state = await settledState();
  let successCalls = 0;
  const deltas = [];
  const rawContent = JSON.stringify(validNarrative());
  const frames = [
    'event: delta\ndata: {"text":"你伸手"}\n\n',
    `event: complete\ndata: ${JSON.stringify({
      resolution: validNarrative(),
      rawContent,
      structured: true,
      fallback: false,
    })}\n\n`,
  ].join("");
  const resolved = await client.requestAgnesResolution(async (url, options) => {
    successCalls += 1;
    assert.equal(url, "/api/resolution");
    assert.equal(options.headers.Accept, "text/event-stream");
    const body = JSON.parse(options.body);
    assert.equal(body.resolution.id, state.meta.pendingResolution.id);
    return new Response(frames, { status: 200, headers: { "Content-Type": "text/event-stream" } });
  }, state, (delta) => deltas.push(delta));
  assert.equal(successCalls, 1);
  assert.deepEqual(deltas, ["你伸手"]);
  assert.deepEqual(resolved, {
    resolution: validNarrative(),
    rawContent,
    structured: true,
    fallback: false,
  });

  let failureCalls = 0;
  await assert.rejects(
    () => client.requestAgnesResolution(async () => {
      failureCalls += 1;
      throw new Error("timeout");
    }, state),
    /network_unavailable/,
  );
  assert.equal(failureCalls, 1);
});

test("POST /api/resolution streams deltas and completes strict or raw Provider content", async () => {
  const state = await settledState();
  let successCalls = 0;
  let capturedPayload = null;
  const strictContent = JSON.stringify(validNarrative());
  await withServer({
    apiKey: "secret-test-key",
    fetchImpl: async (_url, options) => {
      successCalls += 1;
      capturedPayload = JSON.parse(options.body);
      return providerStreamResponse(strictContent);
    },
  }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/resolution`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ game: state, resolution: state.meta.pendingResolution }),
    });
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /^text\/event-stream/);
    const events = parseSseEvents(await response.text());
    assert.ok(events.some((entry) => entry.event === "delta"));
    const complete = events.find((entry) => entry.event === "complete");
    assert.deepEqual(complete.data.resolution, validNarrative());
    assert.equal(complete.data.rawContent, strictContent);
    assert.equal(complete.data.structured, true);
  });
  assert.equal(successCalls, 1);
  assert.equal(capturedPayload.stream, true);
  assert.equal(capturedPayload.model, "agnes-2.5-flash");

  for (const content of [
    "主持人只写下纯文本：本地结果不变。",
    "not-json",
    JSON.stringify({ ...validNarrative(), danger: "fatal" }),
    JSON.stringify({ ...validNarrative(), narrative: "长".repeat(1601) }),
  ]) {
    let calls = 0;
    await withServer({ apiKey: "secret-test-key", fetchImpl: async () => {
      calls += 1;
      return providerStreamResponse(content);
    } }, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/resolution`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game: state, resolution: state.meta.pendingResolution }),
      });
      assert.equal(response.status, 200);
      const events = parseSseEvents(await response.text());
      assert.equal(events.some((entry) => entry.event === "error"), false);
      const complete = events.find((entry) => entry.event === "complete");
      assert.ok(complete);
      assert.equal(complete.data.resolution, null);
      assert.equal(complete.data.rawContent, content);
      assert.equal(complete.data.structured, false);
      assert.equal(complete.data.validationReason, "resolution_contract_drift");
    });
    assert.equal(calls, 1);
  }
});

test("POST /api/resolution keeps HTTP, timeout and interrupted streams as single-shot errors", async () => {
  const state = await settledState();
  const cases = [
    {
      expected: "provider_error",
      fetchImpl: async () => new Response("upstream unavailable", { status: 503 }),
    },
    {
      expected: "provider_uncertain",
      fetchImpl: async () => { throw Object.assign(new Error("uncertain"), { name: "TimeoutError" }); },
    },
    {
      expected: "provider_error",
      fetchImpl: async () => providerStreamResponse("半段已经计费的主持 token", { includeDone: false }),
    },
  ];

  for (const { expected, fetchImpl } of cases) {
    let calls = 0;
    await withServer({ apiKey: "secret-test-key", fetchImpl: async (...args) => {
      calls += 1;
      return fetchImpl(...args);
    } }, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/resolution`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game: state, resolution: state.meta.pendingResolution }),
      });
      assert.match(response.headers.get("content-type"), /^text\/event-stream/);
      const events = parseSseEvents(await response.text());
      assert.equal(events.some((entry) => entry.event === "complete"), false);
      assert.equal(events.find((entry) => entry.event === "error")?.data.error, expected);
    });
    assert.equal(calls, 1);
  }
});

test("POST /api/resolution uses non-stream fallback only after a zero-token stream rejection", async () => {
  const state = await settledState();
  const calls = [];
  await withServer({
    apiKey: "secret-test-key",
    fetchImpl: async (_url, options) => {
      const payload = JSON.parse(options.body);
      calls.push(payload.stream);
      if (payload.stream) {
        return new Response(JSON.stringify({ error: "stream unsupported" }), { status: 400 });
      }
      return providerResponse(JSON.stringify(validNarrative()));
    },
  }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/resolution`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ game: state, resolution: state.meta.pendingResolution }),
    });
    const events = parseSseEvents(await response.text());
    const complete = events.find((entry) => entry.event === "complete");

    assert.ok(complete);
    assert.deepEqual(complete.data.resolution, validNarrative());
    assert.equal(complete.data.fallback, true);
    assert.equal(events.some((entry) => entry.event === "delta"), false);
  });
  assert.deepEqual(calls, [true, false]);
});

test("provider failure is recorded without rolling back or duplicating local settlement", async () => {
  const engine = await import("../public/game-engine.mjs");
  const settled = await settledState();
  const failed = engine.failEventResolution(settled, "provider_uncertain");
  assert.equal(failed.meta.pendingResolution.provider.status, "failed");
  assert.equal(failed.meta.pendingResolution.provider.error, "provider_uncertain");
  assert.equal(failed.player.resources.vitality, settled.player.resources.vitality);
  assert.equal(failed.chronicle.length, settled.chronicle.length);
  assert.equal(settled.meta.pendingResolution.provider.status, "pending");
});

test("raw resolution content is transient and cannot enter the saved settlement state", async () => {
  const client = await import("../public/game-client.mjs");
  assert.equal(typeof client.createSafeResolutionFallback, "function");
  if (typeof client.createSafeResolutionFallback !== "function") return;
  const engine = await import("../public/game-engine.mjs");
  const settled = await settledState();
  const rawContent = '<script>inventory.gold=999999</script>';
  const fallback = client.createSafeResolutionFallback(settled.meta.pendingResolution);
  const completed = engine.completeEventResolution(settled, fallback);

  assert.doesNotMatch(JSON.stringify(completed), /inventory\.gold|999999|<script>/);
  assert.equal(completed.player.resources.vitality, settled.player.resources.vitality);
  assert.deepEqual(completed.player.inventory, settled.player.inventory);
  assert.equal(rawContent.includes("999999"), true);
});

test("choice and free action enter an independent reading surface before explicit continue", async () => {
  const [html, app] = await Promise.all([
    readFile(new URL("public/index.html", projectUrl), "utf8"),
    readFile(new URL("public/app.mjs", projectUrl), "utf8"),
  ]);
  for (const id of ["resolution-view", "resolution-narrative", "resolution-npc-reaction", "resolution-consequence", "resolution-next-clue", "resolution-error"]) {
    assert.equal(new RegExp(`id="${id}"`).test(html), true);
  }
  assert.equal(/function renderResolution\([\s\S]*choice-list[^\n]*hidden[\s\S]*free-action-form[^\n]*hidden[\s\S]*command-drawer[^\n]*hidden/.test(app), true);
  assert.equal(/requestAgnesResolution\([\s\S]*failEventResolution/.test(app), true);
  assert.equal(/resolution-narrative"\]\.textContent\s*=\s*rawContent/.test(app), true);
  assert.equal(/streaming-preview"\]\.textContent\s*=/.test(app), true);
  assert.equal(/\.innerHTML\s*=|insertAdjacentHTML\s*\(/.test(app), false);
  assert.equal(/createSafeResolutionFallback\([\s\S]*completeEventResolution/.test(app), true);
  assert.equal(/free-action-form[\s\S]*settleAndNarrate/.test(app), true);
  assert.equal(/next-event[\s\S]*continueAfterResolution[\s\S]*loadNextEvent/.test(app), true);
});
