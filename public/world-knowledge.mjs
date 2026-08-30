import worldData from "./assets/world/world-data.mjs";

export const WORLD_KNOWLEDGE = Object.freeze(
  worldData.map((entry) => Object.freeze(structuredClone(entry))),
);

function termsOf(query) {
  return String(query || "")
    .toLocaleLowerCase("zh-CN")
    .split(/[\s，。；、]+/u)
    .map((term) => term.trim())
    .filter(Boolean)
    .slice(0, 12);
}

export function searchWorldKnowledge(query, { limit = 5 } = {}) {
  const terms = termsOf(query);
  if (terms.length === 0) return [];
  const boundedLimit = Math.min(8, Math.max(1, Math.floor(Number(limit) || 5)));
  return WORLD_KNOWLEDGE.map((entry) => {
    const id = String(entry.id || "").toLocaleLowerCase("zh-CN");
    const name = String(entry.name || "").toLocaleLowerCase("zh-CN");
    const keywords = (entry.keywords || []).map((keyword) => String(keyword).toLocaleLowerCase("zh-CN"));
    const searchable = `${id} ${name} ${keywords.join(" ")} ${String(entry.summary || "").toLocaleLowerCase("zh-CN")}`;
    const score = terms.reduce((total, term) => total + (id === term ? 6 : name.includes(term) ? 4 : keywords.some((keyword) => keyword.includes(term)) ? 2 : searchable.includes(term) ? 1 : 0), 0);
    return { entry, score };
  })
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score || left.entry.id.localeCompare(right.entry.id))
    .slice(0, boundedLimit)
    .map(({ entry }) => structuredClone(entry));
}
