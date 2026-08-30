import test from "node:test";
import assert from "node:assert/strict";

import { AgnesProvider } from "../lib/agnes-provider.mjs";
import { runDecisionToolLoop } from "../lib/agent-runtime.mjs";
import { buildTurnContext } from "../public/context-builder.mjs";
import { selectToolsForAction } from "../public/agent-tools.mjs";
import { createNewGame } from "../public/game-engine.mjs";

function jsonResponse(body) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function sseResponse(frames) {
  const encoder = new TextEncoder();
  return new Response(new ReadableStream({
    start(controller) {
      for (const frame of frames) controller.enqueue(encoder.encode(`data: ${frame}\n\n`));
      controller.close();
    },
  }), { status: 200, headers: { "Content-Type": "text/event-stream" } });
}

function makeState(seed = 830) {
  return createNewGame({
    name: "顾临川", gender: "男", age: 18, birthplace: "红月城", background: "红月城武者世家",
    path: "快意恩仇", spiritRootGrade: "地灵根", rootPrimaryElement: "雷", rootSecondaryElement: "金",
    constitution: "剑骨", talent: "身轻如燕",
    stats: { aptitude: 10, insight: 10, soul: 10, agility: 10, martialHeart: 10, fortune: 10 },
  }, seed);
}

test("P1-A AgnesProvider sends one non-streaming Chat Completions decision with native tools", async () => {
  const requests = [];
  const provider = new AgnesProvider({
    endpoint: "https://api.agnes-ai.cn/v1/chat/completions",
    apiKey: "fixture-key",
    fetchImpl: async (url, init) => {
      requests.push({ url, init, body: JSON.parse(init.body) });
      return jsonResponse({
        model: "agnes-2.5-flash",
        choices: [{
          finish_reason: "tool_calls",
          message: {
            role: "assistant",
            content: null,
            tool_calls: [{ id: "call_1", type: "function", function: { name: "get_player_state", arguments: "{}" } }],
          },
        }],
        usage: { prompt_tokens: 1200, completion_tokens: 42, total_tokens: 1242 },
      });
    },
  });
  const tools = selectToolsForAction("查看当前状态");
  const completion = await provider.completeDecision({
    messages: [{ role: "user", content: "查看当前状态" }],
    tools,
    enableThinking: false,
  });

  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, "https://api.agnes-ai.cn/v1/chat/completions");
  assert.equal(requests[0].body.model, "agnes-2.5-flash");
  assert.equal(requests[0].body.stream, false);
  assert.equal(requests[0].body.tool_choice, "auto");
  assert.ok(requests[0].body.tools.length > 0);
  assert.equal(requests[0].body.chat_template_kwargs, undefined);
  assert.equal(completion.toolCalls[0].name, "get_player_state");
  assert.deepEqual(completion.toolCalls[0].arguments, {});
  assert.equal(completion.usage.totalTokens, 1242);
});

test("P1-A Narrative streams settled facts without exposing tools", async () => {
  const requests = [];
  const provider = new AgnesProvider({
    endpoint: "https://api.agnes-ai.cn/v1/chat/completions",
    apiKey: "fixture-key",
    fetchImpl: async (url, init) => {
      requests.push(JSON.parse(init.body));
      return sseResponse([
        JSON.stringify({ model: "agnes-2.5-flash", choices: [{ delta: { content: "雨幕" }, finish_reason: null }] }),
        JSON.stringify({ model: "agnes-2.5-flash", choices: [{ delta: { content: "落下。" }, finish_reason: "stop" }], usage: { prompt_tokens: 800, completion_tokens: 6, total_tokens: 806 } }),
        "[DONE]",
      ]);
    },
  });
  let visible = "";
  const result = await provider.streamNarrative({
    messages: [{ role: "user", content: "只描写已结算结果" }],
    onDelta(delta) { visible += delta; },
  });

  assert.equal(visible, "雨幕落下。");
  assert.equal(result.content, "雨幕落下。");
  assert.equal(requests[0].stream, true);
  assert.equal(Object.hasOwn(requests[0], "tools"), false);
  assert.equal(Object.hasOwn(requests[0], "tool_choice"), false);
});

test("P1-A player-key Narrative uses one JSON completion when SSE transport is unavailable", async () => {
  const requests = [];
  const provider = new AgnesProvider({
    endpoint: "https://api.agnes-ai.cn/v1/chat/completions",
    apiKey: "fixture-key",
    narrativeResponseMode: "json",
    fetchImpl: async (_url, init) => {
      requests.push(JSON.parse(init.body));
      return jsonResponse({
        model: "agnes-2.5-flash",
        choices: [{
          finish_reason: "stop",
          message: { role: "assistant", content: "雨幕落下。" },
        }],
        usage: { prompt_tokens: 800, completion_tokens: 6, total_tokens: 806 },
      });
    },
  });
  const deltas = [];
  const result = await provider.streamNarrative({
    messages: [{ role: "user", content: "只描写已结算结果" }],
    onDelta(delta) { deltas.push(delta); },
  });

  assert.equal(requests.length, 1);
  assert.equal(requests[0].stream, false);
  assert.equal(Object.hasOwn(requests[0], "tools"), false);
  assert.deepEqual(deltas, ["雨幕落下。"]);
  assert.equal(result.content, "雨幕落下。");
});

test("P1-A Decision loop executes native tool calls and stops after a tool-free assistant turn", async () => {
  const calls = [];
  const provider = {
    async completeDecision({ messages }) {
      const toolMessages = messages.filter((message) => message.role === "tool");
      if (toolMessages.length === 0) {
        return {
          content: "",
          finishReason: "tool_calls",
          toolCalls: [{ id: "call_state", name: "get_player_state", arguments: {} }],
          usage: { promptTokens: 10, completionTokens: 2, totalTokens: 12 },
        };
      }
      return {
        content: "状态已确认",
        finishReason: "stop",
        toolCalls: [],
        usage: { promptTokens: 12, completionTokens: 3, totalTokens: 15 },
      };
    },
  };
  const result = await runDecisionToolLoop({
    provider,
    messages: [{ role: "user", content: "查看状态" }],
    tools: selectToolsForAction("查看状态"),
    async executeTool(call) {
      calls.push(call.name);
      return { realm: "凡人·初期" };
    },
  });

  assert.deepEqual(calls, ["get_player_state"]);
  assert.equal(result.rounds, 1);
  assert.equal(result.content, "状态已确认");
  assert.equal(result.messages.at(-1).role, "assistant");
  assert.equal(result.usage.totalTokens, 27);
});

test("P1-A Decision loop fails closed after four tool rounds", async () => {
  const provider = {
    async completeDecision() {
      return {
        content: "",
        finishReason: "tool_calls",
        toolCalls: [{ id: crypto.randomUUID(), name: "get_world_state", arguments: {} }],
        usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
      };
    },
  };
  await assert.rejects(
    runDecisionToolLoop({
      provider,
      messages: [{ role: "user", content: "无限查询" }],
      tools: selectToolsForAction("无限查询"),
      executeTool: async () => ({}),
    }),
    /tool_round_limit/,
  );
});

test("P1-A tool registry narrows cultivation and investigation turns", () => {
  const cultivation = selectToolsForAction("闭关三个月").map((tool) => tool.function.name);
  assert.ok(cultivation.includes("get_player_state"));
  assert.ok(cultivation.includes("resolve_cultivation"));
  assert.equal(cultivation.includes("advance_time"), false);
  assert.equal(cultivation.includes("resolve_combat"), false);

  const combat = selectToolsForAction("迎战妖兽").map((tool) => tool.function.name);
  assert.ok(combat.includes("resolve_combat"));
  assert.equal(combat.includes("advance_time"), false);

  const travel = selectToolsForAction("前往北境荒原").map((tool) => tool.function.name);
  assert.ok(travel.includes("resolve_travel"));
  assert.equal(travel.includes("advance_time"), false);

  const investigation = selectToolsForAction("调查古天河是不是在骗我").map((tool) => tool.function.name);
  assert.ok(investigation.includes("get_npc_state"));
  assert.ok(investigation.includes("get_npc_knowledge"));
  assert.ok(investigation.includes("search_memory"));
  assert.equal(investigation.includes("resolve_cultivation"), false);
});

test("P1-A ContextBuilder keeps recent work bounded instead of replaying full history", () => {
  const state = makeState();
  state.chronicle = Array.from({ length: 1000 }, (_, index) => ({
    year: 1127 + Math.floor(index / 12),
    month: index % 12 + 1,
    age: 18 + Math.floor(index / 12),
    eventTitle: `事件${index}`,
    result: `结果${index}`,
  }));
  const context = buildTurnContext(state, {
    playerInput: "继续调查",
    memories: Array.from({ length: 40 }, (_, index) => ({ id: `mem-${index}`, importance: index / 40, summary: `记忆${index}` })),
    worldKnowledge: Array.from({ length: 40 }, (_, index) => ({ id: `world-${index}`, summary: `知识${index}` })),
  });

  assert.equal(context.recentEvents.length, 10);
  assert.ok(context.memories.length <= 8);
  assert.ok(context.worldKnowledge.length <= 8);
  assert.equal(JSON.stringify(context).includes("事件0"), false);
  assert.equal(context.playerInput, "继续调查");
});
