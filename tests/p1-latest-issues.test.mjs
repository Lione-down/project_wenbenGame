import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import * as agnesUi from "../public/agnes-ui-state.mjs";
import {
  createNewGame,
  importGame,
  registerNpcEncounter,
} from "../public/game-engine.mjs";

const profile = {
  name: "顾临川",
  gender: "男",
  age: 18,
  birthplace: "红月城",
  background: "红月城武者世家",
  path: "快意恩仇",
  spiritRootGrade: "地灵根",
  rootPrimaryElement: "雷",
  rootSecondaryElement: "金",
  constitution: "剑骨",
  talent: "身轻如燕",
  stats: { aptitude: 10, insight: 10, soul: 10, agility: 10, martialHeart: 10, fortune: 10 },
};

const { deriveAgnesPendingUi, retryAgnesGeneration } = agnesUi;

function makeState(seed = 829) {
  return createNewGame(profile, seed);
}

function legacySeedNpc(overrides = {}) {
  return {
    id: "lin-xuan",
    name: "林玄",
    gender: "男",
    species: "人族",
    realmIndex: 0,
    stageIndex: 0,
    stage: "初期",
    cultivation: 22,
    ageMonths: 18 * 12,
    lifespan: 100,
    alive: true,
    goal: "从普通少年走出自己的武道",
    bonds: [],
    interactions: [],
    ...overrides,
  };
}

test("P1 explicit regeneration performs a second Provider request with the same action", async () => {
  const actions = [];
  const request = async (action) => {
    actions.push(action);
    return { title: `attempt-${actions.length}` };
  };

  await request("追查药箱");
  const regenerated = await retryAgnesGeneration(request, "追查药箱");

  assert.deepEqual(actions, ["追查药箱", "追查药箱"]);
  assert.equal(regenerated.title, "attempt-2");
});

test("P1 Agnes pending UI shows loading and withholds continue until streaming completes", () => {
  assert.deepEqual(
    deriveAgnesPendingUi({ isAwaiting: true, isDead: false }),
    { isLoadingVisible: true, isContinueVisible: false, loadingText: "Agnes 正在思考中" },
  );
  assert.deepEqual(
    deriveAgnesPendingUi({ isAwaiting: false, isDead: false }),
    { isLoadingVisible: false, isContinueVisible: true, loadingText: "Agnes 正在思考中" },
  );
});

test("TapTap transport diagnostics give a safe actionable recovery message", () => {
  assert.equal(typeof agnesUi.formatAgnesTransportDiagnostic, "function");
  const hostPolicy = agnesUi.formatAgnesTransportDiagnostic({
    transport: {
      channel: "tap.request",
      errno: 600002,
      reason: "host-policy",
      phase: "decision",
      stage: "bridge",
      errMsg: "request:fail url not in domain list",
      statusCode: 0,
      profile: { networkType: "wifi" },
      authorization: "Bearer must-not-be-rendered",
    },
  });
  assert.match(hostPolicy, /TAP-HOST-POLICY-600002/);
  assert.match(hostPolicy, /api\.agnes-ai\.cn/);
  assert.match(hostPolicy, /request 合法域名/);
  assert.match(hostPolicy, /阶段：bridge/);
  assert.match(hostPolicy, /networkType/);
  assert.doesNotMatch(hostPolicy, /must-not-be-rendered|Bearer/i);

  const timeout = agnesUi.formatAgnesTransportDiagnostic({
    transport: { channel: "tap.request", errno: 5, reason: "timeout", phase: "narrative" },
  });
  assert.match(timeout, /TAP-TIMEOUT-5/);
  assert.match(timeout, /不会自动重试/);
  assert.equal(agnesUi.formatAgnesTransportDiagnostic({ code: "provider_error" }), "");
});

test("P1 new games start with an empty ecology and record only settled encounters", () => {
  const state = makeState();
  assert.deepEqual(state.world.npcs, []);
  assert.deepEqual(state.world.antagonists, []);

  const met = registerNpcEncounter(state, {
    id: "merchant-qiao",
    name: "乔芷",
    gender: "女",
    species: "人族",
    realmIndex: 1,
    stageIndex: 2,
    goal: "追回被劫走的药材",
    alive: true,
  }, { eventId: "market-herb", summary: "你在坊市替她辨认了假药。" });

  assert.deepEqual(met.world.npcs.map((npc) => npc.name), ["乔芷"]);
});

test("P1 importing a current save drops untouched legacy seeds but preserves real intersections", () => {
  const state = makeState();
  state.world.npcs.push(
    legacySeedNpc(),
    legacySeedNpc({
      id: "shen-qingli",
      name: "沈青璃",
      gender: "女",
      interactions: [{ turn: 2, year: 1127, month: 1, day: 8, eventId: "snow-road", context: "current", summary: "你们在雪路共同避过伏击。" }],
    }),
  );

  const imported = importGame(JSON.stringify(state));
  assert.deepEqual(imported.world.npcs.map((npc) => npc.name), ["沈青璃"]);
});

test("P1 entry points use a fresh cache key and never say Agnes is extending this month", async () => {
  for (const path of ["index.html", "public/index.html"]) {
    const html = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
    assert.match(html, /20260830-p1b/);
    assert.match(html, /Agnes 正在思考中/);
    assert.doesNotMatch(html, /Agnes 正在续写这一月/);
  }

  const app = await readFile(new URL("../public/app.mjs", import.meta.url), "utf8");
  assert.match(app, /retryAgnesGeneration/);
  assert.match(app, /deriveAgnesPendingUi/);
  assert.doesNotMatch(app, /location\.reload/);
});
