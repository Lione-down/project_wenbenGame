import test from "node:test";
import assert from "node:assert/strict";

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
  assert.equal(result.connected, true);
  assert.equal(result.model, "agnes-2.5-flash");
  assert.equal(result.transport.name, "browser.fetch");
});

test("connection test accepts a compatible Provider model alias", async () => {
  const module = await loadPlayerAgnesModule();
  const result = await module.testPlayerAgnesConnection(async () => Response.json({
    model: "agnes-2.5-flash-202608",
    choices: [{ finish_reason: "stop", message: { role: "assistant", content: "好" } }],
  }), fakeKey);

  assert.equal(result.connected, true);
  assert.equal(result.model, "agnes-2.5-flash-202608");
});

test("legacy direct ReadableStream event entry is disabled", async () => {
  const module = await loadPlayerAgnesModule();
  assert.equal(module.streamPlayerAgnesEvent, undefined);
});

test("TapTap bridge absence fails closed without browser fetch fallback", async () => {
  const module = await loadPlayerAgnesModule();
  const previousTap = globalThis.tap;
  let browserFetchCalls = 0;
  globalThis.tap = {};

  try {
    await assert.rejects(
      () => module.testPlayerAgnesConnection(async () => {
        browserFetchCalls += 1;
        throw new Error("browser_fetch_must_not_run_in_taptap");
      }, fakeKey),
      (error) => error.code === "network_unavailable"
        && error.transport?.name === "tap.request"
        && error.transport?.stage === "bridge",
    );
    assert.equal(browserFetchCalls, 0);
  } finally {
    if (previousTap === undefined) delete globalThis.tap;
    else globalThis.tap = previousTap;
  }
});

test("explicit TapTap minimum test fails at bridge outside TapTap", async () => {
  const module = await loadPlayerAgnesModule();
  const previousTap = globalThis.tap;
  let browserFetchCalls = 0;
  delete globalThis.tap;

  try {
    await assert.rejects(
      () => module.testPlayerAgnesConnection(async () => {
        browserFetchCalls += 1;
        return Response.json({});
      }, fakeKey, { requireTapRequest: true }),
      (error) => error.transport?.stage === "bridge",
    );
    assert.equal(browserFetchCalls, 0);
  } finally {
    if (previousTap !== undefined) globalThis.tap = previousTap;
  }
});

test("TapTap H5 policy uses browser fetch when the host has no request bridge", async () => {
  const module = await loadPlayerAgnesModule();
  const previousTap = globalThis.tap;
  let browserFetchCalls = 0;
  globalThis.tap = {};
  try {
    const result = await module.testPlayerAgnesConnection(async () => {
      browserFetchCalls += 1;
      return Response.json({
        model: "agnes-2.5-flash",
        choices: [{ finish_reason: "stop", message: { role: "assistant", content: "好" } }],
      });
    }, fakeKey, { transportPolicy: "browser-fetch" });

    assert.equal(browserFetchCalls, 1);
    assert.equal(result.transport.name, "browser.fetch");
  } finally {
    if (previousTap === undefined) delete globalThis.tap;
    else globalThis.tap = previousTap;
  }
});

test("TapTap H5 policy stays on browser fetch even when tap.request exists", async () => {
  const module = await loadPlayerAgnesModule();
  const previousTap = globalThis.tap;
  let nativeCalls = 0;
  let browserFetchCalls = 0;
  globalThis.tap = {
    request() {
      nativeCalls += 1;
      throw new Error("tap_request_must_not_run_for_h5_policy");
    },
  };
  try {
    const result = await module.testPlayerAgnesConnection(async () => {
      browserFetchCalls += 1;
      return Response.json({
        model: "agnes-2.5-flash",
        choices: [{ finish_reason: "stop", message: { role: "assistant", content: "好" } }],
      });
    }, fakeKey, { transportPolicy: "browser-fetch" });

    assert.equal(browserFetchCalls, 1);
    assert.equal(nativeCalls, 0);
    assert.equal(result.transport.name, "browser.fetch");
  } finally {
    if (previousTap === undefined) delete globalThis.tap;
    else globalThis.tap = previousTap;
  }
});

test("direct player-key resolution uses one JSON request behind the strict contract", async () => {
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
  let requestPayload;
  const result = await module.streamPlayerAgnesResolution(
    async (_url, request) => {
      calls += 1;
      requestPayload = JSON.parse(request.body);
      return Response.json({
        model: "agnes-2.5-flash",
        choices: [{
          finish_reason: "stop",
          message: { role: "assistant", content: JSON.stringify(validResolution()) },
        }],
      });
    },
    fakeKey,
    state,
    () => {},
  );

  assert.equal(calls, 1);
  assert.equal(requestPayload.stream, false);
  assert.equal(result.structured, true);
  assert.deepEqual(result.resolution, validResolution());
});

test("TapTap player-key resolution prefers tap.request over browser fetch", async () => {
  const module = await loadPlayerAgnesModule();
  const state = playerState();
  state.meta.pendingResolution = {
    id: "pending-taptap-native-request",
    turn: 1,
    event: { id: "opening", kind: "story", title: "灵根初鸣", scene: "验收场景", source: "offline" },
    choice: { id: "confirm", label: "确认印记" },
    localOutcome: { status: "settled", summary: "本地结算已经完成。", stateDelta: { insight: 1 } },
    worldUpdate: "红月城的验印石恢复平静。",
  };
  const previousTap = globalThis.tap;
  let nativeCalls = 0;
  let browserFetchCalls = 0;
  let nativePayload;
  globalThis.tap = {
    request(options) {
      nativeCalls += 1;
      nativePayload = JSON.parse(options.data);
      options.success({
        statusCode: 200,
        data: {
          model: "agnes-2.5-flash",
          choices: [{
            finish_reason: "stop",
            message: { role: "assistant", content: JSON.stringify(validResolution()) },
          }],
        },
        header: { "content-type": "application/json" },
      });
    },
  };

  try {
    const result = await module.streamPlayerAgnesResolution(
      async () => {
        browserFetchCalls += 1;
        throw new Error("browser_fetch_must_not_run_in_taptap");
      },
      fakeKey,
      state,
      () => {},
    );

    assert.equal(nativeCalls, 1);
    assert.equal(browserFetchCalls, 0);
    assert.equal(nativePayload.stream, false);
    assert.equal(result.structured, true);
  } finally {
    if (previousTap === undefined) delete globalThis.tap;
    else globalThis.tap = previousTap;
  }
});

test("TapTap connection timeout preserves a safe transport diagnostic", async () => {
  const module = await loadPlayerAgnesModule();
  const previousTap = globalThis.tap;
  globalThis.tap = {
    request(options) {
      options.fail({
        errno: 5,
        errMsg: `request:fail timeout Bearer ${fakeKey}`,
        statusCode: 0,
        profile: { networkType: "wifi", credential: fakeKey },
      });
    },
  };

  try {
    await assert.rejects(
      () => module.testPlayerAgnesConnection(
        async () => { throw new Error("browser_fetch_must_not_run_in_taptap"); },
        fakeKey,
      ),
      (error) => {
        assert.equal(error.code, "provider_uncertain");
        assert.equal(error.transport.channel, "tap.request");
        assert.equal(error.transport.name, "tap.request");
        assert.equal(error.transport.errno, 5);
        assert.equal(error.transport.reason, "timeout");
        assert.equal(error.transport.phase, "connection-test");
        assert.equal(error.transport.stage, "HTTP");
        assert.equal(error.transport.statusCode, 0);
        assert.equal(error.transport.profile.networkType, "wifi");
        assert.match(error.transport.errMsg, /\[REDACTED\]/);
        assert.equal(error.transport.profile.credential, "[REDACTED]");
        assert.doesNotMatch(JSON.stringify(error.transport), new RegExp(fakeKey, "i"));
        return true;
      },
    );
  } finally {
    if (previousTap === undefined) delete globalThis.tap;
    else globalThis.tap = previousTap;
  }
});

for (const [label, errMsg, stage] of [
  ["DNS", "request:fail DNS lookup failed", "DNS"],
  ["TLS", "request:fail TLS certificate invalid", "TLS"],
]) {
  test(`TapTap connection identifies the ${label} failure stage`, async () => {
    const module = await loadPlayerAgnesModule();
    const previousTap = globalThis.tap;
    globalThis.tap = { request(options) { options.fail({ errno: 7, errMsg }); } };
    try {
      await assert.rejects(
        () => module.testPlayerAgnesConnection(async () => Response.json({}), fakeKey),
        (error) => error.transport?.stage === stage && error.transport?.errMsg === errMsg,
      );
    } finally {
      if (previousTap === undefined) delete globalThis.tap;
      else globalThis.tap = previousTap;
    }
  });
}

test("TapTap Agent failure preserves a safe host-policy diagnostic", async () => {
  const module = await loadPlayerAgnesModule();
  const previousTap = globalThis.tap;
  globalThis.tap = {
    request(options) {
      options.fail({ errno: 600002, errMsg: "request:fail url not in domain list" });
    },
  };

  try {
    await assert.rejects(
      () => module.streamPlayerAgentTurn(
        async () => { throw new Error("browser_fetch_must_not_run_in_taptap"); },
        fakeKey,
        playerState(),
        [],
        "继续命途",
        () => {},
      ),
      (error) => {
        assert.equal(error.code, "network_unavailable");
        assert.equal(error.transport.channel, "tap.request");
        assert.equal(error.transport.errno, 600002);
        assert.equal(error.transport.reason, "host-policy");
        assert.equal(error.transport.phase, "decision");
        assert.equal(error.transport.stage, "bridge");
        assert.doesNotMatch(JSON.stringify(error.transport), new RegExp(fakeKey, "i"));
        return true;
      },
    );
  } finally {
    if (previousTap === undefined) delete globalThis.tap;
    else globalThis.tap = previousTap;
  }
});

test("direct Provider authentication failure is classified without retry", async () => {
  const module = await loadPlayerAgnesModule();
  let calls = 0;
  await assert.rejects(
    module.testPlayerAgnesConnection(async () => {
      calls += 1;
      return Response.json({ error: { message: "denied" } }, { status: 401 });
    }, fakeKey),
    (error) => error.code === "authentication"
      && error.status === 401
      && error.transport?.stage === "auth"
      && error.transport?.name === "browser.fetch",
  );
  assert.equal(calls, 1);
});

test("TapTap HTTP response preserves statusCode and profile", async () => {
  const module = await loadPlayerAgnesModule();
  const previousTap = globalThis.tap;
  globalThis.tap = {
    request(options) {
      options.success({
        statusCode: 403,
        errMsg: "request:ok",
        profile: { route: "edge-shanghai" },
        data: { error: { message: "denied" } },
      });
    },
  };
  try {
    await assert.rejects(
      () => module.testPlayerAgnesConnection(async () => Response.json({}), fakeKey),
      (error) => error.code === "authentication"
        && error.transport?.stage === "auth"
        && error.transport?.statusCode === 403
        && error.transport?.errMsg === "request:ok"
        && error.transport?.profile?.route === "edge-shanghai",
    );
  } finally {
    if (previousTap === undefined) delete globalThis.tap;
    else globalThis.tap = previousTap;
  }
});

test("connection test distinguishes response parsing from model contract", async () => {
  const module = await loadPlayerAgnesModule();
  await assert.rejects(
    () => module.testPlayerAgnesConnection(async () => new Response("not-json", { status: 200 }), fakeKey),
    (error) => error.transport?.stage === "response-parse",
  );
  await assert.rejects(
    () => module.testPlayerAgnesConnection(async () => Response.json({ model: "agnes-compatible", choices: [] }), fakeKey),
    (error) => error.transport?.stage === "model-contract",
  );
});
