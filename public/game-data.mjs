import { getCanonReference } from "./world-canon.mjs";
import { assertEventContentBudget } from "./event-rules.mjs";

const WORLD = Object.freeze({
  huashenSea: getCanonReference("化神海"),
  redMoonCity: getCanonReference("红月城"),
  tianmeng: getCanonReference("天盟"),
  liYunxiao: getCanonReference("李云霄"),
  guFeiyang: getCanonReference("古飞扬"),
  luoYunchang: getCanonReference("洛云裳"),
  ningKeyun: getCanonReference("宁可云"),
  greatDerivation: getCanonReference("《大衍神诀》"),
  ancientStars: getCanonReference("《太古天辰诀》"),
  nineHeavensSword: getCanonReference("《九天剑诀》"),
  herbCanon: getCanonReference("《万药宝典》"),
});

const OFFLINE_EVENTS = [
  {
    id: "huashen-sea-herb-ledger",
    minimumRealm: 0,
    title: "化神海外院的错药",
    scene: `${WORLD.huashenSea}外院的一艘药舟临时靠岸。三十匣灵草的签条被雨水泡乱，负责复核的${WORLD.luoYunchang}只许你查看${WORLD.herbCanon}目录中的三行辨药口诀，并明言这不是收徒试炼。`,
    canonRefs: [WORLD.huashenSea, WORLD.luoYunchang, WORLD.herbCanon],
    monthDelta: 1,
    danger: "low",
    worldUpdate: `${WORLD.huashenSea}外院追回一批被错签的灵草，药舟延误了七日。`,
    choices: [
      { id: "sort", label: "按气味重新分拣", hint: "只凭基础药理帮忙", result: `你辨出七匣错药。${WORLD.luoYunchang}记住了你的谨慎，却收回了${WORLD.herbCanon}目录。`, effects: { insight: 4, soul: 2, reputation: 2 }, npc: { name: WORLD.luoYunchang, role: "术炼天才", stance: "略有印象", goal: "查清药舟错签的源头", relationDelta: 4 } },
      { id: "trace", label: "追查泡水的签条", hint: "可能得罪药舟管事", result: `你在船尾找到同批墨迹，证明错签并非意外。${WORLD.huashenSea}执事封存了账册。`, effects: { agility: 2, reputation: 4, fortune: -1 } },
      { id: "memorize", label: "偷记三行口诀", hint: "残缺口诀可能误导修行", result: `你强记下零散句子，却在试药时气血翻涌。完整的${WORLD.herbCanon}仍与你相隔甚远。`, effects: { insight: 2, wound: 5, martialHeart: -1 } },
    ],
  },
  {
    id: "red-moon-auction-rumor",
    minimumRealm: 0,
    title: "红月城的星诀残页",
    scene: `${WORLD.redMoonCity}夜市将一页焦黑经文包装成${WORLD.ancientStars}真本，并借${WORLD.liYunxiao}之名抬价。以你的境界，只能判断纸上的星图是否后描。`,
    canonRefs: [WORLD.redMoonCity, WORLD.liYunxiao, WORLD.ancientStars],
    monthDelta: 1,
    danger: "medium",
    worldUpdate: `${WORLD.redMoonCity}商会撤下一件伪托${WORLD.liYunxiao}名号的拍品。`,
    choices: [
      { id: "inspect", label: "检查星墨年代", hint: "用常识拆穿骗局", result: `你发现星点下还有新墨，所谓${WORLD.ancientStars}残页只是旧纸新画。`, effects: { insight: 4, reputation: 3, spiritStones: 2 } },
      { id: "follow", label: "跟住暗中抬价者", hint: "可能撞见商会打手", result: `你跟到${WORLD.redMoonCity}西门便被察觉，只记住了对方袖口的月纹。`, effects: { agility: 3, wound: 4, fortune: 2 } },
      { id: "leave", label: "不沾这桩因果", hint: "没有收获，也不担风险", result: `你离开时听见拍卖槌落下。${WORLD.liYunxiao}的名字仍被人当作生意。`, effects: { martialHeart: 2 } },
    ],
  },
  {
    id: "tianmeng-soul-trace",
    minimumRealm: 0,
    title: "天盟榜下的神魂余响",
    scene: `${WORLD.tianmeng}在驿站张贴了一份低阶勘察任务。${WORLD.ningKeyun}留下的批注指出，山谷异响与${WORLD.greatDerivation}的完整传承无关，最多只是一缕被阵纹放大的神魂余波。`,
    canonRefs: [WORLD.tianmeng, WORLD.ningKeyun, WORLD.greatDerivation],
    monthDelta: 1,
    danger: "medium",
    worldUpdate: `${WORLD.tianmeng}确认山谷异响来自废阵，暂时下调了任务等级。`,
    choices: [
      { id: "map", label: "测绘废阵回声", hint: "不触碰阵心，只记录方位", result: `你把六处回声标回地图。${WORLD.ningKeyun}的随行人收走记录，给了你一枚${WORLD.tianmeng}低阶任务印。`, effects: { soul: 3, insight: 3, reputation: 2 }, npc: { name: WORLD.ningKeyun, role: "世界事件引路人", stance: "留档观察", goal: "追查废阵神魂余波的来源", relationDelta: 3 } },
      { id: "listen", label: "隔阵聆听余响", hint: "神魂可能短暂受震", result: `你只听清半个音节便及时退开。那不是${WORLD.greatDerivation}口诀，只是强者昔日留下的回声。`, effects: { soul: 4, wound: 3, cultivation: 2 } },
      { id: "decline", label: "交还任务木牌", hint: "承认此事超出能力", result: `${WORLD.tianmeng}执事没有讥讽，只把你的名字从勘察册上划去。`, effects: { martialHeart: 2, reputation: -1 } },
    ],
  },
  {
    id: "ancient-sword-rubbing",
    minimumRealm: 0,
    title: "古飞扬碑影",
    scene: `荒寺残碑被传为${WORLD.guFeiyang}旧迹，碑角一抹剑痕又被人附会成${WORLD.nineHeavensSword}。真正可辨的，只有石粉下三道运劲次序。`,
    canonRefs: [WORLD.guFeiyang, WORLD.nineHeavensSword],
    monthDelta: 1,
    danger: "low",
    worldUpdate: `关于${WORLD.guFeiyang}遗迹的传言引来许多散修，荒寺附近开始出现临时市集。`,
    choices: [
      { id: "rubbing", label: "只拓三道运劲", hint: "把传说当作基础参照", result: `拓片并非${WORLD.nineHeavensSword}残篇，却让你的发力少了一分滞涩。`, effects: { insight: 3, cultivation: 4 }, gainTechnique: "《碑痕运劲法》" },
      { id: "verify", label: "核对碑石年代", hint: "拆穿传言可能招人不满", result: `碑石比${WORLD.guFeiyang}所处年代晚了数百年。围观者散去一半，摊主把你赶出市集。`, effects: { insight: 4, reputation: -2, martialHeart: 2 } },
    ],
  },
  {
    id: "frost-road-caravan",
    minimumRealm: 0,
    kind: "combat",
    title: "商道截杀",
    scene: `${WORLD.redMoonCity}北门商道上，商会护卫林玄为追查失窃药箱拦住你，误认你与盗匪同路。`,
    canonRefs: [WORLD.redMoonCity, "林玄"],
    monthDelta: 1,
    danger: "medium",
    encounter: {
      npcName: "林玄",
      location: `${WORLD.redMoonCity}北门商道`,
      reason: "追查商会失窃药箱时误认你为同党",
      temperament: "谨慎",
      element: "木",
    },
    worldUpdate: `${WORLD.redMoonCity}商会仍在追查失窃药箱。`,
    choices: [
      { id: "fight", label: "迎战自证", hint: "本地规则判定胜负", result: "兵刃已经出鞘。", action: "fight", effects: {} },
      { id: "escape", label: "借林遁走", hint: "按遁速判定", result: "你寻找脱身空隙。", action: "escape", effects: {} },
      { id: "talk", label: "说明来路", hint: "按名望功德判定", result: "你尝试澄清误会。", action: "negotiate", effects: {} },
      { id: "tribute", label: "献上元石", hint: "代价由本地计算", result: "你提出以财物消弭争端。", action: "tribute", effects: {} },
    ],
  },
  {
    id: "old-apothecary",
    minimumRealm: 0,
    title: "枯井药香",
    scene: "废村枯井中飘出不合时节的药香。井壁刻着半幅丹方，也刻着三道新鲜抓痕。",
    monthDelta: 1,
    danger: "low",
    worldUpdate: "废村地下的旧药窟重新泄出灵气。",
    choices: [
      { id: "copy", label: "拓下丹方", hint: "稳妥研读残篇", result: "残方缺了药引，却让你第一次看懂药性之间的生克。", effects: { insight: 4, soul: 2 }, gainTechnique: "《残卷药理》" },
      { id: "descend", label: "下井寻源", hint: "可能遭遇困兽", result: "井底只有一株将枯的夜兰，以及守了它多年的盲蛇。", effects: { fortune: 4, vitality: -3, cultivation: 5 } },
    ],
  },
  {
    id: "rain-temple-duel",
    minimumRealm: 0,
    title: "破庙听剑",
    scene: "雨夜里，两名剑客隔着一盏残灯对坐。他们请你评断，究竟是活人的承诺更重，还是死人的遗命更重。",
    monthDelta: 1,
    danger: "medium",
    worldUpdate: "一场未曾见血的决斗改变了两名剑客的去向。",
    choices: [
      { id: "living", label: "守活人之约", hint: "得罪执念更深者", result: "左侧剑客收剑离去，另一人却把你的名字记在了剑鞘内侧。", effects: { martialHeart: 3, reputation: 2, fortune: -1 }, npc: { name: "古天河", role: "过路剑修", stance: "留意", goal: "偿还一桩旧约", relationDelta: 8 } },
      { id: "dead", label: "全死者遗命", hint: "因果不会立刻显现", result: "残灯忽灭。有人把一枚冰冷剑穗放在你的掌心。", effects: { soul: 3, fortune: 2, vitality: -2 } },
      { id: "refuse", label: "不替他人定命", hint: "保住本心，失去机缘", result: "你走入雨幕，身后始终没有传来拔剑声。", effects: { martialHeart: 5, reputation: -1 } },
    ],
  },
  {
    id: "sect-stone-steps",
    minimumRealm: 0,
    title: "山门九百阶",
    scene: "小宗门开山收徒。九百级石阶上布着问心阵，落榜者三年内不得再登山。",
    monthDelta: 1,
    danger: "low",
    worldUpdate: "青岚宗收下新一代外门弟子，附近散修纷纷改换去处。",
    choices: [
      { id: "climb", label: "登阶问心", hint: "资质之外，更问本心", result: "你没有走得最快，却是少数没有回头的人。", effects: { martialHeart: 6, cultivation: 12, vitality: -4 }, npc: { name: "闻执事", role: "青岚宗执事", stance: "认可", goal: "为外门挑出可用之人", relationDelta: 6 } },
      { id: "observe", label: "旁观阵理", hint: "不入宗门，参悟布阵", result: "你记住了石阶元气流转的节律，也错过了收徒名额。", effects: { insight: 5, soul: 3 } },
    ],
  },
  {
    id: "river-seal",
    minimumRealm: 1,
    title: "河底镇印",
    scene: "春汛冲开古河床，一方镇印露出半角。每当月光落下，附近孩童都会梦见同一座城。",
    monthDelta: 1,
    danger: "high",
    worldUpdate: "河床古印松动，沉睡的旧城开始出现在百姓梦中。",
    choices: [
      { id: "seal", label: "加固镇印", hint: "压下灾厄，也压下机缘", result: "你用元力补全裂纹，梦中的城门在最后一刻合拢。", effects: { soul: 4, cultivation: -8, reputation: 7 } },
      { id: "open", label: "揭印入梦", hint: "神魂可能受创", result: "你在旧城中走了七日，醒来时河岸只过去一夜。", effects: { soul: 8, wound: 12, fortune: 5 } },
    ],
  },
  {
    id: "border-challenge",
    minimumRealm: 2,
    title: "城头悬刀",
    scene: "敌国年轻刀客在城头悬刀七日，连败十二人。他只问一句，此地是否还有愿意承担败果的人。",
    monthDelta: 1,
    danger: "high",
    worldUpdate: "边城胜负传遍北地，两国年轻武者开始频繁越境挑战。",
    choices: [
      { id: "fight", label: "登城接刀", hint: "境界相近，生死难料", result: "第九刀割开衣襟时，你终于逼他退了半步。", effects: { vitality: -12, wound: 14, cultivation: 18, reputation: 9 } },
      { id: "study", label: "观刀不战", hint: "会被讥为怯懦", result: "你记住了他的起手，也记住了众人失望的目光。", effects: { insight: 6, reputation: -5, martialHeart: -2 } },
    ],
  },
];

export function getOpeningEvent(state) {
  const root = state.player.spiritRoot;
  const event = {
    id: "spirit-root-awakening",
    minimumRealm: 0,
    title: "灵根初鸣",
    scene: `${state.player.age}岁这年，${state.player.name}测出${root.grade}，主灵根为${root.primaryElement}${root.elements.length > 1 ? `，兼有${root.elements.slice(1).join("、")}` : ""}。灵根只决定起步快慢，门后有没有路，仍要用余生去走。`,
    monthDelta: 1,
    danger: "low",
    worldUpdate: `${state.player.birthplace}出现一名新觉醒的年轻武者。`,
    source: "offline",
    choices: [
      { id: "temper", tag: "peace", label: "先磨炼根基", hint: "进境缓慢，但更稳固", result: "你把最初一缕元力反复运行三十六周天，没有急着向任何人证明自己。", effects: { cultivation: 16, martialHeart: 4, vitality: 2 } },
      { id: "wander", tag: "opportunity", label: "离乡寻路", hint: "更早接触广阔世界", result: "你在天亮前收好行囊，故乡的灯火从此留在身后。", effects: { fortune: 5, agility: 3, spiritStones: -3 } },
      { id: "seek-master", tag: "opportunity", label: "拜访山中散修", hint: "可能被拒，也可能得其一言", result: "散修没有收徒，只在地上画了一道元气运行的弧线。", effects: { insight: 4, soul: 2, reputation: 1 }, gainTechnique: "《引气弧诀》", npc: { name: "古天河", role: "山中散修", stance: "审视", goal: "寻找能承受败果的传人", relationDelta: 5 } },
    ],
  };
  return assertEventContentBudget(event);
}

export function chooseOfflineEvent(state) {
  const eligible = OFFLINE_EVENTS.filter(
    (event) => event.minimumRealm <= state.player.realmIndex,
  );
  const selector = state.meta.seed + state.meta.turn * 17 + state.world.year;
  const event = structuredClone(eligible[selector % eligible.length]);
  event.source = "offline";
  event.choices = event.choices.map((choice) => ({
    tag: event.danger === "high" || event.danger === "fatal" ? "risk" : "opportunity",
    ...choice,
  }));
  return assertEventContentBudget(event);
}
