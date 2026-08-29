export const EVENT_CONTENT_LIMITS = Object.freeze({
  title: 18,
  scene: 72,
  label: 12,
  hint: 18,
  result: 96,
  worldUpdate: 80,
  freeAction: 120,
});

function characterCount(value) {
  return Array.from(String(value ?? "")).length;
}

function assertBoundedString(value, field, minimum, maximum) {
  const length = characterCount(value);
  if (typeof value !== "string" || length < minimum || length > maximum) {
    throw new Error(`${field} 必须是 ${minimum} 至 ${maximum} 个字`);
  }
}

export function assertEventContentBudget(event) {
  if (!event || typeof event !== "object" || Array.isArray(event)) {
    throw new Error("event 必须是对象");
  }
  assertBoundedString(event.title, "title", 2, EVENT_CONTENT_LIMITS.title);
  assertBoundedString(event.scene, "scene", 12, EVENT_CONTENT_LIMITS.scene);
  assertBoundedString(event.worldUpdate, "worldUpdate", 2, EVENT_CONTENT_LIMITS.worldUpdate);
  if (!Array.isArray(event.choices) || event.choices.length < 2 || event.choices.length > 4) {
    throw new Error("choices 必须包含 2 至 4 项");
  }
  for (const choice of event.choices) {
    assertBoundedString(choice.label, "choices.label", 2, EVENT_CONTENT_LIMITS.label);
    assertBoundedString(choice.hint, "choices.hint", 2, EVENT_CONTENT_LIMITS.hint);
    assertBoundedString(choice.result, "choices.result", 2, EVENT_CONTENT_LIMITS.result);
  }
  return event;
}
