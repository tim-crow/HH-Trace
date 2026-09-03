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
import { formatDate, formatDateTime, formatQuantity, roundQuantity } from "@/lib/utils"

interface InventoryTableProps {
  inventory: InventoryItem[]
  onSave: (id: string, data: Partial<InventoryItem>) => void
  onDelete: (item: InventoryItem) => void
  isAdmin: boolean
  canEdit: boolean
  deletedItems?: InventoryItem[]
  onRestore?: (item: InventoryItem) => void
}

export function InventoryTable({ inventory, onSave, onDelete, isAdmin, canEdit, deletedItems = [], onRestore }: InventoryTableProps) {
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

  const productTotals = React.useMemo(() => {
    const totals = new Map<string, number>()
    inventory.forEach((item) => {
      totals.set(item.productType, (totals.get(item.productType) || 0) + item.quantity)
    })
    return totals
  }, [inventory])

  const rawMaterialTotal = React.useMemo(() => inventory
    .filter((item) => item.productType.startsWith("Raw Material —"))
    .reduce((total, item) => total + item.quantity, 0),
  [inventory])

  const inventoryGroups = React.useMemo(() => {
    const groups = new Map<string, InventoryItem[]>()
    filteredInventory.forEach((item) => {
      const items = groups.get(item.productType) || []
      items.push(item)
      groups.set(item.productType, items)
    })
    return [...groups.entries()]
      .sort(([productA], [productB]) => {
        const productARaw = productA.startsWith("Raw Material —")
        const productBRaw = productB.startsWith("Raw Material —")
        if (productARaw !== productBRaw) return productARaw ? 1 : -1
        return productA.localeCompare(productB)
      })
      .map(([productType, items]) => ({
        productType,
        items: items.sort((a, b) => a.batchCode.localeCompare(b.batchCode)),
      }))
  }, [filteredInventory])

  const firstRawMaterialGroup = inventoryGroups.findIndex(({ productType }) => productType.startsWith("Raw Material —"))

  const handleEdit = (item: InventoryItem) => {
    if (!canEdit) return
    setEditingRow(item.id)
    setEditData({ ...item, quantity: roundQuantity(item.quantity) })
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
      onSave(editingRow, { ...editData, quantity: editData.quantity === undefined ? undefined : roundQuantity(editData.quantity), location: finalLocation })
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
            {canEdit ? "Click edit to modify inventory details" : "View inventory — contact operations to make changes"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Batch Code</TableHead>
                <TableHead>Quantity (kg)</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventoryGroups.map(({ productType, items }, groupIndex) => (
                <React.Fragment key={productType}>
                  {groupIndex === firstRawMaterialGroup && (
                    <TableRow className="border-t-4 border-t-background bg-primary/10 hover:bg-primary/10">
                      <TableCell colSpan={5} className="py-4">
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold">Raw Materials</span>
                          <Badge variant="secondary">{formatQuantity(rawMaterialTotal)} kg total</Badge>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  <TableRow className="bg-muted/60 hover:bg-muted/60">
                    <TableCell colSpan={5} className="py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-base font-semibold">{productType.replace("Raw Material — ", "")}</span>
                        <Badge variant="secondary">
                          {formatQuantity(productTotals.get(productType) || 0)} kg total
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {items.length} {items.length === 1 ? "batch" : "batches"}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="pl-6 font-mono text-sm">{item.batchCode}</TableCell>
                      <TableCell>
                        {editingRow === item.id ? (
                          <Input
                            type="number"
                            value={editData.quantity?.toString() || item.quantity.toString()}
                            step="0.1"
                            onChange={(e) => setEditData({ ...editData, quantity: Number(e.target.value) })}
                            className="w-24 h-8"
                          />
                        ) : (
                          `${formatQuantity(item.quantity)} kg`
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
                      <TableCell className="text-muted-foreground">{formatDate(item.lastUpdated)}</TableCell>
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
                            canEdit && (
                              <>
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleEdit(item)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                {isAdmin && (
                                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => onDelete(item)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </>
                            )
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </React.Fragment>
              ))}
              {inventoryGroups.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No inventory matches your search.
                  </TableCell>
                </TableRow>
              )}
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
                    <TableCell>{formatQuantity(item.quantity)} kg</TableCell>
                    <TableCell>{item.deletedBy || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.deletedAt ? formatDateTime(item.deletedAt) : "—"}
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
