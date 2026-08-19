export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function healthTone(value?: string) {
  if (value === "healthy" || value === "online" || value === "PASS") return "text-signal";
  if (value === "degraded" || value === "warning" || value === "WARNING") return "text-warn";
  if (value === "unhealthy" || value === "critical" || value === "FAIL" || value === "offline") return "text-crit";
  return "text-muted";
}
