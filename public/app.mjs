import {
  attemptBreakthrough,
  calculateMonthlyCultivation,
  completeEventResolution,
  continueAfterResolution,
  createNewGame,
  cultivateOneMonth,
  exportGame,
  getBreakthroughOptions,
  getNpcDossier,
  getRealmCurve,
  importGame,
  failEventResolution,
  settleEventChoice,
  SIX_DIMENSION_LABELS,
} from "./game-engine.mjs?v=20260830-p1b";
import {
  deriveAgnesPendingUi,
  formatAgnesTransportDiagnostic,
  retryAgnesGeneration,
} from "./agnes-ui-state.mjs?v=20260830-taptap-diagnostic";
import {
  buyMarketItem,
  CRAFT_RECIPES,
  equipTechnique,
  getCaveUpgradeRequirement,
  getMarketSellPrice,
  interactWithNpc,
  ITEM_CATALOG,
  joinSect,
  plantCaveCrop,
  practiceCraft,
  promoteSect,
  runSectTask,
  sellMarketItem,
  tendCaveCrop,
  upgradeCave,
} from "./life-systems.mjs?v=20260829-p0";
import { getLearnedCombatSkills, resolveCombatEncounterChoice } from "./combat-system.mjs?v=20260829-r9";
import { chooseOfflineEvent, getOpeningEvent } from "./game-data.mjs?v=20260824-r8";
import {
  clearLocalGame,
  configureGameApiBase,
  configurePlayerAgnesDirect,
  createSafeResolutionFallback,
  loadLocalGame,
  requestAgnesResolution,
  requestProviderStatus,
  streamAgnesEvent,
} from "./game-client.mjs?v=20260830-p1b";
import { createIndexedDbSaveRepository } from "./indexeddb-save-repository.mjs?v=20260830-p1a";
import {
  canResumeMainline,
  formatCaveFacilityLabel,
  formatEcologyLogEntry,
} from "./ui-presenters.mjs?v=20260824-r7";
import {
  BACKGROUND_OPTIONS,
  BIRTHPLACE_OPTIONS,
  resolveCharacterGender,
} from "./character-options.mjs?v=20260824-r7";
import { shouldUseCompactViewport } from "./viewport-rules.mjs?v=20260824-r7";

if ("scrollRestoration" in history) history.scrollRestoration = "manual";
window.scrollTo({ top: 0, left: 0 });
const apiMode = document.querySelector('meta[name="destiny-api-mode"]')?.content || "local";
const playerAgnesTransportPolicy = apiMode === "player-key" ? "browser-fetch" : "auto";
const supportsPlayerAgnesSettings = ["local", "player-key"].includes(apiMode);
let apiBaseUrl = "";
try {
  apiBaseUrl = configureGameApiBase(
    document.querySelector('meta[name="destiny-api-base"]')?.content || "",
    { pageUrl: window.location.href },
  );
} catch {
  configureGameApiBase("");
}

function getEffectiveViewportWidth() {
  const widths = [
    window.innerWidth,
    window.visualViewport?.width,
    document.documentElement.clientWidth,
    window.screen?.width,
  ].filter((width) => Number.isFinite(width) && width > 0);
  return widths.length ? Math.min(...widths) : window.innerWidth;
}

function getEffectiveViewportHeight() {
  const heights = [
    window.innerHeight,
    window.visualViewport?.height,
    document.documentElement.clientHeight,
    window.screen?.height,
  ].filter((height) => Number.isFinite(height) && height > 0);
  return heights.length ? Math.min(...heights) : window.innerHeight;
}

function resetHorizontalViewportDrift() {
  window.requestAnimationFrame(() => {
    document.documentElement.scrollLeft = 0;
    document.body.scrollLeft = 0;
    document.querySelector(".game-layout")?.scrollTo({ left: 0 });
    document.querySelectorAll(".paper-panel").forEach((panel) => {
      panel.scrollLeft = 0;
    });
  });
}

function syncViewportMode() {
  const isCompact = shouldUseCompactViewport(getEffectiveViewportWidth(), getEffectiveViewportHeight());
  document.documentElement.classList.toggle("compact-viewport", isCompact);
  resetHorizontalViewportDrift();
}

const ids = [
  "intro-screen", "game-screen", "character-form", "character-name", "creation-step-basic",
  "creation-step-build", "creation-next", "creation-back", "character-age", "character-age-output",
  "custom-gender-field", "custom-gender", "birthplace", "background", "stat-points-left", "stat-budget-error",
  "continue-game", "continue-summary", "intro-provider-status", "provider-status", "engine-toggle",
  "world-year", "world-month", "era-name", "player-name", "identity-list", "soul-sigil",
  "spirit-root-name", "spirit-root-detail", "vitality-bar", "vitality-value", "spirit-bar",
  "spirit-value", "cultivation-bar", "cultivation-value", "cultivation-needed", "stat-list",
  "technique-build", "technique-list", "inventory-list", "craft-list", "sect-state", "cave-state",
  "relationship-list", "npc-list", "npc-ecology-list", "event-source", "event-title", "event-scene", "danger-mark",
  "choice-list", "resolution-view", "resolution-status", "resolution-narrative", "resolution-npc-reaction",
  "resolution-consequence", "resolution-next-clue", "resolution-error", "result-copy", "next-event", "event-loading", "streaming-preview",
  "provider-error", "provider-error-message", "retry-generation", "offline-continue", "free-action-form", "free-action-input",
  "system-panel", "system-panel-content", "system-action-list", "combat-forecast", "return-to-mainline", "npc-dossier", "retry-resolution",
  "command-drawer", "command-menu", "world-latest", "unrest-bar", "unrest-value", "chronicle-list", "chronicle-count",
  "mobile-player-status", "mobile-player-name", "mobile-player-realm", "mobile-player-location", "mobile-player-abnormal",
  "mobile-vitality-bar", "mobile-vitality-value", "mobile-spirit-bar", "mobile-spirit-value",
  "mobile-cultivation-bar", "mobile-cultivation-value", "mobile-cultivation-needed",
  "mobile-nav", "open-save-drawer", "close-save-drawer", "save-drawer", "drawer-scrim",
  "export-save", "import-save", "request-reset", "reset-confirmation", "cancel-reset", "confirm-reset",
  "open-agnes-settings-intro", "open-agnes-settings", "save-drawer-view", "agnes-settings-view",
  "back-from-agnes-settings", "agnes-key-input", "toggle-agnes-key-visibility", "remember-agnes-key",
  "save-agnes-settings", "test-agnes-connection", "test-taptap-connection", "request-clear-agnes-key", "clear-agnes-confirmation",
  "cancel-clear-agnes-key", "confirm-clear-agnes-key", "agnes-settings-status", "agnes-transport-status",
  "agnes-connection-diagnostic",
  "end-screen", "end-summary", "restart-from-end", "fate-seal", "toast",
];
const elements = Object.fromEntries(ids.map((id) => [id, document.getElementById(id)]));

const STAT_LABELS = SIX_DIMENSION_LABELS;
const EFFECT_LABELS = {
  ...STAT_LABELS,
  vitality: "气血",
  spirit: "灵力",
  wound: "伤势",
  cultivation: "修为",
  spiritStones: "元石",
  merit: "功德",
  karma: "业力",
  reputation: "声望",
  lifespan: "寿元",
};
const DANGER_LABELS = { low: "平和", medium: "有险", high: "凶险", fatal: "死劫" };
const TAG_LABELS = { peace: "平和", opportunity: "机缘", risk: "风险", affinity: "情缘", demonic: "魔道" };
const PROVIDER_MESSAGES = {
  agnes_not_configured: "尚未配置 Agnes Key，没有发起 AI 主持请求。",
  authentication: "Key 无效或没有调用权限。没有切换其他模型。",
  provider_uncertain: "请求超时，Provider 是否完成生成尚不确定。为避免重复消耗，没有自动重试。",
  rate_limited: "Agnes 当前请求过多。没有自动重试。",
  network_unavailable: "连接中断，未收到完整的 Agnes 响应。请检查网络后手动重试。",
  invalid_request: "Agnes 拒绝了本次请求，请检查服务配置。",
  provider_error: "Agnes 服务暂时不可用。没有切换其他模型。",
};

function formatProviderFailure(error) {
  const base = PROVIDER_MESSAGES[error?.code] || PROVIDER_MESSAGES.provider_error;
  const diagnostic = formatAgnesTransportDiagnostic(error);
  return diagnostic ? `${base} ${diagnostic}` : base;
}

let gameState = null;
let currentEvent = null;
let currentEventTurn = null;
let savedGame = null;
const saveRepository = createIndexedDbSaveRepository();

function persistGameState(state) {
  savedGame = state;
  void saveRepository.save(state).catch(() => showToast("IndexedDB 存档失败，请及时导出命簿"));
}
let providerConfigured = false;
let useAgnes = false;
let playerAgnesModule = null;
let playerAgnesCredential = "";
let playerAgnesVerified = false;
let isGenerating = false;
let lastGenerationAction = "";
let pendingSystemView = null;
let toastTimer = 0;

function renderAgnesTransportStatus(transportName = "") {
  const detected = transportName
    || playerAgnesModule?.getPlayerAgnesTransport?.({ transportPolicy: playerAgnesTransportPolicy }).name
    || "browser.fetch";
  const label = apiMode === "player-key" && detected === "browser.fetch"
    ? "browser.fetch（TapTap H5）"
    : detected;
  elements["agnes-transport-status"].textContent = `当前 Transport：${label}`;
}

function setAgnesConnectionDiagnostic(message = "") {
  elements["agnes-connection-diagnostic"].textContent = message;
  elements["agnes-connection-diagnostic"].hidden = !message;
}

function randomSeed() {
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  return buffer[0];
}

function setProviderChip(element, state, label) {
  element.dataset.state = state;
  element.querySelector("span:last-child").textContent = label;
}

function updateProviderUi() {
  if (apiMode === "player-key") {
    if (providerConfigured) {
      const introLabel = playerAgnesVerified ? "Agnes 连接已验证" : "Key 已保存 · 尚未测试";
      const gameLabel = playerAgnesVerified
        ? (useAgnes ? "Agnes 流式推演" : "Agnes 已验证")
        : (useAgnes ? "Agnes · 未测试" : "Key 已保存");
      setProviderChip(elements["intro-provider-status"], playerAgnesVerified ? "online" : "checking", introLabel);
      setProviderChip(elements["provider-status"], playerAgnesVerified ? "online" : "checking", gameLabel);
    } else {
      setProviderChip(elements["intro-provider-status"], "offline", "命簿引擎 · 未填 Key");
      setProviderChip(elements["provider-status"], "offline", "离线");
    }
    elements["engine-toggle"].textContent = useAgnes ? "Agnes 流式" : "命簿引擎";
    elements["engine-toggle"].setAttribute("aria-pressed", String(useAgnes));
    return;
  }
  if (providerConfigured) {
    setProviderChip(elements["intro-provider-status"], "online", "Agnes 2.5 Flash 可用");
    setProviderChip(elements["provider-status"], "online", useAgnes ? "Agnes 流式推演" : "Agnes 可用");
  } else {
    setProviderChip(elements["intro-provider-status"], "offline", "命簿引擎 · 离线");
    setProviderChip(elements["provider-status"], "offline", "离线");
  }
  elements["engine-toggle"].textContent = useAgnes ? "Agnes 流式" : "命簿引擎";
  elements["engine-toggle"].setAttribute("aria-pressed", String(useAgnes));
}

async function detectProvider() {
  if (supportsPlayerAgnesSettings) {
    try {
      playerAgnesModule = await import("./player-agnes.mjs?v=20260830-p1a");
      const { loadPlayerAgnesKey } = playerAgnesModule;
      const stored = loadPlayerAgnesKey({ sessionStorage, localStorage });
      playerAgnesCredential = stored.key;
      elements["agnes-key-input"].value = playerAgnesCredential;
      elements["remember-agnes-key"].checked = stored.remember;
      renderAgnesTransportStatus();
    } catch {
      playerAgnesModule = null;
      playerAgnesCredential = "";
      providerConfigured = false;
      useAgnes = false;
      configurePlayerAgnesDirect(null, "");
    }
  }
  if (apiMode === "player-key" || playerAgnesCredential) {
    providerConfigured = configurePlayerAgnesDirect(playerAgnesModule, playerAgnesCredential, {
      transportPolicy: playerAgnesTransportPolicy,
    });
    useAgnes = providerConfigured;
    updateProviderUi();
    return;
  }
  if (apiMode === "static" && !apiBaseUrl) {
    providerConfigured = false;
    useAgnes = false;
    updateProviderUi();
    return;
  }
  try {
    const status = await requestProviderStatus(fetch);
    providerConfigured = status.configured && status.model === "agnes-2.5-flash";
    useAgnes = providerConfigured;
  } catch {
    providerConfigured = false;
    useAgnes = false;
  }
  updateProviderUi();
}

async function restoreSaveCandidate() {
  try {
    savedGame = await saveRepository.load();
    if (!savedGame) {
      const legacySave = loadLocalGame(localStorage);
      if (legacySave) {
        await saveRepository.save(legacySave);
        clearLocalGame(localStorage);
        savedGame = legacySave;
      }
    }
  } catch {
    savedGame = null;
    showToast("IndexedDB 存档不可用，未加载本地命簿");
  }
  elements["intro-screen"].classList.toggle("has-save", Boolean(savedGame));
  if (!savedGame) {
    elements["continue-game"].hidden = true;
    return;
  }
  const status = savedGame.meta.status === "dead" ? "已封卷" : savedGame.player.realm;
  elements["continue-summary"].textContent = `${savedGame.player.name} · ${status} · ${savedGame.player.age} 岁`;
  elements["continue-game"].hidden = false;
}

function showCreationStep(step) {
  const showBasic = step === "basic";
  elements["creation-step-basic"].hidden = !showBasic;
  elements["creation-step-build"].hidden = showBasic;
  (showBasic ? elements["character-name"] : document.getElementById("spirit-root-grade")).focus({ preventScroll: true });
  elements["intro-screen"].scrollTo({ top: 0, behavior: "smooth" });
}

function validateBasicForm() {
  const name = elements["character-name"].value.trim();
  const age = Number(elements["character-age"].value);
  const nameError = !name ? "请为此生留下姓名" : name.length > 12 ? "姓名不能超过十二个字" : "";
  document.querySelector('[data-error-for="name"]').textContent = nameError;
  if (nameError) elements["character-name"].focus();
  if (!Number.isInteger(age) || age < 16 || age > 60) {
    showToast("初始年龄须为 16 至 60 岁");
    return false;
  }
  const form = new FormData(elements["character-form"]);
  try {
    resolveCharacterGender(String(form.get("gender")), String(form.get("customGender")));
  } catch (error) {
    showToast(error.message);
    elements["custom-gender"].focus();
    return false;
  }
  return !nameError;
}

function populateSelect(element, options) {
  element.replaceChildren(...options.map((label) => {
    const option = document.createElement("option");
    option.value = label;
    option.textContent = label;
    return option;
  }));
}

function populateCharacterOptions() {
  populateSelect(elements.birthplace, BIRTHPLACE_OPTIONS);
  populateSelect(elements.background, BACKGROUND_OPTIONS);
}

function updateAgeOutput() {
  elements["character-age-output"].textContent = `${elements["character-age"].value} 岁`;
}

function updateCustomGenderField() {
  const preset = document.querySelector('input[name="gender"]:checked')?.value;
  const isCustom = preset === "自定义";
  elements["custom-gender-field"].hidden = !isCustom;
  elements["custom-gender"].required = isCustom;
}

function readStats(form) {
  return Object.fromEntries(Object.keys(STAT_LABELS).map((key) => [key, Number(form.get(key))]));
}

function updateStatBudget() {
  const form = new FormData(elements["character-form"]);
  const total = Object.values(readStats(form)).reduce((sum, value) => sum + value, 0);
  const left = 60 - total;
  elements["stat-points-left"].textContent = left;
  elements["stat-points-left"].style.color = left === 0 ? "var(--merit)" : "var(--danger)";
  return left;
}

function openGame(state, event = null) {
  gameState = state;
  currentEvent = event;
  elements["intro-screen"].hidden = true;
  elements["game-screen"].hidden = false;
  elements["end-screen"].hidden = true;
  selectMobilePanel("event");
  renderState();
  window.scrollTo({ top: 0, left: 0 });
  if (gameState.meta.pendingResolution) renderResolution(gameState.meta.pendingResolution);
  else if (gameState.meta.status === "dead") showEndScreen();
  else if (currentEvent) renderEvent(currentEvent);
  else loadNextEvent();
}

function descriptionRows(rows) {
  return rows.map(([label, value]) => {
    const wrapper = document.createElement("div");
    const term = document.createElement("dt");
    const detail = document.createElement("dd");
    term.textContent = label;
    detail.textContent = value;
    wrapper.append(term, detail);
    return wrapper;
  });
}

function setMobilePlayerStatusVisible(isVisible) {
  elements["mobile-player-status"].hidden = !isVisible;
}

function renderState() {
  const { player, world, chronicle } = gameState;
  const resources = player.resources;
  elements["player-name"].textContent = player.name;
  elements["soul-sigil"].textContent = player.spiritRoot.primaryElement.slice(0, 1);
  elements["world-year"].textContent = world.year;
  elements["world-month"].textContent = world.month;
  elements["era-name"].textContent = world.era;
  elements["world-latest"].textContent = world.latest;
  elements["unrest-value"].textContent = world.unrest;
  elements["unrest-bar"].value = Math.min(100, world.unrest);

  elements["identity-list"].replaceChildren(...descriptionRows([
    ["道号", player.daoName], ["性别", player.gender],
    ["年龄 / 寿元", `${player.age} / ${player.lifespan}`], ["境界", `${player.realm} · ${player.realmStage}`],
    ["宗门 / 职位", `${player.sect.name} · ${player.sect.position}`], ["外貌", player.appearance],
    ["体质", player.constitution], ["所在地", player.location],
    ["时节", `${world.season} · ${world.month}月`], ["异常", player.abnormal],
    ["道途", player.path], ["主线", player.mainGoal],
  ]));

  const needed = getRealmCurve(player.realmIndex).stageRequirement;
  elements["vitality-bar"].max = resources.maxVitality;
  elements["vitality-bar"].value = resources.vitality;
  elements["vitality-value"].textContent = `${resources.vitality} / ${resources.maxVitality}`;
  elements["spirit-bar"].max = resources.maxSpirit;
  elements["spirit-bar"].value = resources.spirit;
  elements["spirit-value"].textContent = `${resources.spirit} / ${resources.maxSpirit}`;
  elements["cultivation-bar"].max = needed;
  elements["cultivation-bar"].value = Math.min(needed, player.cultivation);
  elements["cultivation-value"].textContent = player.cultivation;
  elements["cultivation-needed"].textContent = needed;

  elements["mobile-player-name"].textContent = player.name;
  elements["mobile-player-realm"].textContent = `${player.realm} · ${player.realmStage}`;
  elements["mobile-player-location"].textContent = player.location;
  elements["mobile-player-abnormal"].textContent = player.abnormal;
  elements["mobile-player-abnormal"].dataset.state = player.abnormal === "无" ? "normal" : "warning";
  elements["mobile-vitality-bar"].max = resources.maxVitality;
  elements["mobile-vitality-bar"].value = resources.vitality;
  elements["mobile-vitality-value"].textContent = `${resources.vitality} / ${resources.maxVitality}`;
  elements["mobile-spirit-bar"].max = resources.maxSpirit;
  elements["mobile-spirit-bar"].value = resources.spirit;
  elements["mobile-spirit-value"].textContent = `${resources.spirit} / ${resources.maxSpirit}`;
  elements["mobile-cultivation-bar"].max = needed;
  elements["mobile-cultivation-bar"].value = Math.min(needed, player.cultivation);
  elements["mobile-cultivation-value"].textContent = player.cultivation;
  elements["mobile-cultivation-needed"].textContent = needed;

  const statRows = Object.entries(STAT_LABELS).map(([key, label]) => [label, player.stats[key]]);
  statRows.push(
    ["元石", resources.spiritStones], ["功德", resources.merit], ["业力", resources.karma],
    ["声望", resources.reputation], ["伤势", resources.wound],
  );
  elements["stat-list"].replaceChildren(...descriptionRows(statRows));
  elements["spirit-root-name"].textContent = `${player.spiritRoot.grade} · ${player.spiritRoot.elements.join("、")}`;
  elements["spirit-root-detail"].textContent = `主灵根 ${player.spiritRoot.primaryElement} · 修炼系数 ${player.spiritRoot.coefficient.toFixed(2)} · ${player.constitution}`;
  elements["technique-build"].textContent = `主修：${player.techniqueBuild.main || "未设"}；辅助：${player.techniqueBuild.supports.join("、") || "未设"}`;
  elements["technique-list"].replaceChildren(...player.techniqueBuild.known.map((technique) => {
    const item = document.createElement("li");
    item.textContent = technique;
    return item;
  }));
  const inventoryRows = Object.entries(player.inventory)
    .filter(([, quantity]) => quantity > 0)
    .map(([itemId, quantity]) => {
      const item = document.createElement("li");
      item.textContent = `${ITEM_CATALOG[itemId]?.name || itemId} ×${quantity}`;
      return item;
    });
  if (inventoryRows.length === 0) {
    const empty = document.createElement("li");
    empty.textContent = "背包空空如也";
    inventoryRows.push(empty);
  }
  elements["inventory-list"].replaceChildren(...inventoryRows);
  elements["craft-list"].textContent = Object.entries(player.crafts)
    .map(([craft, skill]) => `${CRAFT_RECIPES[craft]?.name || craft} ${skill.level}阶(${skill.experience})`)
    .join(" · ");
  elements["sect-state"].textContent = `${player.sect.name} · ${player.sect.position} · 贡献 ${player.sect.contribution}`;
  const cropState = player.cave.crop ? `灵植尚需 ${player.cave.crop.monthsRemaining} 月` : "灵田空闲";
  elements["cave-state"].textContent = `灵气 ${player.cave.auraLevel}阶 · ${cropState}`;

  if (player.npcs.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-copy";
    empty.textContent = "尚无一人真正记得你。";
    elements["npc-list"].replaceChildren(empty);
  } else {
    elements["npc-list"].replaceChildren(...player.npcs.slice(-8).map((npc) => {
      const item = document.createElement("div");
      item.className = "npc-item";
      const name = document.createElement("strong");
      const relation = document.createElement("span");
      const detail = document.createElement("small");
      name.textContent = `${npc.name} · ${npc.role}`;
      relation.textContent = `${npc.relation >= 0 ? "+" : ""}${npc.relation}`;
      detail.textContent = `${npc.stance}，${npc.goal}`;
      item.append(name, relation, detail);
      return item;
    }));
  }

  if (player.relationships.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-copy";
    empty.textContent = "尚无情缘。友情与情缘不受性别限制。";
    elements["relationship-list"].replaceChildren(empty);
  } else {
    elements["relationship-list"].replaceChildren(...player.relationships.map((relationship) => {
      const item = document.createElement("div");
      item.className = "npc-item";
      const name = document.createElement("strong");
      const affection = document.createElement("span");
      const detail = document.createElement("small");
      name.textContent = `${relationship.name} · ${relationship.bond}`;
      affection.textContent = relationship.affection;
      detail.textContent = `${relationship.stage}${relationship.romanceEnabled ? " · 情缘已启" : ""}`;
      item.append(name, affection, detail);
      return item;
    }));
  }

  elements["npc-ecology-list"].replaceChildren(...world.npcs.map((npc) => {
    const item = document.createElement("div");
    item.className = "npc-item";
    const name = document.createElement("button");
    name.type = "button";
    name.className = "npc-dossier-trigger";
    name.addEventListener("click", () => {
      renderEcologyPanel();
      showNpcDossier(npc.id);
    });
    const status = document.createElement("span");
    const detail = document.createElement("small");
    const dossier = getNpcDossier(gameState, npc.id);
    name.textContent = `${npc.name} · ${npc.gender} · ${npc.species || "人族"}`;
    status.textContent = npc.alive ? "在世" : "已故";
    detail.textContent = npc.alive
      ? `${dossier.realm} · ${Math.floor(npc.ageMonths / 12)}岁 · ${npc.goal}`
      : `${dossier.realm} · ${Math.floor(npc.ageMonths / 12)}岁终 · 死因：${npc.deathCause || "未记"}`;
    item.append(name, status, detail);
    return item;
  }));

  elements["chronicle-count"].textContent = `${chronicle.length} 笔`;
  elements["chronicle-list"].replaceChildren(...chronicle.slice().reverse().map((entry) => {
    const item = document.createElement("li");
    const time = document.createElement("time");
    const title = document.createElement("strong");
    const copy = document.createElement("p");
    time.textContent = `${entry.year} 年 ${entry.month || 1} 月 · ${entry.age} 岁`;
    title.textContent = entry.eventTitle;
    copy.textContent = entry.result;
    item.append(time, title, copy);
    return item;
  }));
}

function renderEvent(event) {
  currentEvent = event;
  currentEventTurn = gameState.meta.turn;
  isGenerating = false;
  elements["system-panel"].hidden = true;
  setMobilePlayerStatusVisible(true);
  elements["event-loading"].hidden = true;
  const rawContent = event.displayOnly && typeof event.providerRawContent === "string"
    ? event.providerRawContent
    : "";
  elements["streaming-preview"].hidden = !rawContent;
  elements["streaming-preview"].textContent = rawContent;
  elements["provider-error"].hidden = true;
  elements["command-drawer"].open = false;
  elements["resolution-view"].hidden = true;
  document.querySelector(".event-panel").classList.remove("resolution-mode");
  document.querySelector(".event-heading").hidden = false;
  document.querySelector(".gold-rule").hidden = false;
  elements["event-scene"].hidden = false;
  elements["choice-list"].hidden = false;
  elements["free-action-form"].hidden = false;
  elements["command-drawer"].hidden = false;
  elements["event-source"].textContent = event.displayOnly
    ? "Agnes 2.5 Flash · 原文展示"
    : event.source === "agnes"
      ? "Agnes 2.5 Flash · 流式推演"
      : "命簿引擎 · 本地事件";
  elements["event-title"].textContent = event.title;
  elements["event-scene"].textContent = event.scene;
  elements["danger-mark"].dataset.danger = event.danger;
  elements["danger-mark"].textContent = DANGER_LABELS[event.danger] || "未知";

  const displayChoices = event.choices.flatMap((choice) => {
    if (event.kind !== "combat" || choice.action !== "fight") return [{ choice, skill: null }];
    return getLearnedCombatSkills(gameState).map((skill) => ({ choice, skill }));
  });
  const slips = displayChoices.map(({ choice, skill }, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "choice-slip";
    const number = document.createElement("span");
    number.className = "choice-index";
    number.textContent = ["A", "B", "C", "D"][index];
    const copy = document.createElement("span");
    copy.className = "choice-copy";
    const label = document.createElement("strong");
    const hint = document.createElement("small");
    label.textContent = skill ? `${skill.name}迎战` : choice.label;
    hint.textContent = skill ? `${skill.type} · 熟练 ${skill.mastery} · 灵力 ${skill.spiritCost}` : choice.hint;
    copy.append(label, hint);
    const effects = document.createElement("span");
    effects.className = "choice-effects";
    const tag = document.createElement("span");
    tag.className = "choice-tag";
    tag.dataset.tag = choice.tag || "peace";
    tag.textContent = TAG_LABELS[choice.tag] || "平和";
    effects.append(tag);
    for (const [key, value] of Object.entries(choice.effects || {}).slice(0, 2)) {
      const effect = document.createElement("span");
      effect.textContent = `${EFFECT_LABELS[key] || key}${value > 0 ? "+" : ""}${value}`;
      effects.append(effect);
    }
    button.append(number, copy, effects);
    button.addEventListener("click", () => commitChoice(choice.id, skill?.id));
    return button;
  });
  elements["choice-list"].replaceChildren(...slips);
  elements["event-title"].focus({ preventScroll: true });
  resetHorizontalViewportDrift();
}

function formatLocalDelta(stateDelta) {
  const labels = [];
  for (const [key, value] of Object.entries(stateDelta?.resources || {})) {
    labels.push(`${EFFECT_LABELS[key] || key}${value > 0 ? "+" : ""}${value}`);
  }
  for (const [key, value] of Object.entries(stateDelta?.stats || {})) {
    labels.push(`${EFFECT_LABELS[key] || key}${value > 0 ? "+" : ""}${value}`);
  }
  if (stateDelta?.cultivation) labels.push(`修为${stateDelta.cultivation > 0 ? "+" : ""}${stateDelta.cultivation}`);
  if (stateDelta?.lifespan) labels.push(`寿元${stateDelta.lifespan > 0 ? "+" : ""}${stateDelta.lifespan}`);
  if (stateDelta?.status !== "unchanged") labels.push(`状态 ${stateDelta.status}`);
  return labels.join("；") || "本地数值没有变化";
}

function renderResolution(pendingResolution, { isAwaiting = false, rawContent = "", providerError = null } = {}) {
  isGenerating = isAwaiting;
  setMobilePlayerStatusVisible(false);
  document.querySelector(".event-panel").classList.add("resolution-mode");
  document.querySelector(".event-heading").hidden = true;
  document.querySelector(".gold-rule").hidden = true;
  elements["event-scene"].hidden = true;
  elements["choice-list"].hidden = true;
  elements["free-action-form"].hidden = true;
  elements["command-drawer"].hidden = true;
  elements["system-panel"].hidden = true;
  const pendingUi = deriveAgnesPendingUi({ isAwaiting, isDead: gameState.meta.status === "dead" });
  elements["event-loading"].hidden = !pendingUi.isLoadingVisible;
  elements["event-loading"].querySelector("span").textContent = pendingUi.loadingText;
  elements["streaming-preview"].hidden = true;
  elements["provider-error"].hidden = true;
  elements["resolution-view"].hidden = false;

  const provider = pendingResolution.provider || { status: "pending" };
  const resolution = provider.resolution;
  elements["resolution-status"].textContent = provider.status === "complete"
    ? "Agnes 主持 · 本地结算已定"
    : isAwaiting
      ? "本地结算已定 · Agnes 正在主持"
      : "本地结算已定 · 未自动重试";
  elements["result-copy"].textContent = pendingResolution.localOutcome.summary;
  elements["resolution-narrative"].textContent = rawContent || resolution?.narrative || `本地结算已经完成：${pendingResolution.localOutcome.summary}`;
  elements["resolution-npc-reaction"].textContent = resolution?.npcReaction || "本地规则不虚构额外 NPC 台词。";
  elements["resolution-consequence"].textContent = resolution?.consequence || formatLocalDelta(pendingResolution.localOutcome.stateDelta);
  elements["resolution-next-clue"].textContent = resolution?.nextClue || pendingResolution.worldUpdate;
  const hasFailure = provider.status === "failed" || (provider.status === "pending" && !isAwaiting);
  elements["resolution-error"].hidden = !hasFailure;
  elements["resolution-error"].textContent = provider.status === "failed"
    ? `AI 主持失败：${formatProviderFailure(providerError || { code: provider.error })} 本地结果已保留。`
    : "上一次 AI 主持结果不确定，没有自动重试；本地结果已保留。";
  elements["retry-resolution"].hidden = !hasFailure || !providerConfigured;
  elements["retry-resolution"].disabled = isAwaiting;
  elements["next-event"].disabled = isAwaiting;
  elements["next-event"].hidden = !pendingUi.isContinueVisible;
  if (!isAwaiting && gameState.meta.status === "active") elements["next-event"].focus({ preventScroll: true });
  resetHorizontalViewportDrift();
}

async function settleAndNarrate({ choiceId = "", playerAction = "", skillId = "" } = {}) {
  if (isGenerating || gameState?.meta?.pendingResolution || !currentEvent) return;
  const choice = currentEvent?.choices.find((candidate) => candidate.id === choiceId);
  if (!choice && !playerAction) return;
  elements["choice-list"].querySelectorAll("button").forEach((button) => { button.disabled = true; });
  let resolvedState = null;
  let localOutcome = {
    status: playerAction ? "free_action" : "settled",
    summary: playerAction ? `你决定：${playerAction}。本地规则未产生额外数值变动。` : choice.result,
  };
  if (currentEvent?.kind === "combat") {
    if (choice) {
      const combat = resolveCombatEncounterChoice(gameState, currentEvent, choiceId, { skillId });
      resolvedState = combat.state;
      localOutcome = { status: combat.outcome.status, summary: combat.outcome.summary };
    }
  }
  gameState = settleEventChoice(gameState, currentEvent, choiceId, {
    playerAction,
    resolvedState,
    localOutcome,
  });
  persistGameState(gameState);
  renderState();
  strikeSeal();
  renderResolution(gameState.meta.pendingResolution, { isAwaiting: providerConfigured });
  if (!providerConfigured) {
    gameState = failEventResolution(gameState, "agnes_not_configured");
    persistGameState(gameState);
    renderResolution(gameState.meta.pendingResolution);
    return;
  }

  const resolutionId = gameState.meta.pendingResolution.id;
  try {
    let rawContent = "";
    const result = await requestAgnesResolution(fetch, gameState, (delta) => {
      rawContent += delta;
      elements["resolution-narrative"].textContent = rawContent;
    });
    if (gameState.meta.pendingResolution?.id !== resolutionId) return;
    const resolution = result.resolution || createSafeResolutionFallback(gameState.meta.pendingResolution);
    gameState = completeEventResolution(gameState, resolution);
    setProviderChip(elements["provider-status"], "online", "Agnes 主持完成");
    persistGameState(gameState);
    renderResolution(gameState.meta.pendingResolution, {
      rawContent: result.resolution ? "" : result.rawContent,
    });
    return;
  } catch (error) {
    if (gameState.meta.pendingResolution?.id !== resolutionId) return;
    gameState = failEventResolution(gameState, error.code || "provider_error");
    setProviderChip(elements["provider-status"], "error", "AI 主持失败");
    persistGameState(gameState);
    renderResolution(gameState.meta.pendingResolution, { providerError: error });
    return;
  }
  persistGameState(gameState);
  renderResolution(gameState.meta.pendingResolution);
}

async function retryPendingResolution() {
  if (isGenerating || !providerConfigured || !gameState?.meta?.pendingResolution) return;
  const resolutionId = gameState.meta.pendingResolution.id;
  renderResolution(gameState.meta.pendingResolution, { isAwaiting: true });
  try {
    let rawContent = "";
    const result = await requestAgnesResolution(fetch, gameState, (delta) => {
      rawContent += delta;
      elements["resolution-narrative"].textContent = rawContent;
    });
    if (gameState.meta.pendingResolution?.id !== resolutionId) return;
    gameState = completeEventResolution(
      gameState,
      result.resolution || createSafeResolutionFallback(gameState.meta.pendingResolution),
    );
    setProviderChip(elements["provider-status"], "online", "Agnes 主持完成");
  } catch (error) {
    if (gameState.meta.pendingResolution?.id !== resolutionId) return;
    gameState = failEventResolution(gameState, error.code || "provider_error");
    setProviderChip(elements["provider-status"], "error", "AI 主持失败");
    persistGameState(gameState);
    renderResolution(gameState.meta.pendingResolution, { providerError: error });
    return;
  }
  persistGameState(gameState);
  renderResolution(gameState.meta.pendingResolution);
}

function commitChoice(choiceId, skillId = "") {
  if (currentEvent?.agentCommitted && choiceId === "continue-agent-turn") {
    currentEvent = null;
    currentEventTurn = null;
    void loadNextEvent();
    return;
  }
  if (currentEvent?.displayOnly) {
    if (choiceId === "retry-agnes-generation") {
      void retryAgnesGeneration(loadNextEvent, lastGenerationAction);
    } else if (choiceId === "use-offline-engine") {
      useAgnes = false;
      updateProviderUi();
      renderEvent(chooseOfflineEvent(gameState));
    } else {
      elements["streaming-preview"].focus({ preventScroll: true });
    }
    return;
  }
  void settleAndNarrate({ choiceId, skillId });
}

function readPartialJsonString(source, field) {
  const marker = `"${field}"`;
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) return "";
  const colonIndex = source.indexOf(":", markerIndex + marker.length);
  if (colonIndex < 0) return "";
  const quoteIndex = source.indexOf('"', colonIndex + 1);
  if (quoteIndex < 0) return "";
  let result = "";
  let isEscaped = false;
  for (let index = quoteIndex + 1; index < source.length; index += 1) {
    const character = source[index];
    if (isEscaped) {
      const escaped = { n: "\n", r: "\r", t: "\t", '"': '"', "\\": "\\", "/": "/" }[character];
      result += escaped ?? character;
      isEscaped = false;
    } else if (character === "\\") {
      isEscaped = true;
    } else if (character === '"') {
      break;
    } else {
      result += character;
    }
  }
  return result;
}

function renderStreamDraft(raw) {
  const title = readPartialJsonString(raw, "title");
  const scene = readPartialJsonString(raw, "scene");
  elements["streaming-preview"].hidden = false;
  elements["streaming-preview"].textContent = [title, scene].filter(Boolean).join("\n\n") || raw || "天道正在落笔……";
}

async function loadNextEvent(action = "") {
  if (isGenerating) return;
  lastGenerationAction = action;
  setMobilePlayerStatusVisible(false);
  currentEvent = null;
  currentEventTurn = null;
  document.querySelector(".event-panel").classList.remove("resolution-mode");
  document.querySelector(".event-heading").hidden = false;
  document.querySelector(".gold-rule").hidden = false;
  elements["event-scene"].hidden = false;
  elements["choice-list"].hidden = false;
  elements["free-action-form"].hidden = false;
  elements["command-drawer"].hidden = false;
  elements["system-panel"].hidden = true;
  elements["choice-list"].replaceChildren();
  elements["resolution-view"].hidden = true;
  elements["provider-error"].hidden = true;
  elements["streaming-preview"].hidden = true;
  elements["event-loading"].hidden = false;
  elements["event-title"].textContent = action ? "自由行动判定中" : "命途未决";
  elements["event-scene"].textContent = "";
  if (!useAgnes || !providerConfigured) {
    if (action) showToast("离线命簿只能按内置事件推演，自由行动需启用 Agnes");
    renderEvent(chooseOfflineEvent(gameState));
    return;
  }

  isGenerating = true;
  let rawDraft = "";
  try {
    const history = gameState.chronicle.slice(-6).map((entry) => ({
      year: entry.year,
      month: entry.month,
      event: entry.eventTitle,
      result: entry.result,
    }));
    const event = await streamAgnesEvent(fetch, gameState, history, action, (delta) => {
      rawDraft += delta;
      renderStreamDraft(rawDraft);
    });
    if (event.agentGameState) {
      gameState = importGame(JSON.stringify(event.agentGameState));
      delete event.agentGameState;
      persistGameState(gameState);
      renderState();
    }
    renderEvent(event);
    setProviderChip(elements["provider-status"], "online", "Agnes 流式推演");
  } catch (error) {
    isGenerating = false;
    elements["event-loading"].hidden = true;
    elements["streaming-preview"].hidden = true;
    elements["provider-error"].hidden = false;
    elements["provider-error-message"].textContent = formatProviderFailure(error);
    setProviderChip(elements["provider-status"], "error", "Agnes 调用失败");
  }
}

function percent(value) {
  return `${Math.round(value * 100)}%`;
}

function commitLocalState(nextState, message) {
  gameState = nextState;
  persistGameState(gameState);
  renderState();
  if (message) showToast(message);
  if (gameState.meta.status === "dead") showEndScreen();
}

function preserveSystemView(run) {
  const activeCategory = elements["system-panel"].querySelector(".system-category-tabs button.active")?.dataset.systemCategory;
  pendingSystemView = {
    category: activeCategory || "",
    scrollTop: document.querySelector(".event-panel")?.scrollTop || 0,
  };
  run();
}

function renderSystemPanel(title, scene, rows = [], actions = [], forecast = "") {
  isGenerating = false;
  setMobilePlayerStatusVisible(false);
  selectMobilePanel("event");
  elements["event-loading"].hidden = true;
  elements["streaming-preview"].hidden = true;
  elements["provider-error"].hidden = true;
  elements["resolution-view"].hidden = true;
  elements["choice-list"].replaceChildren();
  elements["event-source"].textContent = "本地规则引擎 · 存档实算";
  elements["event-title"].textContent = title;
  elements["event-scene"].textContent = scene;
  elements["danger-mark"].dataset.danger = "low";
  elements["danger-mark"].textContent = "系统";

  const categories = [...new Set([
    ...rows.map(([, , category = "总览"]) => category),
    ...actions.map(({ category = "总览" }) => category),
  ])];
  const tabs = document.createElement("nav");
  tabs.className = "system-category-tabs";
  tabs.setAttribute("aria-label", `${title}分类`);
  const existingTabs = elements["system-panel"].querySelector(".system-category-tabs");
  if (existingTabs) existingTabs.remove();

  elements["npc-dossier"].hidden = true;
  const cards = rows.map(([label, value, category = "总览", onSelect = null, rowActions = []]) => {
    const card = document.createElement("div");
    card.className = `system-card${rowActions.length ? " has-row-actions" : ""}`;
    card.setAttribute("data-system-category", category);
    const content = document.createElement("div");
    content.className = "system-card-copy";
    const heading = onSelect ? document.createElement("button") : document.createElement("strong");
    if (onSelect) {
      heading.type = "button";
      heading.className = "npc-dossier-trigger";
      heading.addEventListener("click", onSelect);
    }
    const copy = document.createElement("span");
    heading.textContent = label;
    copy.textContent = String(value);
    content.append(heading, copy);
    card.append(content);
    if (rowActions.length) {
      const actionGroup = document.createElement("div");
      actionGroup.className = "system-row-actions";
      for (const action of rowActions) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = action.label;
        if (action.hint) button.title = action.hint;
        button.disabled = action.disabled === true;
        button.addEventListener("click", () => {
          try {
            preserveSystemView(action.run);
          } catch (error) {
            pendingSystemView = null;
            showToast(error.message || "本地规则拒绝了这次行动");
          }
        });
        actionGroup.append(button);
      }
      card.append(actionGroup);
    }
    return card;
  });
  elements["system-panel-content"].replaceChildren(...cards);
  elements["combat-forecast"].hidden = !forecast;
  elements["combat-forecast"].textContent = forecast;

  const buttons = actions.map(({ label, hint = "", category = "总览", run }) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "system-action";
    button.setAttribute("data-system-category", category);
    const heading = document.createElement("strong");
    heading.textContent = label;
    button.append(heading);
    if (hint) {
      const copy = document.createElement("small");
      copy.textContent = hint;
      button.append(copy);
    }
    button.addEventListener("click", () => {
      try {
        preserveSystemView(run);
      } catch (error) {
        pendingSystemView = null;
        showToast(error.message || "本地规则拒绝了这次行动");
      }
    });
    return button;
  });
  elements["system-action-list"].replaceChildren(...buttons);
  const showCategory = (category) => {
    [...cards, ...buttons].forEach((item) => { item.hidden = item.dataset.systemCategory !== category; });
    tabs.querySelectorAll("button").forEach((button) => {
      const selected = button.dataset.systemCategory === category;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-selected", String(selected));
    });
  };
  for (const category of categories) {
    const tab = document.createElement("button");
    tab.type = "button";
    tab.setAttribute("data-system-category", category);
    tab.textContent = category;
    tab.addEventListener("click", () => showCategory(category));
    tabs.append(tab);
  }
  elements["system-panel"].insertBefore(tabs, elements["system-panel-content"]);
  const initialCategory = categories.includes(pendingSystemView?.category) ? pendingSystemView.category : categories[0];
  if (initialCategory) showCategory(initialCategory);
  elements["system-panel"].hidden = false;
  elements["event-title"].focus({ preventScroll: true });
  const viewToRestore = pendingSystemView;
  if (viewToRestore) {
    requestAnimationFrame(() => {
      const eventPanel = document.querySelector(".event-panel");
      if (eventPanel) eventPanel.scrollTop = viewToRestore.scrollTop;
      if (pendingSystemView === viewToRestore) pendingSystemView = null;
    });
  }
  resetHorizontalViewportDrift();
}

function renderCultivationPanel(cultivator = cultivateOneMonth) {
  const normal = calculateMonthlyCultivation(gameState, { mode: "normal" });
  const closedDoor = calculateMonthlyCultivation(gameState, { mode: "closedDoor" });
  const curve = getRealmCurve(gameState.player.realmIndex);
  const run = (mode) => {
    const result = cultivator(gameState, { mode });
    commitLocalState(result.state, `修炼一月，修为增加 ${result.monthlyGain}`);
    renderCultivationPanel(cultivator);
  };
  renderSystemPanel(
    "修炼推演",
    "修炼收益由境界曲线、资质、灵根、主功法、洞府灵气与道心共同结算；闭关收益更高，但同样消耗一个月。",
    [
      ["当前层次", `${gameState.player.realm}·${gameState.player.realmStage}`],
      ["修为进度", `${gameState.player.cultivation} / ${curve.stageRequirement}`],
      ["常规月收益", normal.monthlyGain],
      ["闭关月收益", closedDoor.monthlyGain],
      ["综合系数", `灵根 ${normal.rootCoefficient.toFixed(2)} · 功法 ${normal.techniqueCoefficient.toFixed(2)} · 洞府 ${normal.auraCoefficient.toFixed(2)} · 道心 ${normal.mindCoefficient.toFixed(2)}`],
    ],
    [
      { label: "常规修炼一月", hint: `预计 +${normal.monthlyGain} 修为`, run: () => run("normal") },
      { label: "闭关修炼一月", hint: `预计 +${closedDoor.monthlyGain} 修为`, run: () => run("closedDoor") },
    ],
  );
}

function breakthroughSummary(outcome) {
  if (outcome.status === "blocked") return outcome.reason;
  if (outcome.status === "success") {
    return outcome.kind === "minor"
      ? `小境界突破成功，现为${gameState.player.realm}·${gameState.player.realmStage}`
      : `已渡过雷劫与心魔，踏入${gameState.player.realm}`;
  }
  return outcome.failureConsequence || "冲关失败，修为回落并受伤";
}

function renderBreakthroughPanel() {
  const player = gameState.player;
  const curve = getRealmCurve(player.realmIndex);
  const isMajor = player.progression.stageIndex === 3;
  const options = getBreakthroughOptions(gameState);
  const rows = [
    ["当前层次", `${player.realm}·${player.realmStage}`],
    ["修为门槛", `${player.cultivation} / ${curve.stageRequirement}`],
    ["突破冷却", `${player.progression.breakthroughCooldown} 月`],
  ];
  const actions = [];
  if (!isMajor) {
    actions.push({
      label: "冲击下一小境界",
      hint: "以悟性与道心判定；失败会回落修为并产生冷却",
      run: () => {
        const result = attemptBreakthrough(gameState, "minor");
        if (result.outcome.status !== "blocked") commitLocalState(result.state);
        showToast(breakthroughSummary(result.outcome));
        renderBreakthroughPanel();
      },
    });
  } else if (options.length === 0) {
    rows.push(["大道尽头", "当前已是最高境界，暂无更高层次"]);
  } else {
    for (const option of options) {
      rows.push([
        option.name,
        `持有：${option.heldMaterialLabels.join("、")} · 缺少：${option.missingMaterialLabels.join("、") || "无"} · 成功 ${percent(option.successRate)} · 雷劫 ${percent(option.thunderRisk)} · 心魔 ${percent(option.heartDemonRisk)} · 失败：${option.failureConsequence}`,
        option.name,
      ]);
      actions.push({
        label: `选择${option.name}`,
        hint: `成长 ${option.growth}；材料会在正式冲关时消耗`,
        category: option.name,
        run: () => {
          const result = attemptBreakthrough(gameState, option.route);
          if (result.outcome.status !== "blocked") commitLocalState(result.state);
          showToast(breakthroughSummary(result.outcome));
          renderBreakthroughPanel();
        },
      });
    }
  }
  renderSystemPanel(
    "破境择道",
    isMajor
      ? "圆满后必须在人道、地道、天道中择一路线。三路材料、成功率、雷劫、心魔与失败后果均不同。"
      : "先完成初期、中期、后期、圆满四个小境界；圆满后才可选择三道大境界突破。",
    rows,
    actions,
  );
}

function renderInventoryPanel() {
  const rows = Object.entries(gameState.player.inventory).map(([itemId, quantity]) => [
    ITEM_CATALOG[itemId]?.name || itemId,
    `持有 ${quantity}`,
    ({ pill: "丹药", equipment: "装备", consumable: "消耗品" }[ITEM_CATALOG[itemId]?.category] || "材料"),
  ]);
  rows.unshift(["元石", gameState.player.resources.spiritStones, "货币"]);
  renderSystemPanel("背包与材料", "材料是突破、技艺、洞府和交易的真实输入；不足时本地规则会拒绝执行。", rows);
}

function renderTechniquePanel() {
  const build = gameState.player.techniqueBuild;
  const rows = (gameState.player.knowledge || []).map((knowledge) => {
    const buildName = knowledge.name.replace(/^《|》$/gu, "");
    const rowActions = knowledge.category === "功法" && build.known.includes(buildName) && buildName !== build.main
      ? [
        {
          label: "主修",
          run: () => {
            commitLocalState(equipTechnique(gameState, buildName, "main"), "主功法已更换");
            renderTechniquePanel();
          },
        },
        ...(!build.supports.includes(buildName) ? [{
          label: "辅助",
          run: () => {
            commitLocalState(equipTechnique(gameState, buildName, "support"), "辅助功法已装备");
            renderTechniquePanel();
          },
        }] : []),
      ]
      : [];
    return [knowledge.name, `${knowledge.depth || "未入门"} · 熟练 ${knowledge.mastery ?? 0}`, knowledge.category || "功法", null, rowActions];
  });
  rows.unshift(["当前构筑", `主修 ${build.main || "未设"} · 辅助 ${build.supports.join("、") || "未设"}`, "当前构筑"]);
  renderSystemPanel(
    "功法构筑",
    "主线实际习得的功法、武技、阵法、身法与技艺会同步归档；修炼深度按熟练度显示。",
    rows,
  );
}

function renderCraftPanel(craftExecutor = practiceCraft) {
  const actions = Object.entries(CRAFT_RECIPES).map(([craft, recipe]) => ({
    label: `研习${recipe.name}`,
    category: recipe.name,
    hint: `材料 ${Object.entries(recipe.materials).map(([itemId, quantity]) => `${ITEM_CATALOG[itemId].name}×${quantity}`).join("、")}；耗时一月`,
    run: () => {
      const result = craftExecutor(gameState, craft);
      commitLocalState(result.state, result.outcome.status === "success" ? `${recipe.name}成功` : `${recipe.name}失手，材料已损耗`);
      renderCraftPanel(craftExecutor);
    },
  }));
  const rows = Object.entries(gameState.player.crafts).map(([craft, skill]) => [
    CRAFT_RECIPES[craft].name,
    `${skill.level}阶 · 熟练 ${skill.experience}`,
    CRAFT_RECIPES[craft].name,
  ]);
  renderSystemPanel("修仙六艺", "炼丹、炼器、符箓、阵法、御兽、灵植都有材料消耗、熟练度和成败判定。", rows, actions);
}

function renderSectPanel() {
  const sect = gameState.player.sect;
  const actions = sect.name === "散修"
    ? [{
      label: "加入红月城术炼师公会",
      hint: "成为外门弟子并开启宗门任务",
      run: () => {
        commitLocalState(joinSect(gameState, "红月城术炼师公会"), "已入宗门");
        renderSectPanel();
      },
    }]
    : [
      ...[
        ["gathering", "采药任务"], ["patrol", "山门巡逻"], ["hunting", "猎妖任务"],
      ].map(([taskId, name]) => ({
        label: name,
        hint: "耗时一月，获得贡献与资源",
        run: () => {
          const result = runSectTask(gameState, taskId);
          commitLocalState(result.state, `${result.task.name}完成`);
          renderSectPanel();
        },
      })),
      {
        label: "申请晋升",
        hint: "按贡献门槛晋升职位",
        run: () => {
          commitLocalState(promoteSect(gameState), "宗门职位已晋升");
          renderSectPanel();
        },
      },
    ];
  renderSystemPanel(
    "宗门生涯",
    "宗门职位由贡献驱动；任务真实推进一个月，并同步 NPC 生态。",
    [
      ["宗门", sect.name, "当前宗门"],
      ["职位", sect.position, "当前宗门"],
      ["贡献", sect.contribution, "当前宗门"],
      ["宗门声望", sect.reputation, "当前宗门"],
      ...(sect.history || []).slice().reverse().map((entry) => [entry.record, `${entry.year}年${entry.month}月`, "主线记录"]),
    ],
    actions,
  );
}

function renderCavePanel() {
  const cave = gameState.player.cave;
  const requirementText = (requirement) => requirement.isMaxLevel
    ? "已达上限"
    : requirement.costs.map((cost) => `${cost.name} ${cost.required}（持有${cost.held}/缺${cost.missing}）`).join(" · ");
  const auraRequirement = getCaveUpgradeRequirement(gameState, "aura");
  const rows = [
    ["洞府灵气", `${cave.auraLevel}阶 · 升级需要 ${requirementText(auraRequirement)}`, "修炼区", null, [{
      label: "升级",
      hint: requirementText(auraRequirement),
      disabled: auraRequirement.isMaxLevel,
      run: () => {
        commitLocalState(upgradeCave(gameState, "aura"), "洞府灵气已提升");
        renderCavePanel();
      },
    }]],
    ...Object.entries(cave.facilities).map(([facility, level]) => {
      const requirement = getCaveUpgradeRequirement(gameState, facility);
      return [formatCaveFacilityLabel(facility), `${level}阶 · 升级需要 ${requirementText(requirement)}`, "设施区", null, [{
        label: "升级",
        hint: requirementText(requirement),
        disabled: requirement.isMaxLevel,
        run: () => {
          commitLocalState(upgradeCave(gameState, facility), "洞府设施已升级");
          renderCavePanel();
        },
      }]];
    }),
    ["灵田", cave.crop ? `尚需照料 ${cave.crop.monthsRemaining} 月` : "空闲", "灵田区"],
  ];
  const actions = [
    cave.crop
      ? {
        label: "照料灵植一月",
        category: "灵田区",
        run: () => {
          const result = tendCaveCrop(gameState);
          commitLocalState(result.state, result.outcome.status === "harvested" ? `收获灵药 ${result.outcome.harvest} 株` : "灵植继续生长");
          renderCavePanel();
        },
      }
      : {
        label: "播种灵植",
        category: "灵田区",
        hint: "消耗一枚灵植种子",
        run: () => {
          commitLocalState(plantCaveCrop(gameState), "灵植已经播种");
          renderCavePanel();
        },
      },
  ];
  renderSystemPanel("洞府经营", "洞府灵气影响修炼，设施影响生产；灵田需要真实播种和逐月照料。", rows, actions);
}

function renderMarketPanel() {
  const prices = gameState.world.market.prices;
  const rows = Object.entries(prices).map(([itemId, price]) => {
    const item = ITEM_CATALOG[itemId];
    const category = ({ pill: "丹药", equipment: "装备", consumable: "消耗品" }[item.category] || "材料");
    const rowActions = [{
      label: "买入",
      hint: `${price} 元石 / 件`,
      run: () => {
        const result = buyMarketItem(gameState, itemId);
        commitLocalState(result.state, `买入${result.item.name}，花费 ${result.cost} 元石`);
        renderMarketPanel();
      },
    }];
    if ((gameState.player.inventory[itemId] ?? 0) > 0) {
      rowActions.push({
        label: "卖出",
        hint: `回收价 ${getMarketSellPrice(gameState, itemId)} 元石`,
        run: () => {
          const result = sellMarketItem(gameState, itemId);
          commitLocalState(result.state, `卖出${result.item.name}，获得 ${result.revenue} 元石`);
          renderMarketPanel();
        },
      });
    }
    return [item.name, `买入价 ${price} · 卖出价 ${getMarketSellPrice(gameState, itemId)} · 持有 ${gameState.player.inventory[itemId] ?? 0}`, category, null, rowActions];
  });
  rows.unshift(["随身元石", gameState.player.resources.spiritStones, "货币"]);
  renderSystemPanel("坊市交易", "每项资产同时标注买入价与卖出价，交易按钮固定在该项右侧。", rows);
}

function renderRelationshipPanel() {
  const livingNpcs = gameState.world.npcs.filter((npc) => npc.alive);
  const rows = livingNpcs.map((npc) => {
    const relation = gameState.player.relationships.find((candidate) => candidate.npcId === npc.id);
    return [npc.name, relation ? `${relation.bond} · ${relation.stage} · 好感 ${relation.affection}` : "主线人物 · 初识 · 好感 0", relation?.bond || "主线人物"];
  });
  const actions = livingNpcs.flatMap((npc) => [
    {
      label: `结交 ${npc.name}`,
      category: gameState.player.relationships.find((entry) => entry.npcId === npc.id)?.bond || "主线人物",
      hint: "友情路线 · 耗时一月",
      run: () => {
        const result = interactWithNpc(gameState, npc.id, { kind: "friendship" });
        commitLocalState(result.state, `与${result.npc.name}的${result.bond}加深`);
        renderRelationshipPanel();
      },
    },
    {
      label: `追求 ${npc.name}`,
      category: gameState.player.relationships.find((entry) => entry.npcId === npc.id)?.bond || "主线人物",
      hint: "全性向情缘路线 · 耗时一月",
      run: () => {
        const result = interactWithNpc(gameState, npc.id, { kind: "romance" });
        commitLocalState(result.state, `与${result.npc.name}的${result.bond}加深`);
        renderRelationshipPanel();
      },
    },
  ]);
  renderSystemPanel("情缘与关系", "友情、师徒、结义、宿敌与情缘共用持续关系状态；情缘不受角色性别限制。", rows, actions);
}

function renderEcologyPanel() {
  const rows = gameState.world.npcs.map((npc) => {
    const dossier = getNpcDossier(gameState, npc.id);
    return [
      `${npc.name} · ${npc.gender} · ${npc.species || "人族"}`,
      npc.alive
        ? `${dossier.realm} · ${Math.floor(npc.ageMonths / 12)}岁 · 修为 ${npc.cultivation} · 羁绊 ${npc.bonds.length}`
        : `${dossier.realm} · ${Math.floor(npc.ageMonths / 12)}岁终 · 已故 · 死因：${npc.deathCause || "未记"}`,
      npc.alive ? "在世" : "已故",
      () => showNpcDossier(npc.id),
    ];
  });
  const latest = gameState.world.ecologyLog.slice(-6).map(formatEcologyLogEntry).join("；");
  if (latest) rows.push(["最近生态", latest, "世界记录"]);
  renderSystemPanel("NPC 月度生态", "每次时间推进，NPC 都会独立增长年龄与修为，并可能突破、失败、结缘或死亡。", rows);
}

function showNpcDossier(npcId) {
  const npc = getNpcDossier(gameState, npcId);
  const heading = document.createElement("h3");
  heading.textContent = `${npc.name} · ${npc.gender} · ${npc.species}`;
  const status = document.createElement("p");
  status.textContent = `${npc.realm} · ${npc.alive ? "在世" : `已故，死因：${npc.deathCause || "未记"}`} · 目标：${npc.goal}`;
  const history = document.createElement("ol");
  const entries = npc.interactions.length > 0
    ? npc.interactions.map((interaction) => `${interaction.year}年${interaction.month}月：${interaction.summary}`)
    : ["尚无已记录的直接交集。"];
  history.replaceChildren(...entries.map((text) => {
    const item = document.createElement("li");
    item.textContent = text;
    return item;
  }));
  elements["npc-dossier"].replaceChildren(heading, status, history);
  elements["npc-dossier"].hidden = false;
  elements["npc-dossier"].focus({ preventScroll: true });
}

function renderHelpPanel() {
  renderSystemPanel(
    "命令帮助",
    "系统命令由本地规则引擎结算，不会发送给 Agnes；其他自然语言自由行动才由当前事件引擎推演。",
    [
      ["成长", "/修炼 · /突破 · /功法 · /技艺"],
      ["经营", "/背包 · /宗门 · /洞府 · /坊市"],
      ["世界", "/情缘 · /生态"],
    ],
  );
}

function handleCommand(command) {
  if (command === "/状态") {
    selectMobilePanel("player");
    showToast("已打开完整状态卡");
    return;
  }
  if (command === "/修炼") {
    renderCultivationPanel(cultivateOneMonth);
    return;
  }
  if (command === "/突破") {
    renderBreakthroughPanel();
    return;
  }
  if (command === "/背包") {
    renderInventoryPanel();
    return;
  }
  if (command === "/功法") {
    renderTechniquePanel();
    return;
  }
  if (command === "/技艺") {
    renderCraftPanel(practiceCraft);
    return;
  }
  if (command === "/宗门") {
    renderSectPanel();
    return;
  }
  if (command === "/洞府") {
    renderCavePanel();
    return;
  }
  if (command === "/坊市") {
    renderMarketPanel();
    return;
  }
  if (command === "/情缘" || command === "/关系") {
    renderRelationshipPanel();
    return;
  }
  if (command === "/生态") {
    renderEcologyPanel();
    return;
  }
  if (command === "/帮助") {
    renderHelpPanel();
    return;
  }
  loadNextEvent(command);
}

function returnToMainline() {
  if (canResumeMainline(currentEvent, currentEventTurn, gameState.meta.turn)) {
    renderEvent(currentEvent);
    return;
  }
  loadNextEvent();
}

function strikeSeal() {
  elements["fate-seal"].classList.remove("strike");
  void elements["fate-seal"].offsetWidth;
  elements["fate-seal"].classList.add("strike");
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.hidden = false;
  toastTimer = window.setTimeout(() => { elements.toast.hidden = true; }, 2800);
}

function selectMobilePanel(panel) {
  document.querySelector(".game-layout").dataset.mobilePanel = panel;
  elements["mobile-nav"].querySelectorAll("button").forEach((button) => {
    const active = button.dataset.mobilePanel === panel;
    button.classList.toggle("active", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  resetHorizontalViewportDrift();
}

function showDrawerView(view = "save") {
  const isSettings = view === "agnes";
  elements["save-drawer-view"].hidden = isSettings;
  elements["agnes-settings-view"].hidden = !isSettings;
  if (isSettings) {
    renderAgnesTransportStatus();
    setAgnesConnectionDiagnostic();
    elements["clear-agnes-confirmation"].hidden = true;
    elements["agnes-settings-status"].textContent = providerConfigured
      ? (playerAgnesVerified ? "连接已验证，可启用 Agnes。" : "Key 已保存，尚未测试连接。")
      : "未保存 Key，当前使用离线命簿引擎。";
  }
}

function openDrawer(view = "save") {
  showDrawerView(view);
  elements["save-drawer"].setAttribute("aria-hidden", "false");
  elements["save-drawer"].classList.add("open");
  elements["drawer-scrim"].hidden = false;
  elements["open-save-drawer"].setAttribute("aria-expanded", "true");
  (view === "agnes" ? elements["agnes-key-input"] : elements["close-save-drawer"]).focus();
}

function closeDrawer() {
  elements["save-drawer"].classList.remove("open");
  elements["save-drawer"].setAttribute("aria-hidden", "true");
  elements["drawer-scrim"].hidden = true;
  elements["open-save-drawer"].setAttribute("aria-expanded", "false");
  showDrawerView("save");
}

function setAgnesSettingsStatus(message, state = "neutral") {
  elements["agnes-settings-status"].textContent = message;
  elements["agnes-settings-status"].dataset.state = state;
}

function saveAgnesSettings() {
  if (!playerAgnesModule) {
    setAgnesSettingsStatus("Agnes 模块加载失败，请更新游戏包后重试。", "error");
    return;
  }
  const candidate = elements["agnes-key-input"].value.trim();
  if (!candidate) {
    setAgnesSettingsStatus("请先填写 Agnes Key。", "error");
    return;
  }
  const { savePlayerAgnesKey } = playerAgnesModule;
  savePlayerAgnesKey({
    sessionStorage,
    localStorage,
    key: candidate,
    remember: elements["remember-agnes-key"].checked,
  });
  playerAgnesCredential = candidate;
  playerAgnesVerified = false;
  providerConfigured = configurePlayerAgnesDirect(playerAgnesModule, playerAgnesCredential, {
    transportPolicy: playerAgnesTransportPolicy,
  });
  useAgnes = providerConfigured;
  updateProviderUi();
  setAgnesSettingsStatus("已保存到当前浏览器，尚未测试连接。", "saved");
}

async function testAgnesSettingsConnection({ isTapTapH5Test = false } = {}) {
  if (!playerAgnesModule) {
    setAgnesSettingsStatus("Agnes 模块加载失败，请更新游戏包后重试。", "error");
    return;
  }
  const candidate = elements["agnes-key-input"].value.trim();
  if (!candidate) {
    setAgnesSettingsStatus("请先填写 Agnes Key。", "error");
    return;
  }
  const testButton = isTapTapH5Test ? elements["test-taptap-connection"] : elements["test-agnes-connection"];
  testButton.disabled = true;
  setAgnesConnectionDiagnostic();
  setAgnesSettingsStatus("正在发起一次最小连接测试……", "checking");
  try {
    const { testPlayerAgnesConnection, getPlayerAgnesTransport } = playerAgnesModule;
    const result = await testPlayerAgnesConnection(fetch, candidate, {
      transportPolicy: playerAgnesTransportPolicy,
    });
    renderAgnesTransportStatus(
      result.transport?.name || getPlayerAgnesTransport({ transportPolicy: playerAgnesTransportPolicy }).name,
    );
    playerAgnesVerified = candidate === playerAgnesCredential;
    setAgnesSettingsStatus(
      playerAgnesVerified ? "连接成功，已保存的 Key 可用。" : "连接成功；如需用于游戏，请再点击保存。",
      "online",
    );
  } catch (error) {
    playerAgnesVerified = false;
    const diagnostic = formatAgnesTransportDiagnostic(error);
    renderAgnesTransportStatus(error?.transport?.name);
    setAgnesConnectionDiagnostic(diagnostic);
    const safeMessage = error?.code === "authentication"
      ? "连接失败：Key 无效或没有调用权限。"
      : error?.code === "rate_limited"
        ? "连接失败：Agnes 当前请求过多。"
        : `连接失败：无法完成 Agnes 请求。${diagnostic}`;
    setAgnesSettingsStatus(safeMessage, "error");
  } finally {
    testButton.disabled = false;
    updateProviderUi();
  }
}

function clearAgnesSettings() {
  if (playerAgnesModule) {
    const { clearPlayerAgnesKey } = playerAgnesModule;
    clearPlayerAgnesKey({ sessionStorage, localStorage });
  }
  playerAgnesCredential = "";
  playerAgnesVerified = false;
  providerConfigured = false;
  useAgnes = false;
  configurePlayerAgnesDirect(null, "");
  elements["agnes-key-input"].value = "";
  elements["remember-agnes-key"].checked = false;
  elements["clear-agnes-confirmation"].hidden = true;
  updateProviderUi();
  setAgnesSettingsStatus("已从 sessionStorage 与 localStorage 清除。", "neutral");
}

function exportSave() {
  if (!gameState) return;
  const blob = new Blob([exportGame(gameState)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `天命之外-${gameState.player.name}-${gameState.world.year}.json`;
  link.click();
  URL.revokeObjectURL(url);
  showToast("命簿已导出");
}

async function importSave(file) {
  try {
    const imported = importGame(await file.text());
    await saveRepository.save(imported);
    savedGame = imported;
    closeDrawer();
    openGame(imported);
    showToast("命簿已导入");
  } catch (error) {
    showToast(error.message || "无法读取这份命簿");
  } finally {
    elements["import-save"].value = "";
  }
}

function resetGame() {
  clearLocalGame(localStorage);
  void saveRepository.clear().catch(() => showToast("IndexedDB 存档清除失败"));
  gameState = null;
  currentEvent = null;
  currentEventTurn = null;
  savedGame = null;
  closeDrawer();
  elements["end-screen"].hidden = true;
  elements["game-screen"].hidden = true;
  elements["intro-screen"].hidden = false;
  elements["continue-game"].hidden = true;
  elements["reset-confirmation"].hidden = true;
  showCreationStep("basic");
}

function showEndScreen() {
  elements["end-summary"].textContent = `${gameState.player.name}，享年 ${gameState.player.age} 岁，止步于${gameState.player.realm}。此生留下 ${gameState.chronicle.length} 笔记录。`;
  elements["end-screen"].hidden = false;
  elements["restart-from-end"].focus();
}

elements["creation-next"].addEventListener("click", () => {
  if (validateBasicForm()) showCreationStep("build");
});
elements["creation-back"].addEventListener("click", () => showCreationStep("basic"));
elements["character-form"].addEventListener("input", (event) => {
  if (event.target.closest(".stat-inputs")) updateStatBudget();
  if (event.target === elements["character-age"]) updateAgeOutput();
  if (event.target.name === "gender") updateCustomGenderField();
});
elements["character-form"].addEventListener("submit", (event) => {
  event.preventDefault();
  if (!validateBasicForm()) {
    showCreationStep("basic");
    return;
  }
  const form = new FormData(event.currentTarget);
  if (updateStatBudget() !== 0) {
    elements["stat-budget-error"].textContent = "六维必须合计 60 点，单项范围 1 至 15。";
    return;
  }
  elements["stat-budget-error"].textContent = "";
  try {
    const state = createNewGame({
      name: String(form.get("name")),
      gender: resolveCharacterGender(String(form.get("gender")), String(form.get("customGender"))),
      age: Number(form.get("age")),
      birthplace: String(form.get("birthplace")),
      background: String(form.get("background")),
      path: String(form.get("path")),
      spiritRootGrade: String(form.get("spiritRootGrade")),
      rootPrimaryElement: String(form.get("rootPrimaryElement")),
      rootSecondaryElement: String(form.get("rootSecondaryElement")),
      constitution: String(form.get("constitution")),
      talent: String(form.get("talent")),
      stats: readStats(form),
    }, randomSeed());
    persistGameState(state);
    openGame(state, getOpeningEvent(state));
  } catch (error) {
    elements["stat-budget-error"].textContent = error.message;
  }
});

elements["continue-game"].addEventListener("click", () => openGame(savedGame));
elements["next-event"].addEventListener("click", () => {
  if (!gameState?.meta?.pendingResolution) return;
  gameState = continueAfterResolution(gameState);
  persistGameState(gameState);
  renderState();
  currentEvent = null;
  currentEventTurn = null;
  loadNextEvent();
});
elements["return-to-mainline"].addEventListener("click", returnToMainline);
elements["free-action-form"].addEventListener("submit", (event) => {
  event.preventDefault();
  const action = elements["free-action-input"].value.trim();
  if (!action) return;
  elements["free-action-input"].value = "";
  if (action.startsWith("/")) handleCommand(action);
  else void settleAndNarrate({ playerAction: action });
});
elements["command-menu"].addEventListener("click", (event) => {
  const button = event.target.closest("button[data-command]");
  if (button) handleCommand(button.dataset.command);
});
elements["offline-continue"].addEventListener("click", () => {
  useAgnes = false;
  updateProviderUi();
  renderEvent(chooseOfflineEvent(gameState));
});
elements["retry-generation"].addEventListener("click", () => {
  void retryAgnesGeneration(loadNextEvent, lastGenerationAction);
});
elements["retry-resolution"].addEventListener("click", () => {
  void retryPendingResolution();
});
elements["engine-toggle"].addEventListener("click", () => {
  if (!providerConfigured) {
    showToast("尚未配置 Agnes Key，当前使用命簿引擎");
    return;
  }
  useAgnes = !useAgnes;
  updateProviderUi();
  showToast(useAgnes ? "下一页将由 Agnes 流式推演" : "下一页将使用本地命簿引擎");
});
elements["mobile-nav"].addEventListener("click", (event) => {
  const button = event.target.closest("button[data-mobile-panel]");
  if (button) selectMobilePanel(button.dataset.mobilePanel);
});
elements["open-save-drawer"].addEventListener("click", () => openDrawer("save"));
elements["open-agnes-settings-intro"].addEventListener("click", () => openDrawer("agnes"));
elements["open-agnes-settings"].addEventListener("click", () => showDrawerView("agnes"));
elements["back-from-agnes-settings"].addEventListener("click", () => showDrawerView("save"));
elements["toggle-agnes-key-visibility"].addEventListener("click", () => {
  const willShow = elements["agnes-key-input"].type === "password";
  elements["agnes-key-input"].type = willShow ? "text" : "password";
  elements["toggle-agnes-key-visibility"].setAttribute("aria-pressed", String(willShow));
  elements["toggle-agnes-key-visibility"].textContent = willShow ? "隐藏" : "显示";
});
elements["save-agnes-settings"].addEventListener("click", saveAgnesSettings);
elements["test-agnes-connection"].addEventListener("click", () => { void testAgnesSettingsConnection(); });
elements["test-taptap-connection"].addEventListener("click", () => {
  void testAgnesSettingsConnection({ isTapTapH5Test: true });
});
elements["request-clear-agnes-key"].addEventListener("click", () => {
  elements["clear-agnes-confirmation"].hidden = false;
});
elements["cancel-clear-agnes-key"].addEventListener("click", () => {
  elements["clear-agnes-confirmation"].hidden = true;
});
elements["confirm-clear-agnes-key"].addEventListener("click", clearAgnesSettings);
elements["close-save-drawer"].addEventListener("click", closeDrawer);
elements["drawer-scrim"].addEventListener("click", closeDrawer);
elements["export-save"].addEventListener("click", exportSave);
elements["import-save"].addEventListener("change", (event) => {
  if (event.target.files?.[0]) importSave(event.target.files[0]);
});
elements["request-reset"].addEventListener("click", () => { elements["reset-confirmation"].hidden = false; });
elements["cancel-reset"].addEventListener("click", () => { elements["reset-confirmation"].hidden = true; });
elements["confirm-reset"].addEventListener("click", resetGame);
elements["restart-from-end"].addEventListener("click", resetGame);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && elements["save-drawer"].classList.contains("open")) closeDrawer();
});
window.addEventListener("resize", syncViewportMode, { passive: true });
window.visualViewport?.addEventListener("resize", syncViewportMode, { passive: true });
window.addEventListener("orientationchange", syncViewportMode, { passive: true });
window.addEventListener("pageshow", syncViewportMode, { passive: true });

syncViewportMode();
populateCharacterOptions();
updateAgeOutput();
updateCustomGenderField();
updateStatBudget();
async function initializeApp() {
  await restoreSaveCandidate();
  await detectProvider();
}

void initializeApp();
