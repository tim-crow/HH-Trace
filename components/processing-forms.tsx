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
import type { InventoryItem, BulkProduct, FinishedProduct, AvailableBatch, ProcessingRun, ProcessingFormData, OilFilteringDetails } from "@/lib/types"
import { formatQuantity, roundQuantity } from "@/lib/utils"

interface ProcessingFormsProps {
  inventory: InventoryItem[]
  onSubmit: (
    formData: ProcessingFormData,
    processType: string,
    bulkProducts: BulkProduct[],
    finishedProducts: FinishedProduct[],
    onCommitted?: () => void,
  ) => void
  onError: (message: string) => void
  onAdditionalSubmit: () => void
  /** When set, the form is in "edit existing run" mode and pre-fills with this run */
  editRun?: ProcessingRun | null
  onUpdate?: (
    runId: string,
    formData: ProcessingFormData,
    processType: string,
    bulkProducts: BulkProduct[],
    finishedProducts: FinishedProduct[],
  ) => void
  onCancelEdit?: () => void
}

const emptyBulk = (): BulkProduct => ({ bag: "", productType: "", kg: "", batchCode: "", notes: "" })
const emptyFinished = (): FinishedProduct => ({ bin: "", hearts: "", hulls: "", lights: "", overs: "", oil: "", mealProtein: "", mealProteinKg: "", protein50: "", protein65: "", fibreMeal: "", mealFlour: "" })
const firstBulk = (): BulkProduct => ({ ...emptyBulk(), bag: "1" })
const firstFinished = (): FinishedProduct => ({ ...emptyFinished(), bin: "1" })
const emptyOilFilteringDetails = (): OilFilteringDetails => ({
  inputNotes: "",
  labelsCheckedByQa: false,
  comments: "",
})

export function ProcessingForms({ inventory, onSubmit, onError, onAdditionalSubmit, editRun, onUpdate, onCancelEdit }: ProcessingFormsProps) {
  // Per-tab state (so dehulling and pressing don't share rows when not editing)
  const [dehullBulk, setDehullBulk] = React.useState<BulkProduct[]>([firstBulk()])
  const [dehullFinished, setDehullFinished] = React.useState<FinishedProduct[]>([firstFinished()])
  const [dehullDate, setDehullDate] = React.useState("")
  const [dehullBatch, setDehullBatch] = React.useState("")
  const [dehullStaffCount, setDehullStaffCount] = React.useState("")
  const [dehullStaffNames, setDehullStaffNames] = React.useState("")
  const [dehullNotes, setDehullNotes] = React.useState("")

  const [pressBulk, setPressBulk] = React.useState<BulkProduct[]>([firstBulk()])
  const [pressFinished, setPressFinished] = React.useState<FinishedProduct[]>([firstFinished()])
  const [pressDate, setPressDate] = React.useState("")
  const [pressBatch, setPressBatch] = React.useState("")
  const [pressStaffCount, setPressStaffCount] = React.useState("")
  const [pressStaffNames, setPressStaffNames] = React.useState("")
  const [pressNotes, setPressNotes] = React.useState("")
  const [pressOilType, setPressOilType] = React.useState("")

  const [filterBulk, setFilterBulk] = React.useState<BulkProduct[]>([{ ...firstBulk(), productType: "hemp-oil-raw" }])
  const [filterFinished, setFilterFinished] = React.useState<FinishedProduct[]>([firstFinished()])
  const [filterDate, setFilterDate] = React.useState("")
  const [filterBatch, setFilterBatch] = React.useState("")
  const [filterStaffCount, setFilterStaffCount] = React.useState("")
  const [filterStaffNames, setFilterStaffNames] = React.useState("")
  const [filterDetails, setFilterDetails] = React.useState<OilFilteringDetails>(emptyOilFilteringDetails)

  const [millingBulk, setMillingBulk] = React.useState<BulkProduct[]>([firstBulk()])
  const [millingFinished, setMillingFinished] = React.useState<FinishedProduct[]>([firstFinished()])
  const [millingDate, setMillingDate] = React.useState("")
  const [millingBatch, setMillingBatch] = React.useState("")
  const [millingStaffCount, setMillingStaffCount] = React.useState("")
  const [millingStaffNames, setMillingStaffNames] = React.useState("")
  const [millingNotes, setMillingNotes] = React.useState("")
  const [millingRoute, setMillingRoute] = React.useState("")
  const [millingEquipment, setMillingEquipment] = React.useState("")
  const [millingSieveDetails, setMillingSieveDetails] = React.useState("")

  const [combineDate, setCombineDate] = React.useState("")
  const [combineProductType, setCombineProductType] = React.useState("")
  const [combineBatch, setCombineBatch] = React.useState("")
  const [combineNotes, setCombineNotes] = React.useState("")
  const [combineSources, setCombineSources] = React.useState<BulkProduct[]>([firstBulk(), { ...emptyBulk(), bag: "2" }])

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
    } else if (editRun.processType === "oil-filtering") {
      setActiveTab("oil-filtering")
      setFilterDate(editRun.date)
      setFilterBatch(editRun.batchId)
      setFilterStaffCount(editRun.staffCount)
      setFilterStaffNames(editRun.staffNames)
      setFilterDetails(editRun.oilFilteringDetails
        ? {
          inputNotes: editRun.oilFilteringDetails.inputNotes || "",
          labelsCheckedByQa: Boolean(editRun.oilFilteringDetails.labelsCheckedByQa),
          comments: editRun.oilFilteringDetails.comments || "",
        }
        : emptyOilFilteringDetails())
      setFilterBulk(editRun.bulkProducts.length
        ? editRun.bulkProducts.map((product) => ({ ...product, productType: "hemp-oil-raw" }))
        : [{ ...firstBulk(), productType: "hemp-oil-raw" }])
      setFilterFinished(editRun.finishedProducts.length ? editRun.finishedProducts.map((p) => ({ ...p })) : [firstFinished()])
    } else if (editRun.processType === "milling") {
      setActiveTab("milling")
      setMillingDate(editRun.date)
      setMillingBatch(editRun.batchId)
      setMillingStaffCount(editRun.staffCount)
      setMillingStaffNames(editRun.staffNames)
      setMillingNotes(editRun.notes)
      setMillingRoute(editRun.millingRoute || "")
      setMillingEquipment(editRun.equipment || "")
      setMillingSieveDetails(editRun.sieveDetails || "")
      setMillingBulk(editRun.bulkProducts.length ? editRun.bulkProducts.map((p) => ({ ...p })) : [emptyBulk()])
      setMillingFinished(editRun.finishedProducts.length ? editRun.finishedProducts.map((p) => ({ ...p })) : [emptyFinished()])
    } else if (editRun.processType === "combining") {
      setActiveTab("combining")
      setCombineDate(editRun.date)
      setCombineBatch(editRun.batchId)
      setCombineNotes(editRun.notes)
      setCombineProductType(editRun.bulkProducts[0]?.productType || "")
      setCombineSources(editRun.bulkProducts.length
        ? editRun.bulkProducts.map((product) => ({ ...product }))
        : [firstBulk(), { ...emptyBulk(), bag: "2" }])
    }
  }, [editRun])

  const combinationProductTypes = React.useMemo(() =>
    [...new Set(inventory.filter((item) => item.quantity > 0 && item.location === "Factory").map((item) => item.productType))]
      .sort((a, b) => a.localeCompare(b)),
  [inventory])

  const getAvailableBatches = (productType: string): AvailableBatch[] => {
    if (!productType) return []
    const productTypeMap: Record<string, string> = { "whole-seeds": "Whole Seeds", "hulled-seeds": "Hemp Hearts", "hemp-hearts": "Hemp Hearts", "hemp-oil-raw": "Hemp Oil (Raw)", "hemp-meal-cake": "Hemp Meal Chips/Pellets (Dark)", "hemp-protein-cake": "Hemp Protein Chips (Light)", lights: "Hemp Lights", overs: "Overs", seconds: "Seconds" }
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
      setDehullBulk([firstBulk()]); setDehullFinished([firstFinished()])
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
      setPressBulk([firstBulk()]); setPressFinished([firstFinished()])
    }
  }
  const handleOilFilteringSubmit = () => {
    if (!filterDate || !filterBatch.trim() || Number.parseInt(filterStaffCount, 10) <= 0 || !filterStaffNames.trim()) {
      onError("Enter the date, output batch and staff details.")
      return
    }
    const completedInputs = filterBulk.filter((product) => product.batchCode && Number.parseFloat(product.kg) > 0)
    if (!completedInputs.length || completedInputs.length !== filterBulk.length) {
      onError("Every raw-oil input row must have a source batch and quantity greater than zero.")
      return
    }
    if (!validateFactoryStock(completedInputs)) return
    const completedOutputs = filterFinished.filter((product) => Number.parseFloat(product.oil) > 0)
    if (!completedOutputs.length || completedOutputs.length !== filterFinished.length) {
      onError("Every finished-product row must have a quantity in litres greater than zero.")
      return
    }

    const formData: ProcessingFormData = {
      date: filterDate,
      batchId: filterBatch.trim(),
      staffCount: filterStaffCount,
      staffNames: filterStaffNames.trim(),
      notes: filterDetails.comments,
      oilFilteringDetails: filterDetails,
    }
    if (isEditing && editRun && onUpdate) {
      onUpdate(editRun.id, formData, "oil-filtering", completedInputs, completedOutputs)
    } else {
      onSubmit(formData, "oil-filtering", completedInputs, completedOutputs, () => {
        setFilterDate(""); setFilterBatch(""); setFilterStaffCount(""); setFilterStaffNames("")
        setFilterBulk([{ ...firstBulk(), productType: "hemp-oil-raw" }])
        setFilterFinished([firstFinished()])
        setFilterDetails(emptyOilFilteringDetails())
      })
    }
  }
  const handleMillingSubmit = () => {
    if (!millingDate || !millingBatch.trim() || !millingStaffNames.trim() || !millingRoute || !millingEquipment.trim() || Number.parseInt(millingStaffCount, 10) <= 0) {
      onError("Enter the date, output batch, processing route, equipment and staff details.")
      return
    }
    if (millingRoute === "protein-50" && !millingSieveDetails.trim()) {
      onError("Enter the sieve or screen identification for the Protein 50 route.")
      return
    }
    const completedInputs = millingBulk.filter((product) => product.batchCode && Number.parseFloat(product.kg) > 0)
    if (!completedInputs.length || completedInputs.length !== millingBulk.length) {
      onError("Every milling input row must have a product, source batch and quantity greater than zero.")
      return
    }
    const requiredInputType = millingRoute === "protein-65" ? "hemp-protein-cake" : "hemp-meal-cake"
    if (completedInputs.some((product) => product.productType !== requiredInputType)) {
      onError(`${millingRoute === "protein-65" ? "Protein 65" : "This route"} requires ${millingRoute === "protein-65" ? "Hemp Protein Chips (Light)" : "Hemp Meal Chips/Pellets (Dark)"} input.`)
      return
    }
    if (!validateFactoryStock(completedInputs)) return
    const outputs = millingFinished[0]
    const protein65Quantity = roundQuantity(Number.parseFloat(outputs.protein65 || "0") || 0)
    const protein50Quantity = roundQuantity(Number.parseFloat(outputs.protein50 || "0") || 0)
    const fibreMealQuantity = roundQuantity(Number.parseFloat(outputs.fibreMeal || "0") || 0)
    const mealFlourQuantity = roundQuantity(Number.parseFloat(outputs.mealFlour || "0") || 0)
    const outputQuantity = roundQuantity(millingRoute === "protein-65" ? protein65Quantity
      : millingRoute === "meal-flour" ? mealFlourQuantity
        : protein50Quantity + fibreMealQuantity)
    const inputQuantity = roundQuantity(completedInputs.reduce((total, product) => total + Number.parseFloat(product.kg), 0))
    if (
      (millingRoute === "protein-65" && protein65Quantity <= 0) ||
      (millingRoute === "meal-flour" && mealFlourQuantity <= 0) ||
      (millingRoute === "protein-50" && (protein50Quantity <= 0 || fibreMealQuantity <= 0))
    ) {
      onError(millingRoute === "protein-50"
        ? "Enter positive quantities for both Protein Powder 50 and Fibre Meal (Sand)."
        : "Enter a positive finished-product quantity.")
      return
    }
    if (outputQuantity > inputQuantity) {
      onError(`Outputs cannot exceed the ${formatQuantity(inputQuantity)} kg input quantity.`)
      return
    }
    const formData = {
      date: millingDate,
      batchId: millingBatch.trim(),
      staffCount: millingStaffCount,
      staffNames: millingStaffNames.trim(),
      notes: millingNotes,
      millingRoute,
      equipment: millingEquipment.trim(),
      sieveDetails: millingSieveDetails.trim(),
    }
    if (isEditing && editRun && onUpdate) {
      onUpdate(editRun.id, formData, "milling", completedInputs, millingFinished)
    } else {
      onSubmit(formData, "milling", completedInputs, millingFinished, () => {
        setMillingDate(""); setMillingBatch(""); setMillingStaffCount(""); setMillingStaffNames("")
        setMillingNotes(""); setMillingRoute(""); setMillingEquipment(""); setMillingSieveDetails("")
        setMillingBulk([firstBulk()]); setMillingFinished([firstFinished()])
      })
    }
  }
  const handleCombiningSubmit = () => {
    if (!combineDate || !combineProductType || !combineBatch) {
      onError("Please enter the date, product type and new outgoing batch code.")
      return
    }
    const invalidSource = combineSources.find((source) => {
      const hasBatch = Boolean(source.batchCode)
      const hasQuantity = Boolean(source.kg.trim())
      const quantity = Number.parseFloat(source.kg)
      return (hasBatch || hasQuantity) && (!hasBatch || !Number.isFinite(quantity) || quantity <= 0)
    })
    if (invalidSource) {
      onError("Every source row must have both a batch code and a quantity greater than zero.")
      return
    }
    const completedSources = combineSources.filter((source) => source.batchCode && Number.parseFloat(source.kg) > 0)
    if (new Set(completedSources.map((source) => source.batchCode)).size < 2) {
      onError("Select at least two different source batches to combine.")
      return
    }
    if (new Set(completedSources.map((source) => source.batchCode)).size !== completedSources.length) {
      onError("Each source batch can only be selected once. Combine repeated quantities into one row.")
      return
    }
    if (isEditing && editRun?.processType === "combining" && combineBatch !== editRun.batchId) {
      onError("The outgoing batch code cannot be changed after a combination is created. Reverse and recreate the combination if a different code is required.")
      return
    }
    if (
      inventory.some((item) => !item.deleted && item.batchCode === combineBatch) &&
      !(isEditing && editRun?.processType === "combining" && editRun.batchId === combineBatch)
    ) {
      onError(`Batch code ${combineBatch} already exists. Enter a unique outgoing batch code.`)
      return
    }

    const sources = completedSources.map((source, index) => ({
      ...source,
      bag: String(index + 1),
      productType: combineProductType,
    }))
    const formData = {
      date: combineDate,
      batchId: combineBatch,
      staffCount: "",
      staffNames: "",
      notes: combineNotes,
    }
    if (isEditing && editRun && onUpdate) {
      onUpdate(editRun.id, formData, "combining", sources, [])
    } else {
      onSubmit(formData, "combining", sources, [], () => {
        setCombineDate(""); setCombineProductType(""); setCombineBatch(""); setCombineNotes("")
        setCombineSources([firstBulk(), { ...emptyBulk(), bag: "2" }])
      })
    }
  }
  const millingInputQuantity = roundQuantity(millingBulk.reduce((total, product) => total + (Number.parseFloat(product.kg) || 0), 0))
  const millingOutputQuantity = roundQuantity(
    millingRoute === "protein-65" ? (Number.parseFloat(millingFinished[0]?.protein65) || 0)
      : millingRoute === "meal-flour" ? (Number.parseFloat(millingFinished[0]?.mealFlour) || 0)
        : (Number.parseFloat(millingFinished[0]?.protein50) || 0) + (Number.parseFloat(millingFinished[0]?.fibreMeal) || 0)
  )
  const filteringInputQuantity = roundQuantity(filterBulk.reduce((total, product) => total + (Number.parseFloat(product.kg) || 0), 0))
  const filteringOutputLitres = roundQuantity(filterFinished.reduce((total, product) => total + (Number.parseFloat(product.oil) || 0), 0))

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
              : "Record dehulling, pressing, oil filtering, milling, sieving and additional processing activities"}
          </p>
        </div>
        {isEditing && onCancelEdit && (
          <Button
            size="sm"
            onClick={onCancelEdit}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <X className="h-4 w-4 mr-1" /> Cancel Edit
          </Button>
        )}
      </div>

      {isEditing && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertCircle className="h-4 w-4 shrink-0" />
          You are editing an existing processing record. Saving will reconcile newly added inputs and outputs against the previously saved form.
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="dehulling" disabled={isEditing && editRun?.processType !== "dehulling"}>Dehulling</TabsTrigger>
          <TabsTrigger value="pressing" disabled={isEditing && editRun?.processType !== "pressing"}>Pressing</TabsTrigger>
          <TabsTrigger value="oil-filtering" disabled={isEditing && editRun?.processType !== "oil-filtering"}>Oil Filtering</TabsTrigger>
          <TabsTrigger value="milling" disabled={isEditing && editRun?.processType !== "milling"}>Milling / Sieving</TabsTrigger>
          <TabsTrigger value="combining" disabled={isEditing && editRun?.processType !== "combining"}>Combine Batches</TabsTrigger>
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
                productOptions={[{ key: "whole-seeds", label: "Whole Seeds" }, { key: "overs", label: "Overs" }]}
              />

              <div className="space-y-4">
                <h4 className="text-sm font-semibold">Finished Products (KG)</h4>
                {dehullFinished.map((product, index) => (
                  <div key={index} className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_auto] gap-3 p-4 border rounded-lg bg-muted/50">
                    <div className="space-y-1"><Label className="text-xs">Bin #</Label><Input value={product.bin} onChange={(e) => updateFinished(setDehullFinished, index, "bin", e.target.value)} /></div>
                    <div className="space-y-1"><Label className="text-xs">Hearts</Label><Input type="number" step="0.1" value={product.hearts} onChange={(e) => updateFinished(setDehullFinished, index, "hearts", e.target.value)} /></div>
                    <div className="space-y-1"><Label className="text-xs">Hulls</Label><Input type="number" step="0.1" value={product.hulls} onChange={(e) => updateFinished(setDehullFinished, index, "hulls", e.target.value)} /></div>
                    <div className="space-y-1"><Label className="text-xs">Lights</Label><Input type="number" step="0.1" value={product.lights} onChange={(e) => updateFinished(setDehullFinished, index, "lights", e.target.value)} /></div>
                    <div className="space-y-1"><Label className="text-xs">Overs</Label><Input type="number" step="0.1" value={product.overs} onChange={(e) => updateFinished(setDehullFinished, index, "overs", e.target.value)} /></div>
                    <div className="flex items-end">
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" disabled={dehullFinished.length <= 1} onClick={() => removeAt(setDehullFinished, index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setDehullFinished((p) => [...p, { ...emptyFinished(), bin: nextBin(p) }])}>
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
                    <SelectItem value="florapower-sally">Florapower (Sally)</SelectItem>
                    <SelectItem value="k4-k8">K4/K8 (Kate)</SelectItem>
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
                productOptions={[{ key: "hemp-hearts", label: "Hemp Hearts" }, { key: "lights", label: "Lights" }, { key: "overs", label: "Overs" }, { key: "seconds", label: "Seconds" }, { key: "whole-seeds", label: "Whole Seeds" }]}
              />
              <div className="space-y-4">
                <h4 className="text-sm font-semibold">Finished Products (KG)</h4>
                {pressFinished.map((product, index) => (
                  <div key={index} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-3 p-4 border rounded-lg bg-muted/50">
                    <div className="space-y-1"><Label className="text-xs">Bin #</Label><Input value={product.bin} onChange={(e) => updateFinished(setPressFinished, index, "bin", e.target.value)} /></div>
                    <div className="space-y-1"><Label className="text-xs">Oil</Label><Input type="number" step="0.1" value={product.oil} onChange={(e) => updateFinished(setPressFinished, index, "oil", e.target.value)} /></div>
                    <div className="space-y-1">
                      <Label className="text-xs">Meal/Protein</Label>
                      <Select value={product.mealProtein} onValueChange={(v) => updateFinished(setPressFinished, index, "mealProtein", v)}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent><SelectItem value="meal">MEAL</SelectItem><SelectItem value="protein">PROTEIN</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1"><Label className="text-xs">Meal/Protein KG</Label><Input type="number" step="0.1" value={product.mealProteinKg} onChange={(e) => updateFinished(setPressFinished, index, "mealProteinKg", e.target.value)} /></div>
                    <div className="flex items-end">
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" disabled={pressFinished.length <= 1} onClick={() => removeAt(setPressFinished, index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setPressFinished((p) => [...p, { ...emptyFinished(), bin: nextBin(p) }])}>
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

        <TabsContent value="oil-filtering">
          <Card>
            <CardHeader>
              <CardTitle>Oil Filtering Processing Form</CardTitle>
              <CardDescription>Record raw-oil inputs and filtered-oil outputs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2"><Label>Date *</Label><Input type="date" value={filterDate} onChange={(event) => setFilterDate(event.target.value)} /></div>
                <div className="space-y-2"><Label>Product</Label><Input value="Hemp Oil" disabled /></div>
                <div className="space-y-2"><Label>HH Batch ID *</Label><Input placeholder="Enter filtered oil batch ID" value={filterBatch} onChange={(event) => setFilterBatch(event.target.value)} /></div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2"><Label>Number of Staff *</Label><Input type="number" min={1} value={filterStaffCount} onChange={(event) => setFilterStaffCount(event.target.value)} /></div>
                <div className="space-y-2"><Label>Names of Staff *</Label><Input placeholder="Enter staff names" value={filterStaffNames} onChange={(event) => setFilterStaffNames(event.target.value)} /></div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <h4 className="text-sm font-semibold">Hemp Oil Processed</h4>
                  <span className="text-sm text-muted-foreground">Total: {formatQuantity(filteringInputQuantity)} kg</span>
                </div>
                {filterBulk.map((product, index) => {
                  const availableBatches = getAvailableBatches("hemp-oil-raw")
                  return (
                    <div key={index} className="grid gap-3 rounded-lg border bg-muted/50 p-4 md:grid-cols-[60px_1fr_1fr_auto]">
                      <div className="space-y-1"><Label className="text-xs">#</Label><Input value={index + 1} disabled /></div>
                      <div className="space-y-1">
                        <Label className="text-xs">Raw Oil Batch *</Label>
                        <Select value={product.batchCode} onValueChange={(value) => setFilterBulk((products) => products.map((item, itemIndex) => itemIndex === index ? { ...item, productType: "hemp-oil-raw", batchCode: value } : item))}>
                          <SelectTrigger><SelectValue placeholder="Select source batch" /></SelectTrigger>
                          <SelectContent>
                            {availableBatches.map((batch) => <SelectItem key={batch.batchCode} value={batch.batchCode}>{batch.batchCode} ({formatQuantity(batch.quantity)} kg available)</SelectItem>)}
                            {product.batchCode && !availableBatches.some((batch) => batch.batchCode === product.batchCode) && <SelectItem value={product.batchCode}>{product.batchCode} (saved)</SelectItem>}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1"><Label className="text-xs">Quantity (kg) *</Label><Input type="number" min={0} step="0.1" value={product.kg} onChange={(event) => setFilterBulk((products) => products.map((item, itemIndex) => itemIndex === index ? { ...item, productType: "hemp-oil-raw", kg: event.target.value } : item))} /></div>
                      <div className="flex items-end"><Button variant="ghost" size="icon" className="text-destructive" disabled={filterBulk.length <= 1} onClick={() => removeAt(setFilterBulk, index)}><Trash2 className="h-4 w-4" /></Button></div>
                    </div>
                  )
                })}
                <Button variant="outline" size="sm" disabled={filterBulk.length >= 14} onClick={() => setFilterBulk((products) => [...products, { ...emptyBulk(), bag: String(products.length + 1), productType: "hemp-oil-raw" }])}><Plus className="mr-1 h-4 w-4" />Add Raw Oil Input</Button>
                <div className="space-y-2"><Label>Input Notes</Label><Textarea placeholder="Record source or input observations" value={filterDetails.inputNotes} onChange={(event) => setFilterDetails((details) => ({ ...details, inputNotes: event.target.value }))} /></div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4"><h4 className="text-sm font-semibold">Finished Product</h4><span className="text-sm text-muted-foreground">Total: {formatQuantity(filteringOutputLitres)} L</span></div>
                {filterFinished.map((product, index) => (
                  <div key={index} className="grid gap-3 rounded-lg border bg-muted/50 p-4 md:grid-cols-[60px_1fr_2fr_auto]">
                    <div className="space-y-1"><Label className="text-xs">#</Label><Input value={index + 1} disabled /></div>
                    <div className="space-y-1"><Label className="text-xs">Litres *</Label><Input type="number" min={0} step="0.1" value={product.oil} onChange={(event) => updateFinished(setFilterFinished, index, "oil", event.target.value)} /></div>
                    <div className="space-y-1"><Label className="text-xs">Notes (format, IBC, etc.)</Label><Input placeholder="e.g. IBC 1" value={product.notes || ""} onChange={(event) => updateFinished(setFilterFinished, index, "notes", event.target.value)} /></div>
                    <div className="flex items-end"><Button variant="ghost" size="icon" className="text-destructive" disabled={filterFinished.length <= 1} onClick={() => removeAt(setFilterFinished, index)}><Trash2 className="h-4 w-4" /></Button></div>
                  </div>
                ))}
                <Button variant="outline" size="sm" disabled={filterFinished.length >= 5} onClick={() => setFilterFinished((products) => [...products, { ...emptyFinished(), bin: String(products.length + 1) }])}><Plus className="mr-1 h-4 w-4" />Add Finished Product</Button>
              </div>

              <div className="flex items-center gap-2"><Checkbox checked={filterDetails.labelsCheckedByQa} onCheckedChange={(checked) => setFilterDetails((details) => ({ ...details, labelsCheckedByQa: Boolean(checked) }))} /><Label>Labels Checked by QA Manager</Label></div>
              <div className="space-y-2"><Label>Comments / Corrective Actions</Label><Textarea placeholder="Record comments, deviations or corrective actions" value={filterDetails.comments} onChange={(event) => setFilterDetails((details) => ({ ...details, comments: event.target.value }))} /></div>

              <Button onClick={handleOilFilteringSubmit}>{isEditing ? "Update Oil Filtering Record" : "Submit Oil Filtering Record"}</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="milling">
          <Card>
            <CardHeader>
              <CardTitle>Milling / Sieving Processing Form</CardTitle>
              <CardDescription>Record cake-to-powder processing, batch genealogy, co-products and material reconciliation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Date *</Label><Input type="date" value={millingDate} onChange={(event) => setMillingDate(event.target.value)} /></div>
                <div className="space-y-2"><Label>Output Batch Code *</Label><Input placeholder="Enter finished batch code" value={millingBatch} onChange={(event) => setMillingBatch(event.target.value)} /></div>
              </div>
              <div className="space-y-2">
                <Label>Processing Route *</Label>
                <Select
                  value={millingRoute}
                  disabled={isEditing}
                  onValueChange={(route) => {
                    setMillingRoute(route)
                    setMillingSieveDetails("")
                    const inputType = route === "protein-65" ? "hemp-protein-cake" : "hemp-meal-cake"
                    setMillingBulk((products) => products.map((product) => ({ ...product, productType: inputType, batchCode: "", kg: "" })))
                    setMillingFinished([firstFinished()])
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Select milling route" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="protein-65">Protein 65 — Milling Only</SelectItem>
                    <SelectItem value="protein-50">Protein 50 — Milling and Sieving</SelectItem>
                    <SelectItem value="meal-flour">Meal Flour — Milling Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Number of Staff *</Label><Input type="number" min={1} value={millingStaffCount} onChange={(event) => setMillingStaffCount(event.target.value)} /></div>
                <div className="space-y-2"><Label>Names of Staff *</Label><Input placeholder="Enter staff names" value={millingStaffNames} onChange={(event) => setMillingStaffNames(event.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Mill / Equipment ID *</Label><Input placeholder="Equipment name or identifier" value={millingEquipment} onChange={(event) => setMillingEquipment(event.target.value)} /></div>
                {millingRoute === "protein-50" && (
                  <div className="space-y-2"><Label>Sieve / Screen ID *</Label><Input placeholder="Sieve or screen identification" value={millingSieveDetails} onChange={(event) => setMillingSieveDetails(event.target.value)} /></div>
                )}
              </div>
              <BulkProductSection
                products={millingBulk}
                onChange={setMillingBulk}
                getAvailableBatches={getAvailableBatches}
                productOptions={millingRoute === "protein-65"
                  ? [{ key: "hemp-protein-cake", label: "Hemp Protein Chips (Light)" }]
                  : millingRoute ? [{ key: "hemp-meal-cake", label: "Hemp Meal Chips/Pellets (Dark)" }] : []}
              />
              <div className="space-y-4">
                <h4 className="text-sm font-semibold">Finished Products (KG)</h4>
                <div className="grid grid-cols-2 gap-4 rounded-lg border bg-muted/50 p-4">
                  {millingRoute === "protein-65" && (
                    <div className="space-y-2"><Label>Hemp Protein Powder 65 *</Label><Input type="number" min={0} step="0.1" value={millingFinished[0].protein65} onChange={(event) => updateFinished(setMillingFinished, 0, "protein65", event.target.value)} /></div>
                  )}
                  {millingRoute === "protein-50" && (
                    <>
                      <div className="space-y-2"><Label>Hemp Protein Powder 50 *</Label><Input type="number" min={0} step="0.1" value={millingFinished[0].protein50} onChange={(event) => updateFinished(setMillingFinished, 0, "protein50", event.target.value)} /></div>
                      <div className="space-y-2"><Label>Hemp Fibre Meal (Sand) *</Label><Input type="number" min={0} step="0.1" value={millingFinished[0].fibreMeal} onChange={(event) => updateFinished(setMillingFinished, 0, "fibreMeal", event.target.value)} /></div>
                    </>
                  )}
                  {millingRoute === "meal-flour" && (
                    <div className="space-y-2"><Label>Hemp Meal Flour *</Label><Input type="number" min={0} step="0.1" value={millingFinished[0].mealFlour} onChange={(event) => updateFinished(setMillingFinished, 0, "mealFlour", event.target.value)} /></div>
                  )}
                  {!millingRoute && <p className="col-span-2 text-sm text-muted-foreground">Select a processing route to enter finished-product yields.</p>}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 rounded-lg border bg-muted/50 p-3 text-sm">
                <span>Input: <strong>{formatQuantity(millingInputQuantity)} kg</strong></span>
                <span>Outputs: <strong>{formatQuantity(millingOutputQuantity)} kg</strong></span>
                <span>Processing loss: <strong>{formatQuantity(Math.max(0, roundQuantity(millingInputQuantity - millingOutputQuantity)))} kg</strong></span>
              </div>
              <div className="space-y-2"><Label>Notes / Deviations</Label><Textarea placeholder="Equipment, sieve details, observations, waste or corrective actions" value={millingNotes} onChange={(event) => setMillingNotes(event.target.value)} /></div>
              <Button onClick={handleMillingSubmit}>{isEditing ? "Update Milling / Sieving Record" : "Submit Milling / Sieving Record"}</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="combining">
          <Card>
            <CardHeader>
              <CardTitle>Batch Combination Form</CardTitle>
              <CardDescription>Combine quantities from two or more batches of the same product into one outgoing batch code</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Date *</Label>
                  <Input type="date" value={combineDate} onChange={(event) => setCombineDate(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Product Type *</Label>
                  <Select
                    value={combineProductType}
                    onValueChange={(value) => {
                      setCombineProductType(value)
                      setCombineSources((sources) => sources.map((source) => ({ ...source, productType: value, batchCode: "", kg: "" })))
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                    <SelectContent>
                      {combinationProductTypes.map((productType) => (
                        <SelectItem key={productType} value={productType}>{productType}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>New Outgoing Batch Code *</Label>
                  <Input
                    placeholder="Enter unique batch code"
                    value={combineBatch}
                    onChange={(event) => setCombineBatch(event.target.value)}
                    disabled={isEditing}
                  />
                  {isEditing && <p className="text-xs text-muted-foreground">The outgoing batch code is fixed after creation.</p>}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">Source Batches</h4>
                  <span className="text-sm text-muted-foreground">
                    Total: {formatQuantity(combineSources.reduce((sum, source) =>
                      source.batchCode && Number.parseFloat(source.kg) > 0 ? sum + Number.parseFloat(source.kg) : sum,
                    0))} kg
                  </span>
                </div>
                {combineSources.map((source, index) => {
                  const availableBatches = getAvailableBatches(combineProductType)
                    .filter((batch) => batch.batchCode !== combineBatch)
                  return (
                    <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-3 rounded-lg border bg-muted/50 p-4">
                      <div className="space-y-1">
                        <Label className="text-xs">Source Batch *</Label>
                        <Select
                          value={source.batchCode}
                          onValueChange={(value) => setCombineSources((sources) => sources.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, productType: combineProductType, batchCode: value } : item
                          ))}
                          disabled={!combineProductType}
                        >
                          <SelectTrigger><SelectValue placeholder="Select batch" /></SelectTrigger>
                          <SelectContent>
                            {availableBatches.map((batch) => (
                              <SelectItem key={batch.batchCode} value={batch.batchCode}>{batch.batchCode} ({formatQuantity(batch.quantity)} kg available)</SelectItem>
                            ))}
                            {source.batchCode && !availableBatches.some((batch) => batch.batchCode === source.batchCode) && (
                              <SelectItem value={source.batchCode}>{source.batchCode} (saved)</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Quantity Used (kg) *</Label>
                        <Input
                          type="number"
                          min={0}
                          step="0.1"
                          value={source.kg}
                          onChange={(event) => setCombineSources((sources) => sources.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, productType: combineProductType, kg: event.target.value } : item
                          ))}
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-destructive"
                          disabled={combineSources.length <= 2}
                          onClick={() => setCombineSources((sources) => sources.filter((_, itemIndex) => itemIndex !== index))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCombineSources((sources) => [...sources, { ...emptyBulk(), productType: combineProductType, bag: nextBag(sources) }])}
                >
                  <Plus className="mr-1 h-4 w-4" />Add Source Batch
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Reason / Notes</Label>
                <Textarea
                  placeholder="e.g. Customer requires one outgoing batch code"
                  value={combineNotes}
                  onChange={(event) => setCombineNotes(event.target.value)}
                />
              </div>

              <Button onClick={handleCombiningSubmit}>
                {isEditing ? "Update Batch Combination" : "Create Combined Batch"}
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
              <div className="space-y-2"><Label>Input Volume (kg) *</Label><Input type="number" min={0} step="0.1" required /></div>
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

/** Compute the next sequential numeric value for a list of rows, given how to read the field. */
function nextNumber(values: (string | undefined)[]): string {
  const max = values.reduce<number>((acc, v) => {
    const n = parseInt(String(v ?? "").trim(), 10)
    return Number.isFinite(n) && n > acc ? n : acc
  }, 0)
  return String(max + 1)
}

function nextBin(rows: FinishedProduct[]): string {
  return nextNumber(rows.map((r) => r.bin))
}

function nextBag(rows: BulkProduct[]): string {
  return nextNumber(rows.map((r) => r.bag))
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
          <div className="space-y-1"><Label className="text-xs">KG&apos;s *</Label><Input type="number" step="0.1" value={product.kg} onChange={(e) => update(index, "kg", e.target.value)} required /></div>
          <div className="space-y-1">
            <Label className="text-xs">Batch Code</Label>
            <Select value={product.batchCode} onValueChange={(v) => update(index, "batchCode", v)} disabled={!product.productType}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {getAvailableBatches(product.productType).map((batch) => (
                  <SelectItem key={batch.batchCode} value={batch.batchCode}>{batch.batchCode} ({formatQuantity(batch.quantity)}kg)</SelectItem>
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
      <Button variant="outline" size="sm" onClick={() => onChange((prev) => [...prev, { ...emptyBulk(), bag: nextBag(prev) }])}>
        <Plus className="h-4 w-4 mr-1" />Add More Product Input
      </Button>
    </div>
  )
}
