import { supabase } from "@/lib/supabase"

export interface SavedCustomer {
  name: string
  address: string
}

// ── In-memory cache (loaded from Supabase once, then kept in sync) ──

let customersCache: SavedCustomer[] | null = null
let suppliersCache: string[] | null = null
let freightCache: string[] | null = null
let locationsCache: string[] | null = null

// ── Customers (name + address) ─────────────────────────────────────

export function getCustomers(): SavedCustomer[] {
  return customersCache || []
}

export async function loadCustomers(): Promise<SavedCustomer[]> {
  if (customersCache) return customersCache
  const { data } = await supabase.from("saved_customers").select("name, address").order("name")
  customersCache = (data || []).map((r: any) => ({ name: r.name, address: r.address || "" }))
  return customersCache
}

export function saveCustomer(name: string, address: string) {
  if (!name.trim()) return
  const trimmed = name.trim()
  const addr = address.trim()

  // Update local cache immediately
  if (!customersCache) customersCache = []
  const idx = customersCache.findIndex((c) => c.name.toLowerCase() === trimmed.toLowerCase())
  if (idx >= 0) {
    customersCache[idx] = { name: trimmed, address: addr }
  } else {
    customersCache.push({ name: trimmed, address: addr })
  }

  // Persist to Supabase (fire-and-forget)
  supabase.from("saved_customers").upsert({ name: trimmed, address: addr }, { onConflict: "name" }).then()
}

// ── Suppliers ──────────────────────────────────────────────────────

export function getSuppliers(): string[] {
  return suppliersCache || []
}

export async function loadSuppliers(): Promise<string[]> {
  if (suppliersCache) return suppliersCache
  const { data } = await supabase.from("saved_entries").select("value").eq("type", "supplier").order("value")
  suppliersCache = (data || []).map((r: any) => r.value)
  return suppliersCache
}

export function saveSupplier(name: string) {
  if (!name.trim()) return
  const trimmed = name.trim()
  if (!suppliersCache) suppliersCache = []
  if (!suppliersCache.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
    suppliersCache.push(trimmed)
    supabase.from("saved_entries").upsert({ type: "supplier", value: trimmed }, { onConflict: "type,value" }).then()
  }
}

// ── Freight Companies ──────────────────────────────────────────────

export function getFreightCompanies(): string[] {
  return freightCache || []
}

export async function loadFreightCompanies(): Promise<string[]> {
  if (freightCache) return freightCache
  const { data } = await supabase.from("saved_entries").select("value").eq("type", "freight").order("value")
  freightCache = (data || []).map((r: any) => r.value)
  return freightCache
}

export function saveFreightCompany(name: string) {
  if (!name.trim()) return
  const trimmed = name.trim()
  if (!freightCache) freightCache = []
  if (!freightCache.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
    freightCache.push(trimmed)
    supabase.from("saved_entries").upsert({ type: "freight", value: trimmed }, { onConflict: "type,value" }).then()
  }
}

// ── Other Locations ────────────────────────────────────────────────

export function getOtherLocations(): string[] {
  return locationsCache || []
}

export async function loadOtherLocations(): Promise<string[]> {
  if (locationsCache) return locationsCache
  const { data } = await supabase.from("saved_entries").select("value").eq("type", "location").order("value")
  locationsCache = (data || []).map((r: any) => r.value)
  return locationsCache
}

export function saveOtherLocation(name: string) {
  if (!name.trim()) return
  const trimmed = name.trim()
  if (!locationsCache) locationsCache = []
  if (!locationsCache.some((l) => l.toLowerCase() === trimmed.toLowerCase())) {
    locationsCache.push(trimmed)
    supabase.from("saved_entries").upsert({ type: "location", value: trimmed }, { onConflict: "type,value" }).then()
  }
}

// ── Load all (call once on app init) ───────────────────────────────

export async function loadAllSavedEntries() {
  await Promise.all([
    loadCustomers(),
    loadSuppliers(),
    loadFreightCompanies(),
    loadOtherLocations(),
  ])
}
