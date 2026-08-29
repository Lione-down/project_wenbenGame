import test from "node:test";
import assert from "node:assert/strict";

import {
  canResumeMainline,
  formatCaveFacilityLabel,
  formatEcologyLogEntry,
} from "../public/ui-presenters.mjs";

test("cave facility keys are rendered as player-facing Chinese labels", () => {
  assert.deepEqual(
    ["meditationRoom", "alchemyRoom", "forge", "spiritField", "gatheringArray", "ward"]
      .map(formatCaveFacilityLabel),
    ["静修室", "炼丹房", "炼器坊", "灵田", "聚灵阵", "洞府禁制"],
  );
  assert.equal(formatCaveFacilityLabel("unknownFacility"), "未知设施");
  assert.doesNotMatch(formatCaveFacilityLabel("unknownFacility"), /unknownFacility/);
});

test("ecology logs prefer Chinese narrative text and never expose raw event types", () => {
  assert.equal(
    formatEcologyLogEntry({ year: 1127, month: 6, type: "death", text: "林玄寿尽坐化。" }),
    "1127年6月 林玄寿尽坐化。",
  );
  assert.equal(
    formatEcologyLogEntry({ year: 1127, month: 7, type: "breakthrough" }),
    "1127年7月 NPC 完成一次破境。",
  );
  assert.equal(
    formatEcologyLogEntry({ year: 1127, month: 8, type: "unknownType" }),
    "1127年8月 发生一件未记载的生态变故。",
  );
  assert.doesNotMatch(formatEcologyLogEntry({ type: "unknownType" }), /unknownType/);
});

test("a mainline event can resume only while the saved turn is still current", () => {
  const event = { id: "mainline-1", choices: [{ id: "a" }] };
  assert.equal(canResumeMainline(event, 4, 4), true);
  assert.equal(canResumeMainline(event, 4, 5), false);
  assert.equal(canResumeMainline(null, 4, 4), false);
});
