import { AGNES_MODEL } from "./agnes-contract.mjs";

const RESOLUTION_KEYS = Object.freeze(["narrative", "npcReaction", "consequence", "nextClue"]);

const SYSTEM_PROMPT = `你是玄幻文字修炼游戏《天命之外》的 AI 主持人。你的唯一任务，是把本轮已经完成的本地结算写成连贯、丰富且可继续阅读的剧情。
你只能叙述本地已经确定的结果。不得修改数值，不得增删气血、伤势、修为、境界、元石、物品、关系、生死或任何 stateDelta；不得把失败改成成功，也不得另行收费。
必须基于 event、choice、NPC、地点、连续性、localOutcome 与 stateDelta 写出动作或对话、NPC 反应、实际后果和后续线索。不要推进到下一月，不要生成新选项，不要替玩家作出下一次决定。
最终只输出一个 JSON.parse 可直接解析的 JSON 对象，不要 Markdown、代码围栏、注释或解释。顶层字段必须且只能是 narrative、npcReaction、consequence、nextClue，全部为字符串。
narrative 为 80 至 1600 个字；npcReaction 与 consequence 各为 12 至 320 个字；nextClue 为 8 至 200 个字。`;

function ensureString(value, field, minimum, maximum) {
  const length = typeof value === "string" ? Array.from(value.trim()).length : 0;
  if (length < minimum || length > maximum) {
    throw new Error(`${field} 必须是 ${minimum} 至 ${maximum} 个字`);
  }
  return value.trim();
}

function boundedObject(value, maximumEntries = 24) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).slice(0, maximumEntries));
}

function sanitizeResolutionContext(resolution) {
  if (!resolution || typeof resolution !== "object" || Array.isArray(resolution)) {
    throw new Error("resolution context 必须是对象");
  }
  return {
    id: String(resolution.id || "").slice(0, 96),
    turn: Number.isInteger(resolution.turn) ? resolution.turn : 0,
    event: {
      id: String(resolution.event?.id || "").slice(0, 40),
      kind: resolution.event?.kind === "combat" ? "combat" : "story",
      title: String(resolution.event?.title || "").slice(0, 18),
      scene: String(resolution.event?.scene || "").slice(0, 72),
      source: resolution.event?.source === "agnes" ? "agnes" : "offline",
      encounter: boundedObject(resolution.event?.encounter, 5),
    },
    choice: {
      id: String(resolution.choice?.id || "").slice(0, 40),
      label: String(resolution.choice?.label || "").slice(0, 120),
      action: resolution.choice?.action ? String(resolution.choice.action).slice(0, 16) : null,
      playerAction: resolution.choice?.playerAction ? String(resolution.choice.playerAction).slice(0, 120) : null,
    },
    localOutcome: {
      status: String(resolution.localOutcome?.status || "settled").slice(0, 32),
      summary: String(resolution.localOutcome?.summary || "").slice(0, 240),
      stateDelta: boundedObject(resolution.localOutcome?.stateDelta, 12),
    },
    worldUpdate: String(resolution.worldUpdate || "").slice(0, 80),
  };
}

export function buildAgnesResolutionPayload(
  gameSnapshot,
  pendingResolution,
  { stream = false } = {},
) {
  const context = sanitizeResolutionContext(pendingResolution);
  const continuity = {
    player: {
      name: String(gameSnapshot?.player?.name || "无名").slice(0, 12),
      location: String(gameSnapshot?.player?.location || "").slice(0, 24),
      realm: String(gameSnapshot?.player?.realm || "").slice(0, 16),
      abnormal: String(gameSnapshot?.player?.abnormal || "无").slice(0, 24),
    },
    world: {
      year: Number(gameSnapshot?.world?.year) || 1127,
      month: Number(gameSnapshot?.world?.month) || 1,
      latest: String(gameSnapshot?.world?.latest || "").slice(0, 200),
    },
  };
  return {
    model: AGNES_MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: JSON.stringify({ task: "主持本轮已确定结算", context, continuity }) },
    ],
    temperature: 0.35,
    max_tokens: 2400,
    stream: Boolean(stream),
  };
}

export function parseAgnesResolution(content) {
  if (typeof content !== "string" || content.length > 12000) {
    throw new Error("Agnes resolution 不是有效文本");
  }
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    throw new Error(`Agnes resolution 不是有效 JSON：${error.message}`);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Agnes resolution 必须是对象");
  }
  const keys = Object.keys(parsed);
  if (keys.length !== RESOLUTION_KEYS.length || keys.some((key) => !RESOLUTION_KEYS.includes(key))) {
    throw new Error("Agnes resolution 包含未知字段或缺少字段");
  }
  return {
    narrative: ensureString(parsed.narrative, "narrative", 80, 1600),
    npcReaction: ensureString(parsed.npcReaction, "npcReaction", 12, 320),
    consequence: ensureString(parsed.consequence, "consequence", 12, 320),
    nextClue: ensureString(parsed.nextClue, "nextClue", 8, 200),
  };
}
