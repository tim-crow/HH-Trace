import type React from "react"

export interface InventoryItem {
  id: string
  productType: string
  batchCode: string
  quantity: number
  location: string
  lastUpdated: string
  deleted?: boolean
  deletedAt?: string
  deletedBy?: string
}

export interface TransactionRecord {
  id: string
  type: "Receival" | "Processing" | "Deletion" | "Outgoing"
  date: string
  productType: string
  batchCode: string
  quantity: number
  supplier?: string
  processor?: string
  customer?: string
  status: "Completed" | "In Progress"
}

export interface BulkProduct {
  bag: string
  productType: string
  kg: string
  batchCode: string
  notes: string
}

export interface FinishedProduct {
  bin: string
  hearts: string
  hulls: string
  lights: string
  overs: string
  oil: string
  mealProtein: string
  mealProteinKg: string
}

export interface NavigationSection {
  title: string
  items: NavigationItem[]
}

export interface NavigationItem {
  title: string
  icon: React.ComponentType<{ className?: string }>
  href: string
}

export interface AvailableBatch {
  batchCode: string
  quantity: number
  location: string
}

export type OrderStatus = "New" | "In Progress" | "Packed" | "Dispatched" | "Completed"

export type FreightMethod = "Courier" | "Auspost" | "Bulk"

export interface OrderItem {
  productType: string
  quantity: number
  units?: number
  fulfilled?: boolean
  batchCode?: string
}

export interface Order {
  id: string
  orderNumber: string
  customer: string
  customerAddress?: string
  details: string
  items?: OrderItem[]
  dateReceived: string
  dueDate: string
  freight?: FreightMethod
  freightCarrier?: string
  status: OrderStatus
  createdBy: string
  lastUpdatedBy: string
  notes?: string
  lastUpdated: string
  deleted?: boolean
}


