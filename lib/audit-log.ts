const STORAGE_KEY = "hh-audit-log"

export interface AuditEntry {
  id: string
  timestamp: string
  userName: string
  userRole: "admin" | "operator"
  action: string
  target: string
  details: string
}

export function getAuditLog(): AuditEntry[] {
  if (typeof window === "undefined") return []
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")
  } catch {
    return []
  }
}

export function logAction(
  userName: string,
  userRole: "admin" | "operator",
  action: string,
  target: string,
  details: string
) {
  const entries = getAuditLog()
  entries.push({
    id: `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    userName,
    userRole,
    action,
    target,
    details,
  })
  // Keep last 1000 entries
  if (entries.length > 1000) entries.splice(0, entries.length - 1000)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
}
