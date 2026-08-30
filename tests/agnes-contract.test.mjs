import test from "node:test";
import assert from "node:assert/strict";

import {
  AGNES_BASE_URL,
  AGNES_CHAT_COMPLETIONS_URL,
  buildAgnesPayload,
  classifyProviderFailure,
  extractChatCompletionText,
  parseAgnesEvent,
  parseAgnesEventWithRecovery,
} from "../lib/agnes-contract.mjs";

const validEvent = {
  title: "雨夜问剑",
  scene: "红月城外的破庙檐下，一名负伤剑客用半卷剑谱换一夜庇护。",
  canonRefs: ["红月城"],
  monthDelta: 1,
  danger: "medium",
  choices: [
    {
      id: "shelter",
      tag: "opportunity",
      label: "让他留下",
      hint: "可能招来追兵",
      result: "你替他掩去了血迹。",
      effects: { martialHeart: 2, fortune: -1 },
    },
    {
      id: "refuse",
      tag: "peace",
      label: "闭门不见",
      hint: "保全自身",
      result: "雨声吞没了他的脚步。",
      effects: { reputation: -1 },
    },
  ],
  worldUpdate: "一名无名剑客离开北境。",
};

test("OpenAI compatible contract pins the base URL and chat endpoint", () => {
  assert.equal(AGNES_BASE_URL, "https://api.agnes-ai.cn/v1");
  assert.equal(AGNES_CHAT_COMPLETIONS_URL, "https://api.agnes-ai.cn/v1/chat/completions");
});

test("compatible response model aliases do not fail an otherwise valid completion", () => {
  assert.equal(extractChatCompletionText({
    model: "agnes-2.5-flash-202608",
    choices: [{ finish_reason: "stop", message: { role: "assistant", content: "好" } }],
  }), "好");
});

test("buildAgnesPayload uses the OpenAI Chat request shape and configurable stream flag", () => {
  const payload = buildAgnesPayload({ player: { name: "顾长离" } }, [], "", { stream: true });

  assert.equal(payload.model, "agnes-2.5-flash");
  assert.equal(payload.max_tokens, 4096);
  assert.equal(payload.stream, true);
  assert.ok(Array.isArray(payload.messages));
  assert.deepEqual(payload.messages.map((message) => message.role), ["system", "user"]);
  assert.equal(typeof payload.messages[0].content, "string");
  assert.equal("response_format" in payload, false);
});

test("buildAgnesPayload carries the authoritative turn rules, world canon and free action", () => {
  const payload = buildAgnesPayload(
    { player: { name: "顾长离", realm: "武徒" } },
    [],
    "我想夜探红月城商会",
  );
  const systemPrompt = payload.messages[0].content;
  const userPrompt = JSON.parse(payload.messages[1].content);

  assert.match(systemPrompt, /李云霄/);
  assert.match(systemPrompt, /化神海/);
  assert.match(systemPrompt, /红月城/);
  assert.match(systemPrompt, /天盟/);
  assert.match(systemPrompt, /《大衍神诀》/);
  assert.match(systemPrompt, /玩家不得替代/);
  assert.match(systemPrompt, /一个回合只推进一个月/);
  assert.match(systemPrompt, /玩家自由行动/);
  assert.match(systemPrompt, /aptitude、insight、soul、agility、martialHeart、fortune、vitality、spirit、wound、cultivation、spiritStones、merit、karma、reputation、lifespan/);
  assert.match(systemPrompt, /"canonRefs":\["红月城"\]/);
  assert.match(systemPrompt, /"danger":"medium"/);
  assert.match(systemPrompt, /choice\.id 必须是字符串/);
  assert.match(systemPrompt, /choices 必须包含 2 至 4 项/);
  assert.match(systemPrompt, /scene 不超过 72 个字/);
  assert.doesNotMatch(systemPrompt, /青云宗|顾清玄/);
  assert.equal(userPrompt.playerAction, "我想夜探红月城商会");
  assert.ok(payload.temperature <= 0.4);
  assert.ok(payload.max_tokens >= 1800);
});

test("extractChatCompletionText reads a complete OpenAI Chat response", () => {
  const text = extractChatCompletionText({
    id: "chatcmpl_test",
    object: "chat.completion",
    model: "agnes-2.5-flash",
    choices: [
      {
        index: 0,
        message: { role: "assistant", content: "完整事件" },
        finish_reason: "stop",
      },
    ],
  });

  assert.equal(text, "完整事件");
});

test("extractChatCompletionText fails closed for truncated or empty Chat responses", () => {
  assert.throws(() => extractChatCompletionText({
    object: "chat.completion",
    model: "agnes-2.5-flash",
    choices: [{ message: { role: "assistant", content: "半截输出" }, finish_reason: "length" }],
  }), /length/);

  assert.throws(() => extractChatCompletionText({
    object: "chat.completion",
    model: "agnes-2.5-flash",
    choices: [{ message: { role: "assistant", content: "" }, finish_reason: "stop" }],
  }), /content/);
});

test("parseAgnesEvent accepts a valid plain JSON event", () => {
  const parsed = parseAgnesEvent(JSON.stringify(validEvent));

  assert.equal(parsed.title, "雨夜问剑");
  assert.equal(parsed.choices.length, 2);
});

test("parseAgnesEvent repairs repeated or invented claims from known narrative references", () => {
  const noisy = structuredClone(validEvent);
  noisy.canonRefs = ["红月城", "红月城", "玄天神朝"];

  const parsed = parseAgnesEvent(JSON.stringify(noisy));

  assert.deepEqual(parsed.canonRefs, ["红月城"]);
});

test("parseAgnesEvent accepts a fenced JSON event", () => {
  const parsed = parseAgnesEvent(`\`\`\`json\n${JSON.stringify(validEvent)}\n\`\`\``);

  assert.equal(parsed.worldUpdate, "一名无名剑客离开北境。");
});

test("parseAgnesEvent derives known canon references and rejects a wholly disconnected world", () => {
  const parsed = parseAgnesEvent(JSON.stringify(validEvent));
  assert.deepEqual(parsed.canonRefs, ["红月城"]);

  const invented = structuredClone(validEvent);
  invented.scene = "玄天神朝外的陌生荒寺中，有人递来一枚无名玉简。";
  invented.worldUpdate = "玄天神朝开始封锁荒寺。";
  invented.choices[0].result = "你收下了那枚玉简。";
  invented.choices[1].result = "你转身离开荒寺。";
  invented.canonRefs = ["玄天神朝"];
  assert.throws(() => parseAgnesEvent(JSON.stringify(invented)), /canonRefs/);

  const disconnected = structuredClone(validEvent);
  disconnected.canonRefs = ["化神海"];
  assert.deepEqual(parseAgnesEvent(JSON.stringify(disconnected)).canonRefs, ["红月城"]);
});

test("parseAgnesEvent accepts narrative references already present in the bounded player snapshot", () => {
  const localEvent = structuredClone(validEvent);
  localEvent.title = "枯井药香";
  localEvent.scene = "北境边城的枯井旁，残缺阵纹与《残卷药理》中的一段记载相互呼应。";
  localEvent.worldUpdate = "北境边城的旧井重新渗出微弱灵气。";
  localEvent.choices[0].result = "你依照《残卷药理》辨认井壁残痕。";
  localEvent.choices[1].result = "你暂时离开北境边城的枯井。";
  localEvent.canonRefs = ["北境边城", "《残卷药理》"];

  assert.throws(() => parseAgnesEvent(JSON.stringify(localEvent)), /canonRefs/);
  const parsed = parseAgnesEvent(JSON.stringify(localEvent), {
    allowedReferences: ["北境边城", "《残卷药理》"],
  });
  assert.deepEqual(parsed.canonRefs, ["北境边城", "《残卷药理》"]);
});

test("parseAgnesEvent normalizes a uniquely known book title only when narrative uses its exact name", () => {
  const unwrapped = structuredClone(validEvent);
  unwrapped.scene += " 桌上还压着一页《万药宝典》目录。";
  unwrapped.canonRefs = ["红月城", "万药宝典"];

  const parsed = parseAgnesEvent(JSON.stringify(unwrapped));
  assert.deepEqual(parsed.canonRefs, ["红月城", "《万药宝典》"]);
});

test("parseAgnesEvent drops extra canon references but keeps the ones used in narrative", () => {
  const mixed = structuredClone(validEvent);
  mixed.canonRefs = ["红月城", "化神海"];

  const parsed = parseAgnesEvent(JSON.stringify(mixed));
  assert.deepEqual(parsed.canonRefs, ["红月城"]);
});

test("parseAgnesEvent rejects effects outside the authoritative safety range", () => {
  const unsafe = structuredClone(validEvent);
  unsafe.choices[0].effects.vitality = 40;

  assert.throws(() => parseAgnesEvent(JSON.stringify(unsafe)), /effects/);
});

test("Provider recovery repairs only known bare keys and trailing commas before strict validation", () => {
  const malformed = JSON.stringify(validEvent).replace(
    '"effects":{"martialHeart":2,"fortune":-1}',
    'effects:{"martialHeart":2,"fortune":-1,}',
  );

  assert.throws(() => parseAgnesEvent(malformed), /有效 JSON/);
  const parsed = parseAgnesEventWithRecovery(malformed);
  assert.deepEqual(parsed.choices[0].effects, { martialHeart: 2, fortune: -1 });

  const unknownBareKey = JSON.stringify(validEvent).replace(
    '"monthDelta":1',
    'unknownContractKey:1,"monthDelta":1',
  );
  assert.throws(() => parseAgnesEventWithRecovery(unknownBareKey), /有效 JSON/);
});

test("Provider recovery maps bounded effect aliases and drops unsafe effect noise", () => {
  const drifted = structuredClone(validEvent);
  drifted.choices[0].effects = {
    hp: 5,
    realmExp: 30,
    spiritualStones: 2,
    insight: 1.5,
    unknownPower: 9,
  };
  drifted.choices[1].effects = { vitality: -3, hp: 9 };

  assert.throws(() => parseAgnesEvent(JSON.stringify(drifted)), /effects/);
  const parsed = parseAgnesEventWithRecovery(JSON.stringify(drifted));
  assert.deepEqual(parsed.choices[0].effects, {
    vitality: 5,
    cultivation: 20,
    spiritStones: 2,
  });
  assert.deepEqual(parsed.choices[1].effects, { vitality: -3 });
});

test("Provider recovery still rejects truncated, single-quoted and disconnected events", () => {
  assert.throws(() => parseAgnesEventWithRecovery(JSON.stringify(validEvent).slice(0, -1)), /有效 JSON/);
  assert.throws(() => parseAgnesEventWithRecovery("{'title':'伪事件'}"), /有效 JSON/);

  const disconnected = structuredClone(validEvent);
  disconnected.scene = "陌生荒寺里有人递来一枚无名玉简。";
  disconnected.worldUpdate = "陌生荒寺从此封闭。";
  disconnected.choices[0].result = "你收下玉简。";
  disconnected.choices[1].result = "你转身离开。";
  disconnected.canonRefs = ["玄天神朝"];
  assert.throws(() => parseAgnesEventWithRecovery(JSON.stringify(disconnected)), /canonRefs/);
});

test("parseAgnesEvent rejects an event without two meaningful choices", () => {
  const incomplete = structuredClone(validEvent);
  incomplete.choices = incomplete.choices.slice(0, 1);

  assert.throws(() => parseAgnesEvent(JSON.stringify(incomplete)), /choices/);
});

test("classifyProviderFailure preserves uncertain and credential boundaries", () => {
  assert.deepEqual(classifyProviderFailure({ name: "TimeoutError" }), {
    code: "provider_uncertain",
    status: 504,
  });
  assert.deepEqual(classifyProviderFailure({ status: 401 }), {
    code: "authentication",
    status: 401,
  });
});

test("parseAgnesEvent preserves a bounded NPC update and learned technique", () => {
  const relational = structuredClone(validEvent);
  relational.choices[0].gainTechnique = "《听雨剑式》";
  relational.choices[0].npc = {
    name: "古天河",
    role: "隐世剑修",
    stance: "审视",
    goal: "寻找能承受败果的传人",
    relationDelta: 8,
  };

  const parsed = parseAgnesEvent(JSON.stringify(relational));

  assert.equal(parsed.choices[0].gainTechnique, "《听雨剑式》");
  assert.equal(parsed.choices[0].npc.name, "古天河");
  assert.equal(parsed.choices[0].npc.relationDelta, 8);
});
