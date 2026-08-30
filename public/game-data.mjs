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
    timeCostDays: 3,
    activityType: "mainline",
    danger: "low",
    encounterNpcs: [{ id: "luo-yunchang", name: WORLD.luoYunchang, gender: "女", species: "人族", realmIndex: 5, stageIndex: 2, goal: "查清药舟错签的源头", alive: true }],
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
    timeCostDays: 2,
    activityType: "mainline",
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
    timeCostDays: 4,
    activityType: "mainline",
    danger: "medium",
    encounterNpcs: [{ id: "ning-keyun", name: WORLD.ningKeyun, gender: "女", species: "人族", realmIndex: 8, stageIndex: 1, goal: "追查废阵神魂余波的来源", alive: true }],
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
    timeCostDays: 5,
    activityType: "secretRealm",
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
    timeCostDays: 1,
    activityType: "combat",
    danger: "medium",
    encounter: {
      npcId: "lin-xuan",
      npcName: "林玄",
      gender: "男",
      species: "人族",
      realmIndex: 0,
      stageIndex: 2,
      location: `${WORLD.redMoonCity}北门商道`,
      reason: "追查商会失窃药箱时误认你为同党",
      temperament: "谨慎",
      element: "木",
      category: "mainline",
      reward: { spiritGrass: 1 },
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
    id: "mist-hill-hunt",
    minimumRealm: 0,
    kind: "combat",
    title: "雾岭猎牙",
    scene: "药师托你猎取铁背獠豕的獠牙。兽群撞断松木冲来，退路被湿滑山石封死。",
    canonRefs: ["雾岭", "铁背獠豕"],
    timeCostDays: 3,
    activityType: "combat",
    danger: "medium",
    encounter: {
      npcId: "ironback-boar",
      npcName: "铁背獠豕",
      gender: "雄",
      species: "妖兽",
      realmIndex: 0,
      stageIndex: 1,
      location: "雾岭松林",
      reason: "护卫领地与幼兽",
      temperament: "凶悍",
      element: "土",
      category: "hunting",
      reward: { beastFang: 2, beastHide: 1 },
    },
    worldUpdate: "雾岭兽群迁往深山，低阶药师暂时恢复采药。",
    choices: [
      { id: "fight", label: "选武技迎战", hint: "猎取獠牙与兽皮", result: "獠豕踏碎泥地，战端已开。", action: "fight", effects: {} },
      { id: "escape", label: "退入密林", hint: "放弃材料保全自身", result: "你寻找兽群视野之外的退路。", action: "escape", effects: {} },
      { id: "talk", label: "以气味驱兽", hint: "成败取决于临场判断", result: "你点燃苦辛草，试图令兽群退开。", action: "negotiate", effects: {} },
    ],
  },
  {
    id: "star-iron-guardian",
    minimumRealm: 0,
    kind: "combat",
    title: "寒星铁守兽",
    scene: "坠星坑里露出一线北天寒星铁，盘踞其上的霜甲蜥缓缓睁眼，寒气封住坑口。",
    canonRefs: ["北天寒星铁", "霜甲蜥"],
    timeCostDays: 2,
    activityType: "combat",
    danger: "high",
    encounter: {
      npcId: "frost-armored-lizard",
      npcName: "霜甲蜥",
      gender: "雌",
      species: "妖兽",
      realmIndex: 1,
      stageIndex: 0,
      location: "坠星坑",
      reason: "守护赖以蜕鳞的寒星铁",
      temperament: "警觉",
      element: "水",
      category: "opportunity",
      reward: { starIron: 1, frostScale: 2 },
    },
    worldUpdate: "坠星坑的寒气外泄，引来数支寻矿队伍。",
    choices: [
      { id: "fight", label: "选武技夺矿", hint: "跨境战斗极其危险", result: "霜甲蜥压低身体，冰棱沿鳞片竖起。", action: "fight", effects: {} },
      { id: "escape", label: "记路后撤", hint: "保留线索等待变强", result: "你记下星坑方位，沿未封冻的岩缝退去。", action: "escape", effects: {} },
      { id: "tribute", label: "投下温阳石", hint: "消耗元石转移守兽", result: "你将元石投向远处，试图引开守兽。", action: "tribute", effects: {} },
    ],
  },
  {
    id: "old-apothecary",
    minimumRealm: 0,
    title: "枯井药香",
    scene: "废村枯井中飘出不合时节的药香。井壁刻着半幅丹方，也刻着三道新鲜抓痕。",
    timeCostDays: 2,
    activityType: "secretRealm",
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
    timeCostDays: 1,
    activityType: "mainline",
    danger: "medium",
    encounterNpcs: [
      { id: "rain-swordsman-left", name: "古天河", gender: "男", species: "人族", realmIndex: 2, stageIndex: 1, goal: "偿还一桩旧约", alive: true },
      { id: "rain-swordsman-right", name: "迟望", gender: "男", species: "人族", realmIndex: 2, stageIndex: 0, goal: "完成死者遗命", alive: true },
    ],
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
    timeCostDays: 5,
    activityType: "sect",
    danger: "low",
    encounterNpcs: [{ id: "qinglan-steward-wen", name: "闻执事", gender: "男", species: "人族", realmIndex: 3, stageIndex: 2, goal: "为外门挑出可用之人", alive: true }],
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
    timeCostDays: 7,
    activityType: "secretRealm",
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
    timeCostDays: 1,
    activityType: "combat",
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
  const profileText = `${state.player.background}|${state.player.path}|${state.player.birthplace}`;
  const variant = (Array.from(profileText).reduce((total, char) => total + char.codePointAt(0), 0) + state.meta.seed) % 2;
  const common = { minimumRealm: 0, monthDelta: 1, timeCostDays: variant + 2, activityType: "mainline", danger: "low", source: "offline" };
  let event;
  if (/术炼|药|商会/.test(state.player.background)) {
    event = {
      ...common,
      id: `opening-artisan-${variant}`,
      title: "灵根炉火疑云",
      scene: `${state.player.name}守炉时发现药材被人调包。${root.grade}的${root.primaryElement}灵根异样灼鸣，门外传来脚步。`,
      worldUpdate: `${state.player.birthplace}的一间炼房开始暗查药材账目。`,
      choices: [
        { id: `seal-ledger-${variant}`, tag: "risk", label: "封炉查账", hint: "可能得罪管事", result: "你封住炉火，把两批药材的气味逐项记下。", effects: { insight: 5, reputation: 2 } },
        { id: `save-pill-${variant}`, tag: "opportunity", label: "先救丹胚", hint: "保住材料证据会少", result: "你以灵根稳住药性，留下半枚可用丹胚。", effects: { cultivation: 12, soul: 3 } },
        { id: `call-witness-${variant}`, tag: "peace", label: "请同伴见证", hint: "先保全人证物证", result: "你请邻炉学徒共同验药，调包者暂时不敢毁证。", effects: { reputation: 3, martialHeart: 2 } },
      ],
    };
  } else if (/猎|农|山民/.test(state.player.background)) {
    event = {
      ...common,
      id: `opening-wilderness-${variant}`,
      title: "灵根感应兽踪",
      scene: `${state.player.name}在故乡山道发现陌生兽踪，${root.grade}的${root.primaryElement}灵根感到异样，暴雨正压向村落。`,
      worldUpdate: `${state.player.birthplace}附近出现一头尚未辨明的低阶妖兽。`,
      choices: [
        { id: `warn-village-${variant}`, tag: "peace", label: "回村示警", hint: "放弃独占线索", result: "你逐户敲门，把兽踪与雨势画在村口泥墙上。", effects: { reputation: 4, martialHeart: 3 } },
        { id: `track-beast-${variant}`, tag: "risk", label: "循迹入山", hint: "可能提前遇敌", result: "你在雨落前记住妖兽巢穴，却没有贸然靠近。", effects: { agility: 4, fortune: 3 } },
        { id: `set-warning-${variant}`, tag: "opportunity", label: "布下警绳", hint: "监视兽踪再作决定", result: "你用猎铃封住山口，先把兽群动向掌握在手。", effects: { insight: 3, agility: 2 } },
      ],
    };
  } else if (/世家|宗门|贵族/.test(state.player.background)) {
    event = {
      ...common,
      id: `opening-clan-${variant}`,
      title: "灵根族试暗签",
      scene: `${state.player.name}参加族试前，发现自己的木签被换成凶签。${root.grade}的${root.primaryElement}灵根引来几道不善目光。`,
      worldUpdate: `${state.player.birthplace}的一场族试暴露出暗中争夺名额的人。`,
      choices: [
        { id: `public-check-${variant}`, tag: "risk", label: "当众验签", hint: "逼幕后人仓促应对", result: "你请长辈验明刻痕，试场顿时无人出声。", effects: { reputation: 3, martialHeart: 4 } },
        { id: `keep-mark-${variant}`, tag: "opportunity", label: "记痕照走", hint: "暗查换签之人", result: "你收好凶签，在入场人群里认出同样的刻刀痕。", effects: { insight: 4, fortune: 2 } },
        { id: `swap-back-${variant}`, tag: "peace", label: "申请重抽", hint: "放弃追查换签者", result: "你换得一枚公签，却也让幕后人藏回人群。", effects: { martialHeart: 3 } },
      ],
    };
  } else {
    event = {
      ...common,
      id: `opening-road-${variant}`,
      title: "灵根初行血车",
      scene: `${state.player.name}带着${root.grade}的${root.primaryElement}灵根依照“${state.player.path}”之愿离乡，第一夜遇见染血空车。`,
      worldUpdate: `${state.player.birthplace}外的商道失踪了一支小型车队。`,
      choices: [
        { id: `follow-wheel-${variant}`, tag: "risk", label: "追查车辙", hint: "可能撞上伏击", result: "你沿深辙找到一枚折断的护卫腰牌。", effects: { agility: 3, fortune: 3 } },
        { id: `carry-warning-${variant}`, tag: "peace", label: "去驿站报信", hint: "让官差接手", result: "驿卒封锁近路，也把你的名字写进证人簿。", effects: { reputation: 3, martialHeart: 2 } },
        { id: `search-wagon-${variant}`, tag: "opportunity", label: "检查空车", hint: "寻找失踪者留下的线索", result: "你在车底夹层找到半张被血浸透的货单。", effects: { insight: 3, soul: 2 } },
      ],
    };
  }
  return assertEventContentBudget(event);
}

export function chooseOfflineEvent(state) {
  const eligible = OFFLINE_EVENTS.filter(
    (event) => event.minimumRealm <= state.player.realmIndex,
  );
  const selector = Math.abs(
    (state.meta.seed * 1103515245) ^ (state.meta.turn * 12345) ^ (state.world.year * 97),
  );
  const combatEvents = eligible.filter((event) => event.kind === "combat");
  const selected = state.meta.turn > 0 && state.meta.turn % 4 === 0 && combatEvents.length > 0
    ? combatEvents[(Math.floor(state.meta.turn / 4) + state.meta.seed) % combatEvents.length]
    : eligible[selector % eligible.length];
  const event = structuredClone(selected);
  event.monthDelta ??= 1;
  event.source = "offline";
  event.choices = event.choices.map((choice) => ({
    tag: event.danger === "high" || event.danger === "fatal" ? "risk" : "opportunity",
    ...choice,
  }));
  return assertEventContentBudget(event);
}
