"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Plus, Eye, Edit, Search, Printer, Download, Trash2 } from "lucide-react"
import { AutocompleteInput } from "@/components/ui/autocomplete-input"
import { cn, generateId } from "@/lib/utils"
import { getCustomers, saveCustomer, getFreightCompanies, saveFreightCompany } from "@/lib/remembered-entries"
import { HEMP_PRODUCTS, FINISHED_GOODS, PRODUCT_UNIT_WEIGHTS } from "@/lib/constants"
import type { Order, OrderStatus, FreightMethod, OrderItem } from "@/lib/types"

const ALL_PRODUCT_OPTIONS = [...HEMP_PRODUCTS, ...FINISHED_GOODS]

const FREIGHT_METHODS: FreightMethod[] = ["Courier", "Auspost", "Bulk"]

function formatItemDisplay(item: { productType: string; quantity: number; units?: number }): string {
  if (item.units && PRODUCT_UNIT_WEIGHTS[item.productType]) {
    return `${item.units}x ${item.productType} (${item.quantity} kg)`
  }
  return `${item.productType} — ${item.quantity} kg`
}

function formatItemSummary(item: { productType: string; quantity: number; units?: number }): string {
  if (item.units && PRODUCT_UNIT_WEIGHTS[item.productType]) {
    return `${item.units}x ${item.productType} (${item.quantity}kg)`
  }
  return `${item.productType} ${item.quantity}kg`
}

const ORDER_STATUSES: OrderStatus[] = ["New", "In Progress", "Packed", "Dispatched", "Completed"]

const statusVariant = (status: OrderStatus): "default" | "secondary" | "warning" | "success" | "destructive" => {
  switch (status) {
    case "New": return "secondary"
    case "In Progress": return "warning"
    case "Packed": return "default"
    case "Dispatched": return "success"
    case "Completed": return "success"
    default: return "secondary"
  }
}

interface OrderManagementProps {
  orders: Order[]
  onOrdersChange: (orders: Order[]) => void
  isAdmin: boolean
  userName: string
  onAuditLog: (action: string, target: string, details: string) => void
  onMessage: (msg: string) => void
  onPackedForOutgoing: (order: Order) => void
}

export function OrderManagement({ orders, onOrdersChange, isAdmin, userName, onAuditLog, onMessage, onPackedForOutgoing }: OrderManagementProps) {
  const [filter, setFilter] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<string>("open")
  const [viewOrder, setViewOrder] = React.useState<Order | null>(null)
  const [editOrder, setEditOrder] = React.useState<Order | null>(null)
  const [showNewForm, setShowNewForm] = React.useState(false)

  const customerNames = React.useMemo(() => {
    const names = new Set(orders.filter((o) => !o.deleted).map((o) => o.customer))
    return [...names]
  }, [orders])

  const activeOrders = orders.filter((o) => !o.deleted)
  const filtered = activeOrders.filter((order) => {
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(filter.toLowerCase()) ||
      order.customer.toLowerCase().includes(filter.toLowerCase()) ||
      order.details.toLowerCase().includes(filter.toLowerCase())
    const matchesStatus = statusFilter === "all" || (statusFilter === "open" ? order.status !== "Completed" : order.status === statusFilter)
    return matchesSearch && matchesStatus
  })

  const openCount = activeOrders.filter((o) => o.status !== "Completed" && o.status !== "Dispatched").length
  const sorted = [...filtered].sort((a, b) => {
    const statusOrder = { "New": 0, "In Progress": 1, "Packed": 2, "Dispatched": 3, "Completed": 4 }
    return statusOrder[a.status] - statusOrder[b.status] || a.dueDate.localeCompare(b.dueDate)
  })

  const handleStatusUpdate = (order: Order, newStatus: OrderStatus) => {
    const updatedOrder = { ...order, status: newStatus, lastUpdatedBy: userName, lastUpdated: new Date().toISOString() }
    onOrdersChange(orders.map((o) =>
      o.id === order.id ? updatedOrder : o
    ))
    onAuditLog("Updated Order Status", order.orderNumber, `${order.status} → ${newStatus} for ${order.customer}`)
    onMessage(`Order ${order.orderNumber} updated to ${newStatus}`)
    if (newStatus === "Packed") {
      onPackedForOutgoing(updatedOrder)
    }
  }

  const handleCreateOrder = (data: { orderNumber: string; customer: string; customerAddress: string; details: string; dateReceived: string; dueDate: string; freight: FreightMethod | ""; freightCarrier: string; notes: string; items: { productType: string; quantity: number; units?: number }[] }) => {
    const newOrder: Order = {
      id: generateId("ORD"),
      orderNumber: data.orderNumber,
      customer: data.customer,
      customerAddress: data.customerAddress,
      details: data.details,
      items: data.items.map(i => ({ productType: i.productType, quantity: i.quantity, units: i.units })),
      dateReceived: data.dateReceived,
      dueDate: data.dueDate,
      freight: data.freight as FreightMethod || undefined,
      freightCarrier: data.freightCarrier || undefined,
      notes: data.notes || undefined,
      status: "New",
      createdBy: userName,
      lastUpdatedBy: userName,
      lastUpdated: new Date().toISOString(),
    }
    if (data.customer.trim()) saveCustomer(data.customer, data.customerAddress)
    if (data.freight === "Bulk" && data.freightCarrier.trim()) saveFreightCompany(data.freightCarrier)
    onOrdersChange([...orders, newOrder])
    const freightLabel = data.freight ? `${data.freight}${data.freightCarrier ? ` (${data.freightCarrier})` : ""}` : "N/A"
    onAuditLog("Created Order", data.orderNumber, `${data.customer} — ${data.details}, due ${data.dueDate}, freight: ${freightLabel}`)
    onMessage(`Order ${data.orderNumber} created!`)
    setShowNewForm(false)

    // Send email notification (fire-and-forget)
    fetch("/api/notify-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderNumber: data.orderNumber,
        customer: data.customer,
        details: data.details,
        dueDate: data.dueDate,
      }),
    }).catch(() => {})
  }

  const handleEditSave = () => {
    if (!editOrder) return
    onOrdersChange(orders.map((o) =>
      o.id === editOrder.id
        ? { ...editOrder, lastUpdatedBy: userName, lastUpdated: new Date().toISOString() }
        : o
    ))
    onAuditLog("Edited Order", editOrder.orderNumber, `Updated details for ${editOrder.customer}`)
    onMessage(`Order ${editOrder.orderNumber} updated!`)
    setEditOrder(null)
  }

  const handleDelete = (order: Order) => {
    onOrdersChange(orders.map((o) => (o.id === order.id ? { ...o, deleted: true } : o)))
    onAuditLog("Deleted Order", order.orderNumber, `Soft-deleted order for ${order.customer}`)
    onMessage(`Order ${order.orderNumber} deleted`)
  }

  const handlePrint = (order: Order) => {
    const isOverdue = order.dueDate < new Date().toISOString().split("T")[0] && !["Dispatched", "Completed"].includes(order.status)
    const win = window.open("", "_blank")
    if (!win) return
    win.document.write(`<!DOCTYPE html><html><head><title>Order ${order.orderNumber}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        @page { size: A4; margin: 20mm; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; padding: 40px; color: #1a1a1a; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 16px; border-bottom: 3px solid #16a34a; }
        .logo { font-size: 22px; font-weight: 700; color: #16a34a; }
        .logo span { color: #555; font-weight: 400; font-size: 14px; display: block; }
        .status { padding: 4px 12px; border-radius: 6px; font-size: 13px; font-weight: 600; background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
        .status.overdue { background: #fef2f2; color: #dc2626; border-color: #fecaca; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 28px; }
        .field label { display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #888; margin-bottom: 4px; font-weight: 600; }
        .field p { font-size: 15px; font-weight: 500; }
        .details-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 28px; min-height: 80px; }
        .details-box label { display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #888; margin-bottom: 8px; font-weight: 600; }
        .details-box p { font-size: 14px; line-height: 1.6; }
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 28px; }
        .items-table th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #888; font-weight: 600; padding: 8px 12px; border-bottom: 2px solid #e5e7eb; }
        .items-table td { font-size: 14px; padding: 8px 12px; border-bottom: 1px solid #e5e7eb; }
        .items-table .status-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
        .items-table .status-pending { background: #f3f4f6; color: #6b7280; }
        .items-table .status-fulfilled { background: #f0fdf4; color: #16a34a; }
        .notes-section { margin-top: 40px; }
        .notes-section h3 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: #888; margin-bottom: 12px; font-weight: 600; }
        .notes-lines { border-top: 1px solid #e5e7eb; }
        .notes-lines .line { border-bottom: 1px solid #e5e7eb; height: 36px; }
        .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; font-size: 11px; color: #aaa; }
        @media print { body { padding: 0; } }
      </style></head><body>
      <div class="header">
        <div class="logo">Hemp Harvests<span>Order Sheet</span></div>
        <div class="status${isOverdue ? " overdue" : ""}">${order.status}${isOverdue ? " — OVERDUE" : ""}</div>
      </div>
      <div class="grid">
        <div class="field"><label>Order Number</label><p>${order.orderNumber}</p></div>
        <div class="field"><label>Customer</label><p>${order.customer}</p></div>
        <div class="field"><label>Date Received</label><p>${order.dateReceived}</p></div>
        <div class="field"><label>Due Date</label><p style="${isOverdue ? "color:#dc2626;font-weight:700" : ""}">${order.dueDate}</p></div>
        <div class="field"><label>Freight</label><p>${order.freight || "—"}${order.freight === "Bulk" && order.freightCarrier ? ` — ${order.freightCarrier}` : ""}</p></div>
        <div class="field"><label>Last Updated</label><p>${order.lastUpdatedBy} — ${new Date(order.lastUpdated).toLocaleDateString()}</p></div>
      </div>
      ${order.customerAddress ? `<div class="details-box"><label>Customer Address</label><p>${order.customerAddress}</p></div>` : ""}
      ${order.notes ? `<div class="details-box" style="border-left:3px solid #f59e0b"><label>Notes for Team</label><p>${order.notes}</p></div>` : ""}
      ${order.items && order.items.length > 0
        ? `<table class="items-table"><thead><tr><th>Product</th><th>Qty</th><th>Status</th></tr></thead><tbody>${order.items.map(item =>
            `<tr><td>${item.productType}</td><td>${item.units ? `${item.units} units (${item.quantity} kg)` : `${item.quantity} kg`}</td><td><span class="status-badge ${item.fulfilled ? "status-fulfilled" : "status-pending"}">${item.fulfilled ? "Fulfilled" : "Pending"}</span></td></tr>`
          ).join("")}</tbody></table>`
        : `<div class="details-box"><label>Order Details</label><p>${order.details || "—"}</p></div>`
      }
      <div class="notes-section">
        <h3>Packing Notes / Traceability</h3>
        <div class="notes-lines">${Array(8).fill('<div class="line"></div>').join("")}</div>
      </div>
      <div class="footer"><span>Printed ${new Date().toLocaleString()}</span><span>Hemp Harvests Traceability System</span></div>
      </body></html>`)
    win.document.close()
    win.print()
  }

  const handleExportPdf = (mode: "open" | "all") => {
    const today = new Date().toISOString().split("T")[0]
    const exportOrders = mode === "open"
      ? activeOrders.filter((o) => o.status !== "Completed")
      : activeOrders
    const sortedExport = [...exportOrders].sort((a, b) => {
      const statusOrder = { "New": 0, "In Progress": 1, "Packed": 2, "Dispatched": 3, "Completed": 4 }
      return statusOrder[a.status] - statusOrder[b.status] || a.dueDate.localeCompare(b.dueDate)
    })
    if (sortedExport.length === 0) { onMessage("No orders to export"); return }
    const win = window.open("", "_blank")
    if (!win) return
    const orderPages = sortedExport.map((order) => {
      const isOverdue = order.dueDate < today && !["Dispatched", "Completed"].includes(order.status)
      return `<div class="page">
        <div class="header">
          <div class="logo">Hemp Harvests<span>Order Sheet</span></div>
          <div class="status${isOverdue ? " overdue" : ""}">${order.status}${isOverdue ? " — OVERDUE" : ""}</div>
        </div>
        <div class="grid">
          <div class="field"><label>Order Number</label><p>${order.orderNumber}</p></div>
          <div class="field"><label>Customer</label><p>${order.customer}</p></div>
          <div class="field"><label>Date Received</label><p>${order.dateReceived}</p></div>
          <div class="field"><label>Due Date</label><p style="${isOverdue ? "color:#dc2626;font-weight:700" : ""}">${order.dueDate}</p></div>
          <div class="field"><label>Freight</label><p>${order.freight || "—"}${order.freight === "Bulk" && order.freightCarrier ? ` — ${order.freightCarrier}` : ""}</p></div>
          <div class="field"><label>Last Updated</label><p>${order.lastUpdatedBy} — ${new Date(order.lastUpdated).toLocaleDateString()}</p></div>
        </div>
        ${order.customerAddress ? `<div class="details-box"><label>Customer Address</label><p>${order.customerAddress}</p></div>` : ""}
        ${order.notes ? `<div class="details-box" style="border-left:3px solid #f59e0b"><label>Notes for Team</label><p>${order.notes}</p></div>` : ""}
        ${order.items && order.items.length > 0
          ? `<table class="items-table"><thead><tr><th>Product</th><th>Qty</th><th>Status</th></tr></thead><tbody>${order.items.map(item =>
              `<tr><td>${item.productType}</td><td>${item.units ? `${item.units} units (${item.quantity} kg)` : `${item.quantity} kg`}</td><td><span class="status-badge ${item.fulfilled ? "status-fulfilled" : "status-pending"}">${item.fulfilled ? "Fulfilled" : "Pending"}</span></td></tr>`
            ).join("")}</tbody></table>`
          : `<div class="details-box"><label>Order Details</label><p>${order.details || "—"}</p></div>`
        }
        <div class="notes-section">
          <h3>Packing Notes / Traceability</h3>
          <div class="notes-lines">${Array(8).fill('<div class="line"></div>').join("")}</div>
        </div>
        <div class="footer"><span>Printed ${new Date().toLocaleString()}</span><span>Hemp Harvests Traceability System</span></div>
      </div>`
    }).join("")
    win.document.write(`<!DOCTYPE html><html><head><title>${mode === "open" ? "Open" : "All"} Orders — Hemp Harvests</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        @page { size: A4; margin: 20mm; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #1a1a1a; }
        .page { padding: 40px; page-break-after: always; }
        .page:last-child { page-break-after: auto; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 16px; border-bottom: 3px solid #16a34a; }
        .logo { font-size: 22px; font-weight: 700; color: #16a34a; }
        .logo span { color: #555; font-weight: 400; font-size: 14px; display: block; }
        .status { padding: 4px 12px; border-radius: 6px; font-size: 13px; font-weight: 600; background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
        .status.overdue { background: #fef2f2; color: #dc2626; border-color: #fecaca; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 28px; }
        .field label { display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #888; margin-bottom: 4px; font-weight: 600; }
        .field p { font-size: 15px; font-weight: 500; }
        .details-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 28px; min-height: 80px; }
        .details-box label { display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #888; margin-bottom: 8px; font-weight: 600; }
        .details-box p { font-size: 14px; line-height: 1.6; }
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 28px; }
        .items-table th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #888; font-weight: 600; padding: 8px 12px; border-bottom: 2px solid #e5e7eb; }
        .items-table td { font-size: 14px; padding: 8px 12px; border-bottom: 1px solid #e5e7eb; }
        .items-table .status-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
        .items-table .status-pending { background: #f3f4f6; color: #6b7280; }
        .items-table .status-fulfilled { background: #f0fdf4; color: #16a34a; }
        .notes-section { margin-top: 40px; }
        .notes-section h3 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: #888; margin-bottom: 12px; font-weight: 600; }
        .notes-lines { border-top: 1px solid #e5e7eb; }
        .notes-lines .line { border-bottom: 1px solid #e5e7eb; height: 36px; }
        .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; font-size: 11px; color: #aaa; }
        @media print { .page { padding: 0; } }
      </style></head><body>${orderPages}</body></html>`)
    win.document.close()
    win.print()
  }

  // Determine which statuses an operator can move to
  const getNextStatuses = (current: OrderStatus): OrderStatus[] => {
    if (isAdmin) return ORDER_STATUSES
    switch (current) {
      case "New": return ["In Progress"]
      case "In Progress": return ["Packed"]
      case "Packed": return ["Dispatched"]
      default: return []
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Order Management</h2>
          <p className="text-muted-foreground">{openCount} open order{openCount !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExportPdf("open")}>
            <Download className="h-4 w-4 mr-1" />Open Orders
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExportPdf("all")}>
            <Download className="h-4 w-4 mr-1" />All Orders
          </Button>
          {isAdmin && (
            <Button onClick={() => setShowNewForm(true)}>
              <Plus className="h-4 w-4 mr-1" />New Order
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search orders..." value={filter} onChange={(e) => setFilter(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Open Orders</SelectItem>
            <SelectItem value="all">All Statuses</SelectItem>
            {ORDER_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Received</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((order) => {
                const isOverdue = order.dueDate < new Date().toISOString().split("T")[0] && !["Dispatched", "Completed"].includes(order.status)
                const nextStatuses = getNextStatuses(order.status)

                return (
                  <TableRow key={order.id} className={cn(isOverdue && "bg-destructive/5")}>
                    <TableCell className="font-mono text-sm font-medium">{order.orderNumber}</TableCell>
                    <TableCell className="font-medium">{order.customer}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">{order.details}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{order.dateReceived}</TableCell>
                    <TableCell className={cn("whitespace-nowrap text-sm", isOverdue && "text-destructive font-medium")}>
                      {order.dueDate}
                      {isOverdue && <span className="ml-1 text-[10px]">OVERDUE</span>}
                    </TableCell>
                    <TableCell>
                      {nextStatuses.length > 0 ? (
                        <Select value={order.status} onValueChange={(v) => handleStatusUpdate(order, v as OrderStatus)}>
                          <SelectTrigger className="h-7 w-32 text-xs">
                            <Badge variant={statusVariant(order.status)} className="text-[10px]">{order.status}</Badge>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={order.status}>{order.status}</SelectItem>
                            {nextStatuses.filter((s) => s !== order.status).map((s) => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant={statusVariant(order.status)}>{order.status}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setViewOrder(order)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handlePrint(order)} title="Print order sheet">
                          <Printer className="h-4 w-4" />
                        </Button>
                        {isAdmin && (
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditOrder(order)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
              {sorted.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No orders found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View dialog */}
      <Dialog open={!!viewOrder} onOpenChange={() => setViewOrder(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Order {viewOrder?.orderNumber}
              {viewOrder && <Badge variant={statusVariant(viewOrder.status)}>{viewOrder.status}</Badge>}
            </DialogTitle>
            <DialogDescription>{viewOrder?.customer}</DialogDescription>
          </DialogHeader>
          {viewOrder && (
            <div className="space-y-4">
              {viewOrder.customerAddress && (
                <div>
                  <p className="text-sm font-medium mb-1">Customer Address</p>
                  <p className="text-sm text-muted-foreground">{viewOrder.customerAddress}</p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium mb-1">Order Details</p>
                {viewOrder.items && viewOrder.items.length > 0 ? (
                  <div className="space-y-1.5">
                    {viewOrder.items.map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-sm bg-muted/50 rounded px-3 py-1.5">
                        <span>{formatItemDisplay(item)}</span>
                        <Badge variant={item.fulfilled ? "success" : "secondary"} className="text-[10px]">
                          {item.fulfilled ? "Fulfilled" : "Pending"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{viewOrder.details}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium mb-1">Date Received</p>
                  <p className="text-sm text-muted-foreground">{viewOrder.dateReceived}</p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Due Date</p>
                  <p className="text-sm text-muted-foreground">{viewOrder.dueDate}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium mb-1">Freight</p>
                  <p className="text-sm text-muted-foreground">
                    {viewOrder.freight || "—"}{viewOrder.freight === "Bulk" && viewOrder.freightCarrier ? ` — ${viewOrder.freightCarrier}` : ""}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Created By</p>
                  <p className="text-sm text-muted-foreground">{viewOrder.createdBy}</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Last Updated By</p>
                <p className="text-sm text-muted-foreground">{viewOrder.lastUpdatedBy} — {new Date(viewOrder.lastUpdated).toLocaleString()}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewOrder(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog — admin only */}
      <Dialog open={!!editOrder} onOpenChange={() => setEditOrder(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Order — {editOrder?.orderNumber}</DialogTitle>
            <DialogDescription>Modify order details</DialogDescription>
          </DialogHeader>
          {editOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Order Number</Label>
                  <Input value={editOrder.orderNumber} onChange={(e) => setEditOrder({ ...editOrder, orderNumber: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Customer</Label>
                  <AutocompleteInput value={editOrder.customer} onChange={(v) => setEditOrder({ ...editOrder, customer: v })} suggestions={customerNames} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Customer Address</Label>
                <Textarea value={editOrder.customerAddress || ""} onChange={(e) => setEditOrder({ ...editOrder, customerAddress: e.target.value })} rows={2} />
              </div>
              <div className="space-y-2">
                <Label>Product Lines</Label>
                {(editOrder.items || []).map((item, idx) => {
                  const unitWeight = PRODUCT_UNIT_WEIGHTS[item.productType]
                  const isUnitBased = !!unitWeight
                  return (
                    <div key={idx}>
                      <div className="flex items-center gap-2">
                        <Select value={item.productType} onValueChange={(v) => {
                          const items = [...(editOrder.items || [])]
                          const newUnitWeight = PRODUCT_UNIT_WEIGHTS[v]
                          items[idx] = { productType: v, quantity: 0, units: newUnitWeight ? 0 : undefined }
                          const details = items.filter(i => i.productType).map(i => formatItemSummary(i)).join(", ")
                          setEditOrder({ ...editOrder, items, details })
                        }}>
                          <SelectTrigger className="flex-1"><SelectValue placeholder="Product type" /></SelectTrigger>
                          <SelectContent>
                            {ALL_PRODUCT_OPTIONS.map((p) => (
                              <SelectItem key={p} value={p}>{p}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input type="number" min={0} placeholder={isUnitBased ? "Units" : "kg"} className="w-24" value={isUnitBased ? (item.units || "") : (item.quantity || "")} onChange={(e) => {
                          const items = [...(editOrder.items || [])]
                          if (isUnitBased) {
                            const units = parseInt(e.target.value) || 0
                            items[idx] = { ...items[idx], units, quantity: units * unitWeight }
                          } else {
                            items[idx] = { ...items[idx], quantity: Number(e.target.value), units: undefined }
                          }
                          const details = items.filter(i => i.productType).map(i => formatItemSummary(i)).join(", ")
                          setEditOrder({ ...editOrder, items, details })
                        }} />
                        {(editOrder.items || []).length > 1 && (
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => {
                            const items = (editOrder.items || []).filter((_, i) => i !== idx)
                            const details = items.filter(i => i.productType).map(i => formatItemSummary(i)).join(", ")
                            setEditOrder({ ...editOrder, items, details })
                          }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      {isUnitBased && (item.units || 0) > 0 && (
                        <p className="text-xs text-muted-foreground mt-1 ml-1">= {((item.units || 0) * unitWeight).toFixed(1)} kg</p>
                      )}
                    </div>
                  )
                })}
                <Button type="button" variant="outline" size="sm" onClick={() => {
                  const items = [...(editOrder.items || []), { productType: "", quantity: 0 }]
                  setEditOrder({ ...editOrder, items })
                }}>
                  <Plus className="h-4 w-4 mr-1" />Add Product
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date Received</Label>
                  <Input type="date" value={editOrder.dateReceived} onChange={(e) => setEditOrder({ ...editOrder, dateReceived: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input type="date" value={editOrder.dueDate} onChange={(e) => setEditOrder({ ...editOrder, dueDate: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Freight Method</Label>
                  <Select value={editOrder.freight || ""} onValueChange={(v) => setEditOrder({ ...editOrder, freight: v as FreightMethod, freightCarrier: v !== "Bulk" ? "" : editOrder.freightCarrier })}>
                    <SelectTrigger><SelectValue placeholder="Select freight" /></SelectTrigger>
                    <SelectContent>
                      {FREIGHT_METHODS.map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {editOrder.freight === "Bulk" && (
                  <div className="space-y-2">
                    <Label>Carrier Name</Label>
                    <AutocompleteInput value={editOrder.freightCarrier || ""} onChange={(v) => setEditOrder({ ...editOrder, freightCarrier: v })} suggestions={getFreightCompanies()} />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Notes for Team</Label>
                <Textarea placeholder="e.g. Pack with ice packs, customer prefers morning delivery..." value={editOrder.notes || ""} onChange={(e) => setEditOrder({ ...editOrder, notes: e.target.value })} rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={editOrder.status} onValueChange={(v) => setEditOrder({ ...editOrder, status: v as OrderStatus })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ORDER_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button variant="destructive" size="sm" onClick={() => { handleDelete(editOrder); setEditOrder(null) }}>
                    Delete Order
                  </Button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOrder(null)}>Cancel</Button>
            <Button onClick={handleEditSave}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New order dialog */}
      <NewOrderDialog
        open={showNewForm}
        onClose={() => setShowNewForm(false)}
        onSubmit={handleCreateOrder}
        customerNames={customerNames}
      />
    </div>
  )
}

// ── New Order Form Dialog ──────────────────────────────────────────

interface NewOrderDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: { orderNumber: string; customer: string; customerAddress: string; details: string; dateReceived: string; dueDate: string; freight: FreightMethod | ""; freightCarrier: string; notes: string; items: { productType: string; quantity: number; units?: number }[] }) => void
  customerNames: string[]
}

function NewOrderDialog({ open, onClose, onSubmit, customerNames }: NewOrderDialogProps) {
  const [form, setForm] = React.useState({
    orderNumber: "",
    customer: "",
    customerAddress: "",
    dateReceived: new Date().toISOString().split("T")[0],
    dueDate: "",
    freight: "" as FreightMethod | "",
    freightCarrier: "",
    notes: "",
  })
  const [items, setItems] = React.useState<{ productType: string; value: string }[]>([{ productType: "", value: "" }])
  const [error, setError] = React.useState("")
  const savedCustomers = React.useMemo(() => getCustomers(), [])
  const savedCarriers = React.useMemo(() => getFreightCompanies(), [])

  const handleCustomerSelect = (name: string) => {
    const found = savedCustomers.find((c) => c.name.toLowerCase() === name.toLowerCase())
    if (found?.address) {
      setForm((prev) => ({ ...prev, customerAddress: found.address }))
    }
  }

  const handleSubmit = () => {
    if (!form.orderNumber.trim() || !form.customer.trim() || !form.dueDate) {
      setError("Order number, customer, and due date are required")
      return
    }
    const resolvedItems = items.filter(i => i.productType).map(item => {
      const unitWeight = PRODUCT_UNIT_WEIGHTS[item.productType]
      const units = unitWeight ? parseInt(item.value) || 0 : undefined
      const quantity = unitWeight ? (units || 0) * unitWeight : parseFloat(item.value) || 0
      return { productType: item.productType, quantity, units }
    })
    const details = resolvedItems.map(i => formatItemSummary(i)).join(", ")
    onSubmit({ ...form, details, items: resolvedItems })
    setForm({ orderNumber: "", customer: "", customerAddress: "", dateReceived: new Date().toISOString().split("T")[0], dueDate: "", freight: "", freightCarrier: "", notes: "" })
    setItems([{ productType: "", value: "" }])
    setError("")
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Order</DialogTitle>
          <DialogDescription>Create a new customer order</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Order Number *</Label>
              <Input placeholder="e.g. HH-2026-004" value={form.orderNumber} onChange={(e) => { setForm({ ...form, orderNumber: e.target.value }); setError("") }} />
            </div>
            <div className="space-y-2">
              <Label>Customer *</Label>
              <AutocompleteInput placeholder="Customer name" value={form.customer} onChange={(v) => { setForm({ ...form, customer: v }); setError("") }} suggestions={customerNames} onSelect={handleCustomerSelect} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Customer Address</Label>
            <Textarea placeholder="Enter delivery address" value={form.customerAddress} onChange={(e) => setForm({ ...form, customerAddress: e.target.value })} rows={2} />
          </div>
          <div className="space-y-2">
            <Label>Product Lines</Label>
            {items.map((item, idx) => {
              const unitWeight = PRODUCT_UNIT_WEIGHTS[item.productType]
              const isUnitBased = !!unitWeight
              return (
                <div key={idx}>
                  <div className="flex items-center gap-2">
                    <Select value={item.productType} onValueChange={(v) => {
                      const next = [...items]
                      next[idx] = { productType: v, value: "" }
                      setItems(next)
                    }}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Product type" /></SelectTrigger>
                      <SelectContent>
                        {ALL_PRODUCT_OPTIONS.map((p) => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input type="number" min={0} placeholder={isUnitBased ? "Units" : "kg"} className="w-24" value={item.value} onChange={(e) => {
                      const next = [...items]
                      next[idx] = { ...next[idx], value: e.target.value }
                      setItems(next)
                    }} />
                    {items.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setItems(items.filter((_, i) => i !== idx))}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {isUnitBased && item.value && parseInt(item.value) > 0 && (
                    <p className="text-xs text-muted-foreground mt-1 ml-1">= {(parseInt(item.value) * unitWeight).toFixed(1)} kg</p>
                  )}
                </div>
              )
            })}
            <Button type="button" variant="outline" size="sm" onClick={() => setItems([...items, { productType: "", value: "" }])}>
              <Plus className="h-4 w-4 mr-1" />Add Product
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date Received</Label>
              <Input type="date" value={form.dateReceived} onChange={(e) => setForm({ ...form, dateReceived: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Due Date *</Label>
              <Input type="date" value={form.dueDate} onChange={(e) => { setForm({ ...form, dueDate: e.target.value }); setError("") }} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Freight Method</Label>
              <Select value={form.freight} onValueChange={(v) => setForm({ ...form, freight: v as FreightMethod, freightCarrier: v !== "Bulk" ? "" : form.freightCarrier })}>
                <SelectTrigger><SelectValue placeholder="Select freight" /></SelectTrigger>
                <SelectContent>
                  {FREIGHT_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {form.freight === "Bulk" && (
              <div className="space-y-2">
                <Label>Carrier Name</Label>
                <AutocompleteInput placeholder="Enter carrier name" value={form.freightCarrier} onChange={(v) => setForm({ ...form, freightCarrier: v })} suggestions={savedCarriers} />
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label>Notes for Team</Label>
            <Textarea placeholder="e.g. Pack with ice packs, customer prefers morning delivery, include COA..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Create Order</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
