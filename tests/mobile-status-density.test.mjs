import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const stylesUrl = new URL("../public/styles.css", import.meta.url);

function rule(css, selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`));
  assert.ok(match, `missing CSS rule: ${selector}`);
  return match[1];
}

function tallPortraitRules(css) {
  const startMarker = "@media (orientation: portrait) and (min-height: 900px)";
  const start = css.indexOf(startMarker);
  assert.notEqual(start, -1, "missing tall portrait media query");
  const end = css.indexOf("\n@media ", start + startMarker.length);
  return css.slice(start, end === -1 ? css.length : end);
}

test("the compact status card follows actions instead of creating an automatic void", async () => {
  const css = await readFile(stylesUrl, "utf8");
  const statusRule = rule(css, ".mobile-player-status");

  assert.match(statusRule, /margin-top:\s*12px/);
  assert.doesNotMatch(statusRule, /margin-top:\s*auto/);
});

test("tall portrait mode increases event and action readability", async () => {
  const css = await readFile(stylesUrl, "utf8");
  const tallRules = tallPortraitRules(css);

  assert.match(rule(tallRules, "html.compact-viewport .event-heading h2"), /font-size:\s*26px/);
  assert.match(rule(tallRules, "html.compact-viewport .event-scene"), /font-size:\s*16px/);
  assert.match(rule(tallRules, "html.compact-viewport .choice-slip"), /min-height:\s*58px/);
  assert.match(rule(tallRules, "html.compact-viewport .choice-copy strong"), /font-size:\s*15px/);
  assert.match(rule(tallRules, "html.compact-viewport .choice-copy small"), /font-size:\s*13px/);
  assert.match(
    rule(tallRules, "html.compact-viewport .free-action-form input,\n  html.compact-viewport .free-action-form button"),
    /min-height:\s*52px[^}]*font-size:\s*17px/,
  );
  assert.match(rule(tallRules, "html.compact-viewport .command-drawer > summary"), /font-size:\s*15px/);
});

test("tall portrait mode expands the status card into readable resource rows", async () => {
  const css = await readFile(stylesUrl, "utf8");
  const tallRules = tallPortraitRules(css);

  const statusRule = rule(tallRules, "html.compact-viewport .mobile-player-status:not([hidden])");
  assert.match(statusRule, /flex:\s*1 1 auto/);
  assert.match(statusRule, /min-height:\s*260px/);
  assert.match(statusRule, /margin-top:\s*14px/);

  const resourcesRule = rule(tallRules, "html.compact-viewport .mobile-status-resources");
  assert.match(resourcesRule, /grid-template-columns:\s*minmax\(0, 1fr\)/);
  assert.match(resourcesRule, /grid-template-rows:\s*repeat\(3, minmax\(64px, 1fr\)\)/);
  assert.match(rule(tallRules, "html.compact-viewport .mobile-status-resource b"), /font-size:\s*18px/);
  assert.match(
    rule(
      tallRules,
      "html.compact-viewport #mobile-vitality-bar,\n  html.compact-viewport #mobile-spirit-bar,\n  html.compact-viewport #mobile-cultivation-bar",
    ),
    /height:\s*9px/,
  );
  assert.doesNotMatch(tallRules, /(?:line-clamp|-webkit-line-clamp)/);
});
