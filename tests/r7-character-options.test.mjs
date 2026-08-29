import test from "node:test";
import assert from "node:assert/strict";

import {
  BACKGROUND_OPTIONS,
  BIRTHPLACE_OPTIONS,
  resolveCharacterGender,
} from "../public/character-options.mjs";
import { createNewGame } from "../public/game-engine.mjs";

const baseProfile = {
  name: "闻人归海",
  gender: "不记",
  age: 18,
  birthplace: "炎武城",
  background: "无背景",
  path: "随心所欲",
  spiritRootGrade: "真灵根",
  rootPrimaryElement: "水",
  rootSecondaryElement: "",
  constitution: "凡体",
  talent: "过目不忘",
  stats: {
    aptitude: 10,
    insight: 10,
    soul: 10,
    agility: 10,
    martialHeart: 10,
    fortune: 10,
  },
};

function backgroundFingerprint(state) {
  return {
    stats: state.player.stats,
    resources: state.player.resources,
    techniques: state.player.techniques,
  };
}

test("birthplaces and backgrounds use the Tianwu continent setting", () => {
  assert.deepEqual(BIRTHPLACE_OPTIONS, [
    "天水国国都", "炎武城", "火乌帝国", "红月城",
    "化神海", "圣域", "东海海域", "南域边境",
  ]);
  assert.deepEqual(BACKGROUND_OPTIONS, [
    "天水国寒门", "迦蓝学院学员", "镇国神卫军户", "术炼师公会学徒", "炎武城商户",
    "红月城武者世家", "化神海杂役", "海族流民", "妖族后裔", "魔族遗脉",
  ]);
});

test("custom gender accepts a free description while fixed presets stay unchanged", () => {
  assert.equal(resolveCharacterGender("男", ""), "男");
  assert.equal(resolveCharacterGender("女", "忽略此值"), "女");
  assert.equal(resolveCharacterGender("自定义", "  雌雄同体的妖族  "), "雌雄同体的妖族");
  assert.throws(() => resolveCharacterGender("自定义", "   "), /自定义性别/);
  assert.throws(() => resolveCharacterGender("自定义", "超".repeat(21)), /二十个字/);
});

test("every selectable background produces a real initial-state difference", () => {
  const baseline = backgroundFingerprint(createNewGame(baseProfile, 81));
  for (const background of BACKGROUND_OPTIONS) {
    const state = createNewGame({ ...baseProfile, background }, 81);
    assert.notDeepEqual(backgroundFingerprint(state), baseline, `${background} must grant a playable start difference`);
  }
});

test("a custom gender survives character creation without changing relationship rules", () => {
  const state = createNewGame({
    ...baseProfile,
    gender: resolveCharacterGender("自定义", "雌雄同体的妖族"),
    background: "妖族后裔",
  }, 82);

  assert.equal(state.player.gender, "雌雄同体的妖族");
  assert.deepEqual(state.player.relationships, []);
});
