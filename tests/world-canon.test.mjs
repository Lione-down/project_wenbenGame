import test from "node:test";
import assert from "node:assert/strict";

import {
  CANON_FACTIONS,
  CANON_MARTIAL_SKILLS,
  CANON_NPCS,
  CANON_TECHNIQUES,
  CANON_TRANSMISSIONS,
  buildWorldCanonContext,
} from "../public/world-canon.mjs";

test("world canon contains the supplied NPC and faction resources", () => {
  assert.ok(CANON_NPCS.length >= 5);
  assert.ok(CANON_FACTIONS.length >= 3);
  assert.deepEqual(
    CANON_NPCS.slice(0, 5).map((npc) => npc.name),
    ["李云霄", "古飞扬", "曲红颜", "洛云裳", "宁可云"],
  );
  assert.deepEqual(
    CANON_FACTIONS.map((faction) => faction.name),
    ["化神海", "红月城", "天盟"],
  );
});

test("world canon contains techniques, martial skills and refining transmissions", () => {
  assert.ok(CANON_TECHNIQUES.length >= 6);
  assert.ok(CANON_MARTIAL_SKILLS.length >= 4);
  assert.ok(CANON_TRANSMISSIONS.length >= 3);
  assert.ok(CANON_TECHNIQUES.some((item) => item.name === "《大衍神诀》"));
  assert.ok(CANON_TECHNIQUES.some((item) => item.name === "《混沌诀》"));
  assert.ok(CANON_TRANSMISSIONS.some((item) => item.name === "《万药宝典》"));
});

test("world canon prompt context protects the independent player role", () => {
  const context = buildWorldCanonContext();

  assert.match(context, /李云霄/);
  assert.match(context, /化神海/);
  assert.match(context, /《大衍神诀》/);
  assert.match(context, /玩家不得替代/);
  assert.match(context, /高阶传承只能以残篇、线索或受限指导出现/);
});
