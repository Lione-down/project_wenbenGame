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

export const TIME_ACTIVITY_CONFIG = Object.freeze({
  dialogue: { passiveCultivation: 0.6, martialInsight: 0.05, techniqueUnderstanding: 0.08, martialMind: 0.08, adventure: 0.1 },
  mainline: { passiveCultivation: 0.5, martialInsight: 0.35, techniqueUnderstanding: 0.2, martialMind: 0.25, adventure: 0.8 },
  travel: { passiveCultivation: 0.4, martialInsight: 0.15, techniqueUnderstanding: 0.15, martialMind: 0.12, adventure: 0.55 },
  secretRealm: { passiveCultivation: 0.7, martialInsight: 0.5, techniqueUnderstanding: 0.45, martialMind: 0.3, adventure: 1 },
  combat: { passiveCultivation: 0.2, martialInsight: 1.2, techniqueUnderstanding: 0.35, martialMind: 0.5, adventure: 1.1 },
  sect: { passiveCultivation: 0.6, martialInsight: 0.25, techniqueUnderstanding: 0.25, martialMind: 0.18, adventure: 0.45 },
  craft: { passiveCultivation: 0.3, martialInsight: 0.08, techniqueUnderstanding: 0.6, martialMind: 0.16, adventure: 0.25 },
  healing: { passiveCultivation: 0.2, martialInsight: 0.02, techniqueUnderstanding: 0.05, martialMind: 0.1, adventure: 0.05 },
  retreat: { passiveCultivation: 1.4, martialInsight: 0.12, techniqueUnderstanding: 0.5, martialMind: 0.35, adventure: 0 },
  sealed: { passiveCultivation: 0, martialInsight: 0, techniqueUnderstanding: 0, martialMind: 0.05, adventure: 0 },
});

const MARTIAL_SKILL_FOUNDATION = Object.freeze([
  { id: "basic-palm", name: "《基础吐纳掌》", type: "掌法", element: "neutral", power: 1, spiritCost: 4, mastery: 0 },
]);

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

function advanceCalendarMonthInPlace(state, { incrementTurn = true } = {}) {
  if (incrementTurn) state.meta.turn += 1;
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

function advanceOneMonthInPlace(state) {
  advanceCalendarMonthInPlace(state, { incrementTurn: true });
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

function ensureGrowthState(state) {
  state.player.growth ??= {
    martialInsight: 0,
    techniqueUnderstanding: 0,
    martialMind: 0,
    adventureAccumulation: 0,
    cultivationRemainder: 0,
    realmDays: 0,
    recentActivities: [],
  };
  state.meta.elapsedDays ??= Number(state.meta.elapsedMonths || 0) * 30;
  state.world.day ??= 1;
}

function activityGrowth(state, durationDays, activityType) {
  const config = TIME_ACTIVITY_CONFIG[activityType];
  if (!config) throw new Error("活动类型无效");
  const blocked = state.player.abnormal === "垂死" || state.player.resources.wound >= 85;
  const calculation = calculateMonthlyCultivation(state, { mode: "normal" });
  const monthFraction = durationDays / 30;
  return {
    config,
    cultivationRaw: blocked ? 0 : calculation.monthlyGain * config.passiveCultivation * monthFraction,
    martialInsight: config.martialInsight * durationDays,
    techniqueUnderstanding: config.techniqueUnderstanding * durationDays,
    martialMind: config.martialMind * durationDays,
    adventure: config.adventure * durationDays,
    blocked,
  };
}

export function advanceGameTime(state, {
  durationDays,
  activityType = "mainline",
  eventTitle = "岁月流转",
  result = "时间依照行动本身流逝。",
  worldUpdate = result,
  recordChronicle = true,
} = {}) {
  if (state?.meta?.status !== "active") throw new Error("此生命簿已经封存");
  if (!Number.isInteger(durationDays) || durationDays <= 0 || durationDays > 3650) {
    throw new Error("活动耗时必须是 1 到 3650 天的整数");
  }
  const next = structuredClone(state);
  ensureGrowthState(next);
  const growth = activityGrowth(next, durationDays, activityType);
  const cultivationTotal = growth.cultivationRaw + next.player.growth.cultivationRemainder;
  const cultivationGain = Math.floor(cultivationTotal);
  next.player.growth.cultivationRemainder = cultivationTotal - cultivationGain;
  next.player.cultivation += cultivationGain;
  next.player.growth.martialInsight += growth.martialInsight;
  next.player.growth.techniqueUnderstanding += growth.techniqueUnderstanding;
  next.player.growth.martialMind += growth.martialMind;
  next.player.growth.adventureAccumulation += growth.adventure;
  next.player.growth.realmDays += durationDays;
  next.meta.turn += 1;

  for (let day = 0; day < durationDays; day += 1) {
    next.meta.elapsedDays += 1;
    next.world.day += 1;
    if (next.world.day > 30) {
      next.world.day = 1;
      advanceCalendarMonthInPlace(next, { incrementTurn: false });
    }
  }
  next.player.growth.recentActivities.push({
    turn: next.meta.turn,
    activityType,
    durationDays,
    cultivationGain,
    blocked: growth.blocked,
  });
  const cutoff = Math.max(0, next.meta.elapsedDays - 720);
  next.player.growth.recentActivities = next.player.growth.recentActivities
    .filter((entry) => (entry.elapsedDay ?? next.meta.elapsedDays) >= cutoff)
    .slice(-120)
    .map((entry) => ({ ...entry, elapsedDay: entry.elapsedDay ?? next.meta.elapsedDays }));
  next.world.latest = String(worldUpdate).slice(0, 200);
  next.world.danger = assessWorldDanger(next);
  if (next.meta.turn % 3 === 0) advanceAntagonistPlansInPlace(next);
  const timeSummary = `${String(result).slice(0, 200)}（耗时 ${durationDays} 天，被动修为 +${cultivationGain}）`;
  if (recordChronicle) {
    next.chronicle.push({
      year: next.world.year,
      month: next.world.month,
      day: next.world.day,
      age: next.player.age,
      eventTitle: String(eventTitle).slice(0, 40),
      result: timeSummary,
    });
  } else if (next.chronicle.length > 0) {
    next.chronicle.at(-1).year = next.world.year;
    next.chronicle.at(-1).month = next.world.month;
    next.chronicle.at(-1).day = next.world.day;
    next.chronicle.at(-1).age = next.player.age;
    next.chronicle.at(-1).result = timeSummary;
  }
  return next;
}

export function assessWorldDanger(state) {
  const reputation = Math.max(0, Number(state.player?.resources?.reputation) || 0);
  const karma = Math.max(0, Number(state.player?.resources?.karma) || 0);
  const rareInventory = Object.entries(state.player?.inventory || {})
    .filter(([itemId, quantity]) => quantity > 0 && new Set(["daoFragment", "rootOrb", "divineCrystal", "starIron"]).has(itemId))
    .reduce((total, [, quantity]) => total + Number(quantity), 0);
  const activeAntagonists = (state.world?.antagonists || []).filter((entry) => entry.active !== false);
  const knownIntel = activeAntagonists.reduce(
    (total, antagonist) => total + (Array.isArray(antagonist.knownIntel) ? antagonist.knownIntel.length : 0),
    0,
  );
  const score = clamp(Math.round(18 + reputation * 0.15 + karma * 0.5 + rareInventory * 6 + activeAntagonists.length * 4 + knownIntel * 3), 0, 100);
  const level = score >= 80 ? "绝险" : score >= 60 ? "高危" : score >= 35 ? "中危" : "低危";
  const reasons = [];
  if (reputation >= 50) reasons.push("名声已足以引来强敌注意");
  if (karma >= 20) reasons.push("恶业积累正在反噬因果");
  if (rareInventory > 0) reasons.push("持有珍稀资产可能招来觊觎");
  if (knownIntel > 0) reasons.push("敌对势力已掌握玩家相关线索");
  if (reasons.length === 0) reasons.push("声名未显，但世界仍会独立运转");
  return { level, score, reasons };
}

function advanceAntagonistPlansInPlace(state) {
  for (const antagonist of state.world?.antagonists || []) {
    if (antagonist.active === false) continue;
    const intel = Array.isArray(antagonist.knownIntel) ? antagonist.knownIntel : [];
    antagonist.currentPlan = intel.length >= 2
      ? antagonist.longPlan
      : intel.length === 1
        ? antagonist.shortPlan
        : "继续收集商队、驿站与药材流向，不贸然暴露暗线";
    antagonist.planHistory ??= [];
    antagonist.planHistory.push({
      turn: state.meta.turn,
      knownIntel: intel.slice(-6),
      plan: antagonist.currentPlan,
    });
    if (antagonist.planHistory.length > 24) antagonist.planHistory.splice(0, antagonist.planHistory.length - 24);
  }
}

export function advanceAntagonistPlans(state) {
  const next = structuredClone(state);
  advanceAntagonistPlansInPlace(next);
  next.world.danger = assessWorldDanger(next);
  return next;
}

export function convertExperienceDuringRetreat(state, { durationDays = 30 } = {}) {
  if (!Number.isInteger(durationDays) || durationDays <= 0) throw new Error("闭关时长无效");
  const available = Math.max(0, Number(state.player.growth?.adventureAccumulation || 0));
  const conversionCap = durationDays * 1.5;
  const consumed = Math.min(available * 0.15, conversionCap);
  const convertedCultivation = Math.floor(consumed * (0.7 + state.player.stats.insight * 0.03));
  const next = advanceGameTime(state, {
    durationDays,
    activityType: "retreat",
    eventTitle: "闭关融会历练",
    result: `${state.player.name}将过往历练逐一融入功法周天。`,
  });
  next.player.growth.adventureAccumulation = Math.max(0, next.player.growth.adventureAccumulation - consumed);
  next.player.cultivation += convertedCultivation;
  return { state: next, convertedCultivation, consumedExperience: consumed };
}

export function getGrowthPacingStatus(state) {
  const growth = state.player.growth || {};
  if (state.player.abnormal === "垂死" || state.player.resources.wound >= 85) {
    return { isWarning: false, reason: "重伤或垂死状态造成合理停滞", recommendation: "先养伤" };
  }
  const activities = Array.isArray(growth.recentActivities) ? growth.recentActivities : [];
  const recentDays = activities.reduce((total, entry) => total + Number(entry.durationDays || 0), 0);
  const recentGain = activities.reduce((total, entry) => total + Number(entry.cultivationGain || 0), 0);
  const expected = recentDays > 0 ? Math.max(1, recentDays / 30 * getRealmCurve(state.player.realmIndex).monthlyBase * 0.35) : 0;
  const isWarning = growth.realmDays >= 360 && recentGain < expected;
  return {
    isWarning,
    reason: isWarning ? "积极历练但近期成长低于合理区间" : "成长节奏处于合理区间",
    recommendation: isWarning ? "安排自由成长期并提高历练转化机会" : "保持当前节奏",
  };
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
      heldMaterialLabels: Object.entries(materials).map(
        ([itemId, quantity]) => `${ITEM_LABELS[itemId] ?? itemId} ${state.player.inventory[itemId] ?? 0}/${quantity}`,
      ),
      missingMaterials: Object.fromEntries(Object.entries(materials).flatMap(([itemId, quantity]) => {
        const missing = Math.max(0, quantity - (state.player.inventory[itemId] ?? 0));
        return missing > 0 ? [[itemId, missing]] : [];
      })),
      missingMaterialLabels: Object.entries(materials).flatMap(([itemId, quantity]) => {
        const missing = Math.max(0, quantity - (state.player.inventory[itemId] ?? 0));
        return missing > 0 ? [`${ITEM_LABELS[itemId] ?? itemId} ×${missing}`] : [];
      }),
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
    knowledge: [{
      id: "基础引气诀",
      name: "《基础引气诀》",
      category: "功法",
      mastery: 1,
      depth: "入门",
      sourceEventId: "fate-book-opening",
    }, {
      id: "基础吐纳掌",
      name: "《基础吐纳掌》",
      category: "武技",
      mastery: 0,
      depth: "未入门",
      sourceEventId: "fate-book-opening",
    }],
    martialSkills: structuredClone(MARTIAL_SKILL_FOUNDATION),
    growth: {
      martialInsight: 0,
      techniqueUnderstanding: 0,
      martialMind: 0,
      adventureAccumulation: 0,
      cultivationRemainder: 0,
      realmDays: 0,
      recentActivities: [],
    },
  };
}

function createWorldFoundation() {
  return {
    npcs: [],
    npcKnowledge: {},
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
        artifact: 180,
        talisman: 72,
        formationPlate: 220,
        beastContract: 160,
        windHyacinth: 36,
        divineCrystal: 1800,
        embroideredDew: 680,
        yimuQi: 420,
        starIron: 1500,
        beastFang: 48,
        beastHide: 66,
        frostScale: 240,
      },
      lastRefreshTurn: 0,
    },
    ecologyLog: [],
    danger: { level: "低危", score: 18, reasons: ["初入武道，声名未显"] },
    antagonists: [],
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

  const state = {
    meta: {
      schemaVersion: SAVE_SCHEMA_VERSION,
      status: "active",
      seed: normalizedSeed,
      turn: 0,
      elapsedMonths: 0,
      elapsedDays: 0,
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
        history: [],
      },
      location: profile.birthplace.trim().slice(0, 24),
      abnormal: "无",
      mainGoal: PATH_GOALS[profile.path] ?? PATH_GOALS["随心所欲"],
      ...playerFoundation,
    },
    world: {
      year: 1127,
      month: 1,
      day: 1,
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
    recentEvents: [],
    memories: [],
    historySummary: [],
    agent: {
      effectiveEventCount: 0,
      usage: {
        lastPromptTokens: 0,
        promptTokens20: [],
        avgPromptTokens20: 0,
        maxPromptTokens: 0,
      },
    },
  };
  for (const technique of techniques) {
    const id = technique.replace(/^《|》$/gu, "");
    if (!state.player.knowledge.some((entry) => entry.id === id)) {
      recordKnowledge(state, technique, { masteryGain: 1, sourceEventId: "fate-book-opening", category: "功法" });
      if (!state.player.techniqueBuild.known.includes(id)) state.player.techniqueBuild.known.push(id);
    }
  }
  return state;
}

function assertNpcIdentity(npc) {
  if (!npc || typeof npc !== "object") throw new Error("NPC 资料无效");
  for (const key of ["id", "name", "gender", "species"]) {
    if (typeof npc[key] !== "string" || !npc[key].trim()) throw new Error(`NPC ${key} 不能为空`);
  }
  if (!Number.isInteger(npc.realmIndex) || npc.realmIndex < 0 || npc.realmIndex >= REALMS.length) {
    throw new Error("NPC 修为无效");
  }
  if (!Number.isInteger(npc.stageIndex) || npc.stageIndex < 0 || npc.stageIndex >= STAGES.length) {
    throw new Error("NPC 小境界无效");
  }
}

export function registerNpcEncounter(state, npc, interaction = {}) {
  assertNpcIdentity(npc);
  const next = structuredClone(state);
  const id = npc.id.trim().slice(0, 48);
  const context = String(interaction.context || "current");
  let record = next.world.npcs.find((candidate) => candidate.id === id);
  if (record && !record.alive && npc.alive !== false && context !== "memory") {
    throw new Error("死亡 NPC 不得复活或重新在当前剧情行动");
  }
  if (!record) {
    record = {
      id,
      name: npc.name.trim().slice(0, 20),
      gender: npc.gender.trim().slice(0, 20),
      species: npc.species.trim().slice(0, 20),
      realmIndex: npc.realmIndex,
      stageIndex: npc.stageIndex,
      stage: STAGES[npc.stageIndex],
      cultivation: Math.max(0, Math.floor(Number(npc.cultivation) || 0)),
      ageMonths: Math.max(0, Math.floor(Number(npc.ageMonths) || 18 * 12)),
      lifespan: Math.max(1, Math.floor(Number(npc.lifespan) || 100 + npc.realmIndex * 60)),
      alive: npc.alive !== false,
      deathCause: npc.alive === false ? String(npc.deathCause || "死因未记载").slice(0, 80) : null,
      deathTurn: npc.alive === false ? next.meta.turn : null,
      goal: String(npc.goal || "去向未明").slice(0, 100),
      bonds: [],
      interactions: [],
    };
    next.world.npcs.push(record);
  }
  record.interactions ??= [];
  record.interactions.push({
    turn: next.meta.turn,
    year: next.world.year,
    month: next.world.month,
    day: next.world.day ?? 1,
    eventId: String(interaction.eventId || "unknown").slice(0, 48),
    context: context === "memory" ? "memory" : "current",
    summary: String(interaction.summary || "与玩家有过一面之缘").slice(0, 160),
  });
  if (record.interactions.length > 40) record.interactions.splice(0, record.interactions.length - 40);

  const known = next.player.npcs.find((candidate) => candidate.id === id || candidate.name === record.name);
  if (known) {
    known.id = id;
    known.gender = record.gender;
    known.species = record.species;
    known.realmIndex = record.realmIndex;
    known.stageIndex = record.stageIndex;
    known.alive = record.alive;
    known.deathCause = record.deathCause;
  } else {
    next.player.npcs.push({
      id,
      name: record.name,
      gender: record.gender,
      species: record.species,
      realmIndex: record.realmIndex,
      stageIndex: record.stageIndex,
      alive: record.alive,
      deathCause: record.deathCause,
      role: String(npc.role || "途中所遇").slice(0, 24),
      stance: "初识",
      goal: record.goal,
      relation: 0,
    });
  }
  if (context !== "memory") {
    const relationship = next.player.relationships.find((candidate) => candidate.npcId === id);
    if (!relationship) {
      next.player.relationships.push({
        npcId: id,
        name: record.name,
        affection: 0,
        stage: "初识",
        bond: "主线人物",
        romanceEnabled: false,
      });
    } else {
      relationship.name = record.name;
    }
  }
  return next;
}

export function markNpcDead(state, npcId, deathCause) {
  const next = structuredClone(state);
  const npc = next.world.npcs.find((candidate) => candidate.id === npcId);
  if (!npc) throw new Error("NPC 不存在");
  if (!npc.alive) return next;
  npc.alive = false;
  npc.deathCause = String(deathCause || "死因未记载").slice(0, 80);
  npc.deathTurn = next.meta.turn;
  const known = next.player.npcs.find((candidate) => candidate.id === npcId || candidate.name === npc.name);
  if (known) {
    known.alive = false;
    known.deathCause = npc.deathCause;
  }
  logEcology(next, { type: "death", npcId, text: `${npc.name}${npc.deathCause}，身死道消。` });
  return next;
}

export function getNpcDossier(state, npcId) {
  const npc = state.world.npcs.find((candidate) => candidate.id === npcId);
  if (!npc) throw new Error("NPC 不存在");
  return {
    ...structuredClone(npc),
    realm: `${REALMS[npc.realmIndex]}·${STAGES[npc.stageIndex]}`,
    interactions: structuredClone(npc.interactions || []),
  };
}

function knowledgeDepth(mastery) {
  if (mastery <= 0) return "未入门";
  if (mastery < 25) return "入门";
  if (mastery < 50) return "小成";
  if (mastery < 80) return "大成";
  return "圆满";
}

function inferKnowledgeCategory(name) {
  if (name.includes("阵")) return "阵法";
  if (/[剑刀枪拳掌指爪棍戟式]/u.test(name)) return "武技";
  if (/[步身法遁]/u.test(name)) return "身法";
  if (/[丹器符植兽炼]/u.test(name)) return "技艺";
  return "功法";
}

function recordKnowledge(state, rawName, { masteryGain = 1, sourceEventId = "unknown", category = "" } = {}) {
  const name = String(rawName || "").trim().slice(0, 40);
  if (!name) return;
  const id = name.replace(/^《|》$/gu, "");
  const resolvedCategory = category || inferKnowledgeCategory(id);
  state.player.knowledge ??= [];
  let entry = state.player.knowledge.find((candidate) => candidate.id === id);
  if (!entry) {
    entry = { id, name: `《${id}》`, category: resolvedCategory, mastery: 0, depth: "未入门", sourceEventId };
    state.player.knowledge.push(entry);
  }
  entry.mastery = clamp((Number(entry.mastery) || 0) + masteryGain, 0, 100);
  entry.depth = knowledgeDepth(entry.mastery);
  entry.category = resolvedCategory;
  if (entry.sourceEventId === "unknown") entry.sourceEventId = sourceEventId;
}

function applyChoiceConsequencesInPlace(state, choice, eventId = "unknown") {
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
  for (const gain of Array.isArray(choice.skillExperience) ? choice.skillExperience : []) {
    const skill = state.player.martialSkills?.find((entry) => entry.id === gain.skillId);
    if (!skill) throw new Error("不能为未习得武技增加熟练度");
    skill.mastery = clamp((Number(skill.mastery) || 0) + clamp(Number(gain.value) || 0, 0, 20), 0, 100);
    recordKnowledge(state, skill.name, { masteryGain: clamp(Number(gain.value) || 0, 0, 20), sourceEventId: eventId, category: "武技" });
  }

  if (typeof choice.gainTechnique === "string") {
    const technique = choice.gainTechnique.trim().slice(0, 40);
    if (technique && !state.player.techniques.includes(technique)) {
      state.player.techniques.push(technique);
    }
    if (technique) {
      const category = inferKnowledgeCategory(technique);
      recordKnowledge(state, technique, { masteryGain: 1, sourceEventId: eventId, category });
      const buildName = technique.replace(/^《|》$/gu, "");
      if (category === "功法" && !state.player.techniqueBuild.known.includes(buildName)) {
        state.player.techniqueBuild.known.push(buildName);
      }
    }
  }

  if (choice.npc && typeof choice.npc === "object") {
    const name = String(choice.npc.name || "").trim().slice(0, 16);
    if (name) {
      const relationDelta = clamp(Number(choice.npc.relationDelta) || 0, -30, 30);
      const existing = state.player.npcs.find((npc) => npc.name === name);
      if (existing) {
        existing.relation = clamp((Number(existing.relation) || 0) + relationDelta, -100, 100);
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
      const worldNpc = state.world.npcs.find((npc) => npc.name === name);
      if (worldNpc) {
        let relationship = state.player.relationships.find((entry) => entry.npcId === worldNpc.id);
        if (!relationship) {
          relationship = { npcId: worldNpc.id, name, affection: 0, stage: "初识", bond: "主线人物", romanceEnabled: false };
          state.player.relationships.push(relationship);
        }
        relationship.affection = clamp((Number(relationship.affection) || 0) + relationDelta, 0, 120);
        relationship.stage = relationship.affection >= 80 ? "道侣"
          : relationship.affection >= 60 ? "暧昧"
            : relationship.affection >= 40 ? "知己"
              : relationship.affection >= 20 ? "相识" : "初识";
      }
    }
  }

  if (choice.sectUpdate && typeof choice.sectUpdate === "object") {
    const update = choice.sectUpdate;
    const name = String(update.name || "").trim().slice(0, 24);
    if (!name) throw new Error("主线宗门更新缺少宗门名称");
    if (state.player.sect.name !== "散修" && state.player.sect.name !== name) {
      throw new Error("主线宗门更新与当前宗门冲突");
    }
    state.player.sect.name = name;
    state.player.sect.position = String(update.position || state.player.sect.position).trim().slice(0, 24);
    state.player.sect.contribution = Math.max(0, state.player.sect.contribution + clamp(Number(update.contributionDelta) || 0, -20, 20));
    state.player.sect.reputation = Math.max(0, state.player.sect.reputation + clamp(Number(update.reputationDelta) || 0, -20, 20));
    state.player.sect.joinedAtTurn ??= state.meta.turn;
    state.player.sect.history ??= [];
    state.player.sect.history.push({
      turn: state.meta.turn,
      year: state.world.year,
      month: state.world.month,
      eventId: String(eventId).slice(0, 48),
      record: String(update.record || "宗门记录更新").slice(0, 80),
    });
    if (state.player.sect.history.length > 60) state.player.sect.history.splice(0, state.player.sect.history.length - 60);
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
  const timeCostDays = Number.isInteger(event?.timeCostDays)
    ? event.timeCostDays
    : (Number.isInteger(event?.monthDelta) ? event.monthDelta * 30 : 1);
  if (timeCostDays <= 0 || timeCostDays > 3650) throw new Error("事件耗时超出规则范围");

  let next = structuredClone(resolvedState ?? state);
  if (next.meta.turn !== state.meta.turn || next.world.month !== state.world.month || next.world.year !== state.world.year) {
    throw new Error("本地结算不得提前推进月份");
  }
  const combatNpc = event.encounter ? {
    id: event.encounter.npcId || `encounter-${String(event.id).slice(0, 32)}`,
    name: event.encounter.npcName,
    gender: event.encounter.gender,
    species: event.encounter.species,
    realmIndex: Number.isInteger(event.encounter.realmIndex) ? event.encounter.realmIndex : next.player.realmIndex,
    stageIndex: Number.isInteger(event.encounter.stageIndex) ? event.encounter.stageIndex : 0,
    goal: event.encounter.reason,
    alive: true,
  } : null;
  const encounteredNpcs = [
    ...(Array.isArray(event.encounterNpcs) ? event.encounterNpcs : []),
    event.encounterNpc,
    combatNpc,
  ].filter(Boolean);
  for (const encountered of encounteredNpcs) {
    if (!encountered?.id || !encountered?.name || !encountered?.gender || !encountered?.species) continue;
    next = registerNpcEncounter(next, encountered, {
      eventId: event.id,
      summary: String(localOutcome?.summary || choice.result || event.scene),
    });
  }
  applyChoiceConsequencesInPlace(next, choice, event.id);
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
    timeCostDays,
    activityType: TIME_ACTIVITY_CONFIG[event.activityType] ? event.activityType : (event.kind === "combat" ? "combat" : "mainline"),
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
  const pending = structuredClone(state.meta.pendingResolution);
  const base = structuredClone(state);
  base.meta.pendingResolution = null;
  return advanceGameTime(base, {
    durationDays: pending.timeCostDays || 30,
    activityType: pending.activityType || "mainline",
    eventTitle: pending.event.title,
    result: pending.localOutcome.summary,
    worldUpdate: pending.worldUpdate,
    recordChronicle: false,
  });
}

export function applyChoice(state, event, choiceId) {
  if (state?.meta?.status !== "active") {
    throw new Error("此生命簿已经封存");
  }
  const choice = event?.choices?.find((candidate) => candidate.id === choiceId);
  if (!choice) {
    throw new Error("未找到对应选择");
  }
  let next = Number.isInteger(event.timeCostDays)
    ? advanceGameTime(state, {
      durationDays: event.timeCostDays,
      activityType: TIME_ACTIVITY_CONFIG[event.activityType] ? event.activityType : (event.kind === "combat" ? "combat" : "mainline"),
      eventTitle: event.title,
      result: choice.result || event.scene,
      worldUpdate: event.worldUpdate || event.title,
    })
    : advanceOneMonth(state, {
      eventTitle: event.title,
      result: choice.result || event.scene,
      worldUpdate: event.worldUpdate || event.title,
    });

  applyChoiceConsequencesInPlace(next, choice);
  next.chronicle.at(-1).choice = String(choice.label).slice(0, 48);

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
  if (parsed?.meta?.schemaVersion === 3) {
    parsed = migrateVersionThree(parsed);
  }
  if (parsed?.meta?.schemaVersion !== SAVE_SCHEMA_VERSION) {
    throw new Error("存档版本不受支持");
  }
  if (!parsed.player || !parsed.world || !Array.isArray(parsed.chronicle)) {
    throw new Error("存档内容不完整");
  }
  if (parsed.meta.pendingResolution === undefined) parsed.meta.pendingResolution = null;
  assertVersionFourState(parsed);
  return structuredClone(parsed);
}

function assertVersionFourState(state) {
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
  if (!state.player.crafts || !state.player.cave || !Array.isArray(state.player.relationships) || !Array.isArray(state.player.knowledge)) {
    throw new Error("存档生活系统不完整");
  }
  if (!Array.isArray(state.world.npcs) || !state.world.market?.prices) {
    throw new Error("存档世界生态不完整");
  }
  if (!state.player.growth || !Array.isArray(state.player.martialSkills) || !Number.isInteger(state.world.day)) {
    throw new Error("存档时间成长系统不完整");
  }
}

function migrateVersionThree(state) {
  const migrated = structuredClone(state);
  const playerFoundation = createPlayerFoundation();
  const worldFoundation = createWorldFoundation();
  migrated.meta.schemaVersion = SAVE_SCHEMA_VERSION;
  migrated.meta.elapsedDays ??= Number(migrated.meta.elapsedMonths || 0) * 30;
  migrated.player.martialSkills ??= playerFoundation.martialSkills;
  migrated.player.growth ??= playerFoundation.growth;
  const needsKnowledgeMigration = !Array.isArray(migrated.player.knowledge);
  if (needsKnowledgeMigration) migrated.player.knowledge = [];
  migrated.player.sect ??= { name: "散修", position: "无", contribution: 0, reputation: 0, joinedAtTurn: null, history: [] };
  migrated.player.sect.history ??= [];
  if (needsKnowledgeMigration) {
    for (const technique of migrated.player.techniques || []) {
      recordKnowledge(migrated, technique, { masteryGain: 1, sourceEventId: "save-migration" });
    }
    for (const skill of migrated.player.martialSkills || []) {
      recordKnowledge(migrated, skill.name, { masteryGain: Number(skill.mastery) || 0, sourceEventId: "save-migration", category: "武技" });
    }
  }
  migrated.world.day ??= 1;
  migrated.world.npcKnowledge ??= {};
  migrated.world.danger ??= worldFoundation.danger;
  migrated.world.antagonists ??= worldFoundation.antagonists;
  migrated.world.market ??= structuredClone(worldFoundation.market);
  migrated.world.market.prices = {
    ...worldFoundation.market.prices,
    ...(migrated.world.market.prices || {}),
  };
  const knownNpcIds = new Set((migrated.player.npcs || []).map((npc) => npc.id).filter(Boolean));
  const knownNpcNames = new Set((migrated.player.npcs || []).map((npc) => npc.name).filter(Boolean));
  for (const relationship of migrated.player.relationships || []) {
    if (relationship.npcId) knownNpcIds.add(relationship.npcId);
    if (relationship.name) knownNpcNames.add(relationship.name);
  }
  const legacySeedIds = new Set(["lin-xuan", "shen-qingli", "su-linger"]);
  migrated.world.npcs = (migrated.world.npcs || []).filter((npc) => (
    !legacySeedIds.has(npc.id)
    || (Array.isArray(npc.interactions) && npc.interactions.length > 0)
    || knownNpcIds.has(npc.id)
    || knownNpcNames.has(npc.name)
  )).map((npc) => ({
    species: "人族",
    interactions: [],
    ...npc,
  }));
  migrated.world.antagonists = (migrated.world.antagonists || []).filter((antagonist) => (
    antagonist.id !== "black-arrow-broker"
    || (Array.isArray(antagonist.knownIntel) && antagonist.knownIntel.length > 0)
    || (Array.isArray(antagonist.planHistory) && antagonist.planHistory.length > 0)
    || knownNpcIds.has(antagonist.id)
    || knownNpcNames.has(antagonist.name)
  ));
  migrated.recentEvents ??= [];
  migrated.memories ??= [];
  migrated.historySummary ??= [];
  migrated.agent ??= {
    effectiveEventCount: 0,
    usage: {
      lastPromptTokens: 0,
      promptTokens20: [],
      avgPromptTokens20: 0,
      maxPromptTokens: 0,
    },
  };
  return migrated;
}

function migrateVersionTwo(state) {
  const migrated = structuredClone(state);
  const playerFoundation = createPlayerFoundation();
  const worldFoundation = createWorldFoundation();
  const legacyElement = String(migrated.player?.martialSoul?.attribute || "金");
  const primaryElement = SPIRIT_ROOT_ELEMENTS.has(legacyElement) ? legacyElement : "金";
  const grade = ["雷", "风", "冰"].includes(primaryElement) ? "变异灵根" : "真灵根";

  migrated.meta.schemaVersion = 3;
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
    history: Array.isArray(migrated.player.sect?.history) ? migrated.player.sect.history : [],
  };
  migrated.world.npcs = worldFoundation.npcs;
  migrated.world.market = worldFoundation.market;
  migrated.world.ecologyLog = worldFoundation.ecologyLog;
  return migrateVersionThree(migrated);
}

function migrateVersionOne(state) {
  const migrated = structuredClone(state);
  const legacyStats = migrated.player?.stats ?? {};
  const normalizeLegacyStat = (value) => clamp(Math.round((Number(value) || 50) / 5), 1, 20);
  const legacyVitality = clamp(Number(legacyStats.vitality) || 100, 0, 100);
  const legacyWound = clamp(Number(legacyStats.wound) || 0, 0, 100);

  migrated.meta.schemaVersion = 2;
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
  return migrateVersionTwo(migrated);
}
