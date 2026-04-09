export const HEMP_PRODUCTS = [
  "Whole Seeds",
  "Hemp Hearts",
  "Hemp Hulls",
  "Hemp Lights",
  "Hemp Oil (Raw)",
  "Hemp Oil (Filtered)",
  "Hemp Meal Cake",
  "Hemp Protein Cake",
  "Hemp Protein Powder (50)",
  "Hemp Protein Powder (65)",
  "Overs",
  "Packaging",
] as const

export const FINISHED_GOODS = [
  "Hemp Seeds 420g",
  "Hemp Seeds 250g",
  "Hemp Seeds 15kg",
  "Oil 250ml",
  "Protein Powder 65 250g",
  "Protein Powder 65 420g",
  "Protein Powder 65 4.2kg",
  "Protein Powder 50 15kg",
  "Protein Powder 65 15kg",
] as const

export const PROCESS_TYPES = ["Milled", "Blended", "Filtered", "Packed"] as const

export const LOCATIONS = ["Factory", "Other"] as const

export const PRODUCT_UNIT_WEIGHTS: Record<string, number> = {
  "Hemp Seeds 420g": 0.42,
  "Hemp Seeds 250g": 0.25,
  "Hemp Seeds 15kg": 15,
  "Oil 250ml": 0.25,
  "Protein Powder 65 250g": 0.25,
  "Protein Powder 65 420g": 0.42,
  "Protein Powder 65 4.2kg": 4.2,
  "Protein Powder 50 15kg": 15,
  "Protein Powder 65 15kg": 15,
}

export const BOX_SIZES = [
  { label: "Large (30x30x40cm)", value: "Large 30x30x40cm" },
  { label: "15kg (43x31x24cm)", value: "15kg 43x31x24cm" },
  { label: "Other", value: "Other" },
] as const

export const PALLET_SIZES = ["Standard", "Euro", "Half", "Custom"] as const

export const SAMPLE_INVENTORY = [
  {
    id: "INV001",
    productType: "Whole Seeds",
    batchCode: "WS2024001",
    quantity: 500,
    location: "Factory",
    lastUpdated: "2024-01-15T10:30:00Z",
  },
  {
    id: "INV002",
    productType: "Hemp Oil (Raw)",
    batchCode: "HO2024001",
    quantity: 150,
    location: "Factory",
    lastUpdated: "2024-01-15T14:20:00Z",
  },
  {
    id: "INV003",
    productType: "Hemp Protein Cake",
    batchCode: "HP2024001",
    quantity: 75,
    location: "Factory",
    lastUpdated: "2024-01-14T16:45:00Z",
  },
] as const

export const SAMPLE_ORDERS_DATA: import("@/lib/types").Order[] = [
  {
    id: "ORD001",
    orderNumber: "HH-2026-001",
    customer: "Green Grocers Pty Ltd",
    details: "Hemp Hearts 200kg, Hemp Oil 50L",
    dateReceived: "2026-03-01",
    dueDate: "2026-03-14",
    status: "In Progress",
    createdBy: "Thomas",
    lastUpdatedBy: "Thomas",
    lastUpdated: "2026-03-05T10:30:00Z",
  },
  {
    id: "ORD002",
    orderNumber: "HH-2026-002",
    customer: "Health Foods Co",
    details: "Hemp Protein Cake 100kg",
    dateReceived: "2026-03-03",
    dueDate: "2026-03-10",
    status: "Packed",
    createdBy: "Thomas",
    lastUpdatedBy: "Sarah",
    lastUpdated: "2026-03-06T14:20:00Z",
  },
  {
    id: "ORD003",
    orderNumber: "HH-2026-003",
    customer: "Bulk Organics",
    details: "Whole Seeds 1000kg",
    dateReceived: "2026-03-05",
    dueDate: "2026-03-20",
    status: "New",
    createdBy: "Thomas",
    lastUpdatedBy: "Thomas",
    lastUpdated: "2026-03-05T16:00:00Z",
  },
]

export const SAMPLE_RECORDS = [
  {
    id: "REC001",
    type: "Receival" as const,
    date: "2024-01-15",
    productType: "Whole Seeds",
    batchCode: "WS2024001",
    quantity: 500,
    supplier: "Hemp Farm Co.",
    status: "Completed" as const,
  },
  {
    id: "REC002",
    type: "Processing" as const,
    date: "2024-01-14",
    productType: "Hemp Protein Cake",
    batchCode: "HP2024001",
    quantity: 100,
    processor: "Hemp Processing Ltd",
    status: "In Progress" as const,
  },
] as const
