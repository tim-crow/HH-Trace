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
import type { InventoryItem, BulkProduct, FinishedProduct, AvailableBatch, ProcessingRun, RawMaterialAddData, RawMaterialCleaningData } from "@/lib/types"
import { formatQuantity, roundQuantity } from "@/lib/utils"

interface ProcessingFormsProps {
  inventory: InventoryItem[]
  onSubmit: (
    formData: { date: string; batchId: string; staffCount: string; staffNames: string; notes: string; oilPressType?: string; millingRoute?: string; equipment?: string; sieveDetails?: string },
    processType: string,
    bulkProducts: BulkProduct[],
    finishedProducts: FinishedProduct[],
    onCommitted?: () => void,
  ) => void
  onError: (message: string) => void
  onAdditionalSubmit: () => void
  onRawMaterialAdd: (data: RawMaterialAddData, onCommitted: () => void) => void
  onRawMaterialCleaning: (data: RawMaterialCleaningData, onCommitted: () => void) => void
  /** When set, the form is in "edit existing run" mode and pre-fills with this run */
  editRun?: ProcessingRun | null
  onUpdate?: (
    runId: string,
    formData: { date: string; batchId: string; staffCount: string; staffNames: string; notes: string; oilPressType?: string; millingRoute?: string; equipment?: string; sieveDetails?: string },
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

export function ProcessingForms({ inventory, onSubmit, onError, onAdditionalSubmit, onRawMaterialAdd, onRawMaterialCleaning, editRun, onUpdate, onCancelEdit }: ProcessingFormsProps) {
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

  const rawMaterialInventory = React.useMemo(() => inventory
    .filter((item) => item.productType.startsWith("Raw Material —") && item.quantity > 0)
    .sort((a, b) => a.batchCode.localeCompare(b.batchCode)),
  [inventory])

  const getAvailableBatches = (productType: string): AvailableBatch[] => {
    if (!productType) return []
    const productTypeMap: Record<string, string> = { "whole-seeds": "Whole Seeds", "hulled-seeds": "Hulled Seeds", "hemp-hearts": "Hemp Hearts", "hemp-meal-cake": "Hemp Meal Chips/Pellets (Dark)", "hemp-protein-cake": "Hemp Protein Chips (Light)", lights: "Hemp Lights", overs: "Overs", seconds: "Seconds" }
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
    const outputProductTypes = millingRoute === "protein-65" ? ["Hemp Protein Powder (65)"]
      : millingRoute === "meal-flour" ? ["Hemp Meal Flour"]
        : ["Hemp Protein Powder (50)", "Hemp Fibre Meal (Sand)"]
    if (!isEditing && inventory.some((item) => !item.deleted && item.batchCode === millingBatch.trim() && outputProductTypes.includes(item.productType))) {
      onError(`Output batch ${millingBatch.trim()} already exists for this product. Edit the existing run or use a new output batch code.`)
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

  const millingInputQuantity = roundQuantity(millingBulk.reduce((total, product) => total + (Number.parseFloat(product.kg) || 0), 0))
  const millingOutputQuantity = roundQuantity(
    millingRoute === "protein-65" ? (Number.parseFloat(millingFinished[0]?.protein65) || 0)
      : millingRoute === "meal-flour" ? (Number.parseFloat(millingFinished[0]?.mealFlour) || 0)
        : (Number.parseFloat(millingFinished[0]?.protein50) || 0) + (Number.parseFloat(millingFinished[0]?.fibreMeal) || 0)
  )

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
              : "Record dehulling, pressing, milling, sieving and additional processing activities"}
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
        <TabsList>
          <TabsTrigger value="dehulling" disabled={isEditing && editRun?.processType !== "dehulling"}>Dehulling</TabsTrigger>
          <TabsTrigger value="pressing" disabled={isEditing && editRun?.processType !== "pressing"}>Pressing</TabsTrigger>
          <TabsTrigger value="milling" disabled={isEditing && editRun?.processType !== "milling"}>Milling / Sieving</TabsTrigger>
          <TabsTrigger value="combining" disabled={isEditing && editRun?.processType !== "combining"}>Combine Batches</TabsTrigger>
          <TabsTrigger value="raw-materials" disabled={isEditing}>Raw Materials</TabsTrigger>
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
                productOptions={[{ key: "hulled-seeds", label: "Hulled Seeds" }, { key: "lights", label: "Lights" }, { key: "overs", label: "Overs" }, { key: "seconds", label: "Seconds" }, { key: "whole-seeds", label: "Whole Seeds" }]}
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
                  <div className="grid grid-cols-2 gap-4">
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
                  <div className="grid grid-cols-2 gap-4">
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
