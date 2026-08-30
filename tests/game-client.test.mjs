import test from "node:test";
import assert from "node:assert/strict";

import {
  SAVE_KEY,
  configurePlayerAgnesDirect,
  loadLocalGame,
  requestAgnesResolution,
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

test("streamAgnesEvent consumes one JSON response without token streaming", async () => {
  const event = { id: "agnes-stream-1", title: "红月问途", choices: [] };
  const fetchImpl = async (url, request) => {
    assert.equal(url, "/api/agent/stream");
    assert.equal(request.headers.Accept, "application/json");
    assert.equal(JSON.parse(request.body).action, "打听化神海消息");
    return new Response(JSON.stringify({ event, fallback: false }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  const deltas = [];

  const result = await streamAgnesEvent(
    fetchImpl,
    state,
    [],
    "打听化神海消息",
    (text) => deltas.push(text),
  );

  assert.deepEqual(deltas, []);
  assert.deepEqual(result, event);
});

test("streamAgnesEvent never falls back to the legacy fate endpoint", async () => {
  const urls = [];
  const fetchImpl = async (url) => {
    urls.push(url);
    return new Response(JSON.stringify({ error: "stream_unavailable" }), { status: 501 });
  };

  await assert.rejects(
    () => streamAgnesEvent(fetchImpl, state, [], "", () => {}),
    (error) => error.code === "stream_unavailable" && error.status === 501,
  );
  assert.deepEqual(urls, ["/api/agent/stream"]);
});

test("streamAgnesEvent returns a deterministic display-only event for raw Provider content", async () => {
  const rawContent = '<img src=x onerror="globalThis.pwned=true">红月城残页';
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return new Response(JSON.stringify({
      event: null,
      rawContent,
      structured: false,
      validationReason: "event_contract_drift",
      fallback: false,
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  const event = await streamAgnesEvent(fetchImpl, state, [], "", () => {});

  assert.equal(calls, 1);
  assert.equal(event.displayOnly, true);
  assert.equal(event.providerRawContent, rawContent);
  assert.doesNotMatch(event.scene, /onerror|globalThis\.pwned/);
  assert.deepEqual(event.choices.map((choice) => choice.id), [
    "retry-agnes-generation", "use-offline-engine", "stay-display-only",
  ]);
  assert.deepEqual(event.choices.map((choice) => choice.effects), [{}, {}, {}]);
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

test("streamAgnesEvent never retries after receiving malformed JSON", async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return new Response('{"event":', {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  await assert.rejects(
    () => streamAgnesEvent(fetchImpl, state, [], "", () => {}),
    (error) => error.code === "provider_error",
  );
  assert.equal(calls, 1);
});

test("player-key direct mode forwards the explicit H5 transport policy", async () => {
  const transportOptions = [];
  const module = {
    async streamPlayerAgentTurn(...args) {
      transportOptions.push(args.at(-1));
      return { event: { id: "h5-event", title: "H5 命途", choices: [] }, rawContent: "正文" };
    },
    async streamPlayerAgnesResolution(...args) {
      transportOptions.push(args.at(-1));
      return { resolution: { narrative: "完成" }, rawContent: "完成", structured: true };
    },
  };
  const pendingState = structuredClone(state);
  pendingState.meta.pendingResolution = { id: "h5-resolution" };
  configurePlayerAgnesDirect(module, "fixture-key", { transportPolicy: "browser-fetch" });
  try {
    await streamAgnesEvent(async () => Response.json({}), state, [], "继续", () => {});
    await requestAgnesResolution(async () => Response.json({}), pendingState, () => {});
    assert.deepEqual(transportOptions, [
      { transportPolicy: "browser-fetch" },
      { transportPolicy: "browser-fetch" },
    ]);
  } finally {
    configurePlayerAgnesDirect(null, "");
  }
});
