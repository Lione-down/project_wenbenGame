import { advanceOneMonth } from "./game-engine.mjs";

export const ITEM_CATALOG = Object.freeze({
  herb: { name: "天材灵药", category: "material" },
  ore: { name: "玄铁矿", category: "material" },
  talismanPaper: { name: "灵符纸", category: "material" },
  spiritSeed: { name: "灵植种子", category: "material" },
  beastFood: { name: "灵兽口粮", category: "material" },
  breakthroughPill: { name: "破境丹", category: "pill" },
  earthEssence: { name: "地脉灵髓", category: "material" },
  daoFragment: { name: "道韵残片", category: "material" },
  rootOrb: { name: "本命灵珠", category: "material" },
  artifact: { name: "制式玄器", category: "equipment" },
  talisman: { name: "护身符", category: "consumable" },
  formationPlate: { name: "聚元阵盘", category: "equipment" },
  beastContract: { name: "御兽契印", category: "consumable" },
  windHyacinth: { name: "风信子", category: "spirit-herb", tier: "低阶", use: "炼制风属性丹药" },
  divineCrystal: { name: "神宇净晶", category: "rare-material", tier: "高阶", use: "净化神魂与阵基" },
  embroideredDew: { name: "百绣蕴文露", category: "spirit-liquid", tier: "珍稀", use: "温养经脉与符文" },
  yimuQi: { name: "乙木之气", category: "elemental-material", tier: "中阶", use: "木系功法与灵植" },
  starIron: { name: "北天寒星铁", category: "ore", tier: "高阶", use: "炼制寒属性玄器" },
  beastFang: { name: "铁背獠豕獠牙", category: "beast-material", tier: "低阶", use: "炼器与任务交付" },
  beastHide: { name: "铁背獠豕皮", category: "beast-material", tier: "低阶", use: "制作护具" },
  frostScale: { name: "霜甲蜥鳞", category: "beast-material", tier: "中阶", use: "寒阵与护甲" },
});

export const CRAFT_RECIPES = Object.freeze({
  alchemy: {
    name: "炼丹",
    materials: { herb: 2 },
    product: "breakthroughPill",
    outputQuantity: 1,
  },
  forging: {
    name: "炼器",
    materials: { ore: 2 },
    product: "artifact",
    outputQuantity: 1,
  },
  talisman: {
    name: "符箓",
    materials: { talismanPaper: 1, herb: 1 },
    product: "talisman",
    outputQuantity: 1,
  },
  formation: {
    name: "阵法",
    materials: { ore: 1, talismanPaper: 1 },
    product: "formationPlate",
    outputQuantity: 1,
  },
  beast: {
    name: "御兽",
    materials: { beastFood: 1, herb: 1 },
    product: "beastContract",
    outputQuantity: 1,
  },
  planting: {
    name: "灵植",
    materials: { spiritSeed: 1 },
    product: "herb",
    outputQuantity: 3,
  },
});

export const SECT_RANKS = Object.freeze([
  { name: "外门弟子", contribution: 0 },
  { name: "内门弟子", contribution: 80 },
  { name: "真传弟子", contribution: 220 },
  { name: "长老", contribution: 500 },
  { name: "掌门", contribution: 1000 },
]);

export const RELATIONSHIP_STAGES = Object.freeze([
  { name: "陌生", minimum: 0 },
  { name: "相识", minimum: 20 },
  { name: "知己", minimum: 40 },
  { name: "暧昧", minimum: 60 },
  { name: "道侣", minimum: 80 },
  { name: "生死相许", minimum: 100 },
]);

const SECT_TASKS = Object.freeze({
  gathering: {
    name: "采药任务",
    contribution: 40,
    reputation: 2,
    reward: { herb: 1 },
  },
  patrol: {
    name: "山门巡逻",
    contribution: 40,
    reputation: 3,
    reward: { spiritStones: 35 },
  },
  hunting: {
    name: "猎妖任务",
    contribution: 60,
    reputation: 4,
    reward: { ore: 1 },
  },
});

const BOND_LABELS = Object.freeze({
  friendship: "友情",
  mentor: "师徒",
  sworn: "结义",
  rival: "宿敌",
  romance: "情缘",
});

function assertQuantity(quantity) {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error("交易数量必须是正整数");
  }
}

function marketPrice(state, itemId) {
  const price = state.world.market?.prices?.[itemId];
  if (!Number.isInteger(price) || price <= 0 || !ITEM_CATALOG[itemId]) {
    throw new Error("坊市没有这种物品");
  }
  return price;
}

export function buyMarketItem(state, itemId, quantity = 1) {
  assertQuantity(quantity);
  const price = marketPrice(state, itemId);
  const cost = price * quantity;
  if (state.player.resources.spiritStones < cost) {
    throw new Error("元石不足");
  }
  const next = structuredClone(state);
  next.player.resources.spiritStones -= cost;
  next.player.inventory[itemId] = (next.player.inventory[itemId] ?? 0) + quantity;
  return { state: next, cost, item: ITEM_CATALOG[itemId] };
}

export function sellMarketItem(state, itemId, quantity = 1) {
  assertQuantity(quantity);
  const price = marketPrice(state, itemId);
  if ((state.player.inventory[itemId] ?? 0) < quantity) {
    throw new Error("库存不足");
  }
  const revenue = getMarketSellPrice(state, itemId) * quantity;
  const next = structuredClone(state);
  next.player.inventory[itemId] -= quantity;
  next.player.resources.spiritStones += revenue;
  return { state: next, revenue, item: ITEM_CATALOG[itemId] };
}

export function getMarketSellPrice(state, itemId) {
  return Math.floor(marketPrice(state, itemId) * 0.6);
}

export function equipTechnique(state, technique, slot) {
  if (!state.player.techniqueBuild.known.includes(technique)) {
    throw new Error("尚未习得这部功法");
  }
  if (!new Set(["main", "support"]).has(slot)) {
    throw new Error("功法槽位无效");
  }
  const next = structuredClone(state);
  if (slot === "main") {
    next.player.techniqueBuild.main = technique;
    next.player.techniqueBuild.supports = next.player.techniqueBuild.supports
      .filter((name) => name !== technique);
    return next;
  }
  if (technique === next.player.techniqueBuild.main) {
    throw new Error("主功法不能同时占用辅助槽");
  }
  if (next.player.techniqueBuild.supports.includes(technique)) return next;
  if (next.player.techniqueBuild.supports.length >= 2) {
    throw new Error("最多只能装备两个辅助槽");
  }
  next.player.techniqueBuild.supports.push(technique);
  return next;
}

function assertMaterials(state, materials) {
  const missing = Object.entries(materials).filter(
    ([itemId, quantity]) => (state.player.inventory[itemId] ?? 0) < quantity,
  );
  if (missing.length > 0) {
    throw new Error(`材料不足：${missing.map(([itemId]) => ITEM_CATALOG[itemId]?.name ?? itemId).join("、")}`);
  }
}

export function practiceCraft(state, craft, { roll } = {}) {
  const recipe = CRAFT_RECIPES[craft];
  const skill = state.player.crafts[craft];
  if (!recipe || !skill) throw new Error("未知技艺");
  assertMaterials(state, recipe.materials);
  const next = structuredClone(state);
  for (const [itemId, quantity] of Object.entries(recipe.materials)) {
    next.player.inventory[itemId] -= quantity;
  }
  const facilityBonus = craft === "alchemy"
    ? next.player.cave.facilities.alchemyRoom * 0.05
    : craft === "forging"
      ? next.player.cave.facilities.forge * 0.05
      : 0;
  const chance = Math.min(0.95, 0.55 + skill.level * 0.08 + state.player.stats.soul * 0.01 + facilityBonus);
  const check = Number.isFinite(roll) ? Math.min(1, Math.max(0, roll)) : 0.5;
  const succeeded = check < chance;
  if (succeeded) {
    next.player.inventory[recipe.product] = (next.player.inventory[recipe.product] ?? 0) + recipe.outputQuantity;
    next.player.crafts[craft].experience += 10;
  } else {
    next.player.crafts[craft].experience += 4;
  }
  next.player.crafts[craft].level = Math.min(4, Math.floor(next.player.crafts[craft].experience / 40));
  const advanced = advanceOneMonth(next, {
    eventTitle: `${recipe.name}${succeeded ? "成品" : "失手"}`,
    result: succeeded
      ? `${state.player.name}耗费材料，制成${ITEM_CATALOG[recipe.product].name}。`
      : `${state.player.name}${recipe.name}失手，投入的材料尽数损毁。`,
  });
  return {
    state: advanced,
    outcome: { status: succeeded ? "success" : "failed", chance, craft, product: succeeded ? recipe.product : null },
  };
}

export function joinSect(state, sectName) {
  const name = String(sectName || "").trim().slice(0, 24);
  if (!name) throw new Error("宗门名称不能为空");
  if (state.player.sect.name !== "散修") throw new Error("已经加入宗门");
  const next = structuredClone(state);
  next.player.sect = {
    name,
    position: SECT_RANKS[0].name,
    contribution: 0,
    reputation: 0,
    joinedAtTurn: next.meta.turn,
    history: [{
      turn: next.meta.turn,
      year: next.world.year,
      month: next.world.month,
      eventId: "local-sect-join",
      record: `加入${name}`,
    }],
  };
  return next;
}

export function runSectTask(state, taskId) {
  const task = SECT_TASKS[taskId];
  if (!task) throw new Error("未知宗门任务");
  if (state.player.sect.name === "散修") throw new Error("尚未加入宗门");
  let next = advanceOneMonth(state, {
    eventTitle: task.name,
    result: `${state.player.name}完成${task.name}，宗门贡献增加 ${task.contribution}。`,
  });
  next.player.sect.contribution += task.contribution;
  next.player.sect.reputation += task.reputation;
  for (const [key, quantity] of Object.entries(task.reward)) {
    if (key === "spiritStones") next.player.resources.spiritStones += quantity;
    else next.player.inventory[key] = (next.player.inventory[key] ?? 0) + quantity;
  }
  return { state: next, task };
}

export function promoteSect(state) {
  if (state.player.sect.name === "散修") throw new Error("尚未加入宗门");
  const rankIndex = SECT_RANKS.findIndex((rank) => rank.name === state.player.sect.position);
  if (rankIndex < 0 || rankIndex >= SECT_RANKS.length - 1) throw new Error("当前职位无法继续晋升");
  const nextRank = SECT_RANKS[rankIndex + 1];
  if (state.player.sect.contribution < nextRank.contribution) {
    throw new Error("宗门贡献不足");
  }
  const next = structuredClone(state);
  next.player.sect.position = nextRank.name;
  return next;
}

export function upgradeCave(state, target) {
  const requirement = getCaveUpgradeRequirement(state, target);
  if (requirement.isMaxLevel) throw new Error(target === "aura" ? "洞府灵气已达上限" : "洞府设施已达上限");
  if (!requirement.canUpgrade) throw new Error("洞府升级资源不足");
  const next = structuredClone(state);
  next.player.resources.spiritStones -= requirement.costs.find((cost) => cost.id === "spiritStones").required;
  next.player.inventory.ore -= requirement.costs.find((cost) => cost.id === "ore").required;
  if (target === "aura") next.player.cave.auraLevel += 1;
  else next.player.cave.facilities[target] += 1;
  return next;
}

export function getCaveUpgradeRequirement(state, target) {
  const isAura = target === "aura";
  if (!isAura && !Object.hasOwn(state.player.cave.facilities, target)) throw new Error("未知洞府设施");
  const currentLevel = isAura ? state.player.cave.auraLevel : state.player.cave.facilities[target];
  const maxLevel = isAura ? 4 : 3;
  const requiredStones = isAura ? 120 * currentLevel : 80 * (currentLevel + 1);
  const requiredOre = isAura ? currentLevel : currentLevel + 1;
  const heldStones = state.player.resources.spiritStones;
  const heldOre = state.player.inventory.ore ?? 0;
  const costs = [
    { id: "spiritStones", name: "元石", required: requiredStones, held: heldStones, missing: Math.max(0, requiredStones - heldStones) },
    { id: "ore", name: ITEM_CATALOG.ore.name, required: requiredOre, held: heldOre, missing: Math.max(0, requiredOre - heldOre) },
  ];
  const isMaxLevel = currentLevel >= maxLevel;
  return {
    target,
    currentLevel,
    maxLevel,
    isMaxLevel,
    costs,
    canUpgrade: !isMaxLevel && costs.every((cost) => cost.missing === 0),
  };
}

export function plantCaveCrop(state) {
  if (state.player.cave.crop) throw new Error("灵田已有作物");
  if ((state.player.inventory.spiritSeed ?? 0) < 1) throw new Error("没有灵植种子");
  const next = structuredClone(state);
  next.player.inventory.spiritSeed -= 1;
  next.player.cave.crop = { id: "spirit-herb", monthsRemaining: 2 };
  return next;
}

export function tendCaveCrop(state) {
  if (!state.player.cave.crop) throw new Error("灵田没有作物");
  let next = advanceOneMonth(state, {
    eventTitle: "照料灵田",
    result: `${state.player.name}在洞府灵田中照料灵植。`,
  });
  next.player.cave.crop.monthsRemaining -= 1;
  if (next.player.cave.crop.monthsRemaining > 0) {
    return { state: next, outcome: { status: "growing", monthsRemaining: next.player.cave.crop.monthsRemaining } };
  }
  const harvest = 3 + next.player.cave.facilities.spiritField;
  next.player.inventory.herb += harvest;
  next.player.cave.crop = null;
  next.chronicle.at(-1).result = `${state.player.name}从灵田收获天材灵药 ${harvest} 株。`;
  return { state: next, outcome: { status: "harvested", harvest } };
}

export function getRelationshipStage(affection) {
  const value = Math.max(0, Number(affection) || 0);
  return RELATIONSHIP_STAGES
    .filter((stage) => value >= stage.minimum)
    .at(-1).name;
}

export function interactWithNpc(state, npcId, { kind = "friendship", giftItem = null } = {}) {
  const npc = state.world.npcs.find((candidate) => candidate.id === npcId && candidate.alive);
  if (!npc) throw new Error("找不到可互动的 NPC");
  const bond = BOND_LABELS[kind];
  if (!bond) throw new Error("关系类型无效");
  if (giftItem && (state.player.inventory[giftItem] ?? 0) < 1) throw new Error("赠礼库存不足");
  let next = structuredClone(state);
  if (giftItem) next.player.inventory[giftItem] -= 1;
  const gain = (kind === "romance" ? 18 : kind === "rival" ? 8 : 12) + (giftItem ? 6 : 0);
  const existing = next.player.relationships.find((relationship) => relationship.npcId === npcId);
  if (existing) {
    existing.affection = Math.min(120, existing.affection + gain);
    existing.bond = bond;
    existing.romanceEnabled = existing.romanceEnabled || kind === "romance";
    existing.stage = getRelationshipStage(existing.affection);
  } else {
    next.player.relationships.push({
      npcId,
      name: npc.name,
      affection: gain,
      stage: getRelationshipStage(gain),
      bond,
      romanceEnabled: kind === "romance",
    });
  }
  const worldNpc = next.world.npcs.find((candidate) => candidate.id === npcId);
  if (!worldNpc.bonds.some((entry) => entry.name === next.player.name && entry.bond === bond)) {
    worldNpc.bonds.push({ name: next.player.name, bond });
  }
  next = advanceOneMonth(next, {
    eventTitle: `${bond}互动`,
    result: `${state.player.name}与${npc.name}相处一月，关系走向${bond}。`,
  });
  return { state: next, npc: structuredClone(npc), bond };
}
