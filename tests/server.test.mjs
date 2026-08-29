import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";

import { createGameServer } from "../server.mjs";

function makeProviderEvent() {
  return {
    title: "山门夜鼓",
    scene: "红月城更鼓过三巡，一名外门弟子把沾血的腰牌塞进你的药篓。",
    canonRefs: ["红月城"],
    monthDelta: 1,
    danger: "medium",
    choices: [
      {
        id: "keep",
        tag: "risk",
        label: "收下腰牌",
        hint: "可能卷入追查",
        result: "你把腰牌压在药草最底层。",
        effects: { fortune: 2, reputation: -1 },
      },
      {
        id: "return",
        tag: "peace",
        label: "当面归还",
        hint: "表明立场",
        result: "他沉默地取回腰牌。",
        effects: { martialHeart: 1 },
      },
    ],
    worldUpdate: "红月城执法堂开始彻查失踪弟子。",
  };
}

function makeActiveDeadNpcEvent() {
  const event = makeProviderEvent();
  event.title = "故人归来";
  event.scene = "林玄推门走进红月城客栈，请你立刻随他去追查失踪弟子。";
  event.canonRefs = ["林玄", "红月城"];
  event.worldUpdate = "林玄重新出现在红月城，并开始召集旧友。";
  return event;
}

function deadNpcGame() {
  return {
    player: { name: "沈砚秋" },
    world: {
      npcs: [{
        id: "lin-xuan",
        name: "林玄",
        alive: false,
        deathCause: "寿元耗尽",
      }],
      ecologyLog: [{
        turn: 9,
        year: 1127,
        month: 9,
        type: "death",
        npcId: "lin-xuan",
        text: "林玄寿尽坐化。",
      }],
    },
  };
}

function chatResponse(content) {
  return new Response(JSON.stringify({
    id: "chatcmpl_test",
    object: "chat.completion",
    model: "agnes-2.5-flash",
    choices: [{
      index: 0,
      message: { role: "assistant", content },
      finish_reason: "stop",
    }],
  }), { status: 200, headers: { "Content-Type": "application/json" } });
}

function providerStreamResponse(content) {
  const first = content.slice(0, Math.ceil(content.length / 2));
  const second = content.slice(first.length);
  const frames = [first, second].map((text) => `data: ${JSON.stringify({
    id: "chatcmpl_test",
    object: "chat.completion.chunk",
    model: "agnes-2.5-flash",
    choices: [{ index: 0, delta: { content: text }, finish_reason: null }],
  })}\n\n`).join("") + "data: [DONE]\n\n";
  const bytes = new TextEncoder().encode(frames);
  return new Response(new ReadableStream({
    start(controller) {
      controller.enqueue(bytes.slice(0, 17));
      controller.enqueue(bytes.slice(17, 91));
      controller.enqueue(bytes.slice(91));
      controller.close();
    },
  }), { status: 200, headers: { "Content-Type": "text/event-stream" } });
}

function providerInterruptedStreamResponse(content) {
  const frame = `data: ${JSON.stringify({
    id: "chatcmpl_test",
    object: "chat.completion.chunk",
    model: "agnes-2.5-flash",
    choices: [{ index: 0, delta: { content }, finish_reason: null }],
  })}\n\n`;
  return new Response(new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(frame));
      controller.close();
    },
  }), { status: 200, headers: { "Content-Type": "text/event-stream" } });
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

test("GET /api/status reports the pinned model without exposing a key", async () => {
  await withServer({ apiKey: "secret-test-key" }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/status`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(body, {
      configured: true,
      model: "agnes-2.5-flash",
    });
    assert.doesNotMatch(JSON.stringify(body), /secret-test-key/);
  });
});

test("POST /api/fate fails closed when Agnes is not configured", async () => {
  await withServer({ apiKey: "" }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/fate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ game: { player: { name: "沈砚秋" } }, history: [] }),
    });
    const body = await response.json();

    assert.equal(response.status, 503);
    assert.equal(body.error, "agnes_not_configured");
  });
});

test("POST /api/fate validates and returns an Agnes event", async () => {
  const providerEvent = makeProviderEvent();
  const fetchImpl = async (url, request) => {
    const payload = JSON.parse(request.body);
    assert.equal(url, "https://api.agnes-ai.cn/v1/chat/completions");
    assert.equal(payload.model, "agnes-2.5-flash");
    assert.equal(payload.stream, false);
    assert.match(payload.messages[0].content, /化神海/);
    assert.deepEqual(payload.messages.map((message) => message.role), ["system", "user"]);
    assert.equal(request.headers.Authorization, "Bearer secret-test-key");
    assert.equal("x-api-key" in request.headers, false);
    assert.equal("anthropic-version" in request.headers, false);
    return chatResponse(JSON.stringify(providerEvent));
  };

  await withServer({ apiKey: "secret-test-key", fetchImpl }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/fate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ game: { player: { name: "沈砚秋" } }, history: [] }),
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.event.title, "山门夜鼓");
    assert.equal(body.event.source, "agnes");
  });
});

test("POST /api/fate preserves malformed Provider content as display-only data", async () => {
  const fetchImpl = async () => chatResponse("not-json");

  await withServer({ apiKey: "secret-test-key", fetchImpl }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/fate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ game: { player: { name: "沈砚秋" } }, history: [] }),
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.event, null);
    assert.equal(body.rawContent, "not-json");
    assert.equal(body.structured, false);
    assert.equal(body.validationReason, "event_contract_drift");
  });
});

test("POST /api/fate recovers bounded Provider syntax and effect drift without retrying", async () => {
  const providerEvent = makeProviderEvent();
  providerEvent.choices[0].effects = { hp: 4, realmExp: 35, unknownPower: 8 };
  const malformed = JSON.stringify(providerEvent).replace(
    '"effects":{"hp":4,"realmExp":35,"unknownPower":8}',
    'effects:{"hp":4,"realmExp":35,"unknownPower":8,}',
  );
  let callCount = 0;
  const fetchImpl = async () => {
    callCount += 1;
    return chatResponse(malformed);
  };

  await withServer({ apiKey: "secret-test-key", fetchImpl }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/fate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ game: { player: { name: "沈砚秋" } }, history: [] }),
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(callCount, 1);
    assert.deepEqual(body.event.choices[0].effects, { vitality: 4, cultivation: 20 });
  });
});

test("POST /api/fate rejects a length-truncated Chat response", async () => {
  const fetchImpl = async () => new Response(JSON.stringify({
    object: "chat.completion",
    model: "agnes-2.5-flash",
    choices: [{
      message: { role: "assistant", content: "{\"title\":\"未完成" },
      finish_reason: "length",
    }],
  }), { status: 200, headers: { "Content-Type": "application/json" } });

  await withServer({ apiKey: "secret-test-key", fetchImpl }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/fate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ game: { player: { name: "沈砚秋" } }, history: [] }),
    });
    const body = await response.json();

    assert.equal(response.status, 502);
    assert.deepEqual(body, { error: "provider_error" });
  });
});

test("both fate endpoints preserve a semantically unsafe event without treating it as state", async () => {
  const event = makeActiveDeadNpcEvent();
  const rawContent = JSON.stringify(event);

  await withServer({
    apiKey: "secret-test-key",
    fetchImpl: async () => chatResponse(JSON.stringify(event)),
  }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/fate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ game: deadNpcGame(), history: [] }),
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.event, null);
    assert.equal(body.rawContent, rawContent);
    assert.equal(body.structured, false);
  });

  await withServer({
    apiKey: "secret-test-key",
    fetchImpl: async () => providerStreamResponse(JSON.stringify(event)),
  }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/fate/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ game: deadNpcGame(), history: [] }),
    });
    const events = parseSseEvents(await response.text());
    assert.equal(events.some((entry) => entry.event === "error"), false);
    const complete = events.find((entry) => entry.event === "complete");
    assert.ok(complete);
    assert.equal(complete.data.event, null);
    assert.equal(complete.data.rawContent, rawContent);
    assert.equal(complete.data.structured, false);
  });
});

test("POST /api/fate/stream forwards Provider deltas and completes with a validated event", async () => {
  const providerEvent = makeProviderEvent();
  const fetchImpl = async (url, request) => {
    const payload = JSON.parse(request.body);
    assert.equal(url, "https://api.agnes-ai.cn/v1/chat/completions");
    assert.equal(payload.stream, true);
    assert.equal(request.headers.Authorization, "Bearer secret-test-key");
    return providerStreamResponse(JSON.stringify(providerEvent));
  };

  await withServer({ apiKey: "secret-test-key", fetchImpl }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/fate/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ game: { player: { name: "沈砚秋" } }, history: [] }),
    });
    const text = await response.text();

    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /^text\/event-stream/);
    assert.match(text, /event: delta/);
    assert.match(text, /event: complete/);
    assert.match(text, /"fallback":false/);
    assert.match(text, /"title":"山门夜鼓"/);
  });
});

test("POST /api/fate/stream completes a recoverable Provider event without a second request", async () => {
  const providerEvent = makeProviderEvent();
  providerEvent.choices[0].effects = { qi: 7, spiritualStones: 25 };
  const malformed = JSON.stringify(providerEvent).replace(
    '"effects":{"qi":7,"spiritualStones":25}',
    'effects:{"qi":7,"spiritualStones":25,}',
  );
  let callCount = 0;
  const fetchImpl = async () => {
    callCount += 1;
    return providerStreamResponse(malformed);
  };

  await withServer({ apiKey: "secret-test-key", fetchImpl }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/fate/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ game: { player: { name: "沈砚秋" } }, history: [] }),
    });
    const text = await response.text();

    assert.equal(callCount, 1);
    assert.match(text, /event: complete/);
    assert.match(text, /"effects":\{"spirit":7,"spiritStones":20\}/);
  });
});

test("POST /api/fate/stream completes plain text and malformed JSON as display-only content", async () => {
  for (const rawContent of [
    "红月城今夜闭门，林玄只留下一句：明日再来。",
    '{"title":"红月残页","scene":"尚未闭合"',
  ]) {
    let callCount = 0;
    await withServer({
      apiKey: "secret-test-key",
      fetchImpl: async () => {
        callCount += 1;
        return providerStreamResponse(rawContent);
      },
    }, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/fate/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game: { player: { name: "沈砚秋" } }, history: [] }),
      });
      const events = parseSseEvents(await response.text());
      const complete = events.find((entry) => entry.event === "complete");

      assert.equal(response.status, 200);
      assert.ok(events.some((entry) => entry.event === "delta"));
      assert.equal(events.some((entry) => entry.event === "error"), false);
      assert.ok(complete);
      assert.equal(complete.data.event, null);
      assert.equal(complete.data.rawContent, rawContent);
      assert.equal(complete.data.structured, false);
      assert.equal(complete.data.validationReason, "event_contract_drift");
    });
    assert.equal(callCount, 1);
  }
});

test("POST /api/fate/stream keeps Provider HTTP, timeout and interrupted transport as errors", async () => {
  const cases = [
    {
      expected: "provider_error",
      fetchImpl: async () => new Response("upstream unavailable", { status: 503 }),
    },
    {
      expected: "provider_uncertain",
      fetchImpl: async () => { throw Object.assign(new Error("timeout"), { name: "TimeoutError" }); },
    },
    {
      expected: "provider_error",
      fetchImpl: async () => providerInterruptedStreamResponse("半段已经计费的 token"),
    },
  ];

  for (const { expected, fetchImpl } of cases) {
    let callCount = 0;
    await withServer({
      apiKey: "secret-test-key",
      fetchImpl: async (...args) => {
        callCount += 1;
        return fetchImpl(...args);
      },
    }, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/fate/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game: { player: { name: "沈砚秋" } }, history: [] }),
      });
      const events = parseSseEvents(await response.text());
      assert.equal(events.some((entry) => entry.event === "complete"), false);
      assert.equal(events.find((entry) => entry.event === "error")?.data.error, expected);
    });
    assert.equal(callCount, 1);
  }
});

test("POST /api/fate/stream uses non-stream fallback only before the first Provider token", async () => {
  const providerEvent = makeProviderEvent();
  const calls = [];
  const fetchImpl = async (_url, request) => {
    const payload = JSON.parse(request.body);
    calls.push(payload.stream);
    if (payload.stream) {
      return new Response(JSON.stringify({ error: { message: "stream unsupported" } }), { status: 400 });
    }
    return chatResponse(JSON.stringify(providerEvent));
  };

  await withServer({ apiKey: "secret-test-key", fetchImpl }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/fate/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ game: { player: { name: "沈砚秋" } }, history: [] }),
    });
    const text = await response.text();

    assert.deepEqual(calls, [true, false]);
    assert.match(text, /event: complete/);
    assert.match(text, /"fallback":true/);
    assert.doesNotMatch(text, /event: delta/);
  });
});

test("GET / serves the branded accessible game shell", async () => {
  await withServer({ apiKey: "" }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/`);
    const html = await response.text();

    assert.equal(response.status, 200);
    assert.match(html, /<title>天命之外<\/title>/);
    assert.match(html, /href="#main-content"/);
  });
});

test("static game assets revalidate so local fixes are visible after reload", async () => {
  await withServer({ apiKey: "" }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/styles.css`);

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-cache");
  });
});
