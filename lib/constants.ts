export const HEMP_PRODUCTS = [
  "Whole Seeds",
  "Hulled Seeds",
  "Hemp Hearts",
  "Hemp Protein 65",
  "Hemp Protein 50",
  "Hemp Meal",
  "Hemp Hulls",
  "Hemp Lights",
  "Hemp Oil",
  "Hemp Meal Cake",
  "Hemp Protein Cake",
  "Overs",
  "Finished Goods",
  "Packaging",
] as const

export const PROCESS_TYPES = ["Milled", "Blended", "Filtered", "Packed"] as const

export const LOCATIONS = ["Factory", "Other"] as const

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
    productType: "Hemp Oil",
    batchCode: "HO2024001",
    quantity: 150,
    location: "Factory",
    lastUpdated: "2024-01-15T14:20:00Z",
  },
  {
    id: "INV003",
    productType: "Hemp Protein 65",
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
    details: "Hemp Protein 65 100kg",
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
    productType: "Hemp Protein 65",
    batchCode: "HP2024001",
    quantity: 100,
    processor: "Hemp Processing Ltd",
    status: "In Progress" as const,
  },
] as const
