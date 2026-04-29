"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Trash2, AlertCircle, X } from "lucide-react"
import { HEMP_PRODUCTS, PROCESS_TYPES } from "@/lib/constants"
import type { InventoryItem, BulkProduct, FinishedProduct, AvailableBatch, ProcessingRun } from "@/lib/types"

interface ProcessingFormsProps {
  inventory: InventoryItem[]
  onSubmit: (
    formData: { date: string; batchId: string; staffCount: string; staffNames: string; notes: string; oilPressType?: string },
    processType: string,
    bulkProducts: BulkProduct[],
    finishedProducts: FinishedProduct[],
  ) => void
  onError: (message: string) => void
  onAdditionalSubmit: () => void
  /** When set, the form is in "edit existing run" mode and pre-fills with this run */
  editRun?: ProcessingRun | null
  onUpdate?: (
    runId: string,
    formData: { date: string; batchId: string; staffCount: string; staffNames: string; notes: string; oilPressType?: string },
    processType: string,
    bulkProducts: BulkProduct[],
    finishedProducts: FinishedProduct[],
  ) => void
  onCancelEdit?: () => void
}

const emptyBulk = (): BulkProduct => ({ bag: "", productType: "", kg: "", batchCode: "", notes: "" })
const emptyFinished = (): FinishedProduct => ({ bin: "", hearts: "", hulls: "", lights: "", overs: "", oil: "", mealProtein: "", mealProteinKg: "" })

export function ProcessingForms({ inventory, onSubmit, onError, onAdditionalSubmit, editRun, onUpdate, onCancelEdit }: ProcessingFormsProps) {
  // Per-tab state (so dehulling and pressing don't share rows when not editing)
  const [dehullBulk, setDehullBulk] = React.useState<BulkProduct[]>([emptyBulk()])
  const [dehullFinished, setDehullFinished] = React.useState<FinishedProduct[]>([emptyFinished()])
  const [dehullDate, setDehullDate] = React.useState("")
  const [dehullBatch, setDehullBatch] = React.useState("")
  const [dehullStaffCount, setDehullStaffCount] = React.useState("")
  const [dehullStaffNames, setDehullStaffNames] = React.useState("")
  const [dehullNotes, setDehullNotes] = React.useState("")

  const [pressBulk, setPressBulk] = React.useState<BulkProduct[]>([emptyBulk()])
  const [pressFinished, setPressFinished] = React.useState<FinishedProduct[]>([emptyFinished()])
  const [pressDate, setPressDate] = React.useState("")
  const [pressBatch, setPressBatch] = React.useState("")
  const [pressStaffCount, setPressStaffCount] = React.useState("")
  const [pressStaffNames, setPressStaffNames] = React.useState("")
  const [pressNotes, setPressNotes] = React.useState("")
  const [pressOilType, setPressOilType] = React.useState("")

  const [activeTab, setActiveTab] = React.useState("dehulling")
  const isEditing = !!editRun

  // Pre-fill state when entering edit mode
  React.useEffect(() => {
    if (!editRun) return
    if (editRun.processType === "dehulling") {
      setActiveTab("dehulling")
      setDehullDate(editRun.date)
      setDehullBatch(editRun.batchId)
      setDehullStaffCount(editRun.staffCount)
      setDehullStaffNames(editRun.staffNames)
      setDehullNotes(editRun.notes)
      setDehullBulk(editRun.bulkProducts.length ? editRun.bulkProducts.map((p) => ({ ...p })) : [emptyBulk()])
      setDehullFinished(editRun.finishedProducts.length ? editRun.finishedProducts.map((p) => ({ ...p })) : [emptyFinished()])
    } else if (editRun.processType === "pressing") {
      setActiveTab("pressing")
      setPressDate(editRun.date)
      setPressBatch(editRun.batchId)
      setPressStaffCount(editRun.staffCount)
      setPressStaffNames(editRun.staffNames)
      setPressNotes(editRun.notes)
      setPressOilType(editRun.oilPressType || "")
      setPressBulk(editRun.bulkProducts.length ? editRun.bulkProducts.map((p) => ({ ...p })) : [emptyBulk()])
      setPressFinished(editRun.finishedProducts.length ? editRun.finishedProducts.map((p) => ({ ...p })) : [emptyFinished()])
    }
  }, [editRun])

  const getAvailableBatches = (productType: string): AvailableBatch[] => {
    if (!productType) return []
    const productTypeMap: Record<string, string> = { "whole-seeds": "Whole Seeds", "hulled-seeds": "Hulled Seeds", "hemp-hearts": "Hemp Hearts", lights: "Hemp Lights", overs: "Overs" }
    const displayName = productTypeMap[productType] || productType
    return inventory
      .filter((item) => item.productType === displayName && item.quantity > 0 && item.location === "Factory")
      .map((item) => ({ batchCode: item.batchCode, quantity: item.quantity, location: item.location }))
  }

  const validateFactoryStock = (bulkProducts: BulkProduct[]): boolean => {
    if (isEditing) return true // skip stock check when editing existing record (inventory was already deducted)
    for (const product of bulkProducts) {
      if (!product.batchCode) continue
      const item = inventory.find((i) => i.batchCode === product.batchCode)
      if (item && item.location !== "Factory") {
        onError(`Batch ${product.batchCode} is not at Factory (currently at ${item.location}). It must be received at Factory before processing.`)
        return false
      }
    }
    return true
  }

  const handleDehullingSubmit = () => {
    if (!dehullDate || !dehullBatch || !dehullStaffCount || !dehullStaffNames) {
      onError("Please fill in all required fields!")
      return
    }
    if (!validateFactoryStock(dehullBulk)) return
    const formData = { date: dehullDate, batchId: dehullBatch, staffCount: dehullStaffCount, staffNames: dehullStaffNames, notes: dehullNotes }
    if (isEditing && editRun && onUpdate) {
      onUpdate(editRun.id, formData, "dehulling", dehullBulk, dehullFinished)
    } else {
      onSubmit(formData, "dehulling", dehullBulk, dehullFinished)
      // Reset after fresh submit
      setDehullDate(""); setDehullBatch(""); setDehullStaffCount(""); setDehullStaffNames(""); setDehullNotes("")
      setDehullBulk([emptyBulk()]); setDehullFinished([emptyFinished()])
    }
  }
  const handlePressingSubmit = () => {
    if (!pressDate || !pressBatch || !pressStaffCount || !pressStaffNames) {
      onError("Please fill in all required fields!")
      return
    }
    if (!validateFactoryStock(pressBulk)) return
    const formData = { date: pressDate, batchId: pressBatch, staffCount: pressStaffCount, staffNames: pressStaffNames, notes: pressNotes, oilPressType: pressOilType }
    if (isEditing && editRun && onUpdate) {
      onUpdate(editRun.id, formData, "pressing", pressBulk, pressFinished)
    } else {
      onSubmit(formData, "pressing", pressBulk, pressFinished)
      setPressDate(""); setPressBatch(""); setPressStaffCount(""); setPressStaffNames(""); setPressNotes(""); setPressOilType("")
      setPressBulk([emptyBulk()]); setPressFinished([emptyFinished()])
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {isEditing ? "Edit Processing Record" : "Processing Operations"}
          </h2>
          <p className="text-muted-foreground">
            {isEditing
              ? `Editing run ${editRun?.batchId} (${editRun?.processType}) — adjust any field including bin numbers, bag numbers, staff and yields`
              : "Record dehulling, pressing and additional processing activities"}
          </p>
        </div>
        {isEditing && onCancelEdit && (
          <Button variant="outline" size="sm" onClick={onCancelEdit}>
            <X className="h-4 w-4 mr-1" /> Cancel Edit
          </Button>
        )}
      </div>

      {isEditing && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertCircle className="h-4 w-4 shrink-0" />
          You are editing an existing processing record. Saving will overwrite the saved form. Inventory and ledger quantities are not retroactively adjusted — fix those separately if needed.
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="dehulling" disabled={isEditing && editRun?.processType !== "dehulling"}>Dehulling</TabsTrigger>
          <TabsTrigger value="pressing" disabled={isEditing && editRun?.processType !== "pressing"}>Pressing</TabsTrigger>
          <TabsTrigger value="additional" disabled={isEditing}>Additional</TabsTrigger>
        </TabsList>

        <TabsContent value="dehulling">
          <Card>
            <CardHeader>
              <CardTitle>Dehulling Processing Form</CardTitle>
              <CardDescription>Record dehulling operations and finished products</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Date *</Label><Input type="date" required value={dehullDate} onChange={(e) => setDehullDate(e.target.value)} /></div>
                <div className="space-y-2"><Label>HH Batch ID *</Label><Input placeholder="Enter batch ID" required value={dehullBatch} onChange={(e) => setDehullBatch(e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Number of Staff *</Label><Input type="number" min={0} required value={dehullStaffCount} onChange={(e) => setDehullStaffCount(e.target.value)} /></div>
                <div className="space-y-2"><Label>Names of Staff *</Label><Input placeholder="Enter staff names" required value={dehullStaffNames} onChange={(e) => setDehullStaffNames(e.target.value)} /></div>
              </div>

              <BulkProductSection
                products={dehullBulk}
                onChange={setDehullBulk}
                getAvailableBatches={getAvailableBatches}
                productOptions={[{ key: "whole-seeds", label: "Whole Seeds" }]}
              />

              <div className="space-y-4">
                <h4 className="text-sm font-semibold">Finished Products (KG)</h4>
                {dehullFinished.map((product, index) => (
                  <div key={index} className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_auto] gap-3 p-4 border rounded-lg bg-muted/50">
                    <div className="space-y-1"><Label className="text-xs">Bin #</Label><Input value={product.bin} onChange={(e) => updateFinished(setDehullFinished, index, "bin", e.target.value)} /></div>
                    <div className="space-y-1"><Label className="text-xs">Hearts</Label><Input type="number" step="0.01" value={product.hearts} onChange={(e) => updateFinished(setDehullFinished, index, "hearts", e.target.value)} /></div>
                    <div className="space-y-1"><Label className="text-xs">Hulls</Label><Input type="number" step="0.01" value={product.hulls} onChange={(e) => updateFinished(setDehullFinished, index, "hulls", e.target.value)} /></div>
                    <div className="space-y-1"><Label className="text-xs">Lights</Label><Input type="number" step="0.01" value={product.lights} onChange={(e) => updateFinished(setDehullFinished, index, "lights", e.target.value)} /></div>
                    <div className="space-y-1"><Label className="text-xs">Overs</Label><Input type="number" step="0.01" value={product.overs} onChange={(e) => updateFinished(setDehullFinished, index, "overs", e.target.value)} /></div>
                    <div className="flex items-end">
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" disabled={dehullFinished.length <= 1} onClick={() => removeAt(setDehullFinished, index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setDehullFinished((p) => [...p, emptyFinished()])}>
                  <Plus className="h-4 w-4 mr-1" />Add More Finished Product Output
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Notes (inc. estimated waste)</Label>
                <Textarea placeholder="Enter any notes or observations" value={dehullNotes} onChange={(e) => setDehullNotes(e.target.value)} />
              </div>

              <div className="flex items-center gap-2"><Checkbox /><label className="text-sm">COA meets spec</label></div>
              <Button onClick={handleDehullingSubmit}>
                {isEditing ? "Update Dehulling Record" : "Submit Dehulling Record"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pressing">
          <Card>
            <CardHeader>
              <CardTitle>Hemp Oil Processing Form (Pressing)</CardTitle>
              <CardDescription>Record oil pressing operations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Date *</Label><Input type="date" required value={pressDate} onChange={(e) => setPressDate(e.target.value)} /></div>
                <div className="space-y-2"><Label>HH Batch ID *</Label><Input placeholder="Enter batch ID" required value={pressBatch} onChange={(e) => setPressBatch(e.target.value)} /></div>
              </div>
              <div className="space-y-2">
                <Label>Oil Press Type *</Label>
                <Select value={pressOilType} onValueChange={setPressOilType}>
                  <SelectTrigger><SelectValue placeholder="Select press type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="large">LARGE (FLORAPOWER)</SelectItem>
                    <SelectItem value="small">SMALL (ZIGGY)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Number of Staff *</Label><Input type="number" min={0} required value={pressStaffCount} onChange={(e) => setPressStaffCount(e.target.value)} /></div>
                <div className="space-y-2"><Label>Names of Staff *</Label><Input placeholder="Enter staff names" required value={pressStaffNames} onChange={(e) => setPressStaffNames(e.target.value)} /></div>
              </div>
              <BulkProductSection
                products={pressBulk}
                onChange={setPressBulk}
                getAvailableBatches={getAvailableBatches}
                productOptions={[{ key: "hulled-seeds", label: "Hulled Seeds" }, { key: "lights", label: "Lights" }, { key: "overs", label: "Overs" }, { key: "whole-seeds", label: "Whole Seeds" }]}
              />
              <div className="space-y-4">
                <h4 className="text-sm font-semibold">Finished Products (KG)</h4>
                {pressFinished.map((product, index) => (
                  <div key={index} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-3 p-4 border rounded-lg bg-muted/50">
                    <div className="space-y-1"><Label className="text-xs">Bin #</Label><Input value={product.bin} onChange={(e) => updateFinished(setPressFinished, index, "bin", e.target.value)} /></div>
                    <div className="space-y-1"><Label className="text-xs">Oil</Label><Input type="number" step="0.01" value={product.oil} onChange={(e) => updateFinished(setPressFinished, index, "oil", e.target.value)} /></div>
                    <div className="space-y-1">
                      <Label className="text-xs">Meal/Protein</Label>
                      <Select value={product.mealProtein} onValueChange={(v) => updateFinished(setPressFinished, index, "mealProtein", v)}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent><SelectItem value="meal">MEAL</SelectItem><SelectItem value="protein">PROTEIN</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1"><Label className="text-xs">Meal/Protein KG</Label><Input type="number" step="0.01" value={product.mealProteinKg} onChange={(e) => updateFinished(setPressFinished, index, "mealProteinKg", e.target.value)} /></div>
                    <div className="flex items-end">
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" disabled={pressFinished.length <= 1} onClick={() => removeAt(setPressFinished, index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setPressFinished((p) => [...p, emptyFinished()])}>
                  <Plus className="h-4 w-4 mr-1" />Add More Finished Product Output
                </Button>
              </div>
              <div className="space-y-2">
                <Label>Notes (inc. estimated Waste)</Label>
                <Textarea placeholder="Enter any notes or observations" value={pressNotes} onChange={(e) => setPressNotes(e.target.value)} />
              </div>
              <div className="flex items-center gap-2"><Checkbox /><label className="text-sm">COA meets spec</label></div>
              <Button onClick={handlePressingSubmit}>
                {isEditing ? "Update Pressing Record" : "Submit Pressing Record"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="additional">
          <Card>
            <CardHeader><CardTitle>Additional Processing Form</CardTitle><CardDescription>Record additional processing operations</CardDescription></CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2"><Label>Date *</Label><Input type="date" required /></div>
              <div className="space-y-2"><Label>Input Type *</Label><Select><SelectTrigger><SelectValue placeholder="Select input type" /></SelectTrigger><SelectContent>{HEMP_PRODUCTS.filter((p) => !["Whole Seeds", "Finished Goods"].includes(p)).map((product) => (<SelectItem key={product} value={product.toLowerCase().replace(/\s+/g, "-")}>{product}</SelectItem>))}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Input Volume (kg) *</Label><Input type="number" min={0} step="0.01" required /></div>
              <div className="space-y-2"><Label>Input Batch No</Label><Input placeholder="Enter batch number" /></div>
              <div className="space-y-2"><Label>Process Undertaken *</Label><Select><SelectTrigger><SelectValue placeholder="Select process" /></SelectTrigger><SelectContent>{PROCESS_TYPES.map((process) => (<SelectItem key={process} value={process.toLowerCase()}>{process}</SelectItem>))}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Finished Goods Info</Label><Input placeholder="e.g., Hemp oil 500kg" /></div>
              <div className="space-y-2"><Label>New Batch Code (if used)</Label><Input placeholder="Enter new batch code" /></div>
              <div className="flex items-center gap-2"><Checkbox /><label className="text-sm">COA meets spec</label></div>
              <Button onClick={onAdditionalSubmit}>Submit Record</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ─── Helpers ────────────────────────────────────────────────────────
function updateFinished(
  setter: React.Dispatch<React.SetStateAction<FinishedProduct[]>>,
  index: number,
  field: keyof FinishedProduct,
  value: string,
) {
  setter((prev) => {
    const updated = [...prev]
    updated[index] = { ...updated[index], [field]: value }
    return updated
  })
}

function removeAt<T>(setter: React.Dispatch<React.SetStateAction<T[]>>, index: number) {
  setter((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)))
}

interface BulkProductSectionProps {
  products: BulkProduct[]
  onChange: React.Dispatch<React.SetStateAction<BulkProduct[]>>
  getAvailableBatches: (productType: string) => AvailableBatch[]
  productOptions: { key: string; label: string }[]
}

function BulkProductSection({ products, onChange, getAvailableBatches, productOptions }: BulkProductSectionProps) {
  const update = (index: number, field: keyof BulkProduct, value: string) => {
    onChange((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }
  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold">Bulk Product Processed</h4>
      {products.map((product, index) => (
        <div key={index} className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_auto] gap-3 p-4 border rounded-lg bg-muted/50">
          <div className="space-y-1"><Label className="text-xs">Bag #</Label><Input type="number" value={product.bag} onChange={(e) => update(index, "bag", e.target.value)} /></div>
          <div className="space-y-1">
            <Label className="text-xs">Product Type *</Label>
            <Select value={product.productType} onValueChange={(v) => update(index, "productType", v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{productOptions.map((opt) => (<SelectItem key={opt.key} value={opt.key}>{opt.label}</SelectItem>))}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label className="text-xs">KG&apos;s *</Label><Input type="number" step="0.01" value={product.kg} onChange={(e) => update(index, "kg", e.target.value)} required /></div>
          <div className="space-y-1">
            <Label className="text-xs">Batch Code</Label>
            <Select value={product.batchCode} onValueChange={(v) => update(index, "batchCode", v)} disabled={!product.productType}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {getAvailableBatches(product.productType).map((batch) => (
                  <SelectItem key={batch.batchCode} value={batch.batchCode}>{batch.batchCode} ({batch.quantity}kg)</SelectItem>
                ))}
                {/* When editing, the saved batch may no longer be in factory stock — keep it selectable */}
                {product.batchCode && !getAvailableBatches(product.productType).some((b) => b.batchCode === product.batchCode) && (
                  <SelectItem value={product.batchCode}>{product.batchCode} (saved)</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label className="text-xs">Notes</Label><Input value={product.notes} onChange={(e) => update(index, "notes", e.target.value)} /></div>
          <div className="flex items-end">
            <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" disabled={products.length <= 1} onClick={() => removeAt(onChange, index)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => onChange((prev) => [...prev, emptyBulk()])}>
        <Plus className="h-4 w-4 mr-1" />Add More Product Input
      </Button>
    </div>
  )
}
