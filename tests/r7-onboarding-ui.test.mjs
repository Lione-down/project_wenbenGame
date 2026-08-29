import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const projectUrl = new URL("../", import.meta.url);

test("the homepage removes the author and exposes an accessible live age slider", async () => {
  const [html, app] = await Promise.all([
    readFile(new URL("public/index.html", projectUrl), "utf8"),
    readFile(new URL("public/app.mjs", projectUrl), "utf8"),
  ]);

  assert.doesNotMatch(html, /作者：|class="author"/);
  assert.match(html, /id="character-age"[^>]*type="range"[^>]*min="16"[^>]*max="60"/);
  assert.match(html, /<output id="character-age-output"[^>]*for="character-age"[^>]*>18 岁<\/output>/);
  assert.match(app, /function updateAgeOutput\(\)/);
  assert.match(app, /elements\["character-age-output"\]\.textContent\s*=\s*`\$\{elements\["character-age"\]\.value} 岁`/);
});

test("the gender control reveals and submits a custom free-text identity", async () => {
  const [html, app] = await Promise.all([
    readFile(new URL("public/index.html", projectUrl), "utf8"),
    readFile(new URL("public/app.mjs", projectUrl), "utf8"),
  ]);

  assert.match(html, /name="gender" value="自定义"/);
  assert.match(html, /id="custom-gender-field"[^>]*hidden/);
  assert.match(html, /id="custom-gender" name="customGender"[^>]*maxlength="20"/);
  assert.match(html, /placeholder="例如：雌雄同体的妖族"/);
  assert.match(app, /function updateCustomGenderField\(\)/);
  assert.match(app, /resolveCharacterGender\(String\(form\.get\("gender"\)\),\s*String\(form\.get\("customGender"\)\)\)/);
});

test("the form is populated from the structured Tianwu option authority", async () => {
  const [html, app] = await Promise.all([
    readFile(new URL("public/index.html", projectUrl), "utf8"),
    readFile(new URL("public/app.mjs", projectUrl), "utf8"),
  ]);

  assert.match(html, /<select id="birthplace" name="birthplace"><\/select>/);
  assert.match(html, /<select id="background" name="background"><\/select>/);
  assert.match(app, /BIRTHPLACE_OPTIONS/);
  assert.match(app, /BACKGROUND_OPTIONS/);
  assert.match(app, /populateCharacterOptions\(\)/);
});
