import { supabase } from "@/lib/supabase"

export interface AuditEntry {
  id: string
  timestamp: string
  userName: string
  userRole: "admin" | "operator"
  action: string
  target: string
  details: string
}

export async function getAuditLog(): Promise<AuditEntry[]> {
  const { data, error } = await supabase
    .from("audit_log")
    .select("*")
    .order("timestamp", { ascending: true })

  if (error || !data) return []

  return data.map((row) => ({
    id: row.id,
    timestamp: row.timestamp,
    userName: row.user_name,
    userRole: row.user_role,
    action: row.action,
    target: row.target,
    details: row.details,
  }))
}

export async function logAction(
  userName: string,
  userRole: "admin" | "operator",
  action: string,
  target: string,
  details: string
) {
  await supabase.from("audit_log").insert({
    id: `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    user_name: userName,
    user_role: userRole,
    action,
    target,
    details,
  })
}
