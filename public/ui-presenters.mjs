const CAVE_FACILITY_LABELS = Object.freeze({
  meditationRoom: "静修室",
  alchemyRoom: "炼丹房",
  forge: "炼器坊",
  spiritField: "灵田",
  gatheringArray: "聚灵阵",
  ward: "洞府禁制",
});

const ECOLOGY_EVENT_LABELS = Object.freeze({
  death: "有 NPC 离世。",
  breakthrough: "NPC 完成一次破境。",
  setback: "NPC 破境受阻，修为有所回落。",
  bond: "NPC 之间结成了新的羁绊。",
});

export function formatCaveFacilityLabel(facility) {
  return CAVE_FACILITY_LABELS[facility] ?? "未知设施";
}

export function formatEcologyLogEntry(entry = {}) {
  const year = Number(entry.year);
  const month = Number(entry.month);
  const time = Number.isInteger(year) && Number.isInteger(month)
    ? `${year}年${month}月 `
    : "";
  const narrative = [entry.text, entry.summary, entry.event]
    .find((value) => typeof value === "string" && value.trim())
    ?.trim()
    ?? ECOLOGY_EVENT_LABELS[entry.type]
    ?? "发生一件未记载的生态变故。";
  return `${time}${narrative}`;
}

export function canResumeMainline(event, eventTurn, currentTurn) {
  return Boolean(event) && Number.isInteger(eventTurn) && eventTurn === currentTurn;
}
