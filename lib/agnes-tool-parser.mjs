function usageOf(usage = {}) {
  return {
    promptTokens: Math.max(0, Number(usage.prompt_tokens) || 0),
    completionTokens: Math.max(0, Number(usage.completion_tokens) || 0),
    totalTokens: Math.max(0, Number(usage.total_tokens) || 0),
  };
}

export function parseAgnesCompletion(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("invalid_agnes_completion");
  const choice = Array.isArray(body.choices) ? body.choices[0] : null;
  const message = choice?.message;
  if (!message || message.role !== "assistant") throw new Error("invalid_agnes_assistant_message");
  const toolCalls = (Array.isArray(message.tool_calls) ? message.tool_calls : []).map((call, index) => {
    if (!call || call.type !== "function" || typeof call.id !== "string" || !call.id.trim()) {
      throw new Error(`invalid_agnes_tool_call:${index}`);
    }
    const name = call.function?.name;
    if (typeof name !== "string" || !name.trim()) throw new Error(`invalid_agnes_tool_name:${index}`);
    let argumentsValue;
    try {
      argumentsValue = JSON.parse(call.function?.arguments || "{}");
    } catch {
      throw new Error(`invalid_agnes_tool_arguments:${index}`);
    }
    if (!argumentsValue || typeof argumentsValue !== "object" || Array.isArray(argumentsValue)) {
      throw new Error(`invalid_agnes_tool_arguments:${index}`);
    }
    return {
      id: call.id.trim().slice(0, 120),
      name: name.trim().slice(0, 80),
      arguments: argumentsValue,
    };
  });
  return {
    content: typeof message.content === "string" ? message.content : "",
    finishReason: typeof choice.finish_reason === "string" ? choice.finish_reason : null,
    toolCalls,
    usage: usageOf(body.usage),
  };
}

export function normalizeAgnesUsage(usage) {
  return usageOf(usage);
}
