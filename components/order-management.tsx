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
import { Plus, Eye, Edit, Search } from "lucide-react"
import { AutocompleteInput } from "@/components/ui/autocomplete-input"
import { cn, generateId } from "@/lib/utils"
import { getCustomers } from "@/lib/remembered-entries"
import type { Order, OrderStatus } from "@/lib/types"

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
}

export function OrderManagement({ orders, onOrdersChange, isAdmin, userName, onAuditLog, onMessage }: OrderManagementProps) {
  const [filter, setFilter] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<string>("all")
  const [viewOrder, setViewOrder] = React.useState<Order | null>(null)
  const [editOrder, setEditOrder] = React.useState<Order | null>(null)
  const [showNewForm, setShowNewForm] = React.useState(false)

  const [customerNames, setCustomerNames] = React.useState<string[]>([])
  React.useEffect(() => {
    setCustomerNames(getCustomers().map((c) => c.name))
  }, [])

  const activeOrders = orders.filter((o) => !o.deleted)
  const filtered = activeOrders.filter((order) => {
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(filter.toLowerCase()) ||
      order.customer.toLowerCase().includes(filter.toLowerCase()) ||
      order.details.toLowerCase().includes(filter.toLowerCase())
    const matchesStatus = statusFilter === "all" || order.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const openCount = activeOrders.filter((o) => o.status !== "Completed" && o.status !== "Dispatched").length
  const sorted = [...filtered].sort((a, b) => {
    const statusOrder = { "New": 0, "In Progress": 1, "Packed": 2, "Dispatched": 3, "Completed": 4 }
    return statusOrder[a.status] - statusOrder[b.status] || a.dueDate.localeCompare(b.dueDate)
  })

  const handleStatusUpdate = (order: Order, newStatus: OrderStatus) => {
    onOrdersChange(orders.map((o) =>
      o.id === order.id
        ? { ...o, status: newStatus, lastUpdatedBy: userName, lastUpdated: new Date().toISOString() }
        : o
    ))
    onAuditLog("Updated Order Status", order.orderNumber, `${order.status} → ${newStatus} for ${order.customer}`)
    onMessage(`Order ${order.orderNumber} updated to ${newStatus}`)
  }

  const handleCreateOrder = (data: { orderNumber: string; customer: string; details: string; dateReceived: string; dueDate: string }) => {
    const newOrder: Order = {
      id: generateId("ORD"),
      orderNumber: data.orderNumber,
      customer: data.customer,
      details: data.details,
      dateReceived: data.dateReceived,
      dueDate: data.dueDate,
      status: "New",
      createdBy: userName,
      lastUpdatedBy: userName,
      lastUpdated: new Date().toISOString(),
    }
    onOrdersChange([...orders, newOrder])
    onAuditLog("Created Order", data.orderNumber, `${data.customer} — ${data.details}, due ${data.dueDate}`)
    onMessage(`Order ${data.orderNumber} created!`)
    setShowNewForm(false)
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
        {isAdmin && (
          <Button onClick={() => setShowNewForm(true)}>
            <Plus className="h-4 w-4 mr-1" />New Order
          </Button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search orders..." value={filter} onChange={(e) => setFilter(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
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
              <div>
                <p className="text-sm font-medium mb-1">Order Details</p>
                <p className="text-sm text-muted-foreground">{viewOrder.details}</p>
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
                  <p className="text-sm font-medium mb-1">Created By</p>
                  <p className="text-sm text-muted-foreground">{viewOrder.createdBy}</p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Last Updated By</p>
                  <p className="text-sm text-muted-foreground">{viewOrder.lastUpdatedBy} — {new Date(viewOrder.lastUpdated).toLocaleString()}</p>
                </div>
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
                <Label>Details</Label>
                <Textarea value={editOrder.details} onChange={(e) => setEditOrder({ ...editOrder, details: e.target.value })} />
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
  onSubmit: (data: { orderNumber: string; customer: string; details: string; dateReceived: string; dueDate: string }) => void
  customerNames: string[]
}

function NewOrderDialog({ open, onClose, onSubmit, customerNames }: NewOrderDialogProps) {
  const [form, setForm] = React.useState({
    orderNumber: "",
    customer: "",
    details: "",
    dateReceived: new Date().toISOString().split("T")[0],
    dueDate: "",
  })
  const [error, setError] = React.useState("")

  const handleSubmit = () => {
    if (!form.orderNumber.trim() || !form.customer.trim() || !form.dueDate) {
      setError("Order number, customer, and due date are required")
      return
    }
    onSubmit(form)
    setForm({ orderNumber: "", customer: "", details: "", dateReceived: new Date().toISOString().split("T")[0], dueDate: "" })
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
              <AutocompleteInput placeholder="Customer name" value={form.customer} onChange={(v) => { setForm({ ...form, customer: v }); setError("") }} suggestions={customerNames} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Order Details</Label>
            <Textarea placeholder="e.g. Hemp Hearts 200kg, Hemp Oil 50L" value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} />
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
