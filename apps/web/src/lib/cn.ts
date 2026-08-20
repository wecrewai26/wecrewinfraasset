export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function healthTone(value?: string) {
  const v = (value || "").toLowerCase();
  if (["healthy", "online", "pass", "connected", "active", "allocated", "running", "resolved", "ok"].includes(v)) {
    return "text-signal";
  }
  if (["degraded", "warning", "warn", "open", "firing", "investigating", "scheduled", "high", "medium"].includes(v)) {
    return "text-warn";
  }
  if (["unhealthy", "critical", "fail", "offline", "p1", "error"].includes(v)) return "text-crit";
  return "text-muted";
}
