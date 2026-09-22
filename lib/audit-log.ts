import { supabase } from "@/lib/supabase"

const STORAGE_KEY = "hh-audit-log"
const AUDIT_ENTRY_TYPE = "audit"
const LOCAL_ENTRY_LIMIT = 1000
const PAGE_SIZE = 1000
let localMigrationComplete = false

export interface AuditEntry {
  id: string
  timestamp: string
  userName: string
  userRole: "admin" | "operations" | "operator"
  action: string
  target: string
  details: string
}

export function getAuditLog(): AuditEntry[] {
  if (typeof window === "undefined") return []
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]").filter(isAuditEntry)
  } catch {
    return []
  }
}

function isAuditEntry(value: unknown): value is AuditEntry {
  if (!value || typeof value !== "object") return false
  const entry = value as Partial<AuditEntry>
  return typeof entry.id === "string" &&
    typeof entry.timestamp === "string" &&
    typeof entry.userName === "string" &&
    ["admin", "operations", "operator"].includes(entry.userRole || "") &&
    typeof entry.action === "string" &&
    typeof entry.target === "string" &&
    typeof entry.details === "string"
}

function parseAuditEntry(value: string): AuditEntry | null {
  try {
    const entry: unknown = JSON.parse(value)
    return isAuditEntry(entry) ? entry : null
  } catch {
    return null
  }
}

function mergeEntries(...entryLists: AuditEntry[][]): AuditEntry[] {
  const entriesById = new Map<string, AuditEntry>()
  entryLists.flat().forEach((entry) => entriesById.set(entry.id, entry))
  return [...entriesById.values()].sort((a, b) => a.timestamp.localeCompare(b.timestamp))
}

function saveLocalAuditLog(entries: AuditEntry[]) {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-LOCAL_ENTRY_LIMIT)))
}

export async function loadAuditLog(): Promise<AuditEntry[]> {
  const localEntries = getAuditLog()

  // Migrate this browser's existing history into the shared log. Upsert keeps
  // repeated loads harmless because saved_entries is unique on type + value.
  if (localEntries.length > 0 && !localMigrationComplete) {
    const { error } = await supabase.from("saved_entries").upsert(
      localEntries.map((entry) => ({ type: AUDIT_ENTRY_TYPE, value: JSON.stringify(entry) })),
      { onConflict: "type,value" }
    )
    localMigrationComplete = !error
  }

  const sharedEntries: AuditEntry[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("saved_entries")
      .select("value")
      .eq("type", AUDIT_ENTRY_TYPE)
      .order("value")
      .range(from, from + PAGE_SIZE - 1)

    if (error) return localEntries

    const rows = data || []
    rows.forEach((row: { value: string }) => {
      const entry = parseAuditEntry(row.value)
      if (entry) sharedEntries.push(entry)
    })
    if (rows.length < PAGE_SIZE) break
  }

  const mergedEntries = mergeEntries(sharedEntries, localEntries)
  saveLocalAuditLog(mergedEntries)
  return mergedEntries
}

export function logAction(
  userName: string,
  userRole: "admin" | "operations" | "operator",
  action: string,
  target: string,
  details: string
) {
  const entries = getAuditLog()
  const entry: AuditEntry = {
    id: `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    userName,
    userRole,
    action,
    target,
    details,
  }
  saveLocalAuditLog([...entries, entry])
  supabase.from("saved_entries").upsert(
    { type: AUDIT_ENTRY_TYPE, value: JSON.stringify(entry) },
    { onConflict: "type,value" }
  ).then()
}
