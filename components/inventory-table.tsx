"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Edit, Save, X, Trash2, RotateCcw } from "lucide-react"
import { AutocompleteInput } from "@/components/ui/autocomplete-input"
import { LOCATIONS } from "@/lib/constants"
import { getOtherLocations, saveOtherLocation } from "@/lib/remembered-entries"
import type { InventoryItem } from "@/lib/types"

interface InventoryTableProps {
  inventory: InventoryItem[]
  onSave: (id: string, data: Partial<InventoryItem>) => void
  onDelete: (item: InventoryItem) => void
  isAdmin: boolean
  deletedItems?: InventoryItem[]
  onRestore?: (item: InventoryItem) => void
}

export function InventoryTable({ inventory, onSave, onDelete, isAdmin, deletedItems = [], onRestore }: InventoryTableProps) {
  const [filter, setFilter] = React.useState("")
  const [editingRow, setEditingRow] = React.useState<string | null>(null)
  const [editData, setEditData] = React.useState<Partial<InventoryItem>>({})
  const [editLocationType, setEditLocationType] = React.useState("")
  const [editOtherLocation, setEditOtherLocation] = React.useState("")
  const [savedLocations, setSavedLocations] = React.useState<string[]>([])
  const [showDeleted, setShowDeleted] = React.useState(false)

  React.useEffect(() => {
    setSavedLocations(getOtherLocations())
  }, [])

  const filteredInventory = inventory.filter(
    (item) =>
      item.productType.toLowerCase().includes(filter.toLowerCase()) ||
      item.batchCode.toLowerCase().includes(filter.toLowerCase())
  )

  const handleEdit = (item: InventoryItem) => {
    if (!isAdmin) return
    setEditingRow(item.id)
    setEditData(item)
    if (item.location === "Factory") {
      setEditLocationType("Factory")
      setEditOtherLocation("")
    } else {
      setEditLocationType("Other")
      setEditOtherLocation(item.location)
    }
  }

  const handleSave = () => {
    if (editingRow) {
      const finalLocation = editLocationType === "Other" ? editOtherLocation.trim() || "Other" : "Factory"
      if (editLocationType === "Other" && editOtherLocation.trim()) {
        saveOtherLocation(editOtherLocation)
        setSavedLocations(getOtherLocations())
      }
      onSave(editingRow, { ...editData, location: finalLocation })
      setEditingRow(null)
      setEditData({})
    }
  }

  const handleCancel = () => {
    setEditingRow(null)
    setEditData({})
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Live Inventory</h2>
        <p className="text-muted-foreground">Real-time inventory levels and locations</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products or batches..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pl-9"
          />
        </div>
        {isAdmin && deletedItems.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => setShowDeleted(!showDeleted)}>
            <RotateCcw className="h-4 w-4 mr-1" />
            {showDeleted ? "Hide" : "Show"} Deleted ({deletedItems.length})
          </Button>
        )}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Current Inventory</CardTitle>
          <CardDescription>
            {isAdmin ? "Click edit to modify inventory details" : "View inventory — contact admin to make changes"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product Type</TableHead>
                <TableHead>Batch Code</TableHead>
                <TableHead>Quantity (kg)</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInventory.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.productType}</TableCell>
                  <TableCell className="font-mono text-sm">{item.batchCode}</TableCell>
                  <TableCell>
                    {editingRow === item.id ? (
                      <Input
                        type="number"
                        value={editData.quantity?.toString() || item.quantity.toString()}
                        onChange={(e) => setEditData({ ...editData, quantity: Number(e.target.value) })}
                        className="w-24 h-8"
                      />
                    ) : (
                      `${item.quantity} kg`
                    )}
                  </TableCell>
                  <TableCell>
                    {editingRow === item.id ? (
                      <div className="space-y-1">
                        <Select value={editLocationType} onValueChange={(v) => { setEditLocationType(v); if (v === "Factory") setEditOtherLocation(""); }}>
                          <SelectTrigger className="w-36 h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {LOCATIONS.map((loc) => (
                              <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {editLocationType === "Other" && (
                          <AutocompleteInput placeholder="Location name" value={editOtherLocation} onChange={setEditOtherLocation} suggestions={savedLocations} className="h-8 w-36" />
                        )}
                      </div>
                    ) : (
                      item.location
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{new Date(item.lastUpdated).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {editingRow === item.id ? (
                        <>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600" onClick={handleSave}>
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleCancel}>
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          {isAdmin && (
                            <>
                              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleEdit(item)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => onDelete(item)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Soft-deleted items — admin only */}
      {isAdmin && showDeleted && deletedItems.length > 0 && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              Deleted Items
              <Badge variant="secondary">{deletedItems.length}</Badge>
            </CardTitle>
            <CardDescription>These items are hidden but can be restored</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product Type</TableHead>
                  <TableHead>Batch Code</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Deleted By</TableHead>
                  <TableHead>Deleted At</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deletedItems.map((item) => (
                  <TableRow key={item.id} className="opacity-60">
                    <TableCell>{item.productType}</TableCell>
                    <TableCell className="font-mono text-sm">{item.batchCode}</TableCell>
                    <TableCell>{item.quantity} kg</TableCell>
                    <TableCell>{item.deletedBy || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.deletedAt ? new Date(item.deletedAt).toLocaleString() : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => onRestore?.(item)}>
                        <RotateCcw className="h-3 w-3 mr-1" />Restore
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
