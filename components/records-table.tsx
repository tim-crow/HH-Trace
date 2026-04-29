"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Edit, Search, Lock, Trash2, RotateCcw } from "lucide-react"
import { HEMP_PRODUCTS, FINISHED_GOODS } from "@/lib/constants"
import type { TransactionRecord } from "@/lib/types"

interface RecordsTableProps {
  records: TransactionRecord[]
  isAdmin?: boolean
  onRecordUpdate?: (record: TransactionRecord) => void
  /** Called when the user clicks edit on a Processing record — opens the full Processing form */
  onOpenProcessingForm?: (record: TransactionRecord) => void
  /** Admin-only: soft-delete a record */
  onRecordDelete?: (record: TransactionRecord) => void
  /** Admin-only: restore a soft-deleted record */
  onRecordRestore?: (record: TransactionRecord) => void
}

const typeVariantMap: Record<string, "default" | "success" | "destructive" | "warning" | "secondary"> = {
  Receival: "default",
  Processing: "success",
  Deletion: "destructive",
  Outgoing: "warning",
}

export function RecordsTable({ records, isAdmin, onRecordUpdate, onOpenProcessingForm, onRecordDelete, onRecordRestore }: RecordsTableProps) {
  const [editRecord, setEditRecord] = React.useState<TransactionRecord | null>(null)
  const [filter, setFilter] = React.useState("")
  const [typeFilter, setTypeFilter] = React.useState<string>("all")
  const [showDeleted, setShowDeleted] = React.useState(false)

  const filtered = records.filter((r) => {
    // Hide deleted unless admin has toggled "Show deleted"
    if (r.deleted && !showDeleted) return false
    if (r.deleted && !isAdmin) return false
    const matchesSearch =
      r.batchCode.toLowerCase().includes(filter.toLowerCase()) ||
      r.productType.toLowerCase().includes(filter.toLowerCase()) ||
      (r.supplier || "").toLowerCase().includes(filter.toLowerCase()) ||
      (r.processor || "").toLowerCase().includes(filter.toLowerCase()) ||
      (r.customer || "").toLowerCase().includes(filter.toLowerCase())
    const matchesType = typeFilter === "all" || r.type === typeFilter
    return matchesSearch && matchesType
  })

  const deletedCount = records.filter((r) => r.deleted).length

  const sorted = [...filtered].sort((a, b) => b.date.localeCompare(a.date))

  const canEdit = (record: TransactionRecord) => {
    // Operators + admins can edit Processing records
    // Only admins can edit all other types
    if (record.type === "Processing") return true
    return !!isAdmin
  }

  const handleSave = () => {
    if (editRecord && onRecordUpdate) {
      onRecordUpdate(editRecord)
    }
    setEditRecord(null)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Transaction Records</h2>
        <p className="text-muted-foreground">Complete history of all product movements</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>All receival, processing, and outgoing records</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search batch, product, partner..." className="pl-9" value={filter} onChange={(e) => setFilter(e.target.value)} />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Receival">Receival</SelectItem>
                <SelectItem value="Processing">Processing</SelectItem>
                <SelectItem value="Outgoing">Outgoing</SelectItem>
                <SelectItem value="Deletion">Deletion</SelectItem>
              </SelectContent>
            </Select>
            {isAdmin && deletedCount > 0 && (
              <Button
                variant={showDeleted ? "default" : "outline"}
                size="sm"
                onClick={() => setShowDeleted((v) => !v)}
              >
                {showDeleted ? "Hide" : "Show"} deleted ({deletedCount})
              </Button>
            )}
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Batch Code</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Partner</TableHead>
                <TableHead>Status</TableHead>
                {(onRecordUpdate || onRecordDelete) && <TableHead className="w-24 text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((record) => (
                <TableRow key={record.id} className={record.deleted ? "opacity-60 bg-destructive/5" : undefined}>
                  <TableCell className="text-muted-foreground">{record.date}</TableCell>
                  <TableCell>
                    <Badge variant={typeVariantMap[record.type] || "secondary"}>
                      {record.type}
                    </Badge>
                    {record.deleted && (
                      <Badge variant="destructive" className="ml-1 text-[10px]">deleted</Badge>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{record.productType}</TableCell>
                  <TableCell className="font-mono text-sm">{record.batchCode}</TableCell>
                  <TableCell>{record.quantity} kg</TableCell>
                  <TableCell className="text-muted-foreground">{record.supplier || record.processor || record.customer || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={record.status === "Completed" ? "success" : "warning"}>
                      {record.status}
                    </Badge>
                  </TableCell>
                  {(onRecordUpdate || onRecordDelete) && (
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {record.deleted ? (
                          isAdmin && onRecordRestore && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => onRecordRestore(record)}
                              title="Restore record"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          )
                        ) : (
                          <>
                            {canEdit(record) ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {
                                  if (record.type === "Processing" && onOpenProcessingForm) {
                                    onOpenProcessingForm(record)
                                  } else {
                                    setEditRecord({ ...record })
                                  }
                                }}
                                title={
                                  record.type === "Processing"
                                    ? "Open the full Processing form to edit bin numbers, bags, staff, etc."
                                    : `Edit ${record.type} record`
                                }
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Lock className="h-3.5 w-3.5 text-muted-foreground/40" aria-label="Admin only" />
                            )}
                            {isAdmin && onRecordDelete && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => onRecordDelete(record)}
                                title="Delete record"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Full Edit Form Dialog */}
      <Dialog open={!!editRecord} onOpenChange={(v) => { if (!v) setEditRecord(null) }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit {editRecord?.type} Record</DialogTitle>
            <DialogDescription>
              Modify all fields of this {editRecord?.type.toLowerCase()} record.
              Changes are logged in the audit trail.
            </DialogDescription>
          </DialogHeader>

          {editRecord && editRecord.type === "Processing" && (
            <ProcessingEditForm record={editRecord} setRecord={setEditRecord} />
          )}
          {editRecord && editRecord.type === "Receival" && (
            <ReceivalEditForm record={editRecord} setRecord={setEditRecord} />
          )}
          {editRecord && editRecord.type === "Outgoing" && (
            <OutgoingEditForm record={editRecord} setRecord={setEditRecord} />
          )}
          {editRecord && editRecord.type === "Deletion" && (
            <DeletionEditForm record={editRecord} setRecord={setEditRecord} />
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRecord(null)}>Cancel</Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Processing Edit Form ─────────────────────────────────────────
function ProcessingEditForm({
  record,
  setRecord,
}: {
  record: TransactionRecord
  setRecord: (r: TransactionRecord) => void
}) {
  // Parse processor string of format: "Names (X staff)"
  const parsed = React.useMemo(() => {
    const match = (record.processor || "").match(/^(.*?)\s*\((\d+)\s*staff\)\s*$/i)
    if (match) return { staffNames: match[1], staffCount: match[2] }
    return { staffNames: record.processor || "", staffCount: "" }
  }, [record.processor])

  const [staffNames, setStaffNames] = React.useState(parsed.staffNames)
  const [staffCount, setStaffCount] = React.useState(parsed.staffCount)

  React.useEffect(() => {
    const composed = staffCount ? `${staffNames} (${staffCount} staff)` : staffNames
    if (composed !== record.processor) {
      setRecord({ ...record, processor: composed })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffNames, staffCount])

  return (
    <div className="space-y-5">
      <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
        Editing the full Processing record. All fields below match the original processing form.
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Date *</Label>
          <Input type="date" value={record.date} onChange={(e) => setRecord({ ...record, date: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>HH Batch ID *</Label>
          <Input value={record.batchCode} onChange={(e) => setRecord({ ...record, batchCode: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Number of Staff</Label>
          <Input
            type="number"
            min={0}
            value={staffCount}
            onChange={(e) => setStaffCount(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Names of Staff</Label>
          <Input
            placeholder="Enter staff names"
            value={staffNames}
            onChange={(e) => setStaffNames(e.target.value)}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Process / Product Type</Label>
          <Input
            value={record.productType}
            onChange={(e) => setRecord({ ...record, productType: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Total Input Quantity (kg)</Label>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={record.quantity}
            onChange={(e) => setRecord({ ...record, quantity: parseFloat(e.target.value) || 0 })}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Status</Label>
        <Select
          value={record.status}
          onValueChange={(v) => setRecord({ ...record, status: v as "Completed" | "In Progress" })}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Completed">Completed</SelectItem>
            <SelectItem value="In Progress">In Progress</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <p className="text-xs text-muted-foreground">
        Note: Per-bin/bag finished product breakdowns and notes are stored on the original processing run.
        Editing those line items requires the operations team — contact an admin if you need to revise the per-bin yield breakdown.
      </p>
    </div>
  )
}

// ─── Receival Edit Form ───────────────────────────────────────────
function ReceivalEditForm({
  record,
  setRecord,
}: {
  record: TransactionRecord
  setRecord: (r: TransactionRecord) => void
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
        Editing the full Receival record (admin override).
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Date of Receival *</Label>
          <Input type="date" value={record.date} onChange={(e) => setRecord({ ...record, date: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Supplier Name</Label>
          <Input
            placeholder="Enter supplier name"
            value={record.supplier || ""}
            onChange={(e) => setRecord({ ...record, supplier: e.target.value })}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Product Type</Label>
          <Select value={record.productType} onValueChange={(v) => setRecord({ ...record, productType: v })}>
            <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
            <SelectContent>
              {HEMP_PRODUCTS.map((product) => (
                <SelectItem key={product} value={product}>{product}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Batch Code *</Label>
          <Input value={record.batchCode} onChange={(e) => setRecord({ ...record, batchCode: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Quantity (kg) *</Label>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={record.quantity}
            onChange={(e) => setRecord({ ...record, quantity: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={record.status}
            onValueChange={(v) => setRecord({ ...record, status: v as "Completed" | "In Progress" })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Completed">Completed</SelectItem>
              <SelectItem value="In Progress">In Progress</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Storage location is set on the inventory item — edit it from the Inventory page.
      </p>
    </div>
  )
}

// ─── Outgoing Edit Form ───────────────────────────────────────────
function OutgoingEditForm({
  record,
  setRecord,
}: {
  record: TransactionRecord
  setRecord: (r: TransactionRecord) => void
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
        Editing the full Outgoing record (admin override).
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Date of Dispatch *</Label>
          <Input type="date" value={record.date} onChange={(e) => setRecord({ ...record, date: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Customer</Label>
          <Input
            placeholder="Enter customer name"
            value={record.customer || ""}
            onChange={(e) => setRecord({ ...record, customer: e.target.value })}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Product Type</Label>
          <Select value={record.productType} onValueChange={(v) => setRecord({ ...record, productType: v })}>
            <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
            <SelectContent>
              {[...HEMP_PRODUCTS, ...FINISHED_GOODS].map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Batch Code</Label>
          <Input value={record.batchCode} onChange={(e) => setRecord({ ...record, batchCode: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Quantity (kg) *</Label>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={record.quantity}
            onChange={(e) => setRecord({ ...record, quantity: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={record.status}
            onValueChange={(v) => setRecord({ ...record, status: v as "Completed" | "In Progress" })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Completed">Completed</SelectItem>
              <SelectItem value="In Progress">In Progress</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Freight/packaging details for this dispatch can be reviewed from the linked order in Order Management.
      </p>
    </div>
  )
}

// ─── Deletion Edit Form ───────────────────────────────────────────
function DeletionEditForm({
  record,
  setRecord,
}: {
  record: TransactionRecord
  setRecord: (r: TransactionRecord) => void
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
        Editing a deletion record (admin override). Use this only to correct typos in the audit history.
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Date</Label>
          <Input type="date" value={record.date} onChange={(e) => setRecord({ ...record, date: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Batch Code</Label>
          <Input value={record.batchCode} onChange={(e) => setRecord({ ...record, batchCode: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Product Type</Label>
          <Input value={record.productType} onChange={(e) => setRecord({ ...record, productType: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Quantity (kg)</Label>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={record.quantity}
            onChange={(e) => setRecord({ ...record, quantity: parseFloat(e.target.value) || 0 })}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Status</Label>
        <Select
          value={record.status}
          onValueChange={(v) => setRecord({ ...record, status: v as "Completed" | "In Progress" })}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Completed">Completed</SelectItem>
            <SelectItem value="In Progress">In Progress</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
