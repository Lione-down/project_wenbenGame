function tool(name, description, properties = {}, required = []) {
  return {
    type: "function",
    function: {
      name,
      description,
      parameters: { type: "object", properties, required, additionalProperties: false },
    },
  };
}

const TOOL_DEFINITIONS = Object.freeze({
  get_player_state: tool("get_player_state", "读取玩家当前可用于本轮判断的状态"),
  get_npc_state: tool("get_npc_state", "读取已经遇见的指定 NPC 当前状态", { npc_id: { type: "string" } }, ["npc_id"]),
  get_npc_knowledge: tool("get_npc_knowledge", "读取指定 NPC 实际知道的玩家与世界信息", { npc_id: { type: "string" } }, ["npc_id"]),
  get_world_state: tool("get_world_state", "读取当前动态世界状态"),
  get_location_state: tool("get_location_state", "读取指定地点的动态状态", { location_id: { type: "string" } }, ["location_id"]),
  get_faction_state: tool("get_faction_state", "读取指定势力的动态状态", { faction_id: { type: "string" } }, ["faction_id"]),
  search_memory: tool("search_memory", "检索与本轮输入有关的长期记忆", { query: { type: "string" } }, ["query"]),
  search_world_knowledge: tool("search_world_knowledge", "检索静态世界知识", { query: { type: "string" } }, ["query"]),
  resolve_cultivation: tool("resolve_cultivation", "按本地规则一次性结算修炼并推进对应天数；调用后不得再推进时间", { days: { type: "integer", minimum: 1, maximum: 3650 } }, ["days"]),
  resolve_training: tool("resolve_training", "按本地规则一次性结算武技或技艺研习并推进对应天数", { target_id: { type: "string" }, days: { type: "integer", minimum: 1, maximum: 365 } }, ["target_id", "days"]),
  resolve_breakthrough: tool("resolve_breakthrough", "按本地规则结算突破", { route: { type: "string", enum: ["human", "earth", "heaven"] } }, ["route"]),
  resolve_combat: tool("resolve_combat", "按本地规则一次性结算战斗及其行动耗时", { encounter_id: { type: "string" }, action: { type: "string" }, skill_id: { type: "string" } }, ["encounter_id", "action"]),
  resolve_travel: tool("resolve_travel", "按本地规则一次性结算旅行并推进路程天数", { destination_id: { type: "string" } }, ["destination_id"]),
  resolve_social_action: tool("resolve_social_action", "按本地规则一次性结算社交或调查行动并推进耗时", { npc_id: { type: "string" }, intent: { type: "string" } }, ["npc_id", "intent"]),
  resolve_random_event: tool("resolve_random_event", "由程序 RandomService 选择本轮事件", { activity: { type: "string" } }),
  advance_time: tool("advance_time", "按已结算行动推进确定时间", { days: { type: "number", minimum: 0, maximum: 3650 } }, ["days"]),
  world_tick: tool("world_tick", "按已推进时间更新世界"),
  npc_tick: tool("npc_tick", "按已推进时间更新已遇见 NPC"),
});

function pick(names) {
  return [...new Set(names)].map((name) => TOOL_DEFINITIONS[name]);
}

export function selectToolsForAction(action = "") {
  const text = String(action || "").trim();
  if (/研习|训练|练习|修习武技|修习技艺/u.test(text)) {
    return pick(["get_player_state", "search_memory", "resolve_training", "world_tick", "npc_tick"]);
  }
  if (/突破|冲关|渡劫/u.test(text)) {
    return pick(["get_player_state", "search_memory", "resolve_breakthrough", "world_tick", "npc_tick"]);
  }
  if (/闭关|修炼|吐纳|打坐/u.test(text)) {
    return pick(["get_player_state", "search_memory", "resolve_cultivation", "world_tick", "npc_tick"]);
  }
  if (/调查|查问|询问|骗|线索|推理/u.test(text)) {
    return pick(["get_npc_state", "get_npc_knowledge", "search_memory", "search_world_knowledge", "resolve_social_action", "resolve_random_event"]);
  }
  if (/交涉|交谈|拜访|赠礼|结交/u.test(text)) {
    return pick(["get_npc_state", "get_npc_knowledge", "search_memory", "resolve_social_action"]);
  }
  if (/战|攻击|迎战|逃跑|谈判/u.test(text)) {
    return pick(["get_player_state", "get_npc_state", "resolve_combat", "world_tick", "npc_tick"]);
  }
  if (/赶路|旅行|前往|去往/u.test(text)) {
    return pick(["get_player_state", "get_location_state", "search_world_knowledge", "resolve_travel", "world_tick", "npc_tick"]);
  }
  if (/状态|查看|当前/u.test(text)) return pick(["get_player_state", "get_world_state"]);
  return pick(["get_player_state", "get_world_state", "search_memory", "search_world_knowledge", "resolve_random_event"]);
}
