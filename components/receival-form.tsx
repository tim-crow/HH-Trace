"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AutocompleteInput } from "@/components/ui/autocomplete-input"
import { HEMP_PRODUCTS, LOCATIONS } from "@/lib/constants"
import { getSuppliers, saveSupplier, getOtherLocations, saveOtherLocation } from "@/lib/remembered-entries"
import type { InventoryItem, RawMaterialAddData, RawMaterialCleaningData } from "@/lib/types"
import { formatQuantity, roundQuantity } from "@/lib/utils"

interface ReceivalFormData {
  date: string
  supplier: string
  productType: string
  batchCode: string
  quantity: string
  location: string
  notes: string
  sourceInventoryId?: string
}

interface ReceivalFormProps {
  onSubmit: (data: ReceivalFormData) => boolean
  onError: (message: string) => void
  onRawMaterialAdd: (data: RawMaterialAddData, onCommitted: () => void) => void
  onRawMaterialCleaning: (data: RawMaterialCleaningData, onCommitted: () => void) => void
  inventory: InventoryItem[]
}

export function ReceivalForm({ onSubmit, onError, onRawMaterialAdd, onRawMaterialCleaning, inventory }: ReceivalFormProps) {
  const [form, setForm] = React.useState<ReceivalFormData>({
    date: "",
    supplier: "",
    productType: "",
    batchCode: "",
    quantity: "",
    location: "",
    notes: "",
  })
  const [suppliers, setSuppliers] = React.useState<string[]>([])
  const [locationType, setLocationType] = React.useState("")
  const [otherLocation, setOtherLocation] = React.useState("")
  const [savedLocations, setSavedLocations] = React.useState<string[]>([])
  const [sourceInventoryId, setSourceInventoryId] = React.useState("")
  const [rawDate, setRawDate] = React.useState("")
  const [rawBatchCode, setRawBatchCode] = React.useState("")
  const [rawQuantity, setRawQuantity] = React.useState("")
  const [rawSupplier, setRawSupplier] = React.useState("")
  const [rawStatus, setRawStatus] = React.useState<"Field Dressed" | "Cleaned">("Field Dressed")
  const [rawInfo, setRawInfo] = React.useState("")
  const [rawLocation, setRawLocation] = React.useState("")
  const [cleanDate, setCleanDate] = React.useState("")
  const [cleanLocation, setCleanLocation] = React.useState("")
  const [cleanSourceId, setCleanSourceId] = React.useState("")
  const [cleanInputQuantity, setCleanInputQuantity] = React.useState("")
  const [cleanOutputBatch, setCleanOutputBatch] = React.useState("")
  const [cleanSeedsQuantity, setCleanSeedsQuantity] = React.useState("")
  const [cleanSecondsQuantity, setCleanSecondsQuantity] = React.useState("")
  const [cleanStorageLocation, setCleanStorageLocation] = React.useState("")
  const [cleanInfo, setCleanInfo] = React.useState("")

  const approvedExternalMaterials = React.useMemo(() => inventory
    .filter((item) =>
      !item.deleted &&
      item.location !== "Factory" &&
      item.quantity > 0 &&
      ["Cleaned Seeds", "Seconds", "Raw Material — Cleaned"].includes(item.productType)
    )
    .sort((a, b) => a.batchCode.localeCompare(b.batchCode)),
  [inventory])

  const rawMaterialInventory = React.useMemo(() => inventory
    .filter((item) => item.productType.startsWith("Raw Material —") && item.quantity > 0)
    .sort((a, b) => a.batchCode.localeCompare(b.batchCode)),
  [inventory])

  React.useEffect(() => {
    setSuppliers(getSuppliers())
    setSavedLocations(getOtherLocations())
  }, [])

  const updateField = (field: keyof ReceivalFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleLocationTypeChange = (value: string) => {
    setLocationType(value)
    if (value === "Factory") {
      updateField("location", "Factory")
      setOtherLocation("")
    } else {
      updateField("location", "")
    }
  }

  const handleSubmit = () => {
    if (!form.date || !form.batchCode || !form.quantity) {
      onError("Please fill in all required fields!")
      return
    }
    if (locationType === "Other" && !otherLocation.trim()) {
      onError("Please enter a location name!")
      return
    }
    const finalLocation = locationType === "Other" ? otherLocation.trim() : "Factory"
    if (form.supplier.trim()) {
      saveSupplier(form.supplier)
      setSuppliers(getSuppliers())
    }
    if (locationType === "Other" && otherLocation.trim()) {
      saveOtherLocation(otherLocation)
      setSavedLocations(getOtherLocations())
    }
    const submitted = onSubmit({ ...form, location: finalLocation, sourceInventoryId: sourceInventoryId || undefined })
    if (!submitted) return
    setForm({ date: "", supplier: "", productType: "", batchCode: "", quantity: "", location: "", notes: "" })
    setLocationType("")
    setOtherLocation("")
    setSourceInventoryId("")
  }

  const handleRawMaterialAdd = () => {
    const quantity = roundQuantity(Number.parseFloat(rawQuantity))
    if (!rawDate || !rawBatchCode.trim() || !rawSupplier.trim() || !rawLocation.trim() || !Number.isFinite(quantity) || quantity <= 0) {
      onError("Enter the date, source lot/batch code, positive volume, supplier and storage location.")
      return
    }
    if (inventory.some((item) => item.batchCode === rawBatchCode.trim())) {
      onError(`Batch code ${rawBatchCode.trim()} already exists. Enter a unique source lot or batch code.`)
      return
    }
    onRawMaterialAdd({
      date: rawDate,
      batchCode: rawBatchCode.trim(),
      quantity,
      supplier: rawSupplier.trim(),
      status: rawStatus,
      additionalInfo: rawInfo.trim(),
      storageLocation: rawLocation.trim(),
    }, () => {
      setRawDate(""); setRawBatchCode(""); setRawQuantity(""); setRawSupplier("")
      setRawStatus("Field Dressed"); setRawInfo(""); setRawLocation("")
    })
  }

  const handleRawMaterialCleaning = () => {
    const source = rawMaterialInventory.find((item) => item.id === cleanSourceId)
    const inputQuantity = roundQuantity(Number.parseFloat(cleanInputQuantity))
    const cleanedSeedsQuantity = roundQuantity(Number.parseFloat(cleanSeedsQuantity) || 0)
    const secondsQuantity = roundQuantity(Number.parseFloat(cleanSecondsQuantity) || 0)
    if (!cleanDate || !cleanLocation.trim() || !source || !cleanOutputBatch.trim() || !cleanStorageLocation.trim() || !Number.isFinite(inputQuantity) || inputQuantity <= 0) {
      onError("Enter the date, cleaning location, source batch, positive input volume, output batch and storage location.")
      return
    }
    if (inventory.some((item) => item.batchCode === cleanOutputBatch.trim())) {
      onError(`Batch code ${cleanOutputBatch.trim()} already exists. Enter a unique cleaned batch code.`)
      return
    }
    if (inputQuantity > source.quantity) {
      onError(`${source.batchCode} only has ${formatQuantity(source.quantity)} kg available.`)
      return
    }
    const outputQuantity = roundQuantity(cleanedSeedsQuantity + secondsQuantity)
    if (cleanedSeedsQuantity < 0 || secondsQuantity < 0 || outputQuantity > inputQuantity) {
      onError("Cleaned Seeds and Seconds must be zero or greater and cannot exceed the input volume.")
      return
    }
    if (outputQuantity <= 0) {
      onError("Enter a positive quantity for Cleaned Seeds, Seconds, or both.")
      return
    }
    onRawMaterialCleaning({
      date: cleanDate,
      cleaningLocation: cleanLocation.trim(),
      sourceInventoryId: source.id,
      inputQuantity,
      outputBatchCode: cleanOutputBatch.trim(),
      cleanedSeedsQuantity,
      secondsQuantity,
      storageLocation: cleanStorageLocation.trim(),
      additionalInfo: cleanInfo.trim(),
    }, () => {
      setCleanDate(""); setCleanLocation(""); setCleanSourceId(""); setCleanInputQuantity("")
      setCleanOutputBatch(""); setCleanSeedsQuantity(""); setCleanSecondsQuantity("")
      setCleanStorageLocation(""); setCleanInfo("")
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Receival Entry</h2>
        <p className="text-muted-foreground">Record incoming hemp products and supplier information</p>
      </div>
      <Tabs defaultValue="receival" className="space-y-4">
        <TabsList>
          <TabsTrigger value="receival">Receival</TabsTrigger>
          <TabsTrigger value="raw-materials">Raw Materials</TabsTrigger>
        </TabsList>

        <TabsContent value="receival">
          <Card>
        <CardHeader>
          <CardTitle>Receival Form</CardTitle>
          <CardDescription>Record details of received hemp products</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {approvedExternalMaterials.length > 0 && (
            <div className="space-y-2 rounded-lg border bg-muted/40 p-4">
              <Label>Receive Approved External Material (optional)</Label>
              <Select
                value={sourceInventoryId}
                onValueChange={(id) => {
                  setSourceInventoryId(id)
                  const source = approvedExternalMaterials.find((item) => item.id === id)
                  if (!source) return
                  setForm((previous) => ({
                    ...previous,
                    productType: source.productType === "Raw Material — Cleaned" ? "Cleaned Seeds" : source.productType,
                    batchCode: source.batchCode,
                    quantity: String(source.quantity),
                    location: "Factory",
                  }))
                  setLocationType("Factory")
                  setOtherLocation("")
                }}
              >
                <SelectTrigger><SelectValue placeholder="Select cleaned material from external storage" /></SelectTrigger>
                <SelectContent>
                  {approvedExternalMaterials.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.productType.replace("Raw Material — ", "")} — {item.batchCode} ({formatQuantity(item.quantity)} kg at {item.location})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {sourceInventoryId && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSourceInventoryId("")
                    setForm((previous) => ({ ...previous, productType: "", batchCode: "", quantity: "", location: "" }))
                    setLocationType("")
                  }}
                >
                  Clear external material selection
                </Button>
              )}
              <p className="text-xs text-muted-foreground">Submitting Incoming Goods transfers the received quantity into Factory inventory and leaves any balance at external storage.</p>
            </div>
          )}
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="receival-date">Date of Receival *</Label>
              <Input id="receival-date" type="date" value={form.date} onChange={(e) => updateField("date", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier">Supplier Name</Label>
              <AutocompleteInput id="supplier" placeholder="Enter supplier name" value={form.supplier} onChange={(v) => updateField("supplier", v)} suggestions={suppliers} />
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Product Type</Label>
              <Select value={form.productType} onValueChange={(v) => updateField("productType", v)} disabled={!!sourceInventoryId}>
                <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                <SelectContent>
                  {HEMP_PRODUCTS.map((product) => (
                    <SelectItem key={product} value={product}>{product}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="batch-code">Batch Code *</Label>
              <Input id="batch-code" placeholder="Enter batch code" value={form.batchCode} onChange={(e) => updateField("batchCode", e.target.value)} disabled={!!sourceInventoryId} />
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity (kg) *</Label>
              <Input id="quantity" type="number" min={0} step="0.1" value={form.quantity} onChange={(e) => updateField("quantity", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Storage Location</Label>
              <Select value={locationType} onValueChange={handleLocationTypeChange} disabled={!!sourceInventoryId}>
                <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                <SelectContent>
                  {LOCATIONS.map((location) => (
                    <SelectItem key={location} value={location}>{location}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {locationType === "Other" && (
                <AutocompleteInput placeholder="Enter location name" value={otherLocation} onChange={setOtherLocation} suggestions={savedLocations} />
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" placeholder="Enter any notes or observations" value={form.notes} onChange={(e) => updateField("notes", e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox />
            <label className="text-sm">COA meets spec</label>
          </div>
          <Button onClick={handleSubmit} className="w-full sm:w-auto">
            Submit Receival Record
          </Button>
        </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="raw-materials">
          <Tabs defaultValue="add-raw-material" className="space-y-4">
            <TabsList>
              <TabsTrigger value="add-raw-material">Add Raw Material</TabsTrigger>
              <TabsTrigger value="cleaning">Cleaning</TabsTrigger>
            </TabsList>

            <TabsContent value="add-raw-material">
              <Card>
                <CardHeader>
                  <CardTitle>Add Raw Material</CardTitle>
                  <CardDescription>Record externally stored material before it enters the Factory incoming-goods process</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2"><Label>Date *</Label><Input type="date" value={rawDate} onChange={(event) => setRawDate(event.target.value)} /></div>
                    <div className="space-y-2"><Label>Source Lot / Batch Code *</Label><Input placeholder="e.g. JOHN-2026-01" value={rawBatchCode} onChange={(event) => setRawBatchCode(event.target.value)} /></div>
                    <div className="space-y-2"><Label>Volume (kg) *</Label><Input type="number" min={0} step="0.1" value={rawQuantity} onChange={(event) => setRawQuantity(event.target.value)} /></div>
                    <div className="space-y-2"><Label>Supplier *</Label><Input placeholder="Supplier or farm" value={rawSupplier} onChange={(event) => setRawSupplier(event.target.value)} /></div>
                    <div className="space-y-2">
                      <Label>Status *</Label>
                      <Select value={rawStatus} onValueChange={(value) => setRawStatus(value as "Field Dressed" | "Cleaned")}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="Field Dressed">Field Dressed</SelectItem><SelectItem value="Cleaned">Cleaned</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2"><Label>Storage Location *</Label><Input placeholder="Choose or enter external facility" value={rawLocation} onChange={(event) => setRawLocation(event.target.value)} /></div>
                  </div>
                  <div className="space-y-2"><Label>Additional Information</Label><Textarea value={rawInfo} onChange={(event) => setRawInfo(event.target.value)} /></div>
                  <Button onClick={handleRawMaterialAdd}>Add to Raw Material Inventory</Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="cleaning">
              <Card>
                <CardHeader>
                  <CardTitle>Raw Material Cleaning</CardTitle>
                  <CardDescription>Deduct an externally stored source lot and create traceable Cleaned Seeds and Seconds outputs</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2"><Label>Date *</Label><Input type="date" value={cleanDate} onChange={(event) => setCleanDate(event.target.value)} /></div>
                    <div className="space-y-2"><Label>Cleaning Location *</Label><Input placeholder="Cleaning facility" value={cleanLocation} onChange={(event) => setCleanLocation(event.target.value)} /></div>
                    <div className="space-y-2">
                      <Label>Batch In *</Label>
                      <Select value={cleanSourceId} onValueChange={setCleanSourceId}>
                        <SelectTrigger><SelectValue placeholder="Select raw material lot" /></SelectTrigger>
                        <SelectContent>{rawMaterialInventory.map((item) => <SelectItem key={item.id} value={item.id}>{item.batchCode} — {item.productType.replace("Raw Material — ", "")} ({formatQuantity(item.quantity)} kg at {item.location})</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2"><Label>Input Volume (kg) *</Label><Input type="number" min={0} step="0.1" value={cleanInputQuantity} onChange={(event) => setCleanInputQuantity(event.target.value)} /></div>
                    <div className="space-y-2"><Label>Batch Out *</Label><Input placeholder="New cleaned batch code" value={cleanOutputBatch} onChange={(event) => setCleanOutputBatch(event.target.value)} /></div>
                    <div className="space-y-2"><Label>Output Storage Location *</Label><Input placeholder="Choose or enter facility" value={cleanStorageLocation} onChange={(event) => setCleanStorageLocation(event.target.value)} /></div>
                    <div className="space-y-2"><Label>Cleaned Seeds Produced (kg)</Label><Input type="number" min={0} step="0.1" value={cleanSeedsQuantity} onChange={(event) => setCleanSeedsQuantity(event.target.value)} /></div>
                    <div className="space-y-2"><Label>Seconds Produced (kg)</Label><Input type="number" min={0} step="0.1" value={cleanSecondsQuantity} onChange={(event) => setCleanSecondsQuantity(event.target.value)} /></div>
                  </div>
                  <div className="rounded-lg border bg-muted/50 p-3 text-sm">
                    Cleaning loss: <strong>{formatQuantity(Math.max(0, (Number.parseFloat(cleanInputQuantity) || 0) - (Number.parseFloat(cleanSeedsQuantity) || 0) - (Number.parseFloat(cleanSecondsQuantity) || 0)))} kg</strong>
                  </div>
                  <div className="space-y-2"><Label>Additional Information</Label><Textarea value={cleanInfo} onChange={(event) => setCleanInfo(event.target.value)} /></div>
                  <Button onClick={handleRawMaterialCleaning}>Save Cleaning Record</Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  )
}
