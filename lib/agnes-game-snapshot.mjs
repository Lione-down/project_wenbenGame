function boundedInteger(value, minimum = 0, maximum = 9999) {
  const number = Number(value);
  if (!Number.isFinite(number)) return minimum;
  return Math.min(maximum, Math.max(minimum, Math.trunc(number)));
}

function boundedInventory(inventory) {
  if (!inventory || typeof inventory !== "object" || Array.isArray(inventory)) return {};
  return Object.fromEntries(
    Object.entries(inventory)
      .slice(0, 32)
      .map(([itemId, quantity]) => [String(itemId).slice(0, 32), boundedInteger(quantity)]),
  );
}

export function sanitizeGameSnapshot(game) {
  if (!game || typeof game !== "object" || !game.player) {
    throw Object.assign(new Error("invalid_game_state"), { status: 400 });
  }
  const world = game.world ?? {};
  const spiritRoot = game.player.spiritRoot ?? {};
  const progression = game.player.progression ?? {};
  const techniqueBuild = game.player.techniqueBuild ?? {};
  return {
    player: {
      name: String(game.player.name || "无名").slice(0, 12),
      daoName: String(game.player.daoName || "").slice(0, 12),
      age: Number(game.player.age) || 16,
      gender: String(game.player.gender || "不记").slice(0, 20),
      realm: String(game.player.realm || "武徒").slice(0, 16),
      realmStage: String(game.player.realmStage || "初期").slice(0, 8),
      path: String(game.player.path || "随心所欲").slice(0, 24),
      constitution: String(game.player.constitution || "凡体").slice(0, 24),
      spiritRoot: {
        grade: String(spiritRoot.grade || "伪灵根").slice(0, 12),
        elements: Array.isArray(spiritRoot.elements)
          ? spiritRoot.elements.slice(0, 3).map((element) => String(element).slice(0, 4))
          : [],
        primaryElement: String(spiritRoot.primaryElement || "金").slice(0, 4),
        coefficient: Number(spiritRoot.coefficient) || 1,
      },
      progression: {
        stageIndex: boundedInteger(progression.stageIndex, 0, 3),
        stage: String(progression.stage || game.player.realmStage || "初期").slice(0, 8),
        breakthroughCooldown: boundedInteger(progression.breakthroughCooldown, 0, 1200),
        scars: Array.isArray(progression.scars)
          ? progression.scars.slice(-6).map((scar) => String(scar).slice(0, 24))
          : [],
        lastBreakthrough: progression.lastBreakthrough && typeof progression.lastBreakthrough === "object"
          ? progression.lastBreakthrough
          : null,
      },
      stats: game.player.stats,
      resources: game.player.resources,
      inventory: boundedInventory(game.player.inventory),
      techniqueBuild: {
        known: Array.isArray(techniqueBuild.known)
          ? techniqueBuild.known.slice(-12).map((name) => String(name).slice(0, 40))
          : [],
        main: String(techniqueBuild.main || "基础引气诀").slice(0, 40),
        supports: Array.isArray(techniqueBuild.supports)
          ? techniqueBuild.supports.slice(0, 2).map((name) => String(name).slice(0, 40))
          : [],
        arts: Array.isArray(techniqueBuild.arts)
          ? techniqueBuild.arts.slice(-8).map((name) => String(name).slice(0, 40))
          : [],
        movement: techniqueBuild.movement ? String(techniqueBuild.movement).slice(0, 40) : null,
        ultimate: techniqueBuild.ultimate ? String(techniqueBuild.ultimate).slice(0, 40) : null,
      },
      martialSkills: Array.isArray(game.player.martialSkills)
        ? game.player.martialSkills.slice(0, 16).map((skill) => ({
          id: String(skill.id || "").slice(0, 40),
          mastery: boundedInteger(skill.mastery, 0, 100),
        }))
        : [],
      growth: game.player.growth && typeof game.player.growth === "object"
        ? {
          martialInsight: Number(game.player.growth.martialInsight) || 0,
          techniqueUnderstanding: Number(game.player.growth.techniqueUnderstanding) || 0,
          martialMind: Number(game.player.growth.martialMind) || 0,
          adventureAccumulation: Number(game.player.growth.adventureAccumulation) || 0,
          realmDays: boundedInteger(game.player.growth.realmDays, 0, 1000000),
        }
        : {},
      crafts: game.player.crafts && typeof game.player.crafts === "object" ? game.player.crafts : {},
      sect: game.player.sect,
      cave: game.player.cave && typeof game.player.cave === "object" ? game.player.cave : {},
      relationships: Array.isArray(game.player.relationships)
        ? game.player.relationships.slice(-12).map((relationship) => ({
          npcId: String(relationship.npcId || "").slice(0, 32),
          name: String(relationship.name || "").slice(0, 16),
          affection: boundedInteger(relationship.affection, 0, 120),
          stage: String(relationship.stage || "陌生").slice(0, 12),
          bond: String(relationship.bond || "友情").slice(0, 12),
          romanceEnabled: Boolean(relationship.romanceEnabled),
        }))
        : [],
      location: String(game.player.location || game.player.birthplace || "").slice(0, 24),
      abnormal: String(game.player.abnormal || "无").slice(0, 24),
      mainGoal: String(game.player.mainGoal || "").slice(0, 120),
      techniques: Array.isArray(game.player.techniques) ? game.player.techniques.slice(-12) : [],
      npcs: Array.isArray(game.player.npcs) ? game.player.npcs.slice(-12) : [],
    },
    world: {
      year: Number(world.year) || 1127,
      month: Number(world.month) || 1,
      day: boundedInteger(world.day, 1, 30),
      era: String(world.era || "天衡纪").slice(0, 16),
      season: String(world.season || "春").slice(0, 8),
      unrest: Number(world.unrest) || 0,
      latest: String(world.latest || "").slice(0, 240),
      npcs: Array.isArray(world.npcs)
        ? world.npcs.slice(0, 12).map((npc) => ({
          id: String(npc.id || "").slice(0, 32),
          name: String(npc.name || "无名").slice(0, 16),
          gender: String(npc.gender || "不记").slice(0, 8),
          species: String(npc.species || "人族").slice(0, 12),
          realmIndex: boundedInteger(npc.realmIndex, 0, 16),
          stageIndex: boundedInteger(npc.stageIndex, 0, 3),
          stage: String(npc.stage || "初期").slice(0, 8),
          ageMonths: boundedInteger(npc.ageMonths, 0, 1000000),
          lifespan: boundedInteger(npc.lifespan, 1, 100000),
          alive: Boolean(npc.alive),
          deathCause: npc.alive ? "" : String(npc.deathCause || "死因未记").slice(0, 40),
          goal: String(npc.goal || "去向未明").slice(0, 80),
          interactions: Array.isArray(npc.interactions)
            ? npc.interactions.slice(-6).map((interaction) => ({
              eventId: String(interaction.eventId || "").slice(0, 40),
              summary: String(interaction.summary || "交集未详").slice(0, 100),
              context: String(interaction.context || "present").slice(0, 12),
            }))
            : [],
        }))
        : [],
      ecologyLog: Array.isArray(world.ecologyLog)
        ? world.ecologyLog.slice(-12).map((entry) => ({
          turn: boundedInteger(entry.turn, 0, 1000000),
          year: boundedInteger(entry.year, 1, 1000000),
          month: boundedInteger(entry.month, 1, 12),
          type: String(entry.type || "unknown").slice(0, 24),
          npcId: String(entry.npcId || "").slice(0, 32),
          otherNpcId: String(entry.otherNpcId || "").slice(0, 32),
          text: String(entry.text || "发生一件未记载的生态变故。").slice(0, 120),
        }))
        : [],
      danger: world.danger && typeof world.danger === "object" ? world.danger : null,
      antagonists: Array.isArray(world.antagonists)
        ? world.antagonists.slice(0, 8).map((antagonist) => ({
          id: String(antagonist.id || "").slice(0, 40),
          name: String(antagonist.name || "未知反派").slice(0, 20),
          goal: String(antagonist.goal || "目的未明").slice(0, 100),
          knownClues: Array.isArray(antagonist.knownClues) ? antagonist.knownClues.slice(-8) : [],
          currentPlan: String(antagonist.currentPlan || "尚未显露").slice(0, 100),
        }))
        : [],
    },
  };
}
