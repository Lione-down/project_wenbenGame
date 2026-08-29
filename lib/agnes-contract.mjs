import {
  buildWorldCanonContext,
  CANON_REFERENCE_NAMES,
} from "../public/world-canon.mjs";
import { assertEventContentBudget, EVENT_CONTENT_LIMITS } from "../public/event-rules.mjs";

export const AGNES_MODEL = "agnes-2.5-flash";
export const AGNES_BASE_URL = "https://api.agnes-ai.cn/v1";
export const AGNES_CHAT_COMPLETIONS_URL = `${AGNES_BASE_URL}/chat/completions`;

const EFFECT_KEYS = new Set([
  "aptitude",
  "insight",
  "soul",
  "agility",
  "martialHeart",
  "fortune",
  "vitality",
  "spirit",
  "wound",
  "cultivation",
  "spiritStones",
  "merit",
  "karma",
  "reputation",
  "lifespan",
]);
const EFFECT_ALIASES = new Map([
  ["hp", "vitality"],
  ["health", "vitality"],
  ["qi", "spirit"],
  ["mana", "spirit"],
  ["realmExp", "cultivation"],
  ["combatExp", "cultivation"],
  ["cultivationExp", "cultivation"],
  ["spiritualStones", "spiritStones"],
  ["injury", "wound"],
]);
const RECOVERABLE_JSON_KEYS = new Set([
  "kind",
  "title",
  "scene",
  "canonRefs",
  "monthDelta",
  "danger",
  "choices",
  "worldUpdate",
  "id",
  "tag",
  "label",
  "hint",
  "result",
  "effects",
  "action",
  "encounter",
  "npcName",
  "location",
  "reason",
  "temperament",
  "element",
  "gainTechnique",
  "npc",
  "name",
  "role",
  "stance",
  "goal",
  "relationDelta",
  ...EFFECT_KEYS,
  ...EFFECT_ALIASES.keys(),
]);

const DANGER_LEVELS = new Set(["low", "medium", "high", "fatal"]);
const CHOICE_TAGS = new Set(["peace", "opportunity", "risk", "affinity", "demonic"]);
const CANON_REFERENCE_SET = new Set(CANON_REFERENCE_NAMES);
const CANON_REFERENCE_ALIASES = new Map();
for (const name of CANON_REFERENCE_NAMES) {
  const alias = name.startsWith("《") && name.endsWith("》") ? name.slice(1, -1) : name;
  if (CANON_REFERENCE_ALIASES.has(alias) && CANON_REFERENCE_ALIASES.get(alias) !== name) {
    CANON_REFERENCE_ALIASES.set(alias, null);
  } else {
    CANON_REFERENCE_ALIASES.set(alias, name);
  }
}
const WORLD_CANON_CONTEXT = buildWorldCanonContext();
const RESPONSE_EXAMPLE = JSON.stringify({
  kind: "story",
  title: "红月城药单",
  scene: "红月城商会请你核对一张低阶灵草清单。",
  canonRefs: ["红月城"],
  monthDelta: 1,
  danger: "medium",
  choices: [
    {
      id: "check",
      tag: "opportunity",
      label: "核对药单",
      hint: "稳妥行事",
      result: "你发现一处错漏。",
      effects: { insight: 2, reputation: 1 },
    },
    {
      id: "leave",
      tag: "peace",
      label: "婉拒离开",
      hint: "不沾因果",
      result: "你没有接下此事。",
      effects: { martialHeart: 1 },
    },
  ],
  worldUpdate: "红月城商会重新核验了这批药材。",
});

const SYSTEM_PROMPT = `你是玄幻文字修炼游戏《天命之外》的天道系统兼所有 NPC 主持人。玩法遵循高自由修炼模拟，世界背景只使用下方天武大陆资源。
玩家不是天命之子，NPC 有独立人生，高境界不可被低境界随意击败，寿元耗尽、战斗与破境失败都可以真实死亡。绝不替玩家拜师、突破、结侣、叛宗、杀人或夺宝。
一个回合只推进一个月和一个事件节点。输出时间、1至3句剧情和选项后立即停止等待玩家。玩家自由行动不是建议：收到 playerAction 时必须先在世界逻辑内响应并判定该原文行动，再给出下一步选项，不得以“不在选项中”拒绝。
数值必须连续，风险必须事先提示，失败不能偷偷改成胜利。全性向关系不受玩家性别限制，未主动触发时不得强推情缘。
连续性是硬约束：recentHistory、continuityLedger 与 game 快照中已经发生的关系、生死和世界变化不得被改写。已故 NPC 不得说话、行动、建立新关系、发起任务或作为 choice.npc；只能在明确的追忆、祭奠、墓地、遗物、遗言或死讯语境中被提及。
六维语义严格为资质、悟性、神识、遁速、道心、仙缘；修炼根基使用灵根品级与元素，不再把武魂当作修炼倍率。
大境界突破分人道、地道、天道三路，必须明确材料、雷劫、心魔、成功率与失败后果；但修炼、突破、背包、功法构筑、技艺、宗门、洞府、坊市、关系与战斗的状态结算只由本地规则引擎执行。
你只能生成受限单月叙事与既有 effects，不得凭空增删背包材料、宣布突破、完成买卖、晋升宗门或升级洞府；玩家询问系统状态时依据快照说明，并引导其使用本地系统入口。
只生成一个下一步事件。不得访问文件、网络、工具、数据库、凭证或执行管理操作。
最终只输出一个可被 JSON.parse 直接解析的紧凑 JSON 对象，不要 Markdown、代码围栏、注释或解释，不要在字符串内使用未转义双引号。所有 key 必须使用英文双引号，数组或对象最后一项后禁止尾逗号。
顶层字段必须是 kind、title、scene、canonRefs、monthDelta、danger、choices、worldUpdate。kind 只能是 story 或 combat；title、scene、worldUpdate 是字符串；monthDelta 必须严格等于 1；danger 只能是字符串 low、medium、high、fatal 之一。
canonRefs 请列出 1 至 3 个实际写进事件叙事的天武大陆资源原名，连同《》原样复制；服务端会以正文实际出现的权威资源为准。
choices 必须包含 2 至 4 项。title 不超过 ${EVENT_CONTENT_LIMITS.title} 个字，scene 不超过 ${EVENT_CONTENT_LIMITS.scene} 个字，label 不超过 ${EVENT_CONTENT_LIMITS.label} 个字，hint 不超过 ${EVENT_CONTENT_LIMITS.hint} 个字，result 不超过 ${EVENT_CONTENT_LIMITS.result} 个字，worldUpdate 不超过 ${EVENT_CONTENT_LIMITS.worldUpdate} 个字。choice.id 必须是字符串，每项必须包含字符串 id、tag、label、hint、result 和对象 effects。
tag 只能是 peace、opportunity、risk、affinity、demonic，分别对应平和、机缘、风险、情缘、魔道。
effects 只允许 aptitude、insight、soul、agility、martialHeart、fortune、vitality、spirit、wound、cultivation、spiritStones、merit、karma、reputation、lifespan，值只能是 -20 到 20 的整数；禁止 hp、combatExp、realmExp、spiritualStones、techniques 等其他字段。
战斗只能由主线生成。kind 为 combat 时必须额外提供 encounter 对象，且只包含 npcName、location、reason、temperament、element 五个字符串；每个 choice.action 只能是 fight、escape、negotiate、tribute，战斗 choice 的 effects 必须是空对象。Provider 只提供 NPC、地点、原因与选择语境，不得决定气血、伤势、境界、五行、费用、胜负或死亡。
gainTechnique 若出现必须是字符串。npc 若出现必须是对象，且只含字符串 name、role、stance、goal 与 -20 到 20 的整数 relationDelta。
严格照此类型范例生成，内容不要照抄：${RESPONSE_EXAMPLE}
剧情不得引入附件示例中的任何宗门、角色或地名。避免把玩家写成既定作品角色，不保证奇遇成功，不使用游戏外说明。

${WORLD_CANON_CONTEXT}`;

const DEATH_CONTEXT_TERMS = Object.freeze([
  "已故", "已死", "死亡", "亡故", "去世", "身死", "陨落", "坐化", "寿尽",
  "墓", "遗体", "尸", "亡魂", "追忆", "悼念", "祭奠", "死讯", "噩耗",
  "遗物", "遗言", "往事", "回忆", "生前", "故人", "安眠",
]);

function ensureString(value, field, minimum, maximum) {
  if (typeof value !== "string") {
    throw new Error(`${field} 必须是字符串`);
  }
  const trimmed = value.trim();
  if (trimmed.length < minimum || trimmed.length > maximum) {
    throw new Error(`${field} 长度无效`);
  }
  return trimmed;
}

function unwrapJsonFence(content) {
  const trimmed = content.trim();
  if (!trimmed.startsWith("```")) {
    return trimmed;
  }
  const firstLineEnd = trimmed.indexOf("\n");
  const fenceEnd = trimmed.lastIndexOf("```");
  if (firstLineEnd < 0 || fenceEnd <= firstLineEnd) {
    throw new Error("Agnes JSON 围栏不完整");
  }
  return trimmed.slice(firstLineEnd + 1, fenceEnd).trim();
}

function isIdentifierStart(character) {
  if (!character) return false;
  const code = character.charCodeAt(0);
  return character === "_" || (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
}

function isIdentifierPart(character) {
  if (!character) return false;
  const code = character.charCodeAt(0);
  return isIdentifierStart(character) || (code >= 48 && code <= 57);
}

function nextNonWhitespaceIndex(source, start) {
  let index = start;
  while (index < source.length && source.charCodeAt(index) <= 32) index += 1;
  return index;
}

function repairKnownJsonSyntax(content) {
  const source = unwrapJsonFence(content);
  let output = "";
  let inString = false;
  let isEscaped = false;
  let lastSignificant = "";

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (inString) {
      output += character;
      if (isEscaped) {
        isEscaped = false;
      } else if (character === "\\") {
        isEscaped = true;
      } else if (character === '"') {
        inString = false;
        lastSignificant = '"';
      }
      continue;
    }

    if (character === '"') {
      inString = true;
      output += character;
      continue;
    }

    if (character === ",") {
      const nextIndex = nextNonWhitespaceIndex(source, index + 1);
      if (source[nextIndex] === "}" || source[nextIndex] === "]") continue;
    }

    if ((lastSignificant === "{" || lastSignificant === ",") && isIdentifierStart(character)) {
      let keyEnd = index + 1;
      while (isIdentifierPart(source[keyEnd])) keyEnd += 1;
      const colonIndex = nextNonWhitespaceIndex(source, keyEnd);
      const key = source.slice(index, keyEnd);
      if (source[colonIndex] === ":" && RECOVERABLE_JSON_KEYS.has(key)) {
        output += `"${key}"`;
        index = keyEnd - 1;
        lastSignificant = '"';
        continue;
      }
    }

    output += character;
    if (character.charCodeAt(0) > 32) lastSignificant = character;
  }
  return output;
}

function normalizeProviderEffects(effects) {
  if (!effects || typeof effects !== "object" || Array.isArray(effects)) return {};
  const normalized = {};
  for (const key of EFFECT_KEYS) {
    const value = effects[key];
    if (Number.isInteger(value)) normalized[key] = Math.max(-20, Math.min(20, value));
  }
  for (const [alias, key] of EFFECT_ALIASES) {
    const value = effects[alias];
    if (normalized[key] === undefined && Number.isInteger(value)) {
      normalized[key] = Math.max(-20, Math.min(20, value));
    }
  }
  return normalized;
}

function truncateProviderText(value, maximum) {
  if (typeof value !== "string") return value;
  const characters = Array.from(value.trim());
  if (characters.length <= maximum && value.trim().length <= maximum) return value.trim();
  let result = "";
  for (const character of characters) {
    if ((result + character).length > maximum) break;
    result += character;
  }
  return result;
}

function normalizeProviderDisplayText(event) {
  if (!event || typeof event !== "object" || Array.isArray(event)) return;
  event.title = truncateProviderText(event.title, EVENT_CONTENT_LIMITS.title);
  event.scene = truncateProviderText(event.scene, EVENT_CONTENT_LIMITS.scene);
  event.worldUpdate = truncateProviderText(event.worldUpdate, EVENT_CONTENT_LIMITS.worldUpdate);
  if (!Array.isArray(event.choices)) return;
  for (const choice of event.choices) {
    if (!choice || typeof choice !== "object" || Array.isArray(choice)) continue;
    choice.label = truncateProviderText(choice.label, EVENT_CONTENT_LIMITS.label);
    choice.hint = truncateProviderText(choice.hint, EVENT_CONTENT_LIMITS.hint);
    choice.result = truncateProviderText(choice.result, EVENT_CONTENT_LIMITS.result);
  }
}

function normalizeCanonReference(reference) {
  if (typeof reference !== "string") return null;
  const trimmed = reference.trim();
  if (CANON_REFERENCE_SET.has(trimmed)) return trimmed;
  return CANON_REFERENCE_ALIASES.get(trimmed) ?? null;
}

export function buildAgnesPayload(
  gameSnapshot,
  recentHistory = [],
  playerAction = "",
  { stream = false } = {},
) {
  const safeHistory = Array.isArray(recentHistory) ? recentHistory.slice(-6) : [];
  const world = gameSnapshot?.world ?? {};
  const deadNpcs = Array.isArray(world.npcs)
    ? world.npcs
      .filter((npc) => npc && npc.alive === false)
      .slice(0, 12)
      .map((npc) => ({
        id: String(npc.id || "").slice(0, 32),
        name: String(npc.name || "无名").slice(0, 16),
        deathCause: String(npc.deathCause || "死因未记").slice(0, 40),
      }))
    : [];
  const recentEcology = Array.isArray(world.ecologyLog) ? world.ecologyLog.slice(-12) : [];
  return {
    model: AGNES_MODEL,
    max_tokens: 4096,
    messages: [
      {
        role: "system",
        content: SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: JSON.stringify({
          task: "根据当前状态生成下一段命途事件",
          playerAction: typeof playerAction === "string" ? playerAction.trim().slice(0, EVENT_CONTENT_LIMITS.freeAction) : "",
          game: gameSnapshot,
          recentHistory: safeHistory,
          continuityLedger: { deadNpcs, recentEcology },
        }),
      },
    ],
    temperature: 0.3,
    stream: Boolean(stream),
  };
}

export function extractChatCompletionText(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new Error("Agnes Chat 响应必须是对象");
  }
  if (body.model !== AGNES_MODEL) {
    throw new Error("Agnes Chat 响应模型不匹配");
  }
  if (!Array.isArray(body.choices) || body.choices.length === 0) {
    throw new Error("Agnes Chat choices 无效");
  }
  const choice = body.choices[0];
  if (choice?.finish_reason === "length") {
    throw new Error("Agnes Chat 响应因 length 截断");
  }
  if (choice?.message?.role !== "assistant") {
    throw new Error("Agnes Chat message role 无效");
  }
  const text = typeof choice.message.content === "string"
    ? choice.message.content.trim()
    : "";
  if (!text) {
    throw new Error("Agnes Chat message content 为空");
  }
  return text;
}

export function parseAgnesEvent(content, { allowedReferences = [], deadNpcNames = [] } = {}) {
  if (typeof content !== "string" || content.length > 24000) {
    throw new Error("Agnes 响应不是有效文本");
  }
  let parsed;
  try {
    parsed = JSON.parse(unwrapJsonFence(content));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Agnes 响应不是有效 JSON：${error.message}`);
    }
    throw error;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Agnes 事件必须是对象");
  }

  const event = {
    id: `agnes-${Date.now().toString(36)}`,
    kind: parsed.kind === undefined ? "story" : parsed.kind,
    title: ensureString(parsed.title, "title", 2, EVENT_CONTENT_LIMITS.title),
    scene: ensureString(parsed.scene, "scene", 12, EVENT_CONTENT_LIMITS.scene),
    canonRefs: [],
    monthDelta: parsed.monthDelta,
    danger: parsed.danger,
    choices: [],
    worldUpdate: ensureString(parsed.worldUpdate, "worldUpdate", 2, EVENT_CONTENT_LIMITS.worldUpdate),
    source: "agnes",
  };
  if (!new Set(["story", "combat"]).has(event.kind)) {
    throw new Error("kind 枚举无效");
  }
  if (event.monthDelta !== 1) {
    throw new Error("monthDelta 必须严格等于 1");
  }
  if (!DANGER_LEVELS.has(event.danger)) {
    throw new Error("danger 枚举无效");
  }
  if (!Array.isArray(parsed.choices) || parsed.choices.length < 2 || parsed.choices.length > 4) {
    throw new Error("choices 必须包含 2 到 4 项");
  }

  if (event.kind === "combat") {
    if (!parsed.encounter || typeof parsed.encounter !== "object" || Array.isArray(parsed.encounter)) {
      throw new Error("combat encounter 必须是对象");
    }
    const allowedEncounterKeys = new Set(["npcName", "location", "reason", "temperament", "element"]);
    if (Object.keys(parsed.encounter).some((key) => !allowedEncounterKeys.has(key))) {
      throw new Error("combat encounter 包含未知字段");
    }
    event.encounter = {
      npcName: ensureString(parsed.encounter.npcName, "encounter.npcName", 1, 16),
      location: ensureString(parsed.encounter.location, "encounter.location", 2, 40),
      reason: ensureString(parsed.encounter.reason, "encounter.reason", 4, 80),
      temperament: ensureString(parsed.encounter.temperament, "encounter.temperament", 1, 12),
      element: ensureString(parsed.encounter.element, "encounter.element", 1, 2),
    };
    if (!new Set(["金", "木", "水", "火", "土"]).has(event.encounter.element)) {
      throw new Error("encounter.element 枚举无效");
    }
  }

  const ids = new Set();
  for (const candidate of parsed.choices) {
    const id = ensureString(candidate?.id, "choices.id", 1, 40);
    if (ids.has(id)) {
      throw new Error("choices.id 不能重复");
    }
    ids.add(id);
    if (!candidate.effects || typeof candidate.effects !== "object" || Array.isArray(candidate.effects)) {
      throw new Error("choices.effects 必须是对象");
    }
    const effects = {};
    for (const [key, value] of Object.entries(candidate.effects)) {
      if (!EFFECT_KEYS.has(key) || !Number.isInteger(value) || value < -20 || value > 20) {
        throw new Error("choices.effects 包含无效字段或越界数值");
      }
      effects[key] = value;
    }
    if (event.kind === "combat" && Object.keys(effects).length > 0) {
      throw new Error("战斗 choices.effects 必须为空对象");
    }
    const choice = {
      id,
      tag: CHOICE_TAGS.has(candidate.tag)
        ? candidate.tag
        : event.danger === "high" || event.danger === "fatal"
          ? "risk"
          : "peace",
      label: ensureString(candidate.label, "choices.label", 2, EVENT_CONTENT_LIMITS.label),
      hint: ensureString(candidate.hint, "choices.hint", 2, EVENT_CONTENT_LIMITS.hint),
      result: ensureString(candidate.result, "choices.result", 2, EVENT_CONTENT_LIMITS.result),
      effects,
    };
    if (event.kind === "combat") {
      if (!new Set(["fight", "escape", "negotiate", "tribute"]).has(candidate.action)) {
        throw new Error("战斗 choices.action 枚举无效");
      }
      choice.action = candidate.action;
    }
    if (candidate.gainTechnique !== undefined) {
      choice.gainTechnique = ensureString(
        candidate.gainTechnique,
        "choices.gainTechnique",
        2,
        40,
      );
    }
    if (candidate.npc !== undefined) {
      if (!candidate.npc || typeof candidate.npc !== "object" || Array.isArray(candidate.npc)) {
        throw new Error("choices.npc 必须是对象");
      }
      if (
        !Number.isInteger(candidate.npc.relationDelta) ||
        candidate.npc.relationDelta < -20 ||
        candidate.npc.relationDelta > 20
      ) {
        throw new Error("choices.npc.relationDelta 超出范围");
      }
      choice.npc = {
        name: ensureString(candidate.npc.name, "choices.npc.name", 1, 16),
        role: ensureString(candidate.npc.role, "choices.npc.role", 1, 24),
        stance: ensureString(candidate.npc.stance, "choices.npc.stance", 1, 20),
        goal: ensureString(candidate.npc.goal, "choices.npc.goal", 2, 80),
        relationDelta: candidate.npc.relationDelta,
      };
    }
    event.choices.push(choice);
  }

  const narrativeFragments = [
    event.title,
    event.scene,
    event.worldUpdate,
    event.encounter?.npcName ?? "",
    event.encounter?.location ?? "",
    event.encounter?.reason ?? "",
    ...event.choices.flatMap((choice) => [
      choice.label,
      choice.hint,
      choice.result,
      choice.gainTechnique ?? "",
      choice.npc?.name ?? "",
      choice.npc?.role ?? "",
      choice.npc?.stance ?? "",
      choice.npc?.goal ?? "",
    ]),
  ];
  const deadNames = [...new Set(
    (Array.isArray(deadNpcNames) ? deadNpcNames : [])
      .filter((name) => typeof name === "string")
      .map((name) => name.trim())
      .filter((name) => name.length >= 1 && name.length <= 16),
  )];
  for (const deadName of deadNames) {
    if (event.choices.some((choice) => choice.npc?.name === deadName)) {
      throw new Error(`已故 NPC 不得作为 choice.npc：${deadName}`);
    }
    for (const fragment of narrativeFragments) {
      if (!fragment.includes(deadName)) continue;
      if (!DEATH_CONTEXT_TERMS.some((term) => fragment.includes(term))) {
        throw new Error(`已故 NPC ${deadName} 不得作为当前回合的在世行动者`);
      }
    }
  }
  const eventNarrative = narrativeFragments.join("\n");
  const claimedReferences = Array.isArray(parsed.canonRefs) ? parsed.canonRefs : [];
  const runtimeReferences = [];
  const runtimeReferenceAliases = new Map();
  for (const candidate of Array.isArray(allowedReferences) ? allowedReferences : []) {
    if (typeof candidate !== "string") continue;
    const reference = candidate.trim();
    if (reference.length < 2 || reference.length > 40 || runtimeReferences.includes(reference)) continue;
    runtimeReferences.push(reference);
    const alias = reference.startsWith("《") && reference.endsWith("》")
      ? reference.slice(1, -1)
      : reference;
    if (!runtimeReferenceAliases.has(alias)) runtimeReferenceAliases.set(alias, reference);
  }
  const normalizeEventReference = (reference) => {
    const canonical = normalizeCanonReference(reference);
    if (canonical) return canonical;
    if (typeof reference !== "string") return null;
    const trimmed = reference.trim();
    if (runtimeReferences.includes(trimmed)) return trimmed;
    return runtimeReferenceAliases.get(trimmed) ?? null;
  };
  const derivedReferences = [];
  const addReference = (reference) => {
    if (reference && !derivedReferences.includes(reference) && derivedReferences.length < 3) {
      const alias = reference.startsWith("《") && reference.endsWith("》")
        ? reference.slice(1, -1)
        : reference;
      if (eventNarrative.includes(reference) || eventNarrative.includes(alias)) {
        derivedReferences.push(reference);
      }
    }
  };
  for (const reference of claimedReferences) {
    addReference(normalizeEventReference(reference));
  }
  for (const reference of CANON_REFERENCE_NAMES) {
    addReference(reference);
  }
  for (const reference of runtimeReferences) {
    addReference(reference);
  }
  event.canonRefs = derivedReferences;
  if (event.canonRefs.length === 0) {
    throw new Error("canonRefs 必须实际出现在事件叙事中");
  }
  assertEventContentBudget(event);
  return event;
}

export function parseAgnesEventWithRecovery(content, options = {}) {
  if (typeof content !== "string" || content.length > 24000) {
    throw new Error("Agnes 响应不是有效文本");
  }
  let parsed;
  try {
    parsed = JSON.parse(unwrapJsonFence(content));
  } catch (strictError) {
    try {
      parsed = JSON.parse(repairKnownJsonSyntax(content));
    } catch (repairError) {
      if (repairError instanceof SyntaxError) {
        throw new Error(`Agnes 响应不是有效 JSON：${repairError.message}`);
      }
      throw repairError;
    }
  }
  normalizeProviderDisplayText(parsed);
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && Array.isArray(parsed.choices)) {
    for (const choice of parsed.choices) {
      if (choice && typeof choice === "object" && !Array.isArray(choice)) {
        choice.effects = normalizeProviderEffects(choice.effects);
      }
    }
  }
  return parseAgnesEvent(JSON.stringify(parsed), options);
}

export function classifyProviderFailure(error) {
  if (error?.name === "TimeoutError" || error?.name === "AbortError") {
    return { code: "provider_uncertain", status: 504 };
  }
  const status = Number(error?.status);
  if (status === 401 || status === 403) {
    return { code: "authentication", status };
  }
  if (status === 429) {
    return { code: "rate_limited", status: 429 };
  }
  if (status === 400 || status === 422) {
    return { code: "invalid_request", status };
  }
  if (status >= 500) {
    return { code: "provider_error", status: 502 };
  }
  return { code: "provider_error", status: 502 };
}
