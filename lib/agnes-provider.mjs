import { AGNES_CHAT_COMPLETIONS_URL, AGNES_MODEL } from "./agnes-contract.mjs";
import { normalizeAgnesUsage, parseAgnesCompletion } from "./agnes-tool-parser.mjs";

export class AgnesProviderError extends Error {
  constructor(code, status = 0, transport = null) {
    super(code);
    this.name = "AgnesProviderError";
    this.code = code;
    this.status = status;
    if (transport) this.transport = transport;
  }
}

function transportAtStage(response, stage) {
  return response?.transport ? { ...response.transport, stage } : null;
}

function findSseBoundary(buffer) {
  const match = /\r?\n\r?\n/.exec(buffer);
  return match ? { index: match.index, length: match[0].length } : null;
}

export class AgnesProvider {
  constructor({
    fetchImpl = globalThis.fetch,
    endpoint = AGNES_CHAT_COMPLETIONS_URL,
    apiKey = "",
    headers = {},
    narrativeResponseMode = "stream",
    diagnosticPhase = "narrative",
  } = {}) {
    if (typeof fetchImpl !== "function") throw new TypeError("fetch implementation is required");
    this.fetchImpl = fetchImpl;
    this.endpoint = String(endpoint || AGNES_CHAT_COMPLETIONS_URL);
    this.apiKey = String(apiKey || "").trim();
    this.headers = { ...headers };
    this.narrativeResponseMode = narrativeResponseMode === "json" ? "json" : "stream";
    this.diagnosticPhase = String(diagnosticPhase || "narrative");
  }

  requestHeaders() {
    return {
      ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
      "Content-Type": "application/json",
      ...this.headers,
    };
  }

  async request(payload, { retryDefiniteHttpFailure = false, phase = this.diagnosticPhase } = {}) {
    const maxAttempts = retryDefiniteHttpFailure ? 2 : 1;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      let response;
      try {
        response = await this.fetchImpl(this.endpoint, {
          method: "POST",
          headers: this.requestHeaders(),
          body: JSON.stringify(payload),
          signal: typeof AbortSignal?.timeout === "function" ? AbortSignal.timeout(120000) : undefined,
          diagnosticPhase: phase,
        });
      } catch (error) {
        if (error?.code === "provider_uncertain" || error?.code === "network_unavailable") {
          throw new AgnesProviderError(error.code, error.status || 0, error.transport);
        }
        if (error?.name === "AbortError" || error?.name === "TimeoutError") throw new AgnesProviderError("provider_uncertain", 504);
        throw new AgnesProviderError("network_unavailable", 0);
      }
      if (response.ok) return response;
      const isDefinitelyRetryable = new Set([429, 502, 503, 504]).has(response.status);
      if (!isDefinitelyRetryable || attempt === maxAttempts) {
        const stage = response.status === 401 || response.status === 403 ? "auth" : "HTTP";
        throw new AgnesProviderError("provider_error", response.status, transportAtStage(response, stage));
      }
    }
    throw new AgnesProviderError("provider_error", 502);
  }

  async completeDecision({ messages, tools = [], enableThinking = false } = {}) {
    const payload = {
      model: AGNES_MODEL,
      messages,
      temperature: 0.3,
      max_tokens: 4096,
      stream: false,
      tools,
      tool_choice: "auto",
      ...(enableThinking ? { chat_template_kwargs: { enable_thinking: true } } : {}),
    };
    const response = await this.request(payload, { retryDefiniteHttpFailure: true, phase: "decision" });
    let body;
    try {
      body = await response.json();
    } catch {
      throw new AgnesProviderError("provider_error", response.status || 502, transportAtStage(response, "response-parse"));
    }
    try {
      return parseAgnesCompletion(body);
    } catch {
      throw new AgnesProviderError("provider_error", response.status || 502, transportAtStage(response, "model-contract"));
    }
  }

  async streamNarrative({ messages, onDelta = () => {} } = {}) {
    const usesJsonResponse = this.narrativeResponseMode === "json";
    const response = await this.request({
      model: AGNES_MODEL,
      messages,
      temperature: 0.75,
      max_tokens: 4096,
      stream: !usesJsonResponse,
    }, { phase: this.diagnosticPhase });
    if (usesJsonResponse) {
      let body;
      try {
        body = await response.json();
      } catch {
        throw new AgnesProviderError("provider_error", response.status || 502, transportAtStage(response, "response-parse"));
      }
      let completion;
      try {
        completion = parseAgnesCompletion(body);
      } catch {
        throw new AgnesProviderError("provider_error", response.status || 502, transportAtStage(response, "model-contract"));
      }
      if (
        completion.finishReason === "length" ||
        typeof completion.content !== "string" ||
        !completion.content.trim() ||
        completion.content.length > 24000
      ) {
        throw new AgnesProviderError("provider_error", response.status || 502, transportAtStage(response, "model-contract"));
      }
      onDelta(completion.content);
      return { content: completion.content, usage: completion.usage };
    }
    if (!response.body || typeof response.body.getReader !== "function") {
      throw new AgnesProviderError("provider_error", response.status || 502);
    }
    let buffer = "";
    let content = "";
    let isDone = false;
    let usage = normalizeAgnesUsage();
    const consumeFrame = (frame) => {
      const data = frame.split(/\r?\n/)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("\n")
        .trim();
      if (!data) return;
      if (data === "[DONE]") {
        isDone = true;
        return;
      }
      let chunk;
      try {
        chunk = JSON.parse(data);
      } catch {
        throw new AgnesProviderError("provider_error", response.status || 502);
      }
      if (chunk.model && chunk.model !== AGNES_MODEL) throw new AgnesProviderError("provider_error", response.status || 502);
      if (chunk.usage) usage = normalizeAgnesUsage(chunk.usage);
      const choice = Array.isArray(chunk.choices) ? chunk.choices[0] : null;
      if (choice?.finish_reason === "length") throw new AgnesProviderError("provider_error", response.status || 502);
      const delta = typeof choice?.delta?.content === "string" ? choice.delta.content : "";
      if (!delta) return;
      content += delta;
      if (content.length > 24000) throw new AgnesProviderError("provider_error", response.status || 502);
      onDelta(delta);
    };
    const consumeBufferedFrames = () => {
      let boundary = findSseBoundary(buffer);
      while (boundary) {
        const frame = buffer.slice(0, boundary.index);
        buffer = buffer.slice(boundary.index + boundary.length);
        consumeFrame(frame);
        if (isDone) break;
        boundary = findSseBoundary(buffer);
      }
    };
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    while (!isDone) {
      let value;
      let done;
      try {
        ({ value, done } = await reader.read());
      } catch {
        throw new AgnesProviderError("network_unavailable", 0);
      }
      buffer += decoder.decode(value, { stream: !done });
      consumeBufferedFrames();
      if (done) break;
    }
    if (!isDone || !content.trim()) throw new AgnesProviderError("provider_error", response.status || 502);
    return { content, usage };
  }
}
