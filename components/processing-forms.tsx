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
import { Plus, Trash2 } from "lucide-react"
import { HEMP_PRODUCTS, FINISHED_GOODS, PROCESS_TYPES } from "@/lib/constants"
import type { InventoryItem, BulkProduct, FinishedProduct, AvailableBatch } from "@/lib/types"

interface ProcessingFormsProps {
  inventory: InventoryItem[]
  onSubmit: (formData: { date: string; batchId: string; staffCount: string; staffNames: string }, processType: string, bulkProducts: BulkProduct[], finishedProducts: FinishedProduct[]) => void
  onError: (message: string) => void
  onAdditionalSubmit: () => void
}

export function ProcessingForms({ inventory, onSubmit, onError, onAdditionalSubmit }: ProcessingFormsProps) {
  const [bulkProducts, setBulkProducts] = React.useState<BulkProduct[]>([
    { bag: "", productType: "", kg: "", batchCode: "", notes: "" },
  ])
  const [finishedProducts, setFinishedProducts] = React.useState<FinishedProduct[]>([
    { bin: "", hearts: "", hulls: "", lights: "", overs: "", oil: "", mealProtein: "", mealProteinKg: "" },
  ])
  const [dehullDate, setDehullDate] = React.useState("")
  const [dehullBatch, setDehullBatch] = React.useState("")
  const [dehullStaffCount, setDehullStaffCount] = React.useState("")
  const [dehullStaffNames, setDehullStaffNames] = React.useState("")
  const [pressDate, setPressDate] = React.useState("")
  const [pressBatch, setPressBatch] = React.useState("")
  const [pressStaffCount, setPressStaffCount] = React.useState("")
  const [pressStaffNames, setPressStaffNames] = React.useState("")

  const addBulkProductRow = () => {
    setBulkProducts([...bulkProducts, { bag: "", productType: "", kg: "", batchCode: "", notes: "" }])
  }
  const removeBulkProductRow = (index: number) => {
    if (bulkProducts.length <= 1) return
    setBulkProducts((prev) => prev.filter((_, i) => i !== index))
  }
  const addFinishedProductRow = () => {
    setFinishedProducts([...finishedProducts, { bin: "", hearts: "", hulls: "", lights: "", overs: "", oil: "", mealProtein: "", mealProteinKg: "" }])
  }
  const removeFinishedProductRow = (index: number) => {
    if (finishedProducts.length <= 1) return
    setFinishedProducts((prev) => prev.filter((_, i) => i !== index))
  }
  const updateBulkProduct = (index: number, field: keyof BulkProduct, value: string) => {
    const updated = [...bulkProducts]
    updated[index] = { ...updated[index], [field]: value }
    setBulkProducts(updated)
  }
  const updateFinishedProduct = (index: number, field: keyof FinishedProduct, value: string) => {
    const updated = [...finishedProducts]
    updated[index] = { ...updated[index], [field]: value }
    setFinishedProducts(updated)
  }
  const getAvailableBatches = (productType: string): AvailableBatch[] => {
    if (!productType) return []
    const productTypeMap: Record<string, string> = { "whole-seeds": "Whole Seeds", "hemp-hearts": "Hemp Hearts", lights: "Hemp Lights", overs: "Overs" }
    const displayName = productTypeMap[productType] || productType
    return inventory.filter((item) => item.productType === displayName && item.quantity > 0 && item.location === "Factory").map((item) => ({ batchCode: item.batchCode, quantity: item.quantity, location: item.location }))
  }

  const validateFactoryStock = (): boolean => {
    for (const product of bulkProducts) {
      if (!product.batchCode || !product.kg) continue
      const item = inventory.find((i) => i.batchCode === product.batchCode)
      if (!item) continue
      if (item.location !== "Factory") {
        onError(`Batch ${product.batchCode} is not at Factory (currently at ${item.location}). It must be received at Factory before processing.`)
        return false
      }
      const requestedKg = Number.parseFloat(product.kg)
      if (requestedKg > item.quantity) {
        onError(`Batch ${product.batchCode} only has ${item.quantity} kg available but ${requestedKg} kg was entered.`)
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
    if (!validateFactoryStock()) return
    onSubmit({ date: dehullDate, batchId: dehullBatch, staffCount: dehullStaffCount, staffNames: dehullStaffNames }, "dehulling", bulkProducts, finishedProducts)
  }
  const handlePressingSubmit = () => {
    if (!pressDate || !pressBatch || !pressStaffCount || !pressStaffNames) {
      onError("Please fill in all required fields!")
      return
    }
    if (!validateFactoryStock()) return
    onSubmit({ date: pressDate, batchId: pressBatch, staffCount: pressStaffCount, staffNames: pressStaffNames }, "pressing", bulkProducts, finishedProducts)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Processing Operations</h2>
        <p className="text-muted-foreground">Record dehulling, pressing and additional processing activities</p>
      </div>

      <Tabs defaultValue="dehulling">
        <TabsList>
          <TabsTrigger value="dehulling">Dehulling</TabsTrigger>
          <TabsTrigger value="pressing">Pressing</TabsTrigger>
          <TabsTrigger value="additional">Additional</TabsTrigger>
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

              <BulkProductSection products={bulkProducts} onUpdate={updateBulkProduct} onAdd={addBulkProductRow} onRemove={removeBulkProductRow} getAvailableBatches={getAvailableBatches} productOptions={[{ key: "whole-seeds", label: "Whole Seeds" }]} />

              <div className="space-y-4">
                <h4 className="text-sm font-semibold">Finished Products (KG)</h4>
                {finishedProducts.map((product, index) => (
                  <div key={index} className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_auto] gap-3 p-4 border rounded-lg bg-muted/50">
                    <div className="space-y-1"><Label className="text-xs">Bin #</Label><Input value={product.bin} onChange={(e) => updateFinishedProduct(index, "bin", e.target.value)} /></div>
                    <div className="space-y-1"><Label className="text-xs">Hearts</Label><Input type="number" step="0.01" value={product.hearts} onChange={(e) => updateFinishedProduct(index, "hearts", e.target.value)} /></div>
                    <div className="space-y-1"><Label className="text-xs">Hulls</Label><Input type="number" step="0.01" value={product.hulls} onChange={(e) => updateFinishedProduct(index, "hulls", e.target.value)} /></div>
                    <div className="space-y-1"><Label className="text-xs">Lights</Label><Input type="number" step="0.01" value={product.lights} onChange={(e) => updateFinishedProduct(index, "lights", e.target.value)} /></div>
                    <div className="space-y-1"><Label className="text-xs">Overs</Label><Input type="number" step="0.01" value={product.overs} onChange={(e) => updateFinishedProduct(index, "overs", e.target.value)} /></div>
                    <div className="flex items-end">
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" disabled={finishedProducts.length <= 1} onClick={() => removeFinishedProductRow(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addFinishedProductRow}><Plus className="h-4 w-4 mr-1" />Add More Finished Product Output</Button>
              </div>

              <div className="space-y-2"><Label>Notes (inc. estimated waste)</Label><Textarea placeholder="Enter any notes or observations" /></div>

              <div className="flex items-center gap-2"><Checkbox /><label className="text-sm">COA meets spec</label></div>
              <Button onClick={handleDehullingSubmit}>Submit Dehulling Record</Button>
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
                <Select><SelectTrigger><SelectValue placeholder="Select press type" /></SelectTrigger><SelectContent><SelectItem value="large">LARGE (FLORAPOWER)</SelectItem><SelectItem value="small">SMALL (ZIGGY)</SelectItem></SelectContent></Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Number of Staff *</Label><Input type="number" min={0} required value={pressStaffCount} onChange={(e) => setPressStaffCount(e.target.value)} /></div>
                <div className="space-y-2"><Label>Names of Staff *</Label><Input placeholder="Enter staff names" required value={pressStaffNames} onChange={(e) => setPressStaffNames(e.target.value)} /></div>
              </div>
              <BulkProductSection products={bulkProducts} onUpdate={updateBulkProduct} onAdd={addBulkProductRow} onRemove={removeBulkProductRow} getAvailableBatches={getAvailableBatches} productOptions={[{ key: "hemp-hearts", label: "Hemp Hearts" }, { key: "lights", label: "Lights" }, { key: "overs", label: "Overs" }, { key: "whole-seeds", label: "Whole Seeds" }]} />
              <div className="space-y-4">
                <h4 className="text-sm font-semibold">Finished Products (KG)</h4>
                {finishedProducts.map((product, index) => (
                  <div key={index} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-3 p-4 border rounded-lg bg-muted/50">
                    <div className="space-y-1"><Label className="text-xs">Bin #</Label><Input value={product.bin} onChange={(e) => updateFinishedProduct(index, "bin", e.target.value)} /></div>
                    <div className="space-y-1"><Label className="text-xs">Oil (Raw) KG</Label><Input type="number" step="0.01" value={product.oil} onChange={(e) => updateFinishedProduct(index, "oil", e.target.value)} /></div>
                    <div className="space-y-1">
                      <Label className="text-xs">Cake Type</Label>
                      <Select value={product.mealProtein} onValueChange={(v) => updateFinishedProduct(index, "mealProtein", v)}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent><SelectItem value="meal">Meal Cake</SelectItem><SelectItem value="protein">Protein Cake</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1"><Label className="text-xs">Cake KG</Label><Input type="number" step="0.01" value={product.mealProteinKg} onChange={(e) => updateFinishedProduct(index, "mealProteinKg", e.target.value)} /></div>
                    <div className="flex items-end">
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" disabled={finishedProducts.length <= 1} onClick={() => removeFinishedProductRow(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addFinishedProductRow}><Plus className="h-4 w-4 mr-1" />Add More Finished Product Output</Button>
              </div>
              <div className="space-y-2"><Label>Notes (inc. estimated Waste)</Label><Textarea placeholder="Enter any notes or observations" /></div>
              <div className="flex items-center gap-2"><Checkbox /><label className="text-sm">COA meets spec</label></div>
              <Button onClick={handlePressingSubmit}>Submit Pressing Record</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="additional">
          <AdditionalProcessingForm inventory={inventory} onSubmit={onAdditionalSubmit} onError={onError} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

interface BulkProductSectionProps {
  products: BulkProduct[]
  onUpdate: (index: number, field: keyof BulkProduct, value: string) => void
  onAdd: () => void
  onRemove: (index: number) => void
  getAvailableBatches: (productType: string) => AvailableBatch[]
  productOptions: { key: string; label: string }[]
}

function BulkProductSection({ products, onUpdate, onAdd, onRemove, getAvailableBatches, productOptions }: BulkProductSectionProps) {
  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold">Bulk Product Processed</h4>
      {products.map((product, index) => (
        <div key={index} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-3 p-4 border rounded-lg bg-muted/50">
          <div className="space-y-1">
            <Label className="text-xs">Product Type *</Label>
            <Select value={product.productType} onValueChange={(v) => onUpdate(index, "productType", v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{productOptions.map((opt) => (<SelectItem key={opt.key} value={opt.key}>{opt.label}</SelectItem>))}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Batch Code</Label>
            <Select value={product.batchCode} onValueChange={(v) => onUpdate(index, "batchCode", v)} disabled={!product.productType}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{getAvailableBatches(product.productType).map((batch) => (<SelectItem key={batch.batchCode} value={batch.batchCode}>{batch.batchCode} ({batch.quantity}kg)</SelectItem>))}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label className="text-xs">KG&apos;s *</Label><Input type="number" step="0.01" value={product.kg} onChange={(e) => onUpdate(index, "kg", e.target.value)} required /></div>
          <div className="space-y-1"><Label className="text-xs">Notes</Label><Input value={product.notes} onChange={(e) => onUpdate(index, "notes", e.target.value)} /></div>
          <div className="flex items-end">
            <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" disabled={products.length <= 1} onClick={() => onRemove(index)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={onAdd}><Plus className="h-4 w-4 mr-1" />Add More Product Input</Button>
    </div>
  )
}

// ── Additional Processing Form ─────────────────────────────────────

interface AdditionalProcessingFormProps {
  inventory: InventoryItem[]
  onSubmit: () => void
  onError: (message: string) => void
}

function AdditionalProcessingForm({ inventory, onSubmit, onError }: AdditionalProcessingFormProps) {
  const [date, setDate] = React.useState("")
  const [inputType, setInputType] = React.useState("")
  const [inputBatch, setInputBatch] = React.useState("")
  const [inputVolume, setInputVolume] = React.useState("")
  const [process, setProcess] = React.useState("")
  const [outputType, setOutputType] = React.useState("")
  const [newBatchCode, setNewBatchCode] = React.useState("")
  const [coaMeetsSpec, setCoaMeetsSpec] = React.useState(false)

  const availableBatches = React.useMemo(() => {
    if (!inputType) return []
    return inventory.filter((item) => item.productType === inputType && item.quantity > 0 && item.location === "Factory")
  }, [inputType, inventory])

  const selectedBatch = inventory.find((i) => i.batchCode === inputBatch)
  const maxKg = selectedBatch?.quantity ?? 0

  const handleSubmit = () => {
    if (!date || !inputType || !inputBatch || !inputVolume || !process) {
      onError("Please fill in all required fields!")
      return
    }
    const kg = Number.parseFloat(inputVolume)
    if (kg > maxKg) {
      onError(`Batch ${inputBatch} only has ${maxKg} kg available but ${kg} kg was entered.`)
      return
    }
    onSubmit()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Additional Processing Form</CardTitle>
        <CardDescription>Record additional processing operations (milling, blending, filtering, packing)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label>Date *</Label>
          <Input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Input Type *</Label>
          <Select value={inputType} onValueChange={(v) => { setInputType(v); setInputBatch(""); setInputVolume("") }}>
            <SelectTrigger><SelectValue placeholder="Select input type" /></SelectTrigger>
            <SelectContent>
              {HEMP_PRODUCTS.filter((p) => !["Whole Seeds", "Finished Goods", "Packaging"].includes(p)).map((product) => (
                <SelectItem key={product} value={product}>{product}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Input Batch *</Label>
          <Select value={inputBatch} onValueChange={(v) => { setInputBatch(v); setInputVolume("") }} disabled={!inputType}>
            <SelectTrigger><SelectValue placeholder={inputType ? "Select batch" : "Select input type first"} /></SelectTrigger>
            <SelectContent>
              {availableBatches.map((item) => (
                <SelectItem key={item.batchCode} value={item.batchCode}>
                  {item.batchCode} ({item.quantity} kg available)
                </SelectItem>
              ))}
              {availableBatches.length === 0 && inputType && (
                <SelectItem value="_none" disabled>No batches available</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Input Volume (kg) *{inputBatch && ` — ${maxKg} kg available`}</Label>
          <Input type="number" min={0} max={maxKg} step="0.01" required value={inputVolume} onChange={(e) => setInputVolume(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Process Undertaken *</Label>
          <Select value={process} onValueChange={(v) => { setProcess(v); setOutputType("") }}>
            <SelectTrigger><SelectValue placeholder="Select process" /></SelectTrigger>
            <SelectContent>
              {PROCESS_TYPES.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{process === "Packed" ? "Finished Good *" : "Output Product Type *"}</Label>
          <Select value={outputType} onValueChange={setOutputType}>
            <SelectTrigger><SelectValue placeholder={process === "Packed" ? "Select finished good" : "Select output product"} /></SelectTrigger>
            <SelectContent>
              {process === "Packed"
                ? FINISHED_GOODS.map((product) => (
                    <SelectItem key={product} value={product}>{product}</SelectItem>
                  ))
                : HEMP_PRODUCTS.filter((p) => p !== "Whole Seeds" && p !== "Packaging").map((product) => (
                    <SelectItem key={product} value={product}>{product}</SelectItem>
                  ))
              }
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>New Batch Code</Label>
          <Input placeholder="Enter new batch code for output" value={newBatchCode} onChange={(e) => setNewBatchCode(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <Checkbox checked={coaMeetsSpec} onCheckedChange={(v) => setCoaMeetsSpec(v === true)} />
          <label className="text-sm">COA meets spec</label>
        </div>
        <Button onClick={handleSubmit}>Submit Record</Button>
      </CardContent>
    </Card>
  )
}
