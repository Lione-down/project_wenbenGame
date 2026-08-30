import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";

import { createNewGame } from "../public/game-engine.mjs";
import { runEventAgentTurn } from "../public/game-agent-runtime.mjs";
import { createGameServer } from "../server.mjs";

function makeGame() {
  return createNewGame({
    name: "沈砚",
    gender: "男",
    age: 18,
    birthplace: "北境荒村",
    background: "山野遗孤",
    path: "问道飞升",
    spiritRootGrade: "天灵根",
    rootPrimaryElement: "雷",
    rootSecondaryElement: "",
    constitution: "凡体",
    talent: "心志坚韧",
    stats: { aptitude: 10, insight: 10, soul: 10, agility: 10, martialHeart: 10, fortune: 10 },
  });
}

test("P1-A event turn commits a local authoritative event before narrative streaming", async () => {
  const provider = {
    decisionCalls: 0,
    narrativeMessages: null,
    async completeDecision() {
      this.decisionCalls += 1;
      if (this.decisionCalls === 1) {
        return {
          content: "",
          toolCalls: [{ id: "call-1", name: "resolve_random_event", arguments: { activity: "主线" } }],
          usage: { promptTokens: 10, completionTokens: 2, totalTokens: 12 },
        };
      }
      return { content: "已取得本地判定", toolCalls: [], usage: {} };
    },
    async streamNarrative({ messages, onDelta }) {
      this.narrativeMessages = messages;
      onDelta("山雨将至。");
      return { content: "山雨将至。", usage: { promptTokens: 5, completionTokens: 4, totalTokens: 9 } };
    },
  };

  const result = await runEventAgentTurn({ provider, gameState: makeGame(), onDelta() {} });

  assert.equal(provider.decisionCalls, 2);
  assert.ok(result.event.title);
  assert.ok(result.event.choices.length >= 2);
  assert.equal(result.event.scene, "山雨将至。");
  assert.equal(result.rawContent, "山雨将至。");
  assert.equal(result.structured, true);
  assert.match(JSON.stringify(provider.narrativeMessages), /已由本地规则确定/);
  assert.match(JSON.stringify(provider.narrativeMessages), new RegExp(result.event.title));
});

test("P1-A narrative cannot replace locally authoritative choices or effects", async () => {
  const provider = {
    async completeDecision() {
      return {
        content: "",
        toolCalls: [{ id: "call-1", name: "resolve_random_event", arguments: {} }],
        usage: {},
      };
    },
    async streamNarrative() {
      return {
        content: JSON.stringify({ title: "伪造事件", choices: [{ id: "hack", effects: { spiritStones: 999999 } }] }),
        usage: {},
      };
    },
  };
  let calls = 0;
  provider.completeDecision = async () => {
    calls += 1;
    return calls === 1
      ? { content: "", toolCalls: [{ id: "call-1", name: "resolve_random_event", arguments: {} }], usage: {} }
      : { content: "完成", toolCalls: [], usage: {} };
  };

  const result = await runEventAgentTurn({ provider, gameState: makeGame() });

  assert.notEqual(result.event.title, "伪造事件");
  assert.ok(result.event.choices.every((choice) => choice.id !== "hack"));
  assert.equal(result.event.scene, providerResultText(provider));
});

test("P1-A event turn fails closed when Decision never invokes an authoritative tool", async () => {
  const provider = {
    async completeDecision() {
      return { content: "我自行决定剧情", toolCalls: [], usage: {} };
    },
    async streamNarrative() {
      throw new Error("narrative_must_not_run");
    },
  };

  await assert.rejects(
    () => runEventAgentTurn({ provider, gameState: makeGame() }),
    /authoritative_turn_result_required/,
  );
});

function providerResultText(provider) {
  return JSON.stringify({ title: "伪造事件", choices: [{ id: "hack", effects: { spiritStones: 999999 } }] });
}

function completion(message) {
  return new Response(JSON.stringify({
    model: "agnes-2.5-flash",
    choices: [{ message: { role: "assistant", ...message }, finish_reason: "stop" }],
  }), { status: 200, headers: { "Content-Type": "application/json" } });
}

test("P1-A /api/agent/stream uses JSON Decision and Narrative responses", async () => {
  const payloads = [];
  const fetchImpl = async (_url, request) => {
    const payload = JSON.parse(request.body);
    payloads.push(payload);
    if (payloads.length === 1) {
      return completion({
        content: null,
        tool_calls: [{
          id: "call-1",
          type: "function",
          function: { name: "resolve_random_event", arguments: "{}" },
        }],
      });
    }
    if (payloads.length === 2) return completion({ content: "本地事实已取得" });
    return completion({ content: "风过碑林，旧痕无声显露。" });
  };
  const server = createGameServer({ apiKey: "test-only", fetchImpl });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/agent/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ game: makeGame(), history: [], action: "" }),
    });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /application\/json/);
    assert.equal(payloads.length, 3);
    assert.deepEqual(payloads.map((payload) => payload.stream), [false, false, false]);
    assert.ok(payloads[0].tools.some((tool) => tool.function.name === "resolve_random_event"));
    assert.equal("tools" in payloads[2], false);
    assert.match(body.event.scene, /风过碑林/);
    assert.equal(body.fallback, false);
  } finally {
    server.close();
    await once(server, "close");
  }
});
