const SAVE_SCHEMA_VERSION = 3;

export const REALMS = [
  "武徒",
  "一元境",
  "二分境",
  "三才境",
  "四象境",
  "五行境",
  "六合境",
  "七宿境",
  "八荒境",
  "九天境",
  "归真境",
  "掌天境",
  "虚极境",
  "造化境",
  "百劫界王",
  "千界之主",
  "天外至尊",
];

export const SIX_DIMENSION_LABELS = Object.freeze({
  aptitude: "资质",
  insight: "悟性",
  soul: "神识",
  agility: "遁速",
  martialHeart: "道心",
  fortune: "仙缘",
});

export const SPIRIT_ROOT_GRADES = Object.freeze([
  "天灵根",
  "地灵根",
  "真灵根",
  "伪灵根",
  "变异灵根",
]);

const SPIRIT_ROOT_COEFFICIENTS = Object.freeze({
  天灵根: 2,
  地灵根: 1.6,
  真灵根: 1.3,
  伪灵根: 1,
  变异灵根: 1.8,
});

const SPIRIT_ROOT_ELEMENTS = new Set(["金", "木", "水", "火", "土", "雷", "风", "冰"]);

export const STAGES = Object.freeze(["初期", "中期", "后期", "圆满"]);

const REALM_MONTHLY_BASES = Object.freeze([
  10, 10, 9, 9, 9, 8, 8, 7, 7, 6, 6, 5, 5, 4, 4, 3, 3,
]);

const REALM_STAGE_REQUIREMENTS = Object.freeze([
  100, 160, 240, 340, 470, 630, 830, 1080, 1380,
  1740, 2180, 2710, 3340, 4080, 4940, 5930, 7060,
]);

const TECHNIQUE_COEFFICIENTS = Object.freeze({
  基础引气诀: 1,
  "太古天辰诀·残页": 1.12,
  太古天辰诀: 1.3,
  大衍神诀: 1.7,
  混沌诀: 2.2,
});

const AURA_COEFFICIENTS = Object.freeze([0.6, 1, 1.5, 2, 2.5]);

const ITEM_LABELS = Object.freeze({
  herb: "天材灵药",
  breakthroughPill: "破境丹",
  earthEssence: "地脉灵髓",
  daoFragment: "道韵残片",
  rootOrb: "本命灵珠",
});

const BREAKTHROUGH_ROUTES = Object.freeze({
  human: {
    name: "人道突破",
    successBase: 0.92,
    successDecline: 0.025,
    thunderBase: 0.18,
    heartDemonBase: 0.16,
    growth: "稳妥破境，根基增益较少",
  },
  earth: {
    name: "地道突破",
    successBase: 0.8,
    successDecline: 0.03,
    thunderBase: 0.34,
    heartDemonBase: 0.26,
    growth: "借地脉淬体，根基与寿元增益居中",
  },
  heaven: {
    name: "天道突破",
    successBase: 0.68,
    successDecline: 0.035,
    thunderBase: 0.58,
    heartDemonBase: 0.42,
    growth: "逆天承劫，成功后获得最高根基增益",
  },
});

const BACKGROUND_BONUSES = {
  "天水国寒门": { martialHeart: 2 },
  "迦蓝学院学员": { insight: 2, reputation: 5 },
  "镇国神卫军户": { maxVitality: 20, martialHeart: 1 },
  "术炼师公会学徒": { soul: 2 },
  "炎武城商户": { spiritStones: 300, fortune: 1 },
  "红月城武者世家": { aptitude: 1, agility: 1 },
  "化神海杂役": { maxSpirit: 20, insight: 1 },
  "海族流民": { agility: 2 },
  "魔族遗脉": { soul: 1, maxVitality: 10 },
  "农家子": { martialHeart: 2 },
  "猎户之后": { maxVitality: 20 },
  "商贾之家": { spiritStones: 300, fortune: 1 },
  "官宦子弟": { reputation: 20 },
  "将门之后": { martialHeart: 1, insight: 1 },
  "没落世家": { technique: "《太古天辰诀·残页》" },
  "市井孤儿": { agility: 2 },
  "书香门第": { insight: 3 },
  "方外遗孤": { aptitude: 2 },
  "妖族后裔": { soul: 1, maxVitality: 10 },
};

const TALENT_BONUSES = {
  "天资聪颖": { aptitude: 3 },
  "过目不忘": { insight: 3 },
  "身轻如燕": { agility: 3 },
  "天生道心": { martialHeart: 3 },
  "气运加身": { fortune: 3 },
  "神识过人": { soul: 3 },
  "百脉俱通": { maxSpirit: 50 },
  "钢筋铁骨": { maxVitality: 80 },
};

const STAT_KEYS = new Set(Object.keys(SIX_DIMENSION_LABELS));

const DIRECT_RESOURCE_KEYS = new Set([
  "vitality",
  "spirit",
  "wound",
  "spiritStones",
  "merit",
  "karma",
  "reputation",
]);

const PATH_GOALS = {
  "问道飞升": "自证武道，寻找不借天命的登临之路",
  "逍遥长生": "在乱世中护住所爱之人并活得足够久",
  "快意恩仇": "查清旧怨，让每一笔因果得到回应",
  "守护所爱": "守住重要之人，不让强者随意夺走他们",
  "问鼎天下": "从无名之辈走到一方势力之主",
  "随心所欲": "不立宏愿，只为每一个当下自行抉择",
};

const SEASONS = ["冬", "春", "春", "春", "夏", "夏", "夏", "秋", "秋", "秋", "冬", "冬"];

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function normalizeSeed(seed) {
  const numericSeed = Number(seed);
  return Number.isFinite(numericSeed) ? numericSeed >>> 0 : 1;
}

function randomFromSeed(seed) {
  let value = normalizeSeed(seed) || 1;
  return () => {
    value += 0x6d2b79f5;
    let mixed = value;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

function score(random, minimum = 34, span = 34) {
  return minimum + Math.floor(random() * span);
}

export function getRealmCurve(realmIndex) {
  if (!Number.isInteger(realmIndex) || realmIndex < 0 || realmIndex >= REALMS.length) {
    throw new Error("境界索引无效");
  }
  return {
    realm: REALMS[realmIndex],
    monthlyBase: REALM_MONTHLY_BASES[realmIndex],
    stageRequirement: REALM_STAGE_REQUIREMENTS[realmIndex],
  };
}

export function calculateMonthlyCultivation(state, { mode = "normal" } = {}) {
  if (!state?.player?.spiritRoot || !state.player.techniqueBuild || !state.player.cave) {
    throw new Error("修炼状态不完整");
  }
  if (!new Set(["normal", "closedDoor"]).has(mode)) {
    throw new Error("修炼方式无效");
  }
  const curve = getRealmCurve(state.player.realmIndex);
  const aptitudeCoefficient = 1 + state.player.stats.aptitude * 0.05;
  const rootCoefficient = state.player.spiritRoot.coefficient;
  const techniqueCoefficient = TECHNIQUE_COEFFICIENTS[state.player.techniqueBuild.main] ?? 1;
  const auraIndex = clamp(Number(state.player.cave.auraLevel) || 1, 0, AURA_COEFFICIENTS.length - 1);
  const auraCoefficient = AURA_COEFFICIENTS[auraIndex];
  const mindRequirement = 8 + Math.floor(state.player.realmIndex / 3);
  const heart = state.player.stats.martialHeart;
  const mindCoefficient = heart >= mindRequirement + 5 ? 1.2 : heart >= mindRequirement ? 1 : 0.5;
  const modeCoefficient = mode === "closedDoor" ? 2 : 1;
  const monthlyGain = Math.max(1, Math.floor(
    curve.monthlyBase *
    aptitudeCoefficient *
    rootCoefficient *
    techniqueCoefficient *
    auraCoefficient *
    mindCoefficient *
    modeCoefficient,
  ));

  return {
    base: curve.monthlyBase,
    aptitudeCoefficient,
    rootCoefficient,
    techniqueCoefficient,
    auraCoefficient,
    mindCoefficient,
    modeCoefficient,
    monthlyGain,
    stageRequirement: curve.stageRequirement,
  };
}

function logEcology(state, entry) {
  state.world.ecologyLog ??= [];
  state.world.ecologyLog.push({
    turn: state.meta.turn,
    year: state.world.year,
    month: state.world.month,
    ...entry,
  });
  if (state.world.ecologyLog.length > 40) {
    state.world.ecologyLog.splice(0, state.world.ecologyLog.length - 40);
  }
}

function evolveNpcEcologyInPlace(state) {
  if (!Array.isArray(state.world.npcs)) return;
  for (let index = 0; index < state.world.npcs.length; index += 1) {
    const npc = state.world.npcs[index];
    if (!npc.alive) continue;
    npc.ageMonths += 1;
    if (npc.ageMonths >= npc.lifespan * 12) {
      npc.alive = false;
      npc.deathCause = "寿元耗尽";
      logEcology(state, { type: "death", npcId: npc.id, text: `${npc.name}寿尽坐化。` });
      continue;
    }
    const random = randomFromSeed(state.meta.seed + state.meta.turn * 131 + index * 17);
    const gain = 4 + npc.realmIndex + npc.stageIndex + Math.floor(random() * 4);
    npc.cultivation += gain;
    const curve = getRealmCurve(npc.realmIndex);
    if (npc.cultivation < curve.stageRequirement) continue;

    if (npc.stageIndex < STAGES.length - 1) {
      npc.cultivation -= curve.stageRequirement;
      npc.stageIndex += 1;
      npc.stage = STAGES[npc.stageIndex];
      logEcology(state, {
        type: "breakthrough",
        npcId: npc.id,
        text: `${npc.name}踏入${REALMS[npc.realmIndex]}·${npc.stage}。`,
      });
      continue;
    }

    if (npc.realmIndex >= REALMS.length - 1) {
      npc.cultivation = curve.stageRequirement;
      continue;
    }
    const majorChance = clamp(0.82 - npc.realmIndex * 0.025, 0.15, 0.9);
    if (random() < majorChance) {
      npc.realmIndex += 1;
      npc.stageIndex = 0;
      npc.stage = STAGES[0];
      npc.cultivation = 0;
      npc.lifespan += 40 + npc.realmIndex * 10;
      logEcology(state, {
        type: "breakthrough",
        npcId: npc.id,
        text: `${npc.name}独自破境，踏入${REALMS[npc.realmIndex]}。`,
      });
    } else {
      npc.cultivation = Math.floor(curve.stageRequirement * 0.5);
      if (npc.realmIndex >= 10 && random() < 0.25) {
        npc.alive = false;
        npc.deathCause = "渡劫失败";
        logEcology(state, { type: "death", npcId: npc.id, text: `${npc.name}渡劫失败，身死道消。` });
      } else {
        logEcology(state, { type: "setback", npcId: npc.id, text: `${npc.name}破境受阻，修为回落。` });
      }
    }
  }

  const living = state.world.npcs.filter((npc) => npc.alive);
  if (state.meta.turn > 0 && state.meta.turn % 6 === 0 && living.length >= 2) {
    const first = living[0];
    const second = living[1];
    const firstHasBond = first.bonds.some((bond) => bond.npcId === second.id && bond.bond === "同道");
    if (!firstHasBond) {
      first.bonds.push({ npcId: second.id, name: second.name, bond: "同道" });
      second.bonds.push({ npcId: first.id, name: first.name, bond: "同道" });
      logEcology(state, {
        type: "bond",
        npcId: first.id,
        otherNpcId: second.id,
        text: `${first.name}与${second.name}在各自行途中结为同道。`,
      });
    }
  }
}

function advanceOneMonthInPlace(state) {
  state.meta.turn += 1;
  state.meta.elapsedMonths = Number(state.meta.elapsedMonths || 0) + 1;
  state.world.month = Number(state.world.month || 1) + 1;
  if (state.world.month > 12) {
    state.world.month = 1;
    state.world.year += 1;
  }
  if (state.meta.elapsedMonths % 12 === 0) {
    state.player.age += 1;
  }
  state.world.season = SEASONS[state.world.month - 1];
  if (state.player.progression?.breakthroughCooldown > 0) {
    state.player.progression.breakthroughCooldown -= 1;
  }
  if (state.player.age >= state.player.lifespan) {
    state.meta.status = "dead";
  }
  evolveNpcEcologyInPlace(state);
}

export function advanceOneMonth(state, {
  eventTitle = "岁月流转",
  result = "一个月过去，天武大陆并未为任何人停下。",
  worldUpdate = result,
} = {}) {
  if (state?.meta?.status !== "active") {
    throw new Error("此生命簿已经封存");
  }
  const next = structuredClone(state);
  advanceOneMonthInPlace(next);
  next.world.latest = String(worldUpdate).slice(0, 200);
  next.chronicle.push({
    year: next.world.year,
    month: next.world.month,
    age: next.player.age,
    eventTitle: String(eventTitle).slice(0, 40),
    result: String(result).slice(0, 240),
  });
  return next;
}

export function cultivateOneMonth(state, { mode = "normal" } = {}) {
  if (state?.meta?.status !== "active") {
    throw new Error("此生命簿已经封存");
  }
  const calculation = calculateMonthlyCultivation(state, { mode });
  const next = structuredClone(state);
  advanceOneMonthInPlace(next);
  next.player.cultivation += calculation.monthlyGain;
  next.world.latest = `${next.player.name}在${next.player.location}修炼一月，天武大陆诸事仍在流转。`;
  next.chronicle.push({
    year: next.world.year,
    month: next.world.month,
    age: next.player.age,
    eventTitle: mode === "closedDoor" ? "闭关修炼" : "吐纳修炼",
    result: `${next.player.name}本月获得修为 ${calculation.monthlyGain} 点。`,
  });
  return { state: next, ...calculation };
}

function getRouteMaterials(route, realmIndex) {
  const tier = 1 + Math.floor(realmIndex / 4);
  if (route === "human") return { breakthroughPill: tier };
  if (route === "earth") return { earthEssence: tier, herb: tier + 1 };
  return { earthEssence: tier + 1, rootOrb: tier, daoFragment: tier };
}

function getFailureConsequence(realmIndex) {
  if (realmIndex <= 4) return "失败将重伤，并进入至少六个月的突破冷却";
  if (realmIndex <= 10) return "失败将倒退一个小境界，并留下永久暗伤";
  return "失败可能走火入魔，亦可能当场陨落";
}

export function getBreakthroughOptions(state) {
  const realmIndex = state.player.realmIndex;
  if (realmIndex >= REALMS.length - 1) return [];
  return Object.entries(BREAKTHROUGH_ROUTES).map(([route, config]) => {
    const materials = getRouteMaterials(route, realmIndex);
    const heartModifier = (state.player.stats.martialHeart - 10) * 0.012;
    const rootModifier = (state.player.spiritRoot.coefficient - 1) * 0.05;
    const meritModifier = (state.player.resources.merit - state.player.resources.karma) * 0.002;
    const woundPenalty = state.player.resources.wound * 0.002;
    const successRate = clamp(
      config.successBase - realmIndex * config.successDecline + heartModifier + rootModifier + meritModifier - woundPenalty,
      0.08,
      0.97,
    );
    const thunderRisk = clamp(
      config.thunderBase + realmIndex * 0.025 + state.player.resources.karma * 0.005 - state.player.resources.merit * 0.004,
      0.05,
      0.95,
    );
    const heartDemonRisk = clamp(
      config.heartDemonBase + realmIndex * 0.02 + state.player.resources.karma * 0.003 - state.player.stats.martialHeart * 0.01,
      0.05,
      0.9,
    );
    return {
      route,
      name: config.name,
      materials,
      materialLabels: Object.entries(materials).map(
        ([itemId, quantity]) => `${ITEM_LABELS[itemId] ?? itemId} ×${quantity}`,
      ),
      successRate,
      thunderRisk,
      heartDemonRisk,
      growth: config.growth,
      failureConsequence: getFailureConsequence(realmIndex),
    };
  });
}

function getBreakthroughRolls(state, supplied = {}) {
  const random = randomFromSeed(
    state.meta.seed + state.meta.turn * 97 + state.player.realmIndex * 997 + state.player.progression.stageIndex * 17,
  );
  const read = (key) => Number.isFinite(supplied[key]) ? clamp(Number(supplied[key]), 0, 1) : random();
  return {
    insight: read("insight"),
    success: read("success"),
    thunder: read("thunder"),
    heartDemon: read("heartDemon"),
    fate: read("fate"),
  };
}

function recordBreakthrough(state, eventTitle, result) {
  state.chronicle.push({
    year: state.world.year,
    month: state.world.month,
    age: state.player.age,
    eventTitle,
    result,
  });
}

function attemptMinorBreakthrough(state, rolls) {
  const next = structuredClone(state);
  const curve = getRealmCurve(next.player.realmIndex);
  if (next.player.progression.breakthroughCooldown > 0) {
    return { state: next, outcome: { status: "blocked", kind: "minor", reason: "突破冷却尚未结束" } };
  }
  if (next.player.cultivation < curve.stageRequirement) {
    return { state: next, outcome: { status: "blocked", kind: "minor", reason: "修为尚未充盈" } };
  }
  if (next.player.progression.stageIndex >= STAGES.length - 1) {
    return { state: next, outcome: { status: "blocked", kind: "minor", reason: "圆满境需选择人道、地道或天道突破" } };
  }
  advanceOneMonthInPlace(next);
  const chance = clamp(
    0.5 + next.player.stats.insight * 0.02 + next.player.stats.martialHeart * 0.01 - next.player.realmIndex * 0.015,
    0.25,
    0.95,
  );
  if (rolls.insight < chance) {
    next.player.cultivation -= curve.stageRequirement;
    next.player.progression.stageIndex += 1;
    next.player.progression.stage = STAGES[next.player.progression.stageIndex];
    next.player.realmStage = next.player.progression.stage;
    recordBreakthrough(next, "小境界突破", `${next.player.name}踏入${next.player.realm}·${next.player.realmStage}。`);
    return {
      state: next,
      outcome: { status: "success", kind: "minor", chance, thunderTribulation: false, heartDemon: false },
    };
  }
  next.player.cultivation = Math.floor(curve.stageRequirement * 0.7);
  next.player.resources.wound = clamp(next.player.resources.wound + 12, 0, 100);
  next.player.progression.breakthroughCooldown = 2;
  next.player.abnormal = "轻伤";
  recordBreakthrough(next, "小境界受阻", `${next.player.name}冲关受阻，修为回落并受轻伤。`);
  return {
    state: next,
    outcome: { status: "failed", kind: "minor", chance, thunderTribulation: false, heartDemon: false },
  };
}

function applyMajorFailure(state, realmIndex, fateRoll) {
  if (realmIndex <= 4) {
    state.player.resources.vitality = Math.max(1, state.player.resources.vitality - 35);
    state.player.resources.wound = clamp(state.player.resources.wound + 45, 0, 100);
    state.player.progression.breakthroughCooldown = 6;
    state.player.abnormal = "重伤";
    return "雷劫与心魔反噬，经脉重创，六个月内不得再破境";
  }
  if (realmIndex <= 10) {
    state.player.progression.stageIndex = 2;
    state.player.progression.stage = STAGES[2];
    state.player.realmStage = STAGES[2];
    state.player.progression.scars.push("雷劫暗伤");
    state.player.resources.maxSpirit = Math.max(20, state.player.resources.maxSpirit - 15);
    state.player.resources.spirit = Math.min(state.player.resources.spirit, state.player.resources.maxSpirit);
    state.player.resources.wound = clamp(state.player.resources.wound + 65, 0, 100);
    state.player.progression.breakthroughCooldown = 12;
    state.player.abnormal = "雷劫暗伤";
    return "修为倒退至后期，并留下永久雷劫暗伤";
  }
  if (fateRoll < 0.55) {
    state.player.resources.vitality = 0;
    state.player.resources.wound = 100;
    state.player.abnormal = "雷劫陨落";
    state.meta.status = "dead";
    return "道基在雷劫与心魔中崩毁，当场陨落";
  }
  state.player.progression.stageIndex = 2;
  state.player.progression.stage = STAGES[2];
  state.player.realmStage = STAGES[2];
  state.player.progression.scars.push("心魔蚀道");
  state.player.progression.breakthroughCooldown = 24;
  state.player.abnormal = "走火入魔";
  return "虽侥幸未陨落，却走火入魔并留下心魔蚀道";
}

export function attemptBreakthrough(state, route, suppliedRolls = {}) {
  if (state?.meta?.status !== "active") {
    return { state: structuredClone(state), outcome: { status: "blocked", reason: "此生命簿已经封存" } };
  }
  const rolls = getBreakthroughRolls(state, suppliedRolls);
  if (route === "minor") return attemptMinorBreakthrough(state, rolls);
  const option = getBreakthroughOptions(state).find((candidate) => candidate.route === route);
  if (!option) {
    return { state: structuredClone(state), outcome: { status: "blocked", reason: "突破路线无效" } };
  }
  if (state.player.progression.stageIndex !== STAGES.length - 1) {
    return { state: structuredClone(state), outcome: { status: "blocked", reason: "尚未达到当前境界圆满" } };
  }
  if (state.player.progression.breakthroughCooldown > 0) {
    return { state: structuredClone(state), outcome: { status: "blocked", reason: "突破冷却尚未结束" } };
  }
  const requirement = getRealmCurve(state.player.realmIndex).stageRequirement;
  if (state.player.cultivation < requirement) {
    return { state: structuredClone(state), outcome: { status: "blocked", reason: "修为尚未充盈" } };
  }
  const missing = Object.fromEntries(
    Object.entries(option.materials).filter(
      ([itemId, quantity]) => (state.player.inventory[itemId] ?? 0) < quantity,
    ),
  );
  if (Object.keys(missing).length > 0) {
    return {
      state: structuredClone(state),
      outcome: { status: "blocked", reason: "突破材料不足", missing },
    };
  }

  const next = structuredClone(state);
  for (const [itemId, quantity] of Object.entries(option.materials)) {
    next.player.inventory[itemId] -= quantity;
  }
  advanceOneMonthInPlace(next);
  const passedBase = rolls.success < option.successRate;
  const passedThunder = rolls.thunder >= option.thunderRisk;
  const passedHeartDemon = rolls.heartDemon >= option.heartDemonRisk;

  if (passedBase && passedThunder && passedHeartDemon) {
    const previousRealm = next.player.realm;
    next.player.realmIndex += 1;
    next.player.realm = REALMS[next.player.realmIndex];
    next.player.progression.stageIndex = 0;
    next.player.progression.stage = STAGES[0];
    next.player.realmStage = STAGES[0];
    next.player.cultivation = 0;
    const growth = route === "human" ? 5 : route === "earth" ? 12 : 20;
    next.player.resources.maxVitality += growth;
    next.player.resources.maxSpirit += growth;
    next.player.resources.vitality = next.player.resources.maxVitality;
    next.player.resources.spirit = next.player.resources.maxSpirit;
    if (route === "heaven") {
      for (const key of STAT_KEYS) next.player.stats[key] = clamp(next.player.stats[key] + 1, 1, 20);
    }
    next.player.lifespan += (route === "human" ? 40 : route === "earth" ? 55 : 70) + next.player.realmIndex * 15;
    next.player.progression.lastBreakthrough = {
      route,
      from: previousRealm,
      to: next.player.realm,
      turn: next.meta.turn,
      thunderTribulation: true,
      heartDemon: true,
    };
    next.player.abnormal = "无";
    const result = `${next.player.name}以${option.name}渡过雷劫与心魔，踏入${next.player.realm}。`;
    recordBreakthrough(next, option.name, result);
    return {
      state: next,
      outcome: {
        status: "success",
        kind: "major",
        route,
        successRate: option.successRate,
        thunderRisk: option.thunderRisk,
        heartDemonRisk: option.heartDemonRisk,
        thunderTribulation: true,
        heartDemon: true,
      },
    };
  }

  const failureConsequence = applyMajorFailure(next, state.player.realmIndex, rolls.fate);
  next.player.cultivation = Math.floor(requirement * 0.35);
  next.player.progression.lastBreakthrough = {
    route,
    from: state.player.realm,
    to: null,
    turn: next.meta.turn,
    thunderTribulation: true,
    heartDemon: true,
    failed: true,
  };
  recordBreakthrough(next, `${option.name}失败`, failureConsequence);
  return {
    state: next,
    outcome: {
      status: "failed",
      kind: "major",
      route,
      successRate: option.successRate,
      thunderRisk: option.thunderRisk,
      heartDemonRisk: option.heartDemonRisk,
      thunderTribulation: true,
      heartDemon: true,
      failureConsequence,
    },
  };
}

function assertProfile(profile) {
  if (!profile || typeof profile !== "object") {
    throw new Error("角色资料无效");
  }
  for (const key of [
    "name", "gender", "birthplace", "background", "path", "constitution", "talent",
  ]) {
    if (typeof profile[key] !== "string" || !profile[key].trim()) {
      throw new Error(`角色字段 ${key} 不能为空`);
    }
  }
  if (!Number.isInteger(profile.age) || profile.age < 16 || profile.age > 60) {
    throw new Error("初始年龄必须在 16 到 60 岁之间");
  }
  if (!profile.stats || typeof profile.stats !== "object") {
    throw new Error("六维分配无效");
  }
  const values = [...STAT_KEYS].map((key) => Number(profile.stats[key]));
  if (values.some((value) => !Number.isInteger(value) || value < 1 || value > 15)) {
    throw new Error("六维单项必须是 1 到 15 的整数");
  }
  if (values.reduce((total, value) => total + value, 0) !== 60) {
    throw new Error("六维初始点数总和必须为 60");
  }
  createSpiritRoot(profile);
}

function createSpiritRoot(profile) {
  const grade = String(profile.spiritRootGrade || "真灵根").trim();
  if (!SPIRIT_ROOT_GRADES.includes(grade)) {
    throw new Error("灵根品级无效");
  }
  const primaryElement = String(profile.rootPrimaryElement || profile.soulAttribute || "金").trim();
  if (!SPIRIT_ROOT_ELEMENTS.has(primaryElement)) {
    throw new Error("灵根主元素无效");
  }
  const secondaryElement = String(profile.rootSecondaryElement || "").trim();
  if (secondaryElement && !SPIRIT_ROOT_ELEMENTS.has(secondaryElement)) {
    throw new Error("灵根次元素无效");
  }
  const elements = [...new Set([primaryElement, secondaryElement].filter(Boolean))];
  return {
    grade,
    elements,
    primaryElement,
    coefficient: SPIRIT_ROOT_COEFFICIENTS[grade],
  };
}

function createPlayerFoundation() {
  return {
    progression: {
      stageIndex: 0,
      stage: "初期",
      breakthroughCooldown: 0,
      scars: [],
      lastBreakthrough: null,
    },
    inventory: {
      herb: 4,
      ore: 3,
      talismanPaper: 2,
      spiritSeed: 2,
      beastFood: 1,
      breakthroughPill: 0,
      earthEssence: 0,
      daoFragment: 0,
      rootOrb: 0,
    },
    techniqueBuild: {
      known: ["基础引气诀"],
      main: "基础引气诀",
      supports: [],
      arts: [],
      movement: null,
      ultimate: null,
    },
    crafts: Object.fromEntries(
      ["alchemy", "forging", "talisman", "formation", "beast", "planting"]
        .map((key) => [key, { level: 0, experience: 0 }]),
    ),
    cave: {
      auraLevel: 1,
      facilities: {
        meditationRoom: 0,
        alchemyRoom: 0,
        forge: 0,
        spiritField: 0,
        gatheringArray: 0,
        ward: 0,
      },
      crop: null,
    },
    relationships: [],
  };
}

function createWorldFoundation() {
  return {
    npcs: [
      {
        id: "lin-xuan",
        name: "林玄",
        gender: "男",
        realmIndex: 0,
        stageIndex: 0,
        stage: "初期",
        cultivation: 22,
        ageMonths: 18 * 12,
        lifespan: 100,
        alive: true,
        goal: "从普通少年走出自己的武道",
        bonds: [],
      },
      {
        id: "shen-qingli",
        name: "沈青璃",
        gender: "女",
        realmIndex: 5,
        stageIndex: 1,
        stage: "中期",
        cultivation: 310,
        ageMonths: 24 * 12,
        lifespan: 500,
        alive: true,
        goal: "成为九阶术炼师",
        bonds: [],
      },
      {
        id: "su-linger",
        name: "苏灵儿",
        gender: "女",
        realmIndex: 1,
        stageIndex: 0,
        stage: "初期",
        cultivation: 48,
        ageMonths: 22 * 12,
        lifespan: 175,
        alive: true,
        goal: "扩张红月城商路",
        bonds: [],
      },
    ],
    market: {
      prices: {
        herb: 18,
        ore: 24,
        talismanPaper: 12,
        spiritSeed: 15,
        beastFood: 20,
        breakthroughPill: 500,
        earthEssence: 760,
        daoFragment: 1200,
        rootOrb: 980,
      },
      lastRefreshTurn: 0,
    },
    ecologyLog: [],
  };
}

export function createNewGame(profile, seed = Date.now()) {
  assertProfile(profile);
  const normalizedSeed = normalizeSeed(seed);
  const spiritRoot = createSpiritRoot(profile);
  const stats = Object.fromEntries(
    [...STAT_KEYS].map((key) => [key, Number(profile.stats[key])]),
  );
  const resources = {
    vitality: 100,
    maxVitality: 100,
    spirit: 100,
    maxSpirit: 100,
    wound: 0,
    spiritStones: 50,
    merit: 0,
    karma: 0,
    reputation: 0,
  };
  let cultivation = 0;
  const techniques = ["《基础引气诀》"];
  const bonus = {
    ...(BACKGROUND_BONUSES[profile.background] ?? {}),
    ...(TALENT_BONUSES[profile.talent] ?? {}),
  };
  for (const [key, amount] of Object.entries(bonus)) {
    if (STAT_KEYS.has(key)) {
      stats[key] = clamp(stats[key] + amount, 1, 20);
    } else if (key === "spiritStones" || key === "reputation") {
      resources[key] = Math.max(0, resources[key] + amount);
    } else if (key === "maxVitality" || key === "maxSpirit") {
      resources[key] += amount;
      const currentKey = key === "maxVitality" ? "vitality" : "spirit";
      resources[currentKey] = resources[key];
    } else if (key === "technique" && typeof amount === "string") {
      techniques.push(amount);
    }
  }

  const name = profile.name.trim().slice(0, 12);
  const age = profile.age;
  const playerFoundation = createPlayerFoundation();
  const worldFoundation = createWorldFoundation();

  return {
    meta: {
      schemaVersion: SAVE_SCHEMA_VERSION,
      status: "active",
      seed: normalizedSeed,
      turn: 0,
      elapsedMonths: 0,
      pendingResolution: null,
    },
    player: {
      name,
      daoName: String(profile.daoName || `玄${name.slice(-1)}`).slice(0, 12),
      gender: profile.gender.trim().slice(0, 20),
      birthplace: profile.birthplace.trim().slice(0, 24),
      background: profile.background.trim().slice(0, 24),
      path: profile.path.trim().slice(0, 24),
      constitution: profile.constitution.trim().slice(0, 24),
      talent: profile.talent.trim().slice(0, 24),
      appearance: "清秀",
      age,
      lifespan: 100,
      realmIndex: 0,
      realm: REALMS[0],
      realmStage: "初期",
      cultivation,
      spiritRoot,
      stats,
      resources,
      techniques,
      npcs: [],
      sect: {
        name: "散修",
        position: "无",
        contribution: 0,
        reputation: 0,
        joinedAtTurn: null,
      },
      location: profile.birthplace.trim().slice(0, 24),
      abnormal: "无",
      mainGoal: PATH_GOALS[profile.path] ?? PATH_GOALS["随心所欲"],
      ...playerFoundation,
    },
    world: {
      year: 1127,
      month: 1,
      era: "天衡纪",
      season: "冬",
      unrest: 22,
      latest: "北境灵潮初起，各方势力开始寻找失落的古道。",
      ...worldFoundation,
    },
    chronicle: [
      {
        year: 1127,
        month: 1,
        age,
        eventTitle: "命簿初开",
        result: `${name}于${profile.birthplace.trim()}测得${spiritRoot.grade}，主灵根为${spiritRoot.primaryElement}。`,
      },
    ],
  };
}

function applyChoiceConsequencesInPlace(state, choice) {
  for (const [key, rawAmount] of Object.entries(choice.effects ?? {})) {
    const amount = clamp(Number(rawAmount) || 0, -1000, 1000);
    if (STAT_KEYS.has(key)) {
      state.player.stats[key] = clamp(state.player.stats[key] + amount, 1, 20);
    } else if (DIRECT_RESOURCE_KEYS.has(key)) {
      const maximum = key === "vitality"
        ? state.player.resources.maxVitality
        : key === "spirit"
          ? state.player.resources.maxSpirit
          : key === "wound"
            ? 100
            : Number.POSITIVE_INFINITY;
      state.player.resources[key] = clamp(state.player.resources[key] + amount, 0, maximum);
    } else if (key === "cultivation") {
      state.player.cultivation = Math.max(0, state.player.cultivation + amount);
    } else if (key === "lifespan") {
      state.player.lifespan = Math.max(16, state.player.lifespan + amount);
    }
  }

  if (typeof choice.gainTechnique === "string") {
    const technique = choice.gainTechnique.trim().slice(0, 40);
    if (technique && !state.player.techniques.includes(technique)) {
      state.player.techniques.push(technique);
    }
  }

  if (choice.npc && typeof choice.npc === "object") {
    const name = String(choice.npc.name || "").trim().slice(0, 16);
    if (name) {
      const relationDelta = clamp(Number(choice.npc.relationDelta) || 0, -30, 30);
      const existing = state.player.npcs.find((npc) => npc.name === name);
      if (existing) {
        existing.relation = clamp(existing.relation + relationDelta, -100, 100);
        existing.stance = String(choice.npc.stance || existing.stance).slice(0, 20);
        existing.goal = String(choice.npc.goal || existing.goal).slice(0, 80);
      } else {
        state.player.npcs.push({
          name,
          role: String(choice.npc.role || "萍水相逢").slice(0, 24),
          stance: String(choice.npc.stance || "陌生").slice(0, 20),
          goal: String(choice.npc.goal || "去向未明").slice(0, 80),
          relation: clamp(relationDelta, -100, 100),
        });
      }
    }
  }
}

function refreshPlayerConditionInPlace(state) {
  if (state.player.resources.wound >= 66 || state.player.resources.vitality < state.player.resources.maxVitality * 0.33) {
    state.player.abnormal = "垂死";
  } else if (state.player.resources.wound >= 35 || state.player.resources.vitality < state.player.resources.maxVitality * 0.66) {
    state.player.abnormal = "重伤";
  } else if (state.player.resources.wound > 0 || state.player.resources.vitality < state.player.resources.maxVitality) {
    state.player.abnormal = "轻伤";
  } else {
    state.player.abnormal = "无";
  }

  if (
    state.player.resources.vitality <= 0 ||
    state.player.resources.wound >= 100 ||
    state.player.age >= state.player.lifespan
  ) {
    state.meta.status = "dead";
  }
}

function numericDelta(before, after, keys) {
  return Object.fromEntries([...keys].flatMap((key) => {
    const delta = Number(after?.[key] ?? 0) - Number(before?.[key] ?? 0);
    return delta === 0 ? [] : [[key, delta]];
  }));
}

function buildStateDelta(before, after) {
  const knownBefore = new Set(before.player.techniques);
  return {
    resources: numericDelta(before.player.resources, after.player.resources, DIRECT_RESOURCE_KEYS),
    stats: numericDelta(before.player.stats, after.player.stats, STAT_KEYS),
    cultivation: after.player.cultivation - before.player.cultivation,
    lifespan: after.player.lifespan - before.player.lifespan,
    status: before.meta.status === after.meta.status ? "unchanged" : `${before.meta.status}->${after.meta.status}`,
    abnormal: before.player.abnormal === after.player.abnormal ? "unchanged" : `${before.player.abnormal}->${after.player.abnormal}`,
    techniquesAdded: after.player.techniques.filter((name) => !knownBefore.has(name)).slice(0, 4),
  };
}

export function settleEventChoice(state, event, choiceId, {
  playerAction = "",
  resolvedState = null,
  localOutcome = null,
} = {}) {
  if (state?.meta?.status !== "active") throw new Error("此生命簿已经封存");
  if (state.meta.pendingResolution) throw new Error("本月已经结算，正在等待继续");
  const normalizedAction = String(playerAction || "").trim().slice(0, 120);
  const selected = event?.choices?.find((candidate) => candidate.id === choiceId);
  if (!selected && !normalizedAction) throw new Error("未找到对应选择");
  const choice = selected ?? {
    id: "free-action",
    label: normalizedAction,
    hint: "玩家自由行动",
    result: `你决定：${normalizedAction}`,
    effects: {},
  };
  const monthDelta = Number.isInteger(event?.monthDelta) ? event.monthDelta : 1;
  if (monthDelta !== 1) throw new Error("一个回合只能推进一个月");

  const next = structuredClone(resolvedState ?? state);
  if (next.meta.turn !== state.meta.turn || next.world.month !== state.world.month || next.world.year !== state.world.year) {
    throw new Error("本地结算不得提前推进月份");
  }
  applyChoiceConsequencesInPlace(next, choice);
  refreshPlayerConditionInPlace(next);
  const summary = String(localOutcome?.summary || choice.result || event.scene).slice(0, 240);
  const stateDelta = buildStateDelta(state, next);
  const pendingResolution = {
    id: `${state.meta.turn}:${String(event.id).slice(0, 40)}:${choice.id}`,
    turn: state.meta.turn,
    event: {
      id: String(event.id).slice(0, 40),
      kind: event.kind === "combat" ? "combat" : "story",
      title: String(event.title).slice(0, 18),
      scene: String(event.scene).slice(0, 72),
      source: event.source === "agnes" ? "agnes" : "offline",
      encounter: event.kind === "combat" ? structuredClone(event.encounter) : null,
    },
    choice: {
      id: String(choice.id).slice(0, 40),
      label: String(choice.label).slice(0, 120),
      action: typeof choice.action === "string" ? choice.action : null,
      playerAction: normalizedAction || null,
    },
    localOutcome: {
      status: String(localOutcome?.status || "settled").slice(0, 32),
      summary,
      stateDelta,
    },
    worldUpdate: String(event.worldUpdate || event.title).slice(0, 80),
    provider: { status: "pending", resolution: null, error: null },
  };
  next.meta.pendingResolution = pendingResolution;
  next.chronicle.push({
    year: next.world.year,
    month: next.world.month,
    age: next.player.age,
    eventTitle: pendingResolution.event.title,
    choice: pendingResolution.choice.label,
    result: summary,
  });
  return next;
}

export function completeEventResolution(state, resolution) {
  if (!state?.meta?.pendingResolution) throw new Error("没有等待主持的本月结算");
  const next = structuredClone(state);
  next.meta.pendingResolution.provider = {
    status: "complete",
    resolution: structuredClone(resolution),
    error: null,
  };
  return next;
}

export function failEventResolution(state, errorCode = "provider_error") {
  if (!state?.meta?.pendingResolution) throw new Error("没有等待主持的本月结算");
  const next = structuredClone(state);
  next.meta.pendingResolution.provider = {
    status: "failed",
    resolution: null,
    error: String(errorCode || "provider_error").slice(0, 48),
  };
  return next;
}

export function continueAfterResolution(state) {
  if (!state?.meta?.pendingResolution) throw new Error("本月尚未结算");
  if (state.meta.status !== "active") throw new Error("此生命簿已经封存");
  const next = structuredClone(state);
  const worldUpdate = next.meta.pendingResolution.worldUpdate;
  advanceOneMonthInPlace(next);
  next.world.latest = worldUpdate;
  next.meta.pendingResolution = null;
  return next;
}

export function applyChoice(state, event, choiceId) {
  if (state?.meta?.status !== "active") {
    throw new Error("此生命簿已经封存");
  }
  const choice = event?.choices?.find((candidate) => candidate.id === choiceId);
  if (!choice) {
    throw new Error("未找到对应选择");
  }
  const next = structuredClone(state);
  const monthDelta = Number.isInteger(event.monthDelta) ? event.monthDelta : 1;
  if (monthDelta !== 1) {
    throw new Error("一个回合只能推进一个月");
  }
  advanceOneMonthInPlace(next);
  next.world.latest = String(event.worldUpdate || event.title).slice(0, 200);

  applyChoiceConsequencesInPlace(next, choice);

  next.chronicle.push({
    year: next.world.year,
    month: next.world.month,
    age: next.player.age,
    eventTitle: String(event.title).slice(0, 40),
    choice: String(choice.label).slice(0, 48),
    result: String(choice.result || event.scene).slice(0, 240),
  });

  refreshPlayerConditionInPlace(next);
  return next;
}

export function resolveBreakthrough(state, route, rolls) {
  if (!route) return structuredClone(state);
  return attemptBreakthrough(state, route, rolls).state;
}

export function exportGame(state) {
  return JSON.stringify(state, null, 2);
}

export function importGame(serialized) {
  let parsed;
  try {
    parsed = JSON.parse(serialized);
  } catch {
    throw new Error("存档不是有效 JSON");
  }
  if (parsed?.meta?.schemaVersion === 1) {
    parsed = migrateVersionOne(parsed);
  }
  if (parsed?.meta?.schemaVersion === 2) {
    parsed = migrateVersionTwo(parsed);
  }
  if (parsed?.meta?.schemaVersion !== SAVE_SCHEMA_VERSION) {
    throw new Error("存档版本不受支持");
  }
  if (!parsed.player || !parsed.world || !Array.isArray(parsed.chronicle)) {
    throw new Error("存档内容不完整");
  }
  if (parsed.meta.pendingResolution === undefined) parsed.meta.pendingResolution = null;
  assertVersionThreeState(parsed);
  return structuredClone(parsed);
}

function assertVersionThreeState(state) {
  if (Object.hasOwn(state.player, "martialSoul")) {
    throw new Error("R6 存档不得保留旧武魂状态");
  }
  if (!SPIRIT_ROOT_GRADES.includes(state.player.spiritRoot?.grade)) {
    throw new Error("存档灵根品级无效");
  }
  if (
    !Array.isArray(state.player.spiritRoot.elements) ||
    state.player.spiritRoot.elements.length === 0 ||
    state.player.spiritRoot.elements.some((element) => !SPIRIT_ROOT_ELEMENTS.has(element))
  ) {
    throw new Error("存档灵根元素无效");
  }
  if (
    !state.player.inventory ||
    Object.values(state.player.inventory).some((quantity) => !Number.isInteger(quantity) || quantity < 0)
  ) {
    throw new Error("存档背包数量无效");
  }
  if (
    !state.player.techniqueBuild ||
    !Array.isArray(state.player.techniqueBuild.known) ||
    !state.player.techniqueBuild.known.includes(state.player.techniqueBuild.main) ||
    !Array.isArray(state.player.techniqueBuild.supports) ||
    state.player.techniqueBuild.supports.length > 2
  ) {
    throw new Error("存档功法构筑无效");
  }
  if (!state.player.crafts || !state.player.cave || !Array.isArray(state.player.relationships)) {
    throw new Error("存档生活系统不完整");
  }
  if (!Array.isArray(state.world.npcs) || !state.world.market?.prices) {
    throw new Error("存档世界生态不完整");
  }
}

function migrateVersionTwo(state) {
  const migrated = structuredClone(state);
  const playerFoundation = createPlayerFoundation();
  const worldFoundation = createWorldFoundation();
  const legacyElement = String(migrated.player?.martialSoul?.attribute || "金");
  const primaryElement = SPIRIT_ROOT_ELEMENTS.has(legacyElement) ? legacyElement : "金";
  const grade = ["雷", "风", "冰"].includes(primaryElement) ? "变异灵根" : "真灵根";

  migrated.meta.schemaVersion = SAVE_SCHEMA_VERSION;
  migrated.player.spiritRoot = {
    grade,
    elements: [primaryElement],
    primaryElement,
    coefficient: SPIRIT_ROOT_COEFFICIENTS[grade],
  };
  delete migrated.player.martialSoul;
  migrated.player.progression = playerFoundation.progression;
  migrated.player.inventory = playerFoundation.inventory;
  migrated.player.techniqueBuild = playerFoundation.techniqueBuild;
  migrated.player.crafts = playerFoundation.crafts;
  migrated.player.cave = playerFoundation.cave;
  migrated.player.relationships = playerFoundation.relationships;
  migrated.player.sect = {
    name: migrated.player.sect?.name || "散修",
    position: migrated.player.sect?.position || "无",
    contribution: Math.max(0, Number(migrated.player.sect?.contribution) || 0),
    reputation: Math.max(0, Number(migrated.player.sect?.reputation) || 0),
    joinedAtTurn: migrated.player.sect?.joinedAtTurn ?? null,
  };
  migrated.world.npcs = worldFoundation.npcs;
  migrated.world.market = worldFoundation.market;
  migrated.world.ecologyLog = worldFoundation.ecologyLog;
  return migrated;
}

function migrateVersionOne(state) {
  const migrated = structuredClone(state);
  const legacyStats = migrated.player?.stats ?? {};
  const normalizeLegacyStat = (value) => clamp(Math.round((Number(value) || 50) / 5), 1, 20);
  const legacyVitality = clamp(Number(legacyStats.vitality) || 100, 0, 100);
  const legacyWound = clamp(Number(legacyStats.wound) || 0, 0, 100);

  migrated.meta.schemaVersion = SAVE_SCHEMA_VERSION;
  migrated.meta.elapsedMonths = Number(migrated.meta.turn || 0);
  migrated.player.daoName = migrated.player.daoName || `玄${String(migrated.player.name || "无名").slice(-1)}`;
  migrated.player.path = migrated.player.path || "随心所欲";
  migrated.player.constitution = migrated.player.constitution || "凡体";
  migrated.player.talent = migrated.player.talent || "旧命余痕";
  migrated.player.appearance = migrated.player.appearance || "清秀";
  migrated.player.realmStage = migrated.player.realmStage || "初期";
  migrated.player.stats = Object.fromEntries(
    [...STAT_KEYS].map((key) => [key, normalizeLegacyStat(legacyStats[key])]),
  );
  migrated.player.resources = {
    vitality: legacyVitality,
    maxVitality: 100,
    spirit: 100,
    maxSpirit: 100,
    wound: legacyWound,
    spiritStones: Number(migrated.player.resources?.spiritStones) || 0,
    merit: 0,
    karma: 0,
    reputation: Number(migrated.player.resources?.reputation) || 0,
  };
  migrated.player.sect = migrated.player.sect || { name: "散修", position: "无" };
  migrated.player.location = migrated.player.location || migrated.player.birthplace || "北境";
  migrated.player.abnormal = legacyWound > 0 ? "轻伤" : "无";
  migrated.player.mainGoal = migrated.player.mainGoal || PATH_GOALS[migrated.player.path];
  migrated.world.month = migrated.world.month || 1;
  migrated.world.season = migrated.world.season || SEASONS[migrated.world.month - 1];
  migrated.chronicle = migrated.chronicle.map((entry) => ({ month: 1, ...entry }));
  return migrated;
}
