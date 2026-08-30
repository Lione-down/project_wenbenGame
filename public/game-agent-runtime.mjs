import { runDecisionToolLoop } from "../lib/agent-runtime.mjs";
import { selectToolsForAction } from "./agent-tools.mjs";
import { buildMemoryAwareContext, recordAgentTurn } from "./memory-runtime.mjs";
import { createGameToolRuntime } from "./tool-runtime.mjs";
import { searchWorldKnowledge } from "./world-knowledge.mjs";

const SYSTEM_PROMPT = [
  "你是《天命之外》的 Decision Agent。",
  "GameState 与本地 Tool 返回值是唯一事实来源。",
  "你必须调用 Tool 取得本轮结果，不能自行编造数值、NPC、物品、选项或状态变化。",
].join("\n");

function narrativeMessages(context, event) {
  return [
    {
      role: "system",
      content: [
        "你是《天命之外》的 Narrative Agent。",
        "本轮事实已经由本地规则确定。只描写场景正文，不输出 JSON，不新增或修改选项、数值、物品、NPC 与状态。",
        "正文使用简体中文，保持危险世界与高智商对手的因果一致性。",
      ].join("\n"),
    },
    {
      role: "user",
      content: `上下文：${JSON.stringify(context)}\n已由本地规则确定的本轮事实：${JSON.stringify({
        title: event.title,
        danger: event.danger,
        scene: event.scene,
        choices: event.choices.map(({ id, label }) => ({ id, label })),
      })}\n请仅续写这一事实的场景正文。`,
    },
  ];
}

function eventFromTurnResult(turnResult, action, turn) {
  const titles = {
    cultivation: "闭关功成",
    training: "研习有得",
    breakthrough: "冲关结果",
    combat: "此战已决",
    travel: "行程已定",
    social: "交涉已毕",
    time: "岁月流转",
  };
  return {
    id: `agent-action-${turn}-${turnResult.kind}`,
    kind: "agent-action-result",
    title: titles[turnResult.kind] || "行动已结算",
    scene: `${String(action || "本轮行动").slice(0, 80)}已由本地规则完成结算。`,
    danger: turnResult.status === "defeat" ? "fatal" : "low",
    choices: [{
      id: "continue-agent-turn",
      tag: "peace",
      label: "继续命途",
      hint: "本轮状态已经写入命簿，不会重复结算",
      result: "继续等待下一段命途。",
      effects: {},
    }],
    agentCommitted: true,
    turnResult: structuredClone(turnResult),
  };
}

export async function runEventAgentTurn({
  provider,
  gameState,
  history = [],
  action = "",
  memories = [],
  worldKnowledge = [],
  onDelta = () => {},
} = {}) {
  const retrievedWorldKnowledge = worldKnowledge.length
    ? worldKnowledge
    : searchWorldKnowledge(action || `${gameState.player.location} ${gameState.world.latest}`, { limit: 8 });
  const memoryState = {
    ...gameState,
    memories: memories.length ? memories : gameState.memories,
  };
  const context = buildMemoryAwareContext(memoryState, { playerInput: action, worldKnowledge: retrievedWorldKnowledge });
  if (Array.isArray(history) && history.length) context.recentEvents = history.slice(-10);
  const tools = selectToolsForAction(action);
  const runtime = createGameToolRuntime(gameState);
  const decision = await runDecisionToolLoop({
    provider,
    tools,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: JSON.stringify(context) },
    ],
    executeTool: (call) => runtime.execute(call),
    enableThinking: /调查|推理|阴谋|谈判/u.test(String(action || "")),
  });
  if (!runtime.result) throw new Error("authoritative_turn_result_required");
  const authoritativeEvent = runtime.result.id && Array.isArray(runtime.result.choices)
    ? runtime.result
    : eventFromTurnResult(runtime.result, action, gameState.meta.turn);

  const preNarrativeState = runtime.commit();
  preNarrativeState.currentScene = { event: structuredClone(authoritativeEvent) };

  const narrative = await provider.streamNarrative({
    messages: narrativeMessages(context, authoritativeEvent),
    onDelta,
  });
  const event = { ...authoritativeEvent, scene: narrative.content };
  preNarrativeState.currentScene = { event: structuredClone(event) };
  const gameStateAfterTurn = recordAgentTurn(preNarrativeState, {
    event: {
      id: event.id,
      type: event.kind || "event",
      summary: `${event.title}：${event.scene}`,
      importance: event.danger === "fatal" ? 0.95 : event.danger === "high" ? 0.75 : 0.35,
      gameTime: `${preNarrativeState.world.year}-${preNarrativeState.world.month}-${preNarrativeState.world.day}`,
    },
    usage: {
      promptTokens: decision.usage.promptTokens + (Number(narrative.usage?.promptTokens) || 0),
      completionTokens: decision.usage.completionTokens + (Number(narrative.usage?.completionTokens) || 0),
      totalTokens: decision.usage.totalTokens + (Number(narrative.usage?.totalTokens) || 0),
    },
  });
  return {
    event,
    gameState: gameStateAfterTurn,
    rawContent: narrative.content,
    structured: true,
    validationReason: null,
    usage: {
      decision: decision.usage,
      narrative: narrative.usage,
    },
  };
}
