export function retryAgnesGeneration(request, action = "") {
  if (typeof request !== "function") throw new TypeError("Agnes generation request is required");
  return request(action);
}

export function deriveAgnesPendingUi({ isAwaiting = false, isDead = false } = {}) {
  return {
    isLoadingVisible: Boolean(isAwaiting),
    isContinueVisible: !isAwaiting && !isDead,
    loadingText: "Agnes 正在思考中",
  };
}

export function formatAgnesTransportDiagnostic(error) {
  const transport = error?.transport;
  if (!transport || !["tap.request", "browser.fetch"].includes(transport.channel)) return "";
  const stage = ["bridge", "DNS", "TLS", "HTTP", "auth", "response-parse", "model-contract"].includes(transport.stage)
    ? transport.stage
    : "HTTP";
  if (transport.channel === "browser.fetch") {
    return `阶段：${stage}。Transport：browser.fetch。`;
  }
  const errno = Number.isFinite(Number(transport.errno)) ? Math.trunc(Number(transport.errno)) : 0;
  const reason = ["timeout", "host-policy", "dns", "tls", "network", "bridge-unavailable"].includes(transport.reason)
    ? transport.reason
    : "network";
  const diagnosticId = `TAP-${reason.toUpperCase()}-${errno}`;
  const guidance = {
    "host-policy": "请在 TapTap 开发者后台确认 https://api.agnes-ai.cn 已加入 request 合法域名。",
    timeout: "TapTap 请求已超时，请切换网络后手动重试；为避免重复消耗，不会自动重试。",
    dns: "TapTap 无法解析 Agnes 域名，请切换网络或稍后手动重试。",
    tls: "TapTap 无法建立 Agnes HTTPS 连接，请检查设备时间、网络证书或稍后重试。",
    "bridge-unavailable": "当前没有可用的 TapTap tap.request bridge，已禁止回退 browser fetch。",
    network: "TapTap 网络层未完成请求，请记录诊断 ID 后检查设备网络。",
  }[reason];
  const details = {
    errno: transport.errno ?? 0,
    errMsg: typeof transport.errMsg === "string"
      ? transport.errMsg.replace(/Bearer\s+[^\s,;]+/gi, "Bearer [REDACTED]")
      : "",
    statusCode: transport.statusCode ?? 0,
    profile: transport.profile ?? null,
  };
  return `${guidance}阶段：${stage}。Transport：tap.request。诊断 ID：${diagnosticId}。详情：${JSON.stringify(details)}。`;
}
