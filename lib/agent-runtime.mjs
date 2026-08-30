function addUsage(total, usage = {}) {
  total.promptTokens += Math.max(0, Number(usage.promptTokens) || 0);
  total.completionTokens += Math.max(0, Number(usage.completionTokens) || 0);
  total.totalTokens += Math.max(0, Number(usage.totalTokens) || 0);
}

export async function runDecisionToolLoop({
  provider,
  messages,
  tools,
  executeTool,
  enableThinking = false,
  maxToolRounds = 4,
  onWarning = () => {},
} = {}) {
  if (!provider || typeof provider.completeDecision !== "function") throw new TypeError("decision provider is required");
  if (typeof executeTool !== "function") throw new TypeError("tool executor is required");
  const allowedTools = new Set((tools || []).map((tool) => tool?.function?.name).filter(Boolean));
  const workingMessages = structuredClone(messages || []);
  const usage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
  let rounds = 0;
  while (true) {
    const completion = await provider.completeDecision({ messages: workingMessages, tools, enableThinking });
    addUsage(usage, completion.usage);
    if (!completion.toolCalls?.length) {
      workingMessages.push({ role: "assistant", content: completion.content || "" });
      return { ...completion, rounds, messages: workingMessages, usage };
    }
    if (rounds >= maxToolRounds) throw new Error("tool_round_limit");
    const assistantToolCalls = completion.toolCalls.map((call) => ({
      id: call.id,
      type: "function",
      function: { name: call.name, arguments: JSON.stringify(call.arguments) },
    }));
    workingMessages.push({ role: "assistant", content: completion.content || null, tool_calls: assistantToolCalls });
    for (const call of completion.toolCalls) {
      if (!allowedTools.has(call.name)) throw new Error(`tool_not_allowed:${call.name}`);
      const result = await executeTool(call);
      workingMessages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result ?? null) });
    }
    rounds += 1;
    if (rounds > 3) onWarning({ code: "tool_rounds_high", rounds });
  }
}
