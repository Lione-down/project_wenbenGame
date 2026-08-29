export const CANON_NPCS = Object.freeze([
  {
    name: "李云霄",
    identity: "天武大陆传奇人物",
    role: "世界级核心NPC",
    traits: ["前世为古飞扬", "武道天赋极高", "精通术炼、阵法、炼器与炼丹"],
    uses: ["隐藏剧情触发者", "高阶术炼引路人", "竞争者或盟友"],
  },
  {
    name: "古飞扬",
    identity: "远古强者",
    role: "上古时代传说人物",
    traits: ["上古秘境核心", "至尊传承源头", "历史事件核心"],
    uses: ["遗迹线索", "残缺功法", "受限术炼传承"],
  },
  {
    name: "曲红颜",
    identity: "天赋卓绝的强者",
    role: "重要世界NPC",
    traits: ["实力强大", "性格坚定"],
    uses: ["战斗伙伴", "势力联盟对象", "独立关系线"],
  },
  {
    name: "洛云裳",
    identity: "拥有特殊天赋的天才人物",
    role: "术炼相关NPC",
    traits: ["特殊天赋", "与术炼体系相关"],
    uses: ["术炼大会", "宗门事件", "天才竞争剧情"],
  },
  {
    name: "宁可云",
    identity: "重要人物",
    role: "世界事件NPC",
    traits: ["掌握情报", "连接多方势力"],
    uses: ["提供情报", "引导任务", "触发势力关系"],
  },
]);

export const CANON_FACTIONS = Object.freeze([
  {
    name: "化神海",
    role: "顶级势力",
    members: ["长老", "真传弟子", "守护者"],
    hooks: ["天才争夺", "秘境探索", "势力战争"],
  },
  {
    name: "红月城",
    role: "大型城市势力",
    members: ["城主", "商会", "武者", "术炼师"],
    hooks: ["交易", "拍卖", "情报"],
  },
  {
    name: "天盟",
    role: "大陆顶级联盟",
    members: ["任务执事", "认证使者", "榜单记录者"],
    hooks: ["任务发布", "势力认证", "强者排名"],
  },
]);

export const CANON_TECHNIQUES = Object.freeze([
  { name: "《大衍神诀》", grade: "圣阶/神阶", type: "神魂功法", effects: ["增强精神力", "提升术炼能力", "提高阵法领悟"] },
  { name: "《太古天辰诀》", grade: "天阶", type: "元气功法", effects: ["扩大元力容量", "提升修炼速度"] },
  { name: "《霸天炼体诀》", grade: "地阶", type: "炼体功法", effects: ["铜皮", "铁骨", "霸体"] },
  { name: "《九天剑诀》", grade: "圣阶", type: "剑道功法", effects: ["九天剑气", "万剑归流", "剑域"] },
  { name: "《真龙霸体》", grade: "神阶", type: "血脉炼体", effects: ["龙威", "龙鳞防御", "肉身强化"] },
  { name: "《混沌诀》", grade: "至尊级", type: "混元功法", effects: ["吸收多种力量", "需要极高悟性"] },
]);

export const CANON_MARTIAL_SKILLS = Object.freeze([
  { category: "剑道", skills: ["《落英剑诀》", "《天外飞仙》", "《一剑凌天》", "《万剑朝宗》"] },
  { category: "掌法", skills: ["《碎星掌》", "《大荒掌》", "《翻天印》"] },
  { category: "身法", skills: ["《逍遥步》", "《虚空遁》", "《九天游龙步》"] },
  { category: "神魂秘术", skills: ["《搜魂术》", "《神念刺》", "《幻神诀》"] },
]);

export const CANON_TRANSMISSIONS = Object.freeze([
  { name: "《万药宝典》", category: "炼丹", effects: ["提升炼丹成功率", "回元丹", "破境丹", "血脉丹"] },
  { name: "《天工神录》", category: "炼器", effects: ["提升玄器品质", "灵器", "圣器", "神兵"] },
  { name: "《九宫天阵》", category: "阵法", effects: ["创造领域", "防御阵", "杀阵", "聚灵阵"] },
]);

const ALL_CANON_RECORDS = Object.freeze([
  ...CANON_NPCS,
  ...CANON_FACTIONS,
  ...CANON_TECHNIQUES,
  ...CANON_TRANSMISSIONS,
]);

export const CANON_REFERENCE_NAMES = Object.freeze([
  ...ALL_CANON_RECORDS.map((record) => record.name),
  ...CANON_MARTIAL_SKILLS.flatMap((group) => group.skills),
]);

const CANON_REFERENCE_SET = new Set(CANON_REFERENCE_NAMES);

export function getCanonReference(name) {
  if (!CANON_REFERENCE_SET.has(name)) {
    throw new Error(`未知世界资源：${name}`);
  }
  return name;
}

export function buildWorldCanonContext() {
  const npcSummary = CANON_NPCS.map(
    (npc) => `${npc.name}（${npc.role}；用途：${npc.uses.join("、")}）`,
  ).join("；");
  const factionSummary = CANON_FACTIONS.map(
    (faction) => `${faction.name}（${faction.role}；${faction.hooks.join("、")}）`,
  ).join("；");
  const techniqueSummary = CANON_TECHNIQUES.map(
    (technique) => `${technique.name}（${technique.grade}，${technique.type}）`,
  ).join("；");
  const martialSummary = CANON_MARTIAL_SKILLS.map(
    (group) => `${group.category}：${group.skills.join("、")}`,
  ).join("；");
  const transmissionSummary = CANON_TRANSMISSIONS.map(
    (entry) => `${entry.category}${entry.name}`,
  ).join("；");

  return [
    "【天武大陆统一世界资源库】",
    `核心NPC：${npcSummary}`,
    `主要势力：${factionSummary}`,
    `功法：${techniqueSummary}`,
    `武技：${martialSummary}`,
    `术炼传承：${transmissionSummary}`,
    "玩家边界：玩家不得替代李云霄、古飞扬或其他既定角色；既定角色只能作为NPC、导师、敌人、盟友或历史人物存在，并继续自己的行动线。",
    "境界边界：高阶传承只能以残篇、线索或受限指导出现；低境界玩家不得直接掌握圣阶、神阶或至尊级完整功法，也不得无因战胜高境界NPC。",
    "事件边界：每个事件必须实际引用1至3个以上资源名中的角色、势力、功法、武技或术炼传承，并在 canonRefs 中原样列出。",
  ].join("\n");
}
