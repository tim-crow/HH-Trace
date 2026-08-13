"use client"

export const dynamic = "force-dynamic"

import * as React from "react"
import { Menu, LogOut } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

import { AuthProvider, useAuth } from "@/lib/auth"
import { logAction } from "@/lib/audit-log"
import { Sidebar } from "@/components/sidebar"
import { Dashboard } from "@/components/dashboard"
import { LoginScreen } from "@/components/login-screen"
import { ReceivalForm } from "@/components/receival-form"
import { ProcessingForms } from "@/components/processing-forms"
import { OutgoingForm } from "@/components/outgoing-form"
import { InventoryTable } from "@/components/inventory-table"
import { RecordsTable } from "@/components/records-table"
import { OrderManagement } from "@/components/order-management"
import { AuditLogView } from "@/components/audit-log-view"
import { ProcessingAnalytics } from "@/components/processing-analytics"
import { AssistantChat } from "@/components/assistant-chat"
import { formatQuantity, generateId, roundQuantity } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { loadAllSavedEntries } from "@/lib/remembered-entries"
import type { InventoryItem, TransactionRecord, BulkProduct, FinishedProduct, Order, OrderItem, OrderStatus, ProcessingRun, RawMaterialAddData, RawMaterialCleaningData } from "@/lib/types"

interface PackingSlipData {
  number: string
  date: string
  orderNumber?: string
  customer: string
  address: string
  products: { productType: string; batchCode: string; weight: number }[]
}

function normalizeOrderStatus(status: string): OrderStatus {
  if (status === "Packed") return "Ready to Ship"
  if (status === "Completed") return "Dispatched"
  if (["New", "In Progress", "Ready to Ship", "Dispatched"].includes(status)) return status as OrderStatus
  return "New"
}

function normalizeBulkProductQuantities(products: BulkProduct[]) {
  return products.map((product) => ({
    ...product,
    kg: Number.isFinite(Number.parseFloat(product.kg)) ? String(roundQuantity(Number.parseFloat(product.kg))) : product.kg,
  }))
}

function normalizeFinishedProductQuantities(products: FinishedProduct[]) {
  const normalize = (value: string) => Number.isFinite(Number.parseFloat(value)) ? String(roundQuantity(Number.parseFloat(value))) : value
  return products.map((product) => ({
    ...product,
    hearts: normalize(product.hearts),
    hulls: normalize(product.hulls),
    lights: normalize(product.lights),
    overs: normalize(product.overs),
    oil: normalize(product.oil),
    mealProteinKg: normalize(product.mealProteinKg),
  }))
}

function escapePackingSlipValue(value: string | number) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

function openPackingSlip(data: PackingSlipData) {
  const win = window.open("", "_blank")
  if (!win) return false

  const productRows = data.products.map((product) => `
    <tr>
      <td>${escapePackingSlipValue(product.productType)}</td>
      <td class="batch">${escapePackingSlipValue(product.batchCode)}</td>
      <td class="quantity">${escapePackingSlipValue(formatQuantity(product.weight))} kg</td>
    </tr>
  `).join("")

  win.document.write(`<!DOCTYPE html><html><head><title>Packing Slip ${escapePackingSlipValue(data.number)}</title>
    <style>
      * { box-sizing: border-box; }
      @page { size: A4; margin: 20mm; }
      body { margin: 0; padding: 40px; color: #1a1a1a; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      .toolbar { display: flex; justify-content: flex-end; margin-bottom: 20px; }
      .toolbar button { border: 0; border-radius: 6px; background: #16a34a; color: white; padding: 10px 18px; font-size: 14px; font-weight: 600; cursor: pointer; }
      .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #16a34a; padding-bottom: 18px; margin-bottom: 30px; }
      .brand { color: #16a34a; font-size: 24px; font-weight: 700; }
      .brand span { display: block; color: #555; font-size: 14px; font-weight: 400; margin-top: 3px; }
      .document-title { text-align: right; }
      .document-title h1 { margin: 0 0 6px; font-size: 24px; }
      .document-title p { margin: 2px 0; color: #555; font-size: 13px; }
      .details { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 28px; }
      .field label { display: block; color: #777; font-size: 11px; font-weight: 600; letter-spacing: .5px; text-transform: uppercase; margin-bottom: 5px; }
      .field p { margin: 0; font-size: 15px; font-weight: 500; white-space: pre-line; }
      .address { grid-column: 1 / -1; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb; padding: 15px; }
      table { width: 100%; border-collapse: collapse; margin-top: 8px; }
      th { color: #777; font-size: 11px; font-weight: 600; letter-spacing: .5px; text-align: left; text-transform: uppercase; border-bottom: 2px solid #d1d5db; padding: 10px 12px; }
      td { border-bottom: 1px solid #e5e7eb; padding: 12px; font-size: 14px; }
      .batch { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
      .quantity { text-align: right; }
      th:last-child { text-align: right; }
      .footer { border-top: 1px solid #e5e7eb; color: #aaa; font-size: 11px; margin-top: 40px; padding-top: 14px; text-align: center; }
      @media print { body { padding: 0; } .toolbar { display: none; } }
    </style></head><body>
    <div class="toolbar"><button onclick="window.print()">Print Packing Slip</button></div>
    <div class="header">
      <div class="brand">Hemp Harvests<span>Traceability System</span></div>
      <div class="document-title">
        <h1>Packing Slip</h1>
        <p>${escapePackingSlipValue(data.number)}</p>
        <p>${escapePackingSlipValue(data.date)}</p>
      </div>
    </div>
    <div class="details">
      ${data.orderNumber ? `<div class="field"><label>Order Number</label><p>${escapePackingSlipValue(data.orderNumber)}</p></div>` : ""}
      <div class="field"><label>Customer</label><p>${escapePackingSlipValue(data.customer || "—")}</p></div>
      <div class="field address"><label>Delivery Address</label><p>${escapePackingSlipValue(data.address || "—")}</p></div>
    </div>
    <table>
      <thead><tr><th>Product</th><th>Batch Code</th><th>Quantity</th></tr></thead>
      <tbody>${productRows}</tbody>
    </table>
    <div class="footer">Hemp Harvests Packing Slip</div>
  </body></html>`)
  win.document.close()
  return true
}

export default function HempTraceabilityDashboard() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

function AppContent() {
  const { user, logout, isAdmin } = useAuth()

  const [activeSection, setActiveSection] = React.useState("dashboard")
  const [inventory, setInventory] = React.useState<InventoryItem[]>([])
  const [records, setRecords] = React.useState<TransactionRecord[]>([])
  const [orders, setOrders] = React.useState<Order[]>([])
  const [sidebarOpen, setSidebarOpen] = React.useState(true)
  const [outgoingPrefill, setOutgoingPrefill] = React.useState<{ orderId: string; items: OrderItem[]; customer: string; customerAddress: string; freight?: string; freightCarrier?: string; previousStatus?: import("@/lib/types").OrderStatus } | null>(null)
  const [editingProcessingRun, setEditingProcessingRun] = React.useState<ProcessingRun | null>(null)

  React.useEffect(() => {
    supabase.from('inventory').select('*').then(({ data }) => {
      if (data) setInventory(data.map((r: any) => ({
        id: r.id, productType: r.product_type, batchCode: r.batch_code, quantity: r.quantity,
        location: r.location, lastUpdated: r.last_updated, deleted: r.deleted,
        deletedAt: r.deleted_at, deletedBy: r.deleted_by,
      })))
    })
    supabase.from('records').select('*').then(({ data }) => {
      if (data) setRecords(data.map((r: any) => ({
        id: r.id, type: r.type, date: r.date, productType: r.product_type,
        batchCode: r.batch_code, quantity: r.quantity, supplier: r.supplier,
        processor: r.processor, customer: r.customer, status: r.status,
        processingRunId: r.processing_run_id || undefined,
        deleted: r.deleted || false,
        deletedAt: r.deleted_at || undefined,
        deletedBy: r.deleted_by || undefined,
      })))
    })
    supabase.from('orders').select('*').then(({ data }) => {
      if (data) setOrders(data.map((r: any) => ({
        id: r.id, orderNumber: r.order_number, customer: r.customer,
        customerAddress: r.customer_address || "", details: r.details,
        items: r.items || [],
        dateReceived: r.date_received, dueDate: r.due_date,
        freight: r.freight, freightCarrier: r.freight_carrier,
        notes: r.notes || "",
        status: normalizeOrderStatus(r.status), createdBy: r.created_by, lastUpdatedBy: r.last_updated_by,
        lastUpdated: r.last_updated, deleted: r.deleted,
      })))
    })
    supabase.from('orders').update({ status: "Ready to Ship" }).eq('status', 'Packed').then()
    supabase.from('orders').update({ status: "Dispatched" }).eq('status', 'Completed').then()
    loadAllSavedEntries()
  }, [])
  const [message, setMessage] = React.useState("")
  const [messageOpen, setMessageOpen] = React.useState(false)
  const [itemToDelete, setItemToDelete] = React.useState<InventoryItem | null>(null)
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [confirmAction, setConfirmAction] = React.useState<{ title: string; description: string; onConfirm: () => void } | null>(null)

  // Auto-revert: if the user moved an order to "Ready to Ship" (which redirected to the
  // Outgoing form) but then navigated away without submitting a dispatch record,
  // put the order back at "In Progress".
  const prevActiveSection = React.useRef(activeSection)
  React.useEffect(() => {
    const leftOutgoing = prevActiveSection.current === "outgoing" && activeSection !== "outgoing"
    prevActiveSection.current = activeSection

    if (leftOutgoing && outgoingPrefill?.orderId && outgoingPrefill.previousStatus) {
      const orderId = outgoingPrefill.orderId
      const prevStatus = outgoingPrefill.previousStatus
      const now = new Date().toISOString()
      const reverted = orders.find((o) => o.id === orderId)
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: prevStatus, lastUpdated: now } : o))
      )
      supabase.from('orders').update({ status: prevStatus, last_updated: now }).eq('id', orderId).then()
      if (user && reverted) {
        logAction(user.name, user.role, "Reverted Order Status", reverted.orderNumber, `Ready to Ship → ${prevStatus} — no outgoing dispatch was submitted`)
        setMessage(`Order ${reverted.orderNumber} reverted to ${prevStatus} — no dispatch record was submitted.`)
        setMessageOpen(true)
      }
      setOutgoingPrefill(null)
    }
  }, [activeSection, outgoingPrefill, orders, user])

  if (!user) return <LoginScreen />

  const showMessage = (msg: string) => {
    setMessage(msg)
    setMessageOpen(true)
  }

  const activeInventory = inventory.filter((item) => !item.deleted)

  const handleReceivalSubmit = (formData: {
    date: string
    supplier: string
    productType: string
    batchCode: string
    quantity: string
    location: string
    sourceInventoryId?: string
  }) => {
    const quantity = roundQuantity(Number.parseFloat(formData.quantity))
    const source = formData.sourceInventoryId
      ? inventory.find((item) => item.id === formData.sourceInventoryId && !item.deleted)
      : undefined
    if (!Number.isFinite(quantity) || quantity <= 0) {
      showMessage("Enter a positive quantity for this receival.")
      return false
    }
    const sourceProductType = source?.productType === "Raw Material — Cleaned" ? "Cleaned Seeds" : source?.productType
    if (formData.sourceInventoryId && (
      !source ||
      source.location === "Factory" ||
      !["Cleaned Seeds", "Seconds", "Raw Material — Cleaned"].includes(source.productType) ||
      source.quantity < quantity ||
      formData.productType !== sourceProductType ||
      formData.batchCode !== source.batchCode ||
      formData.location !== "Factory"
    )) {
      showMessage("The selected external material or its inventory details have changed. Select it again and check the available quantity.")
      return false
    }
    const productType = formData.productType || "Whole Seeds"
    const existingFactoryItems = source
      ? inventory.filter((item) => !item.deleted && item.location === "Factory" && item.productType === productType && item.batchCode === formData.batchCode)
      : []
    if (existingFactoryItems.length > 1) {
      showMessage(`${productType} batch ${formData.batchCode} has duplicate Factory inventory rows. Ask an admin to consolidate them before receiving more stock.`)
      return false
    }
    const existingFactoryItem = existingFactoryItems[0]
    const newItem: InventoryItem = {
      id: existingFactoryItem?.id || generateId("INV"),
      productType,
      batchCode: formData.batchCode,
      quantity: existingFactoryItem ? roundQuantity(existingFactoryItem.quantity + quantity) : quantity,
      location: formData.location || "Factory",
      lastUpdated: new Date().toISOString(),
    }
    const newRecord: TransactionRecord = {
      id: generateId("REC"),
      type: "Receival",
      date: formData.date,
      productType: newItem.productType,
      batchCode: formData.batchCode,
      quantity,
      supplier: formData.supplier,
      status: "Completed",
    }
    setInventory((previous) => {
      const withSourceDeducted = source
        ? previous.map((item) => item.id === source.id ? { ...item, quantity: roundQuantity(item.quantity - quantity), lastUpdated: newItem.lastUpdated } : item)
        : previous
      return existingFactoryItem
        ? withSourceDeducted.map((item) => item.id === existingFactoryItem.id ? newItem : item)
        : [...withSourceDeducted, newItem]
    })
    setRecords((prev) => [...prev, newRecord])
    if (source) {
      supabase.from('inventory').update({ quantity: roundQuantity(source.quantity - quantity), last_updated: newItem.lastUpdated }).eq('id', source.id).then()
    }
    if (existingFactoryItem) {
      supabase.from('inventory').update({ quantity: newItem.quantity, last_updated: newItem.lastUpdated }).eq('id', existingFactoryItem.id).then()
    } else {
      supabase.from('inventory').insert({ id: newItem.id, product_type: newItem.productType, batch_code: newItem.batchCode, quantity: newItem.quantity, location: newItem.location, last_updated: newItem.lastUpdated }).then()
    }
    supabase.from('records').insert({ id: newRecord.id, type: newRecord.type, date: newRecord.date, product_type: newRecord.productType, batch_code: newRecord.batchCode, quantity: newRecord.quantity, supplier: newRecord.supplier, status: newRecord.status }).then()
    logAction(user.name, user.role, "Created Receival", formData.batchCode, `${formData.productType || "Whole Seeds"} — ${formatQuantity(quantity)} kg from ${formData.supplier || "unknown supplier"} at ${formData.location || "Factory"}`)
    showMessage("Receival record added successfully!")
    return true
  }

  const handleProcessingSubmit = (
    formData: { date: string; batchId: string; staffCount: string; staffNames: string; notes: string; oilPressType?: string },
    processType: string,
    bulkProducts: BulkProduct[],
    finishedProducts: FinishedProduct[],
    onCommitted?: () => void,
  ) => {
    const doProcess = () => {
      const newInventoryItems: InventoryItem[] = []

      // Aggregate yields across all bins so each product stays under the single
      // processing batch ID (e.g. all hemp hearts from batch 11226 → batchCode "11226").
      const totals: Record<string, number> = {}
      const addTotal = (productType: string, value: string | undefined) => {
        const n = Number.parseFloat(value || "")
        if (Number.isFinite(n) && n > 0) {
          totals[productType] = (totals[productType] || 0) + n
        }
      }

      if (processType === "dehulling") {
        finishedProducts.forEach((product) => {
          addTotal("Hemp Hearts", product.hearts)
          addTotal("Hemp Hulls", product.hulls)
          addTotal("Hemp Lights", product.lights)
          addTotal("Overs", product.overs)
        })
      } else if (processType === "pressing") {
        finishedProducts.forEach((product) => {
          addTotal("Hemp Oil (Raw)", product.oil)
          if (product.mealProteinKg && Number.parseFloat(product.mealProteinKg) > 0) {
            const productType = product.mealProtein === "protein" ? "Hemp Protein Cake" : "Hemp Meal Cake"
            addTotal(productType, product.mealProteinKg)
          }
        })
      } else if (processType === "combining") {
        const productType = bulkProducts[0]?.productType
        const quantity = roundQuantity(bulkProducts.reduce((sum, product) => sum + (Number.parseFloat(product.kg) || 0), 0))
        if (productType && quantity > 0) totals[productType] = quantity
      }

      if (processType === "combining" && inventory.some((item) => item.batchCode === formData.batchId)) {
        showMessage(`Batch code ${formData.batchId} already exists. Enter a unique outgoing batch code.`)
        return
      }

      Object.entries(totals).forEach(([productType, quantity]) => {
        newInventoryItems.push({
          id: generateId("INV"),
          productType,
          batchCode: formData.batchId,
          quantity: roundQuantity(quantity),
          location: "Factory",
          lastUpdated: new Date().toISOString(),
        })
      })

      const inputProductTypes: Record<string, string> = {
        "whole-seeds": "Whole Seeds",
        "hulled-seeds": "Hulled Seeds",
        "hemp-hearts": "Hemp Hearts",
        lights: "Hemp Lights",
        overs: "Overs",
        seconds: "Seconds",
      }
      const inputDeductions = new Map<string, number>()
      bulkProducts.forEach((product) => {
        const quantity = roundQuantity(Number.parseFloat(product.kg))
        const productType = inputProductTypes[product.productType] || product.productType
        if (!product.batchCode || !productType || !Number.isFinite(quantity) || quantity <= 0) return
        const key = `${productType}\u0000${product.batchCode}`
        inputDeductions.set(key, roundQuantity((inputDeductions.get(key) || 0) + quantity))
      })

      const inventoryUpdates = new Map<string, { quantity: number; lastUpdated: string }>()
      let inputError = ""
      inputDeductions.forEach((quantity, key) => {
        const [productType, batchCode] = key.split("\u0000")
        const matches = inventory.filter((candidate) =>
          !candidate.deleted &&
          candidate.productType === productType &&
          candidate.batchCode === batchCode &&
          candidate.location === "Factory"
        )
        if (matches.length > 1) {
          inputError = `${productType} batch ${batchCode} has duplicate inventory rows. Ask an admin to consolidate them before processing.`
          return
        }
        const item = matches[0]
        if (!item) {
          inputError = `${productType} batch ${batchCode} is no longer available at Factory.`
          return
        }
        if (item.quantity < quantity) {
          inputError = `${productType} batch ${batchCode} only has ${formatQuantity(item.quantity)}kg available; ${formatQuantity(quantity)}kg was requested.`
          return
        }

        const lastUpdated = new Date().toISOString()
        const remainingQuantity = roundQuantity(item.quantity - quantity)
        inventoryUpdates.set(item.id, { quantity: remainingQuantity, lastUpdated })
      })
      if (inputError) {
        showMessage(inputError)
        return
      }
      inventoryUpdates.forEach((update, id) => {
        supabase.from('inventory').update({ quantity: update.quantity, last_updated: update.lastUpdated }).eq('id', id).then()
      })
      setInventory((prev) =>
        prev.map((item) => {
          const update = inventoryUpdates.get(item.id)
          return update ? { ...item, quantity: update.quantity, lastUpdated: update.lastUpdated } : item
        })
      )

      setInventory((prev) => [...prev, ...newInventoryItems])
      newInventoryItems.forEach((item) => {
        supabase.from('inventory').insert({ id: item.id, product_type: item.productType, batch_code: item.batchCode, quantity: item.quantity, location: item.location, last_updated: item.lastUpdated }).then()
      })

      const totalKg = roundQuantity(bulkProducts.reduce((sum, p) => sum + (Number.parseFloat(p.kg) || 0), 0))
      const runId = generateId("PR")
      const newRecord: TransactionRecord = {
        id: generateId("REC"),
        type: "Processing",
        date: formData.date,
        productType: processType === "combining" ? "Batch Combination" : `${processType.charAt(0).toUpperCase() + processType.slice(1)} Processing`,
        batchCode: formData.batchId,
        quantity: totalKg,
        processor: processType === "combining" ? user.name : `${formData.staffNames} (${formData.staffCount} staff)`,
        status: "Completed",
        processingRunId: runId,
      }
      setRecords((prev) => [...prev, newRecord])
      supabase.from('records').insert({ id: newRecord.id, type: newRecord.type, date: newRecord.date, product_type: newRecord.productType, batch_code: newRecord.batchCode, quantity: newRecord.quantity, processor: newRecord.processor, status: newRecord.status, processing_run_id: runId }).then()
      const outputs = newInventoryItems.map(item => ({ productType: item.productType, kg: item.quantity }))
      // Save the entire form snapshot so it can be reopened and edited later
      const formSnapshot = {
        staffCount: formData.staffCount,
        staffNames: formData.staffNames,
        notes: formData.notes || "",
        oilPressType: formData.oilPressType || "",
        bulkProducts: normalizeBulkProductQuantities(bulkProducts),
        finishedProducts: normalizeFinishedProductQuantities(finishedProducts),
      }
      supabase.from('processing_runs').insert({
        id: runId,
        date: formData.date,
        batch_id: formData.batchId,
        process_type: processType,
        total_input_kg: totalKg,
        outputs: outputs,
        form_data: formSnapshot,
      }).then()
      logAction(user.name, user.role, "Created Processing", formData.batchId, `${processType} — ${formatQuantity(totalKg)} kg input, ${newInventoryItems.length} outputs created`)
      showMessage(processType === "combining" ? "Combined batch created successfully!" : `${processType.charAt(0).toUpperCase() + processType.slice(1)} record saved successfully!`)
      onCommitted?.()
    }

    const totalKg = roundQuantity(bulkProducts.reduce((sum, p) => sum + (Number.parseFloat(p.kg) || 0), 0))
    setConfirmAction({
      title: processType === "combining" ? "Confirm Batch Combination" : `Confirm ${processType.charAt(0).toUpperCase() + processType.slice(1)} Record`,
      description: processType === "combining"
        ? `This will deduct ${formatQuantity(totalKg)} kg from the selected source batches and create batch ${formData.batchId}. The source genealogy will be saved.`
        : `This will deduct ${formatQuantity(totalKg)} kg from input batches and create finished product inventory items. This action is recorded in the audit log.`,
      onConfirm: doProcess,
    })
  }

  const handleRawMaterialAdd = (data: RawMaterialAddData, onCommitted: () => void) => {
    setConfirmAction({
      title: "Add Raw Material?",
      description: `This will add ${formatQuantity(data.quantity)} kg from ${data.supplier} as ${data.status} raw material at ${data.storageLocation}.`,
      onConfirm: () => {
        if (inventory.some((item) => item.batchCode === data.batchCode)) {
          showMessage(`Batch code ${data.batchCode} already exists. Enter a unique source lot or batch code.`)
          return
        }
        const now = new Date().toISOString()
        const runId = generateId("PR")
        const item: InventoryItem = {
          id: generateId("INV"),
          productType: `Raw Material — ${data.status}`,
          batchCode: data.batchCode,
          quantity: roundQuantity(data.quantity),
          location: data.storageLocation,
          lastUpdated: now,
        }
        const record: TransactionRecord = {
          id: generateId("REC"),
          type: "Processing",
          date: data.date,
          productType: item.productType,
          batchCode: item.batchCode,
          quantity: item.quantity,
          supplier: data.supplier,
          status: "Completed",
          processingRunId: runId,
        }
        setInventory((previous) => [...previous, item])
        setRecords((previous) => [...previous, record])
        supabase.from('inventory').insert({ id: item.id, product_type: item.productType, batch_code: item.batchCode, quantity: item.quantity, location: item.location, last_updated: item.lastUpdated }).then()
        supabase.from('records').insert({ id: record.id, type: record.type, date: record.date, product_type: record.productType, batch_code: record.batchCode, quantity: record.quantity, supplier: record.supplier, status: record.status, processing_run_id: runId }).then()
        supabase.from('processing_runs').insert({
          id: runId,
          date: data.date,
          batch_id: data.batchCode,
          process_type: "raw-material-add",
          total_input_kg: data.quantity,
          outputs: [{ productType: item.productType, kg: item.quantity }],
          form_data: { ...data, inventoryItemId: item.id },
        }).then()
        logAction(user.name, user.role, "Added Raw Material", data.batchCode, `${formatQuantity(item.quantity)} kg ${data.status} from ${data.supplier} at ${data.storageLocation}`)
        showMessage("Raw material added to inventory successfully!")
        onCommitted()
      },
    })
  }

  const handleRawMaterialCleaning = (data: RawMaterialCleaningData, onCommitted: () => void) => {
    const source = inventory.find((item) => item.id === data.sourceInventoryId && !item.deleted)
    if (!source) {
      showMessage("The selected raw-material batch is no longer available.")
      return
    }
    const outputTotal = roundQuantity(data.cleanedSeedsQuantity + data.secondsQuantity)
    const cleaningLoss = roundQuantity(data.inputQuantity - outputTotal)
    setConfirmAction({
      title: "Confirm Raw Material Cleaning",
      description: `This will deduct ${formatQuantity(data.inputQuantity)} kg from ${source.batchCode} and create ${formatQuantity(data.cleanedSeedsQuantity)} kg Cleaned Seeds and ${formatQuantity(data.secondsQuantity)} kg Seconds under batch ${data.outputBatchCode}. Cleaning loss: ${formatQuantity(cleaningLoss)} kg.`,
      onConfirm: () => {
        const currentSource = inventory.find((item) => item.id === data.sourceInventoryId && !item.deleted)
        if (!currentSource || currentSource.quantity < data.inputQuantity) {
          showMessage(`${source.batchCode} no longer has enough raw material for this cleaning record.`)
          return
        }
        if (inventory.some((item) => item.batchCode === data.outputBatchCode)) {
          showMessage(`Batch code ${data.outputBatchCode} already exists. Enter a unique cleaned batch code.`)
          return
        }
        const now = new Date().toISOString()
        const runId = generateId("PR")
        const revisedSourceQuantity = roundQuantity(currentSource.quantity - data.inputQuantity)
        const outputs: InventoryItem[] = [
          data.cleanedSeedsQuantity > 0 ? {
            id: generateId("INV"), productType: "Cleaned Seeds", batchCode: data.outputBatchCode,
            quantity: roundQuantity(data.cleanedSeedsQuantity), location: data.storageLocation, lastUpdated: now,
          } : null,
          data.secondsQuantity > 0 ? {
            id: generateId("INV"), productType: "Seconds", batchCode: data.outputBatchCode,
            quantity: roundQuantity(data.secondsQuantity), location: data.storageLocation, lastUpdated: now,
          } : null,
        ].filter((item): item is InventoryItem => item !== null)
        const record: TransactionRecord = {
          id: generateId("REC"),
          type: "Processing",
          date: data.date,
          productType: "Raw Material Cleaning",
          batchCode: data.outputBatchCode,
          quantity: roundQuantity(data.inputQuantity),
          processor: user.name,
          status: "Completed",
          processingRunId: runId,
        }
        setInventory((previous) => [
          ...previous.map((item) => item.id === currentSource.id ? { ...item, quantity: revisedSourceQuantity, lastUpdated: now } : item),
          ...outputs,
        ])
        setRecords((previous) => [...previous, record])
        supabase.from('inventory').update({ quantity: revisedSourceQuantity, last_updated: now }).eq('id', currentSource.id).then()
        outputs.forEach((item) => supabase.from('inventory').insert({ id: item.id, product_type: item.productType, batch_code: item.batchCode, quantity: item.quantity, location: item.location, last_updated: item.lastUpdated }).then())
        supabase.from('records').insert({ id: record.id, type: record.type, date: record.date, product_type: record.productType, batch_code: record.batchCode, quantity: record.quantity, processor: record.processor, status: record.status, processing_run_id: runId }).then()
        supabase.from('processing_runs').insert({
          id: runId,
          date: data.date,
          batch_id: data.outputBatchCode,
          process_type: "raw-material-cleaning",
          total_input_kg: data.inputQuantity,
          outputs: outputs.map((item) => ({ productType: item.productType, kg: item.quantity })),
          form_data: {
            ...data,
            sourceBatchCode: currentSource.batchCode,
            sourceProductType: currentSource.productType,
            sourceStorageLocation: currentSource.location,
            cleaningLoss,
            outputInventoryIds: outputs.map((item) => item.id),
          },
        }).then()
        logAction(user.name, user.role, "Cleaned Raw Material", data.outputBatchCode, `${source.batchCode}: ${formatQuantity(data.inputQuantity)} kg input → ${formatQuantity(data.cleanedSeedsQuantity)} kg Cleaned Seeds + ${formatQuantity(data.secondsQuantity)} kg Seconds + ${formatQuantity(cleaningLoss)} kg loss at ${data.cleaningLocation}`)
        showMessage("Raw-material cleaning record saved successfully!")
        onCommitted()
      },
    })
  }

  const handleInventorySave = (id: string, data: Partial<InventoryItem>) => {
    const item = inventory.find((i) => i.id === id)
    if (!isAdmin) {
      showMessage("Only admins can edit inventory records. Please ask an admin to make this change.")
      return
    }
    const roundedData: Partial<InventoryItem> = data.quantity === undefined
      ? data
      : { ...data, quantity: roundQuantity(data.quantity) }
    setInventory((prev) =>
      prev.map((i) => (i.id === id ? { ...i, ...roundedData, lastUpdated: new Date().toISOString() } : i))
    )
    supabase.from('inventory').update({ quantity: roundedData.quantity, location: roundedData.location, last_updated: new Date().toISOString() }).eq('id', id).then()
    logAction(user.name, user.role, "Updated Inventory", item?.batchCode || id, `Quantity: ${formatQuantity(roundedData.quantity ?? item?.quantity ?? 0)} kg, Location: ${roundedData.location ?? item?.location}`)
    showMessage("Record updated successfully!")
  }

  const handleDeleteRequest = (item: InventoryItem) => {
    if (!isAdmin) {
      showMessage("Only admins can delete inventory items. Please flag this item for an admin to review.")
      return
    }
    setItemToDelete(item)
    setDeleteOpen(true)
  }

  const confirmDelete = () => {
    if (itemToDelete) {
      // Soft delete — mark as deleted but keep the data
      setInventory((prev) =>
        prev.map((item) =>
          item.id === itemToDelete.id
            ? { ...item, deleted: true, deletedAt: new Date().toISOString(), deletedBy: user.name }
            : item
        )
      )
      const newRecord: TransactionRecord = {
        id: generateId("REC"),
        type: "Deletion",
        date: new Date().toISOString().split("T")[0],
        productType: itemToDelete.productType,
        batchCode: itemToDelete.batchCode,
        quantity: itemToDelete.quantity,
        status: "Completed",
      }
      setRecords((prev) => [...prev, newRecord])
      supabase.from('inventory').update({ deleted: true, deleted_at: new Date().toISOString(), deleted_by: user.name }).eq('id', itemToDelete.id).then()
      supabase.from('records').insert({ id: newRecord.id, type: newRecord.type, date: newRecord.date, product_type: newRecord.productType, batch_code: newRecord.batchCode, quantity: newRecord.quantity, status: newRecord.status }).then()
      logAction(user.name, user.role, "Deleted Inventory", itemToDelete.batchCode, `Soft-deleted ${itemToDelete.productType} — ${formatQuantity(itemToDelete.quantity)} kg from ${itemToDelete.location}`)
      showMessage(`Inventory item ${itemToDelete.batchCode} deleted successfully!`)
    }
    setDeleteOpen(false)
    setItemToDelete(null)
  }

  const handleRestore = (item: InventoryItem) => {
    setInventory((prev) =>
      prev.map((i) =>
        i.id === item.id
          ? { ...i, deleted: false, deletedAt: undefined, deletedBy: undefined, lastUpdated: new Date().toISOString() }
          : i
      )
    )
    supabase.from('inventory').update({ deleted: false, deleted_at: null, deleted_by: null, last_updated: new Date().toISOString() }).eq('id', item.id).then()
    logAction(user.name, user.role, "Restored Inventory", item.batchCode, `Restored ${item.productType} — ${formatQuantity(item.quantity)} kg`)
    showMessage(`Inventory item ${item.batchCode} restored!`)
  }

  const handleOpenProcessingForEdit = async (record: TransactionRecord) => {
    if (record.type !== "Processing") return
    // Try to find the processing_run by linked id, or fall back to batch_id
    const query = supabase.from('processing_runs').select('*')
    const { data } = record.processingRunId
      ? await query.eq('id', record.processingRunId).maybeSingle()
      : await query.eq('batch_id', record.batchCode).order('date', { ascending: false }).limit(1).maybeSingle()

    if (!data) {
      // No saved snapshot — synthesize a minimal one from the record so the form still opens
      const processType: "dehulling" | "pressing" =
        record.productType.toLowerCase().includes("press") ? "pressing" : "dehulling"
      const match = (record.processor || "").match(/^(.*?)\s*\((\d+)\s*staff\)\s*$/i)
      const staffNames = match ? match[1] : (record.processor || "")
      const staffCount = match ? match[2] : ""
      setEditingProcessingRun({
        id: record.processingRunId || record.id,
        date: record.date,
        batchId: record.batchCode,
        processType,
        staffCount,
        staffNames,
        notes: "",
        bulkProducts: [{ bag: "", productType: "", kg: String(record.quantity || ""), batchCode: "", notes: "" }],
        finishedProducts: [{ bin: "", hearts: "", hulls: "", lights: "", overs: "", oil: "", mealProtein: "", mealProteinKg: "" }],
        totalInputKg: record.quantity,
      })
      showMessage("No saved form snapshot for this older record — opened a partial form pre-filled from the record summary.")
    } else {
      const fd = (data as any).form_data || {}
      setEditingProcessingRun({
        id: (data as any).id,
        date: (data as any).date,
        batchId: (data as any).batch_id,
        processType: (data as any).process_type,
        staffCount: fd.staffCount || "",
        staffNames: fd.staffNames || "",
        notes: fd.notes || "",
        oilPressType: fd.oilPressType || "",
        bulkProducts: Array.isArray(fd.bulkProducts) && fd.bulkProducts.length
          ? normalizeBulkProductQuantities(fd.bulkProducts)
          : [{ bag: "", productType: "", kg: "", batchCode: "", notes: "" }],
        finishedProducts: Array.isArray(fd.finishedProducts) && fd.finishedProducts.length
          ? normalizeFinishedProductQuantities(fd.finishedProducts)
          : [{ bin: "", hearts: "", hulls: "", lights: "", overs: "", oil: "", mealProtein: "", mealProteinKg: "" }],
        totalInputKg: (data as any).total_input_kg ?? record.quantity,
      })
    }
    setActiveSection("processing")
  }

  const handleProcessingRunUpdate = (
    runId: string,
    formData: { date: string; batchId: string; staffCount: string; staffNames: string; notes: string; oilPressType?: string },
    processType: string,
    bulkProducts: BulkProduct[],
    finishedProducts: FinishedProduct[],
  ) => {
    const oldRun = editingProcessingRun
    if (!oldRun || oldRun.id !== runId) {
      showMessage("The original processing run is no longer loaded. Reopen the record and try again.")
      return
    }

    const totalKg = roundQuantity(bulkProducts.reduce((sum, p) => sum + (Number.parseFloat(p.kg) || 0), 0))
    const formSnapshot = {
      staffCount: formData.staffCount,
      staffNames: formData.staffNames,
      notes: formData.notes || "",
      oilPressType: formData.oilPressType || "",
      bulkProducts: normalizeBulkProductQuantities(bulkProducts),
      finishedProducts: normalizeFinishedProductQuantities(finishedProducts),
    }

    const inputProductTypes: Record<string, string> = {
      "whole-seeds": "Whole Seeds",
      "hulled-seeds": "Hulled Seeds",
      "hemp-hearts": "Hemp Hearts",
      lights: "Hemp Lights",
      overs: "Overs",
      seconds: "Seconds",
    }
    const getInputTotals = (products: BulkProduct[]) => {
      const totals = new Map<string, number>()
      products.forEach((product) => {
        const quantity = roundQuantity(Number.parseFloat(product.kg))
        const productType = inputProductTypes[product.productType] || product.productType
        if (!product.batchCode || !productType || !Number.isFinite(quantity) || quantity <= 0) return
        const key = `${productType}\u0000${product.batchCode}`
        totals.set(key, roundQuantity((totals.get(key) || 0) + quantity))
      })
      return totals
    }
    const getOutputTotals = (runProcessType: string, products: FinishedProduct[], sourceProducts: BulkProduct[]) => {
      const totals: Record<string, number> = {}
      const add = (productType: string, value: string | undefined) => {
        const quantity = roundQuantity(Number.parseFloat(value || ""))
        if (Number.isFinite(quantity) && quantity > 0) {
          totals[productType] = roundQuantity((totals[productType] || 0) + quantity)
        }
      }
      if (runProcessType === "dehulling") {
        products.forEach((product) => {
          add("Hemp Hearts", product.hearts)
          add("Hemp Hulls", product.hulls)
          add("Hemp Lights", product.lights)
          add("Overs", product.overs)
        })
      } else if (runProcessType === "pressing") {
        products.forEach((product) => {
          add("Hemp Oil (Raw)", product.oil)
          add(product.mealProtein === "protein" ? "Hemp Protein Cake" : "Hemp Meal Cake", product.mealProteinKg)
        })
      } else if (runProcessType === "combining") {
        const productType = sourceProducts[0]?.productType
        const quantity = roundQuantity(sourceProducts.reduce((sum, product) => sum + (Number.parseFloat(product.kg) || 0), 0))
        if (productType && quantity > 0) totals[productType] = quantity
      }
      return totals
    }

    // Reconcile only the change between the saved cumulative form and the edited
    // cumulative form. This lets an output such as Overs 1111 from day 1 become
    // an input to the same run on day 2 without recreating or double-counting it.
    const inventoryDeltas = new Map<string, number>()
    const addDelta = (productType: string, batchCode: string, quantity: number) => {
      if (!quantity) return
      const key = `${productType}\u0000${batchCode}`
      inventoryDeltas.set(key, (inventoryDeltas.get(key) || 0) + quantity)
    }
    getInputTotals(oldRun.bulkProducts).forEach((quantity, key) => {
      inventoryDeltas.set(key, (inventoryDeltas.get(key) || 0) + quantity)
    })
    getInputTotals(bulkProducts).forEach((quantity, key) => {
      inventoryDeltas.set(key, (inventoryDeltas.get(key) || 0) - quantity)
    })

    const oldOutputTotals = getOutputTotals(oldRun.processType, oldRun.finishedProducts, oldRun.bulkProducts)
    const newOutputTotals = getOutputTotals(processType, finishedProducts, bulkProducts)
    Object.entries(oldOutputTotals).forEach(([productType, quantity]) => addDelta(productType, oldRun.batchId, -quantity))
    Object.entries(newOutputTotals).forEach(([productType, quantity]) => addDelta(productType, formData.batchId, quantity))

    const now = new Date().toISOString()
    const inventoryUpdates = new Map<string, number>()
    const newInventoryItems: InventoryItem[] = []
    let inventoryError = ""
    inventoryDeltas.forEach((delta, key) => {
      if (Math.abs(delta) < 0.000001) return
      const [productType, batchCode] = key.split("\u0000")
      const matches = inventory.filter((candidate) =>
        !candidate.deleted &&
        candidate.productType === productType &&
        candidate.batchCode === batchCode &&
        candidate.location === "Factory"
      )
      if (matches.length > 1) {
        inventoryError = `${productType} batch ${batchCode} has duplicate inventory rows. Ask an admin to consolidate them before updating this run.`
        return
      }
      const item = matches[0]

      if (!item) {
        if (delta < 0) {
          inventoryError = `${productType} batch ${batchCode} is no longer available at Factory.`
          return
        }
        newInventoryItems.push({
          id: generateId("INV"),
          productType,
          batchCode,
          quantity: roundQuantity(delta),
          location: "Factory",
          lastUpdated: now,
        })
        return
      }

      const revisedQuantity = item.quantity + delta
      if (revisedQuantity < -0.000001) {
        inventoryError = `${productType} batch ${batchCode} only has ${formatQuantity(item.quantity)}kg available; this update needs ${formatQuantity(Math.abs(delta))}kg.`
        return
      }
      inventoryUpdates.set(item.id, roundQuantity(Math.max(0, revisedQuantity)))
    })

    if (inventoryError) {
      showMessage(inventoryError)
      return
    }

    inventoryUpdates.forEach((quantity, id) => {
      supabase.from('inventory').update({ quantity, last_updated: now }).eq('id', id).then()
    })
    newInventoryItems.forEach((item) => {
      supabase.from('inventory').insert({
        id: item.id, product_type: item.productType, batch_code: item.batchCode,
        quantity: item.quantity, location: item.location, last_updated: item.lastUpdated,
      }).then()
    })
    setInventory((prev) => [
      ...prev.map((item) => inventoryUpdates.has(item.id)
        ? { ...item, quantity: inventoryUpdates.get(item.id)!, lastUpdated: now }
        : item),
      ...newInventoryItems,
    ])

    supabase.from('processing_runs').update({
      date: formData.date,
      batch_id: formData.batchId,
      process_type: processType,
      total_input_kg: totalKg,
      outputs: Object.entries(newOutputTotals).map(([productType, kg]) => ({ productType, kg })),
      form_data: formSnapshot,
    }).eq('id', runId).then()

    // Update the linked records row to keep summary in sync
    const linkedRecord = records.find((r) => r.processingRunId === runId)
    if (linkedRecord) {
      const updatedRecord: TransactionRecord = {
        ...linkedRecord,
        date: formData.date,
        batchCode: formData.batchId,
        quantity: totalKg,
        productType: processType === "combining" ? "Batch Combination" : `${processType.charAt(0).toUpperCase() + processType.slice(1)} Processing`,
        processor: processType === "combining" ? user.name : `${formData.staffNames} (${formData.staffCount} staff)`,
      }
      setRecords((prev) => prev.map((r) => (r.id === updatedRecord.id ? updatedRecord : r)))
      supabase.from('records').update({
        date: updatedRecord.date,
        batch_code: updatedRecord.batchCode,
        quantity: updatedRecord.quantity,
        product_type: updatedRecord.productType,
        processor: updatedRecord.processor,
      }).eq('id', updatedRecord.id).then()
    }

    logAction(user.name, user.role, "Edited Processing", formData.batchId, `Updated ${processType} run — ${formatQuantity(totalKg)} kg total, ${bulkProducts.length} bulk lines, ${finishedProducts.length} finished lines`)
    showMessage(processType === "combining" ? "Batch combination updated!" : `${processType.charAt(0).toUpperCase() + processType.slice(1)} record updated!`)
    setEditingProcessingRun(null)
    setActiveSection("records")
  }

  const handleRecordDelete = (record: TransactionRecord) => {
    if (!isAdmin) {
      showMessage("Only admins can delete records.")
      return
    }
    setConfirmAction({
      title: `Delete ${record.type} Record?`,
      description: `This will soft-delete the ${record.type} record for batch ${record.batchCode} (${record.productType}, ${formatQuantity(record.quantity)} kg). It can be restored later by an admin. Inventory and ledger quantities are NOT retroactively adjusted.`,
      onConfirm: () => {
        const now = new Date().toISOString()
        setRecords((prev) =>
          prev.map((r) => (r.id === record.id ? { ...r, deleted: true, deletedAt: now, deletedBy: user.name } : r))
        )
        supabase.from('records').update({ deleted: true, deleted_at: now, deleted_by: user.name }).eq('id', record.id).then()
        logAction(user.name, user.role, "Deleted Record", record.batchCode, `Soft-deleted ${record.type} record: ${record.productType} — ${formatQuantity(record.quantity)} kg`)
        showMessage(`${record.type} record for ${record.batchCode} deleted.`)
      },
    })
  }

  const handleRecordRestore = (record: TransactionRecord) => {
    if (!isAdmin) return
    setRecords((prev) =>
      prev.map((r) => (r.id === record.id ? { ...r, deleted: false, deletedAt: undefined, deletedBy: undefined } : r))
    )
    supabase.from('records').update({ deleted: false, deleted_at: null, deleted_by: null }).eq('id', record.id).then()
    logAction(user.name, user.role, "Restored Record", record.batchCode, `Restored ${record.type} record: ${record.productType} — ${formatQuantity(record.quantity)} kg`)
    showMessage(`${record.type} record for ${record.batchCode} restored.`)
  }

  const handleOrdersChange = (newOrders: Order[]) => {
    setOrders(newOrders)
    newOrders.forEach((order) => {
      supabase.from('orders').upsert({
        id: order.id,
        order_number: order.orderNumber,
        customer: order.customer,
        customer_address: order.customerAddress || "",
        details: order.details,
        items: order.items || [],
        date_received: order.dateReceived,
        due_date: order.dueDate,
        freight: order.freight || null,
        freight_carrier: order.freightCarrier || null,
        notes: order.notes || null,
        status: order.status,
        created_by: order.createdBy,
        last_updated_by: order.lastUpdatedBy,
        last_updated: order.lastUpdated,
        deleted: order.deleted || false,
      }).then()
    })
  }

  const renderContent = () => {
    switch (activeSection) {
      case "receival":
        return <ReceivalForm inventory={activeInventory} onSubmit={handleReceivalSubmit} onError={showMessage} />
      case "processing":
        return (
          <ProcessingForms
            inventory={activeInventory}
            onSubmit={handleProcessingSubmit}
            onError={showMessage}
            onAdditionalSubmit={() => {
              logAction(user.name, user.role, "Created Processing", "Additional", "Additional processing record submitted")
              showMessage("Additional processing record saved!")
            }}
            onRawMaterialAdd={handleRawMaterialAdd}
            onRawMaterialCleaning={handleRawMaterialCleaning}
            editRun={editingProcessingRun}
            onUpdate={handleProcessingRunUpdate}
            onCancelEdit={() => { setEditingProcessingRun(null); setActiveSection("records") }}
          />
        )
      case "outgoing":
        return <OutgoingForm
          inventory={activeInventory}
          orders={orders}
          prefill={outgoingPrefill}
          onSubmit={(products, customerName, customerAddress, freight, dispatchDate, fromOrderId) => {
            // Deduct the exact product + batch row. Multiple finished products can
            // share a processing batch code, so batch code alone is not unique.
            const outgoingTotals = new Map<string, { productType: string; batchCode: string; quantity: number }>()
            products.forEach((p) => {
              const key = `${p.productType}\u0000${p.batchCode}`
              const existing = outgoingTotals.get(key)
              outgoingTotals.set(key, {
                productType: p.productType,
                batchCode: p.batchCode,
                quantity: roundQuantity((existing?.quantity || 0) + p.weight),
              })
            })
            const now = new Date().toISOString()
            const outgoingUpdates = new Map<string, number>()
            for (const outgoing of outgoingTotals.values()) {
              const matches = inventory.filter((candidate) =>
                !candidate.deleted &&
                candidate.productType === outgoing.productType &&
                candidate.batchCode === outgoing.batchCode &&
                candidate.location === "Factory"
              )
              if (matches.length > 1) {
                showMessage(`${outgoing.productType} batch ${outgoing.batchCode} has duplicate inventory rows. Ask an admin to consolidate them before dispatch.`)
                return
              }
              const item = matches[0]
              if (!item || item.quantity < outgoing.quantity) {
                showMessage(`${outgoing.productType} batch ${outgoing.batchCode} does not have enough stock for this dispatch.`)
                return
              }
              outgoingUpdates.set(item.id, roundQuantity(item.quantity - outgoing.quantity))
            }
            outgoingUpdates.forEach((quantity, id) => {
              supabase.from('inventory').update({ quantity, last_updated: now }).eq('id', id).then()
            })
            setInventory((prev) => prev.map((item) =>
              outgoingUpdates.has(item.id)
                ? { ...item, quantity: outgoingUpdates.get(item.id)!, lastUpdated: now }
                : item
            ))
            // Create transaction records
            products.forEach((p) => {
              const newRecord: TransactionRecord = {
                id: generateId("REC"),
                type: "Outgoing",
                date: dispatchDate,
                productType: p.productType,
                batchCode: p.batchCode,
                quantity: p.weight,
                customer: customerName,
                status: "Completed",
              }
              setRecords((prev) => [...prev, newRecord])
              supabase.from('records').insert({
                id: newRecord.id, type: newRecord.type, date: newRecord.date,
                product_type: newRecord.productType, batch_code: newRecord.batchCode,
                quantity: newRecord.quantity, customer: newRecord.customer,
                status: newRecord.status,
              }).then()
            })
            // Mark fulfilled items on the linked order (from prefill or dropdown)
            const linkedOrderId = outgoingPrefill?.orderId || fromOrderId
            const linkedOrder = linkedOrderId ? orders.find((order) => order.id === linkedOrderId) : undefined
            if (linkedOrderId) {
              const fulfilledTypes = new Set(products.map((p) => p.productType))
              const updateOrder = (o: Order): Order => {
                if (o.id !== linkedOrderId) return o
                const updatedItems = (o.items || []).map((item) =>
                  fulfilledTypes.has(item.productType) ? { ...item, fulfilled: true, batchCode: products.find((p) => p.productType === item.productType)?.batchCode } : item
                )
                const allFulfilled = updatedItems.length > 0 && updatedItems.every((i) => i.fulfilled)
                return { ...o, items: updatedItems, status: allFulfilled ? "Dispatched" as const : o.status, lastUpdated: new Date().toISOString() }
              }
              setOrders((prev) => prev.map(updateOrder))
              handleOrdersChange(orders.map(updateOrder))
              setOutgoingPrefill(null)
            }
            const totalKg = roundQuantity(products.reduce((s, p) => s + p.weight, 0))
            logAction(user.name, user.role, "Created Outgoing", "Dispatch", `${formatQuantity(totalKg)} kg to ${customerName} via ${freight || "N/A"}: ${products.map(p => `${p.productType} ${p.batchCode} ${formatQuantity(p.weight)}kg`).join(", ")}`)
            const packingSlipOpened = openPackingSlip({
              number: `PS-${dispatchDate.replaceAll("-", "")}-${Date.now().toString().slice(-6)}`,
              date: dispatchDate,
              orderNumber: linkedOrder?.orderNumber,
              customer: customerName,
              address: customerAddress,
              products,
            })
            showMessage(packingSlipOpened
              ? "Outgoing record saved and inventory updated. The packing slip is ready to print in the new window."
              : "Outgoing record saved and inventory updated, but the packing slip window was blocked. Do not submit the dispatch again; allow pop-ups before the next dispatch."
            )
          }}
          onError={showMessage}
        />
      case "orders":
        return (
          <OrderManagement
            orders={orders}
            onOrdersChange={handleOrdersChange}
            isAdmin={isAdmin}
            userName={user.name}
            onAuditLog={(action, target, details) => logAction(user.name, user.role, action, target, details)}
            onMessage={showMessage}
            onReadyToShipForOutgoing={(order) => {
              // The order was just moved to "Ready to Ship". If the user navigates away from
              // Outgoing without submitting a dispatch record we'll revert it back to
              // "In Progress" (handled by the useEffect below).
              setOutgoingPrefill({
                orderId: order.id,
                items: (order.items || []).filter((i) => !i.fulfilled),
                customer: order.customer,
                customerAddress: order.customerAddress || "",
                freight: order.freight,
                freightCarrier: order.freightCarrier,
                previousStatus: "In Progress",
              })
              setActiveSection("outgoing")
            }}
          />
        )
      case "inventory":
        return (
          <InventoryTable
            inventory={activeInventory}
            onSave={handleInventorySave}
            onDelete={handleDeleteRequest}
            isAdmin={isAdmin}
            deletedItems={isAdmin ? inventory.filter((i) => i.deleted) : []}
            onRestore={handleRestore}
          />
        )
      case "records":
        return <RecordsTable
          records={records}
          isAdmin={isAdmin}
          onOpenProcessingForm={handleOpenProcessingForEdit}
          onRecordDelete={handleRecordDelete}
          onRecordRestore={handleRecordRestore}
          onRecordUpdate={(updated) => {
            const roundedUpdated = { ...updated, quantity: roundQuantity(updated.quantity) }
            setRecords((prev) => prev.map((r) => r.id === roundedUpdated.id ? roundedUpdated : r))
            supabase.from('records').update({
              date: roundedUpdated.date,
              product_type: roundedUpdated.productType,
              batch_code: roundedUpdated.batchCode,
              quantity: roundedUpdated.quantity,
              supplier: roundedUpdated.supplier || null,
              processor: roundedUpdated.processor || null,
              customer: roundedUpdated.customer || null,
              status: roundedUpdated.status,
            }).eq('id', roundedUpdated.id).then()
            logAction(user.name, user.role, "Edited Record", roundedUpdated.batchCode, `Modified ${roundedUpdated.type} record: ${roundedUpdated.productType} — ${formatQuantity(roundedUpdated.quantity)} kg`)
            showMessage(`Record ${roundedUpdated.batchCode} updated!`)
          }}
        />
      case "analytics":
        return <ProcessingAnalytics />
      case "audit":
        return isAdmin ? <AuditLogView /> : null
      default:
        return <Dashboard inventory={activeInventory} orders={orders} onNavigate={setActiveSection} />
    }
  }

  return (
    <div className="flex h-screen bg-muted/30">
      <Sidebar activeSection={activeSection} onNavigate={setActiveSection} isOpen={sidebarOpen} isAdmin={isAdmin} />

      <main className="flex-1 overflow-auto">
        <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b px-6 py-3 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <Menu className="h-5 w-5" />
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <h1 className="font-semibold text-lg">Hemp Harvests Traceability System</h1>
          <div className="ml-auto flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium leading-tight">{user.name}</p>
              <Badge variant={isAdmin ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
                {user.role}
              </Badge>
            </div>
            <Button variant="ghost" size="icon" onClick={logout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>
        <div className="p-6 max-w-7xl mx-auto">{renderContent()}</div>
      </main>

      <Dialog open={messageOpen} onOpenChange={setMessageOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>System Message</DialogTitle>
            <DialogDescription>{message}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setMessageOpen(false)}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the inventory item &quot;{itemToDelete?.batchCode}&quot; (
              {itemToDelete?.productType}) with {formatQuantity(itemToDelete?.quantity ?? 0)}kg from {itemToDelete?.location}.
              The record will be kept and can be restored later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation dialog for critical actions */}
      <AlertDialog open={!!confirmAction} onOpenChange={(open) => { if (!open) setConfirmAction(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmAction?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmAction?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { confirmAction?.onConfirm(); setConfirmAction(null) }}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AssistantChat inventory={activeInventory} records={records} />
    </div>
  )
}
