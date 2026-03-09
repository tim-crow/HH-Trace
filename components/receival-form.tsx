"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { AutocompleteInput } from "@/components/ui/autocomplete-input"
import { HEMP_PRODUCTS, LOCATIONS } from "@/lib/constants"
import { getSuppliers, saveSupplier, getOtherLocations, saveOtherLocation } from "@/lib/remembered-entries"

interface ReceivalFormData {
  date: string
  supplier: string
  productType: string
  batchCode: string
  quantity: string
  location: string
  notes: string
}

interface ReceivalFormProps {
  onSubmit: (data: ReceivalFormData) => void
  onError: (message: string) => void
}

export function ReceivalForm({ onSubmit, onError }: ReceivalFormProps) {
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
    onSubmit({ ...form, location: finalLocation })
    setForm({ date: "", supplier: "", productType: "", batchCode: "", quantity: "", location: "", notes: "" })
    setLocationType("")
    setOtherLocation("")
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Receival Entry</h2>
        <p className="text-muted-foreground">Record incoming hemp products and supplier information</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Receival Form</CardTitle>
          <CardDescription>Record details of received hemp products</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
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
              <Select value={form.productType} onValueChange={(v) => updateField("productType", v)}>
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
              <Input id="batch-code" placeholder="Enter batch code" value={form.batchCode} onChange={(e) => updateField("batchCode", e.target.value)} />
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity (kg) *</Label>
              <Input id="quantity" type="number" min={0} step="0.01" value={form.quantity} onChange={(e) => updateField("quantity", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Storage Location</Label>
              <Select value={locationType} onValueChange={handleLocationTypeChange}>
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
    </div>
  )
}
