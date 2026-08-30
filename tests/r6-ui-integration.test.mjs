import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { buildAgnesPayload } from "../lib/agnes-contract.mjs";
import { createNewGame } from "../public/game-engine.mjs";
import { getOpeningEvent } from "../public/game-data.mjs";
import { sanitizeGameSnapshot } from "../server.mjs";

const projectUrl = new URL("../", import.meta.url);

const profile = {
  name: "闻人照夜",
  gender: "自定义",
  age: 21,
  birthplace: "红月城",
  background: "没落世家",
  path: "问鼎天下",
  spiritRootGrade: "变异灵根",
  rootPrimaryElement: "雷",
  rootSecondaryElement: "",
  constitution: "先天道胎",
  talent: "神识过人",
  stats: {
    aptitude: 10,
    insight: 10,
    soul: 10,
    agility: 10,
    martialHeart: 10,
    fortune: 10,
  },
};

test("opening event uses spirit root as the active cultivation foundation", () => {
  const state = createNewGame(profile, 51);
  const event = getOpeningEvent(state);

  assert.match(event.title, /灵根/);
  assert.match(event.scene, /变异灵根/);
  assert.match(event.scene, /雷/);
  assert.doesNotMatch(event.scene, /武魂/);
});

test("Agnes receives a bounded R6 snapshot without the legacy martial-soul authority", () => {
  const state = createNewGame(profile, 52);
  state.player.inventory.herb = 1000000;
  const snapshot = sanitizeGameSnapshot(state);

  assert.deepEqual(snapshot.player.spiritRoot, state.player.spiritRoot);
  assert.deepEqual(snapshot.player.progression, state.player.progression);
  assert.ok(snapshot.player.inventory.herb <= 9999);
  assert.ok(snapshot.player.techniqueBuild.main);
  assert.ok(snapshot.player.crafts.alchemy);
  assert.ok(snapshot.player.cave);
  assert.ok(Array.isArray(snapshot.player.relationships));
  assert.ok(Array.isArray(snapshot.world.npcs));
  assert.ok(snapshot.world.npcs.length <= 12);
  assert.equal("martialSoul" in snapshot.player, false);
});

test("Agnes prompt explains R6 semantics while reserving state mutations for the local engine", () => {
  const state = createNewGame(profile, 53);
  const snapshot = sanitizeGameSnapshot(state);
  const payload = buildAgnesPayload(snapshot, [], "我想查看天道突破所需材料");
  const prompt = payload.messages[0].content;

  assert.match(prompt, /资质、悟性、神识、遁速、道心、仙缘/);
  assert.match(prompt, /人道、地道、天道/);
  assert.match(prompt, /雷劫/);
  assert.match(prompt, /心魔/);
  assert.match(prompt, /本地规则引擎/);
  assert.match(prompt, /不得[^。]*凭空[^。]*(背包|材料|宗门|洞府)/);
});

test("creation UI collects spirit-root grade and elements with Ask Immortality labels", async () => {
  const html = await readFile(new URL("public/index.html", projectUrl), "utf8");

  for (const id of ["spirit-root-grade", "root-primary-element", "root-secondary-element"]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  for (const label of ["灵根品级", "主灵根", "次灵根", "神识", "遁速", "道心", "仙缘"]) {
    assert.match(html, new RegExp(label));
  }
  assert.doesNotMatch(html, /id="soul-attribute"/);
  assert.doesNotMatch(html, /<label>神魂<input|<label>身法<input|<label>武心<input|<label>气运<input/);
});

test("play screen exposes persisted R6 system state without a manufactured battle command", async () => {
  const html = await readFile(new URL("public/index.html", projectUrl), "utf8");

  for (const id of [
    "spirit-root-name", "inventory-list", "technique-build", "craft-list", "sect-state",
    "cave-state", "relationship-list", "npc-ecology-list", "system-panel",
    "system-panel-content", "system-action-list", "combat-forecast",
  ]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  for (const command of [
    "/修炼", "/突破", "/背包", "/功法", "/技艺", "/宗门", "/洞府",
    "/坊市", "/情缘", "/生态",
  ]) {
    assert.match(html, new RegExp(`data-command="${command}"`));
  }
  assert.doesNotMatch(html, /data-command="\/战斗"/);
});

test("UI handlers call local R6 rules instead of sending system commands to Agnes", async () => {
  const app = await readFile(new URL("public/app.mjs", projectUrl), "utf8");

  for (const symbol of [
    "cultivateOneMonth", "getBreakthroughOptions", "attemptBreakthrough", "buyMarketItem",
    "sellMarketItem", "equipTechnique", "practiceCraft", "joinSect", "runSectTask",
    "promoteSect", "upgradeCave", "plantCaveCrop", "tendCaveCrop", "interactWithNpc",
    "resolveCombatEncounterChoice",
  ]) {
    assert.match(app, new RegExp(symbol));
  }
  assert.match(app, /function renderSystemPanel\(/);
  assert.match(app, /function renderBreakthroughPanel\(/);
  assert.match(app, /command === "\/修炼"[\s\S]*cultivateOneMonth/);
  assert.match(app, /command === "\/突破"[\s\S]*renderBreakthroughPanel/);
  assert.match(app, /command === "\/技艺"[\s\S]*practiceCraft/);
  assert.match(app, /currentEvent\?\.kind === "combat"[\s\S]*resolveCombatEncounterChoice/);
  assert.doesNotMatch(app, /command === "\/战斗"/);
});

test("R6 system panels preserve mobile light-theme and touch-target contracts", async () => {
  const [html, css] = await Promise.all([
    readFile(new URL("public/index.html", projectUrl), "utf8"),
    readFile(new URL("public/styles.css", projectUrl), "utf8"),
  ]);

  assert.match(html, /styles\.css\?v=20260830-p1b/);
  assert.match(html, /app\.mjs\?v=20260830-p1b/);
  assert.match(css, /\.system-panel\s*\{/);
  assert.match(css, /\.system-grid\s*\{/);
  assert.match(css, /\.system-action[^}]*min-height:\s*44px/s);
  assert.match(css, /\.command-menu button[^}]*min-height:\s*44px/s);
  assert.match(css, /html\.compact-viewport\s+\.game-layout/);
  assert.match(css, /color-scheme:\s*light/);
});
