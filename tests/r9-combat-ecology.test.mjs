import test from "node:test";
import assert from "node:assert/strict";

import {
  getLearnedCombatSkills,
  resolveCombatEncounterChoice,
} from "../public/combat-system.mjs";
import {
  assessWorldDanger,
  advanceAntagonistPlans,
  createNewGame,
  getNpcDossier,
  markNpcDead,
  registerNpcEncounter,
  settleEventChoice,
} from "../public/game-engine.mjs";
import { chooseOfflineEvent } from "../public/game-data.mjs";
import { ITEM_CATALOG } from "../public/life-systems.mjs";

function makeState(seed = 8) {
  return createNewGame({
    name: "陆青衡", gender: "女", age: 19, birthplace: "红月城", background: "红月城武者世家",
    path: "快意恩仇", spiritRootGrade: "地灵根", rootPrimaryElement: "雷", rootSecondaryElement: "金",
    constitution: "剑骨", talent: "身轻如燕",
    stats: { aptitude: 10, insight: 10, soul: 10, agility: 10, martialHeart: 10, fortune: 10 },
  }, seed);
}

test("R9 combat exposes only learned skills and rejects invented or unlearned skill ids", () => {
  const state = makeState();
  const skills = getLearnedCombatSkills(state);
  assert.ok(skills.length >= 1);
  assert.deepEqual(skills.map((skill) => skill.id), state.player.martialSkills.map((skill) => skill.id));

  const event = {
    id: "skill-gate", kind: "combat", danger: "medium", title: "雨巷追杀", scene: "旧敌在雨巷截住去路。",
    timeCostDays: 1, activityType: "combat", worldUpdate: "追杀留下新的线索。",
    encounter: { npcId: "rain-assassin", npcName: "封七", gender: "男", species: "人族", location: "红月城雨巷", reason: "奉命试探", temperament: "谨慎", element: "木", category: "mainline" },
    choices: [{ id: "fight", action: "fight", label: "迎战", hint: "选择已学武技", result: "战端已开。", effects: {} }],
  };
  assert.throws(() => resolveCombatEncounterChoice(state, event, "fight", { skillId: "invented-skill" }), /未习得|武技/);
});

test("R9 offline event pool contains story, hunting and opportunity-guardian combat", () => {
  const categories = new Set();
  for (let seed = 1; seed <= 80; seed += 1) {
    const state = makeState(seed);
    state.meta.turn = seed;
    const event = chooseOfflineEvent(state);
    if (event.kind === "combat") categories.add(event.encounter.category);
  }
  assert.deepEqual([...categories].sort(), ["hunting", "mainline", "opportunity"].sort());
});

test("R9 NPC dossier accumulates explicit sex, species, realm and player intersections", () => {
  let state = makeState();
  state = registerNpcEncounter(state, {
    id: "merchant-qiao", name: "乔芷", gender: "女", species: "人族", realmIndex: 1, stageIndex: 2,
    goal: "追回被劫走的药材", alive: true,
  }, { summary: "你在坊市替她辨认了假药。", eventId: "market-fraud" });
  state = registerNpcEncounter(state, {
    id: "merchant-qiao", name: "乔芷", gender: "女", species: "人族", realmIndex: 1, stageIndex: 2,
    goal: "追回被劫走的药材", alive: true,
  }, { summary: "你们在商道共同躲过一次伏击。", eventId: "road-ambush" });
  const dossier = getNpcDossier(state, "merchant-qiao");
  assert.equal(dossier.gender, "女");
  assert.equal(dossier.species, "人族");
  assert.match(dossier.realm, /一元境/);
  assert.equal(dossier.interactions.length, 2);
});

test("R9 story encounters enter the ecology during real local settlement", () => {
  const state = makeState();
  const event = {
    id: "market-herbalist",
    title: "坊市辨药",
    scene: "药师乔芷请你辨认一株被换过标签的灵草。",
    timeCostDays: 1,
    activityType: "dialogue",
    worldUpdate: "坊市开始复核灵草标签。",
    encounterNpcs: [{
      id: "merchant-qiao", name: "乔芷", gender: "女", species: "人族",
      realmIndex: 1, stageIndex: 2, goal: "追回被劫走的药材", alive: true,
    }],
    choices: [{ id: "inspect", label: "替她辨药", result: "你发现标签墨迹有异。", effects: {} }],
  };
  const settled = settleEventChoice(state, event, "inspect");
  const dossier = getNpcDossier(settled, "merchant-qiao");
  assert.equal(dossier.gender, "女");
  assert.equal(dossier.species, "人族");
  assert.match(dossier.interactions[0].summary, /标签|辨药/);
});

test("R9 dead NPCs remain dead and can only appear in explicit memory context", () => {
  let state = makeState();
  state = registerNpcEncounter(state, {
    id: "merchant-qiao", name: "乔芷", gender: "女", species: "人族", realmIndex: 1, stageIndex: 2,
    goal: "追回被劫走的药材", alive: true,
  }, { summary: "初次相识", eventId: "first" });
  state = markNpcDead(state, "merchant-qiao", "护送商队时战死");
  const dossier = getNpcDossier(state, "merchant-qiao");
  assert.equal(dossier.alive, false);
  assert.equal(dossier.deathCause, "护送商队时战死");
  assert.throws(() => registerNpcEncounter(state, { ...dossier, alive: true }, { summary: "重新现身", eventId: "revive" }), /死亡|复活/);
  const memory = registerNpcEncounter(state, dossier, { summary: "你在旧信中想起她。", eventId: "memory", context: "memory" });
  assert.equal(getNpcDossier(memory, "merchant-qiao").alive, false);
});

test("R9 text assets and danger model remain locally authoritative", () => {
  const names = Object.values(ITEM_CATALOG).map((item) => item.name);
  for (const name of ["风信子", "神宇净晶", "百绣蕴文露", "乙木之气", "北天寒星铁", "铁背獠豕獠牙"]) {
    assert.ok(names.includes(name), `missing text asset ${name}`);
  }
  const state = makeState();
  state.player.resources.reputation = 80;
  state.player.resources.karma = 30;
  state.world.antagonists.push({
    id: "black-arrow-broker",
    name: "黑箭掮客",
    goal: "控制北线药材运输",
    shortPlan: "试探商队护卫",
    longPlan: "收买驿站并切断药材补给",
    knownIntel: [],
    active: true,
  });
  state.world.antagonists[0].knownIntel.push("玩家介入北线药材案");
  const danger = assessWorldDanger(state);
  assert.ok(danger.score > state.world.danger.score);
  const advanced = advanceAntagonistPlans(state);
  assert.match(advanced.world.antagonists[0].currentPlan, /药材|驿站|试探|商队/);
  assert.ok(advanced.world.antagonists[0].planHistory.length >= 1);
});
