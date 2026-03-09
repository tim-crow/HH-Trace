const STORAGE_KEYS = {
  suppliers: "hh-suppliers",
  customers: "hh-customers",
  freight: "hh-freight",
  locations: "hh-locations",
} as const

export interface SavedCustomer {
  name: string
  address: string
}

// ── Suppliers ──────────────────────────────────────────────────────

export function getSuppliers(): string[] {
  if (typeof window === "undefined") return []
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.suppliers) || "[]")
  } catch {
    return []
  }
}

export function saveSupplier(name: string) {
  if (!name.trim()) return
  const suppliers = getSuppliers()
  const trimmed = name.trim()
  if (!suppliers.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
    suppliers.push(trimmed)
    localStorage.setItem(STORAGE_KEYS.suppliers, JSON.stringify(suppliers))
  }
}

// ── Customers (name + address) ─────────────────────────────────────

export function getCustomers(): SavedCustomer[] {
  if (typeof window === "undefined") return []
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.customers) || "[]")
  } catch {
    return []
  }
}

export function saveCustomer(name: string, address: string) {
  if (!name.trim()) return
  const customers = getCustomers()
  const trimmed = name.trim()
  const idx = customers.findIndex((c) => c.name.toLowerCase() === trimmed.toLowerCase())
  if (idx >= 0) {
    customers[idx] = { name: trimmed, address: address.trim() }
  } else {
    customers.push({ name: trimmed, address: address.trim() })
  }
  localStorage.setItem(STORAGE_KEYS.customers, JSON.stringify(customers))
}

// ── Freight Companies ──────────────────────────────────────────────

export function getFreightCompanies(): string[] {
  if (typeof window === "undefined") return []
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.freight) || "[]")
  } catch {
    return []
  }
}

export function saveFreightCompany(name: string) {
  if (!name.trim()) return
  const companies = getFreightCompanies()
  const trimmed = name.trim()
  if (!companies.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
    companies.push(trimmed)
    localStorage.setItem(STORAGE_KEYS.freight, JSON.stringify(companies))
  }
}

// ── Other Locations ────────────────────────────────────────────────

export function getOtherLocations(): string[] {
  if (typeof window === "undefined") return []
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.locations) || "[]")
  } catch {
    return []
  }
}

export function saveOtherLocation(name: string) {
  if (!name.trim()) return
  const locations = getOtherLocations()
  const trimmed = name.trim()
  if (!locations.some((l) => l.toLowerCase() === trimmed.toLowerCase())) {
    locations.push(trimmed)
    localStorage.setItem(STORAGE_KEYS.locations, JSON.stringify(locations))
  }
}
