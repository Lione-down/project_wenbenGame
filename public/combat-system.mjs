const ELEMENT_OVERCOMES = Object.freeze({
  金: "木",
  木: "土",
  土: "水",
  水: "火",
  火: "金",
});

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function getElementMultiplier(attackerElement, defenderElement) {
  if (!attackerElement || !defenderElement || attackerElement === defenderElement) return 1;
  if (ELEMENT_OVERCOMES[attackerElement] === defenderElement) return 1.3;
  if (ELEMENT_OVERCOMES[defenderElement] === attackerElement) return 0.8;
  return 1;
}

export function getCombatForecast(state, encounter) {
  const realmGap = encounter.realmIndex - state.player.realmIndex;
  let playerDamageMultiplier = 1;
  let enemyDamageMultiplier = 1;
  let warning = "双方处于同一大境界，可凭功法、五行与状态一战。";
  if (realmGap === 1) {
    playerDamageMultiplier = 0.4;
    enemyDamageMultiplier = 1.6;
    warning = "对方高出一个大境界，正面交手胜算极低。";
  } else if (realmGap >= 2) {
    playerDamageMultiplier = 0;
    enemyDamageMultiplier = 2.5;
    warning = "对方高出两个大境界，正面硬拼近乎送死，你的攻击无法伤及其根本。";
  } else if (realmGap === -1) {
    playerDamageMultiplier = 1.6;
    enemyDamageMultiplier = 0.4;
    warning = "你高出对方一个大境界，境界威压明显。";
  } else if (realmGap <= -2) {
    playerDamageMultiplier = 2.5;
    enemyDamageMultiplier = 0;
    warning = "你高出对方至少两个大境界，对方几乎无法伤及你。";
  }
  const statEdge = (state.player.stats.martialHeart + state.player.stats.agility - 20) * 0.01;
  const winChance = realmGap >= 2
    ? 0.03
    : realmGap <= -2
      ? 0.97
      : clamp(0.5 - realmGap * 0.35 + statEdge, 0.05, 0.95);
  return {
    realmGap,
    playerDamageMultiplier,
    enemyDamageMultiplier,
    winChance,
    warning,
  };
}

function readRoll(value) {
  return Number.isFinite(value) ? clamp(Number(value), 0, 1) : 0.5;
}

export function createEncounterFromEvent(state, event) {
  if (event?.kind !== "combat" || !event.encounter) {
    throw new Error("当前主线不是有效战斗遭遇");
  }
  const context = event.encounter;
  const knownNpc = state.world?.npcs?.find((npc) => npc.alive && npc.name === context.npcName);
  const dangerOffset = { low: -1, medium: 0, high: 1, fatal: 2 }[event.danger] ?? 0;
  const realmIndex = clamp(
    knownNpc?.realmIndex ?? state.player.realmIndex + dangerOffset,
    0,
    16,
  );
  const stageIndex = clamp(knownNpc?.stageIndex ?? Math.max(0, dangerOffset), 0, 3);
  const maxVitality = 100 + realmIndex * 30 + stageIndex * 8;
  return {
    id: knownNpc?.id ?? `mainline-${event.id}`,
    name: context.npcName,
    location: context.location,
    reason: context.reason,
    realmIndex,
    stageIndex,
    element: context.element,
    vitality: maxVitality,
    maxVitality,
    temperament: context.temperament,
  };
}

function resolveFailedExit(state, encounter, action, options) {
  const result = resolveCombatAction(state, encounter, action, options);
  if (result.outcome.status !== "ongoing") return result;
  const label = action === "escape" ? "遁逃失败" : "谈判失败";
  return {
    ...result,
    outcome: {
      ...result.outcome,
      status: action === "escape" ? "escape_failed" : "negotiation_failed",
      summary: `${label}，对方趁隙逼近；你承受 ${result.outcome.enemyDamage} 点伤害后退开战圈。`,
    },
  };
}

export function resolveCombatEncounterChoice(state, event, choiceId, options = {}) {
  if (state?.meta?.status !== "active") throw new Error("此生命簿已经封存");
  if (event?.kind !== "combat") throw new Error("当前主线不是战斗遭遇");
  const choice = event.choices?.find((candidate) => candidate.id === choiceId);
  if (!choice || !new Set(["fight", "escape", "negotiate", "tribute"]).has(choice.action)) {
    throw new Error("战斗选择无效");
  }
  const encounter = createEncounterFromEvent(state, event);

  if (choice.action === "tribute") {
    const next = structuredClone(state);
    const cost = Math.max(1, 6 + encounter.realmIndex * 4 + encounter.stageIndex * 2);
    if (next.player.resources.spiritStones < cost) {
      return {
        state: next,
        encounter,
        outcome: {
          status: "tribute_failed",
          cost: 0,
          requiredCost: cost,
          summary: `你拿不出对方索要的 ${cost} 枚元石，只得退回原处。`,
          forecast: getCombatForecast(next, encounter),
        },
      };
    }
    next.player.resources.spiritStones -= cost;
    return {
      state: next,
      encounter,
      outcome: {
        status: "appeased",
        cost,
        summary: `你献出 ${cost} 枚元石，对方权衡利害后收起兵刃。`,
        forecast: getCombatForecast(next, encounter),
      },
    };
  }

  if (choice.action === "escape" || choice.action === "negotiate") {
    return resolveFailedExit(state, encounter, choice.action, options);
  }

  let roundState = structuredClone(state);
  let roundEncounter = encounter;
  let result = null;
  for (let round = 0; round < 32; round += 1) {
    result = resolveCombatAction(roundState, roundEncounter, "attack", options);
    roundState = result.state;
    roundEncounter = result.encounter;
    if (result.outcome.status !== "ongoing") return result;
  }
  throw new Error("战斗结算超过本地回合上限");
}

export function resolveCombatAction(state, encounter, action, { roll } = {}) {
  if (state?.meta?.status !== "active") throw new Error("此生命簿已经封存");
  if (!new Set(["attack", "defend", "escape", "negotiate"]).has(action)) {
    throw new Error("战斗行动无效");
  }
  const next = structuredClone(state);
  const target = structuredClone(encounter);
  const forecast = getCombatForecast(next, target);
  const check = readRoll(roll);

  if (action === "escape") {
    const enemyPursuit = 8 + target.realmIndex * 2 + target.stageIndex;
    const chance = clamp(
      0.45 + (next.player.stats.agility - enemyPursuit) * 0.03 - Math.max(0, forecast.realmGap) * 0.12,
      0.05,
      0.9,
    );
    if (check < chance) {
      return {
        state: next,
        encounter: target,
        outcome: { status: "escaped", chance, summary: `${next.player.name}抓住破绽遁出战圈。`, forecast },
      };
    }
  }

  if (action === "negotiate") {
    const temperamentBonus = target.temperament === "谨慎" ? 0.1 : target.temperament === "贪婪" ? 0.05 : 0;
    const chance = clamp(
      0.15 + next.player.resources.reputation * 0.01 + next.player.resources.merit * 0.005 -
      Math.max(0, forecast.realmGap) * 0.1 + temperamentBonus,
      0.05,
      0.9,
    );
    if (check < chance) {
      return {
        state: next,
        encounter: target,
        outcome: { status: "negotiated", chance, summary: "你以名望、因果与利害说动对方暂且收手。", forecast },
      };
    }
  }

  let playerDamage = 0;
  if (action === "attack") {
    const elementMultiplier = getElementMultiplier(next.player.spiritRoot.primaryElement, target.element);
    playerDamage = Math.floor(
      (20 + next.player.stats.insight * 0.8) * forecast.playerDamageMultiplier * elementMultiplier,
    );
    target.vitality = Math.max(0, target.vitality - playerDamage);
  }

  if (target.vitality <= 0) {
    return {
      state: next,
      encounter: target,
      outcome: { status: "victory", playerDamage, enemyDamage: 0, summary: `${next.player.name}击败${target.name}。`, forecast },
    };
  }

  const defenseMultiplier = action === "defend" ? 0.5 : 1;
  const enemyDamage = Math.floor(
    (18 + target.realmIndex * 6 + target.stageIndex * 2) * forecast.enemyDamageMultiplier * defenseMultiplier,
  );
  next.player.resources.vitality = Math.max(0, next.player.resources.vitality - enemyDamage);
  next.player.resources.wound = clamp(next.player.resources.wound + Math.floor(enemyDamage * 0.4), 0, 100);
  if (next.player.resources.vitality <= 0 || next.player.resources.wound >= 100) {
    next.meta.status = "dead";
    next.player.abnormal = "战斗陨落";
    const reason = forecast.realmGap >= 2 ? "境界压制令你无法伤及对方，最终陨落。" : "气血断绝，此战成为命簿最后一页。";
    return {
      state: next,
      encounter: target,
      outcome: { status: "defeat", playerDamage, enemyDamage, summary: reason, forecast },
    };
  }
  return {
    state: next,
    encounter: target,
    outcome: {
      status: "ongoing",
      playerDamage,
      enemyDamage,
      summary: `${forecast.warning} 本轮你造成 ${playerDamage} 点伤害，承受 ${enemyDamage} 点伤害。`,
      forecast,
    },
  };
}
