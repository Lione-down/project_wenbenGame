import test from "node:test";
import assert from "node:assert/strict";

import { parseAgnesEventWithRecovery } from "../lib/agnes-contract.mjs";
import { createDisplayOnlyFateEvent } from "../public/game-client.mjs";
import {
  createNewGame,
  getNpcDossier,
  settleEventChoice,
} from "../public/game-engine.mjs";

const profile = {
  name: "赵日天", gender: "男", age: 18, birthplace: "天水国国都", background: "天水国寒门",
  path: "问道飞升", spiritRootGrade: "真灵根", rootPrimaryElement: "金", rootSecondaryElement: "",
  constitution: "凡体", talent: "天资聪颖",
  stats: { aptitude: 10, insight: 10, soul: 10, agility: 10, martialHeart: 10, fortune: 10 },
};

function realAgnesSample({ escapedUnderscore = false } = {}) {
  const cultivationKey = escapedUnderscore ? "cultivation\\_gain" : "cultivation_gain";
  return `{"schemaVersion":1,"kind":"story","title":"外门报到","scene":"青岚宗外门报到后，你开始适应宗门生活。","canonRefs":["青岚宗"],"timeCostDays":3,"activityType":"mainline","danger":"low","choices":[{"id":"explore","tag":"opportunity","label":"探索宗门","hint":"了解环境","result":"你在宗门内闲逛，了解基本布局。","effects":{"martialHeart":1}},{"id":"cultivate","tag":"peace","label":"修炼基础引气诀","hint":"稳固根基","result":"你修炼《基础引气诀》，气血更通畅。","effects":{"${cultivationKey}":10}},{"id":"task","tag":"risk","label":"接取杂役任务","hint":"赚取贡献","result":"你主动请缨做一些杂事，赚取贡献点。","effects":{"merit":2}}],"worldUpdate":"赵日天已正式成为青岚宗外门弟子，可借阅功法、参与宗门事务。","encounterNpcs":[{"id":"wen-zhishi","name":"闻执事","gender":"男","species":"人族","realmIndex":2,"stageIndex":2,"goal":"为外门挑出可用之人","alive":true}]}`;
}

for (const escapedUnderscore of [false, true]) {
  test(`P0 Agnes real schema keeps bounded legacy effects${escapedUnderscore ? " after escaped underscore repair" : ""}`, () => {
    const event = parseAgnesEventWithRecovery(realAgnesSample({ escapedUnderscore }), {
      allowedReferences: ["青岚宗"],
      allowedSkillIds: ["basic-palm"],
    });
    assert.equal(event.choices[0].effects.martialHeart, 1);
    assert.equal(event.choices[1].effects.cultivation, 10);
    assert.equal(event.choices[2].effects.merit, 2);
  });
}

test("P0 contract drift display keeps raw text inert and offers explicit regeneration", () => {
  const event = createDisplayOnlyFateEvent("raw contract drift", 4);
  assert.equal(event.displayOnly, true);
  assert.deepEqual(event.choices.find((choice) => choice.id === "retry-agnes-generation"), {
    id: "retry-agnes-generation",
    tag: "opportunity",
    label: "重新生成",
    hint: "重新请求本次命途，不结算原文",
    result: "你要求 Agnes 重新生成本次命途。",
    effects: {},
  });
});

test("P0 proposal preserves bounded structured mainline updates", () => {
  const proposal = JSON.parse(realAgnesSample());
  proposal.choices[0].gainTechnique = "《小聚灵阵》";
  proposal.choices[0].sectUpdate = {
    name: "青岚宗",
    position: "外门弟子",
    contributionDelta: 2,
    reputationDelta: 1,
    record: "完成外门报到",
  };
  const event = parseAgnesEventWithRecovery(JSON.stringify(proposal), {
    allowedReferences: ["青岚宗"],
  });
  assert.equal(event.choices[0].gainTechnique, "《小聚灵阵》");
  assert.deepEqual(event.choices[0].sectUpdate, proposal.choices[0].sectUpdate);
});

test("P0 mainline settlement synchronizes ecology, relationship, knowledge and sect history", () => {
  const state = createNewGame(profile, 17);
  const event = {
    id: "outer-court-registration",
    kind: "story",
    title: "外门报到",
    scene: "闻执事核对名册后，允许你进入青岚宗外门。",
    timeCostDays: 3,
    activityType: "sect",
    worldUpdate: "青岚宗外门名册新增一人。",
    encounterNpcs: [{
      id: "wen-zhishi", name: "闻执事", gender: "男", species: "人族",
      realmIndex: 2, stageIndex: 2, goal: "为外门挑出可用之人", alive: true,
    }],
    choices: [{
      id: "register",
      label: "登记入门",
      result: "你完成外门报到，并获授《小聚灵阵》。",
      effects: {},
      gainTechnique: "《小聚灵阵》",
      sectUpdate: {
        name: "青岚宗", position: "外门弟子", contributionDelta: 2, reputationDelta: 1,
        record: "完成外门报到",
      },
    }],
  };

  const settled = settleEventChoice(state, event, "register");
  assert.match(getNpcDossier(settled, "wen-zhishi").interactions[0].summary, /外门报到|小聚灵阵/);
  assert.deepEqual(
    settled.player.relationships.find((entry) => entry.npcId === "wen-zhishi"),
    { npcId: "wen-zhishi", name: "闻执事", affection: 0, stage: "初识", bond: "主线人物", romanceEnabled: false },
  );
  assert.deepEqual(
    settled.player.knowledge.find((entry) => entry.name === "《小聚灵阵》"),
    { id: "小聚灵阵", name: "《小聚灵阵》", category: "阵法", mastery: 1, depth: "入门", sourceEventId: "outer-court-registration" },
  );
  assert.equal(settled.player.sect.name, "青岚宗");
  assert.equal(settled.player.sect.position, "外门弟子");
  assert.equal(settled.player.sect.contribution, 2);
  assert.match(settled.player.sect.history.at(-1).record, /外门报到/);
});
