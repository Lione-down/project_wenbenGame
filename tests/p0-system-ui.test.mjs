import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { createNewGame } from "../public/game-engine.mjs";
import * as lifeSystems from "../public/life-systems.mjs";

const projectUrl = new URL("../", import.meta.url);
const profile = {
  name: "赵日天", gender: "男", age: 18, birthplace: "天水国国都", background: "天水国寒门",
  path: "问道飞升", spiritRootGrade: "真灵根", rootPrimaryElement: "金", rootSecondaryElement: "",
  constitution: "凡体", talent: "天资聪颖",
  stats: { aptitude: 10, insight: 10, soul: 10, agility: 10, martialHeart: 10, fortune: 10 },
};

test("P0 cave requirement reports exact required, held and missing resources", () => {
  const state = createNewGame(profile, 18);
  assert.equal(typeof lifeSystems.getCaveUpgradeRequirement, "function");
  const requirement = lifeSystems.getCaveUpgradeRequirement(state, "aura");
  assert.deepEqual(requirement.costs, [
    { id: "spiritStones", name: "元石", required: 120, held: 50, missing: 70 },
    { id: "ore", name: "玄铁矿", required: 1, held: 3, missing: 0 },
  ]);
  assert.equal(requirement.canUpgrade, false);
});

test("P0 market prices cover every catalog asset with explicit buy and sell values", () => {
  const state = createNewGame(profile, 19);
  for (const itemId of Object.keys(lifeSystems.ITEM_CATALOG)) {
    const buyPrice = state.world.market.prices[itemId];
    assert.ok(Number.isInteger(buyPrice) && buyPrice > 0, `${itemId} 缺少买入价`);
    assert.equal(Math.floor(buyPrice * 0.6), lifeSystems.getMarketSellPrice(state, itemId));
  }
});

test("P0 system UI keeps item actions inline and preserves the active page after local actions", async () => {
  const [app, css] = await Promise.all([
    readFile(new URL("public/app.mjs", projectUrl), "utf8"),
    readFile(new URL("public/styles.css", projectUrl), "utf8"),
  ]);
  assert.match(app, /system-row-actions/);
  assert.match(app, /买入价[^\n]*卖出价/);
  assert.match(app, /getCaveUpgradeRequirement/);
  assert.match(app, /preserveSystemView/);
  assert.match(app, /主线人物/);
  assert.match(app, /未入门|入门/);
  assert.match(css, /\.system-row-actions/);
  assert.match(css, /grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto/);
  assert.doesNotMatch(css, /\.system-row-actions[^}]*transition:\s*all/i);
});
