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
import { Edit, Search } from "lucide-react"
import type { TransactionRecord } from "@/lib/types"

interface RecordsTableProps {
  records: TransactionRecord[]
  isAdmin?: boolean
  onRecordUpdate?: (record: TransactionRecord) => void
}

const typeVariantMap: Record<string, "default" | "success" | "destructive" | "warning" | "secondary"> = {
  Receival: "default",
  Processing: "success",
  Deletion: "destructive",
  Outgoing: "warning",
}

export function RecordsTable({ records, isAdmin, onRecordUpdate }: RecordsTableProps) {
  const [editRecord, setEditRecord] = React.useState<TransactionRecord | null>(null)
  const [filter, setFilter] = React.useState("")
  const [typeFilter, setTypeFilter] = React.useState<string>("all")

  const filtered = records.filter((r) => {
    const matchesSearch =
      r.batchCode.toLowerCase().includes(filter.toLowerCase()) ||
      r.productType.toLowerCase().includes(filter.toLowerCase()) ||
      (r.supplier || "").toLowerCase().includes(filter.toLowerCase()) ||
      (r.processor || "").toLowerCase().includes(filter.toLowerCase()) ||
      (r.customer || "").toLowerCase().includes(filter.toLowerCase())
    const matchesType = typeFilter === "all" || r.type === typeFilter
    return matchesSearch && matchesType
  })

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
                {onRecordUpdate && <TableHead className="w-12"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="text-muted-foreground">{record.date}</TableCell>
                  <TableCell>
                    <Badge variant={typeVariantMap[record.type] || "secondary"}>
                      {record.type}
                    </Badge>
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
                  {onRecordUpdate && (
                    <TableCell>
                      {canEdit(record) && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditRecord({ ...record })}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Record Dialog */}
      <Dialog open={!!editRecord} onOpenChange={(v) => { if (!v) setEditRecord(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit {editRecord?.type} Record</DialogTitle>
            <DialogDescription>Modify record details. Changes are logged in the audit trail.</DialogDescription>
          </DialogHeader>
          {editRecord && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" value={editRecord.date} onChange={(e) => setEditRecord({ ...editRecord, date: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Batch Code</Label>
                  <Input value={editRecord.batchCode} onChange={(e) => setEditRecord({ ...editRecord, batchCode: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Product Type</Label>
                  <Input value={editRecord.productType} onChange={(e) => setEditRecord({ ...editRecord, productType: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Quantity (kg)</Label>
                  <Input type="number" min={0} step="0.01" value={editRecord.quantity} onChange={(e) => setEditRecord({ ...editRecord, quantity: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
              {editRecord.type === "Receival" && (
                <div className="space-y-2">
                  <Label>Supplier</Label>
                  <Input value={editRecord.supplier || ""} onChange={(e) => setEditRecord({ ...editRecord, supplier: e.target.value })} />
                </div>
              )}
              {editRecord.type === "Processing" && (
                <div className="space-y-2">
                  <Label>Processor / Staff</Label>
                  <Input value={editRecord.processor || ""} onChange={(e) => setEditRecord({ ...editRecord, processor: e.target.value })} />
                </div>
              )}
              {editRecord.type === "Outgoing" && (
                <div className="space-y-2">
                  <Label>Customer</Label>
                  <Input value={editRecord.customer || ""} onChange={(e) => setEditRecord({ ...editRecord, customer: e.target.value })} />
                </div>
              )}
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editRecord.status} onValueChange={(v) => setEditRecord({ ...editRecord, status: v as "Completed" | "In Progress" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
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
