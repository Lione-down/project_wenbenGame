import test from "node:test";
import assert from "node:assert/strict";

import {
  SAVE_KEY,
  loadLocalGame,
  requestAgnesEvent,
  saveLocalGame,
  streamAgnesEvent,
} from "../public/game-client.mjs";
import { createNewGame } from "../public/game-engine.mjs";

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

const state = createNewGame(
  {
    name: "晏无归",
    gender: "男",
    age: 20,
    birthplace: "赤沙驿",
    background: "商贾之家",
    path: "随心所欲",
    soulAttribute: "火",
    constitution: "凡体",
    talent: "气运加身",
    stats: { aptitude: 10, insight: 10, soul: 10, agility: 10, martialHeart: 10, fortune: 10 },
  },
  76,
);

test("saveLocalGame and loadLocalGame preserve the supported save", () => {
  const storage = memoryStorage();
  saveLocalGame(storage, state);

  assert.ok(storage.getItem(SAVE_KEY));
  assert.deepEqual(loadLocalGame(storage), state);
});

test("requestAgnesEvent returns a validated server event", async () => {
  const event = { id: "agnes-1", title: "归雁传书", choices: [] };
  const fetchImpl = async (_url, request) => {
    const body = JSON.parse(request.body);
    assert.equal(body.action, "我想去红月城坊市摆摊");
    return new Response(JSON.stringify({ event }), { status: 200 });
  };

  assert.deepEqual(
    await requestAgnesEvent(fetchImpl, state, [], "我想去红月城坊市摆摊"),
    event,
  );
});

test("requestAgnesEvent exposes provider failure instead of choosing an offline event", async () => {
  const fetchImpl = async () => new Response(
    JSON.stringify({ error: "authentication" }),
    { status: 401 },
  );

  await assert.rejects(
    requestAgnesEvent(fetchImpl, state, []),
    (error) => error.code === "authentication" && error.status === 401,
  );
});

test("streamAgnesEvent reports token deltas and returns the validated complete event", async () => {
  const event = { id: "agnes-stream-1", title: "红月问途", choices: [] };
  const frames = [
    "event: delta\ndata: {\"text\":\"红月\"}\n\n",
    "event: delta\ndata: {\"text\":\"城外\"}\n\n",
    `event: complete\ndata: ${JSON.stringify({ event, fallback: false })}\n\n`,
  ].join("");
  const bytes = new TextEncoder().encode(frames);
  const fetchImpl = async (url, request) => {
    assert.equal(url, "/api/fate/stream");
    assert.equal(JSON.parse(request.body).action, "打听化神海消息");
    return new Response(new ReadableStream({
      start(controller) {
        controller.enqueue(bytes.slice(0, 13));
        controller.enqueue(bytes.slice(13));
        controller.close();
      },
    }), { status: 200, headers: { "Content-Type": "text/event-stream" } });
  };
  const deltas = [];

  const result = await streamAgnesEvent(
    fetchImpl,
    state,
    [],
    "打听化神海消息",
    (text) => deltas.push(text),
  );

  assert.deepEqual(deltas, ["红月", "城外"]);
  assert.deepEqual(result, event);
});

test("streamAgnesEvent falls back to non-stream only when streaming is unavailable", async () => {
  const event = { id: "agnes-fallback-1", title: "命簿续页", choices: [] };
  const urls = [];
  const fetchImpl = async (url) => {
    urls.push(url);
    if (url === "/api/fate/stream") {
      return new Response(JSON.stringify({ error: "stream_unavailable" }), { status: 501 });
    }
    return new Response(JSON.stringify({ event }), { status: 200 });
  };

  const result = await streamAgnesEvent(fetchImpl, state, [], "", () => {});

  assert.deepEqual(urls, ["/api/fate/stream", "/api/fate"]);
  assert.deepEqual(result, event);
});

test("streamAgnesEvent returns a deterministic display-only event for raw Provider content", async () => {
  const rawContent = '<img src=x onerror="globalThis.pwned=true">红月城残页';
  let calls = 0;
  const frames = [
    `event: delta\ndata: ${JSON.stringify({ text: rawContent })}\n\n`,
    `event: complete\ndata: ${JSON.stringify({
      event: null,
      rawContent,
      structured: false,
      validationReason: "event_contract_drift",
      fallback: false,
    })}\n\n`,
  ].join("");
  const fetchImpl = async () => {
    calls += 1;
    return new Response(frames, { status: 200, headers: { "Content-Type": "text/event-stream" } });
  };

  const event = await streamAgnesEvent(fetchImpl, state, [], "", () => {});

  assert.equal(calls, 1);
  assert.equal(event.displayOnly, true);
  assert.equal(event.providerRawContent, rawContent);
  assert.doesNotMatch(event.scene, /onerror|globalThis\.pwned/);
  assert.deepEqual(event.choices.map((choice) => choice.effects), [{}, {}]);
});

test("display-only fate content cannot enter local state settlement", async () => {
  const client = await import("../public/game-client.mjs");
  assert.equal(typeof client.createDisplayOnlyFateEvent, "function");
  if (typeof client.createDisplayOnlyFateEvent !== "function") return;
  const engine = await import("../public/game-engine.mjs");
  const rawContent = "<script>改变气血与背包</script>";
  const event = client.createDisplayOnlyFateEvent(rawContent, state.meta.turn);
  const settled = engine.settleEventChoice(state, event, "stay-display-only");

  assert.equal(settled.player.resources.vitality, state.player.resources.vitality);
  assert.deepEqual(settled.player.inventory, state.player.inventory);
  assert.doesNotMatch(JSON.stringify(settled), /改变气血与背包|<script>/);
});

test("streamAgnesEvent never retries after receiving a delta without complete", async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return new Response('event: delta\ndata: {"text":"半段 token"}\n\n', {
      status: 200,
      headers: { "Content-Type": "text/event-stream" },
    });
  };

  await assert.rejects(
    () => streamAgnesEvent(fetchImpl, state, [], "", () => {}),
    (error) => error.code === "network_unavailable",
  );
  assert.equal(calls, 1);
});
