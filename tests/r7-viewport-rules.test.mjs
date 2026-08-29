import test from "node:test";
import assert from "node:assert/strict";

import { shouldUseCompactViewport } from "../public/viewport-rules.mjs";

test("phone portrait and low-height phone landscape both use the compact single-panel shell", () => {
  for (const size of [
    { width: 320, height: 568 },
    { width: 360, height: 640 },
    { width: 390, height: 844 },
    { width: 430, height: 932 },
    { width: 844, height: 390 },
  ]) {
    assert.equal(shouldUseCompactViewport(size.width, size.height), true, `${size.width}x${size.height}`);
  }
});

test("tablet and desktop viewports retain the multi-panel layout", () => {
  assert.equal(shouldUseCompactViewport(1024, 768), false);
  assert.equal(shouldUseCompactViewport(1280, 720), false);
  assert.equal(shouldUseCompactViewport(1440, 900), false);
});

test("invalid dimensions fail safe to the compact shell", () => {
  assert.equal(shouldUseCompactViewport(0, 0), true);
  assert.equal(shouldUseCompactViewport(Number.NaN, 640), true);
});
