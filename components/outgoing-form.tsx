"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2 } from "lucide-react"
import { AutocompleteInput } from "@/components/ui/autocomplete-input"
import { HEMP_PRODUCTS } from "@/lib/constants"
import { getCustomers, saveCustomer, getFreightCompanies, saveFreightCompany } from "@/lib/remembered-entries"

interface ProductLine {
  productType: string
  batchCode: string
  weight: string
}

interface OutgoingFormProps {
  onSubmit: () => void
}

export function OutgoingForm({ onSubmit }: OutgoingFormProps) {
  const [products, setProducts] = React.useState<ProductLine[]>([
    { productType: "", batchCode: "", weight: "" },
  ])
  const [customerName, setCustomerName] = React.useState("")
  const [customerAddress, setCustomerAddress] = React.useState("")
  const [freight, setFreight] = React.useState("")
  const [savedCustomers, setSavedCustomers] = React.useState(getCustomers())
  const [savedFreight, setSavedFreight] = React.useState(getFreightCompanies())

  React.useEffect(() => {
    setSavedCustomers(getCustomers())
    setSavedFreight(getFreightCompanies())
  }, [])

  const customerNames = React.useMemo(() => savedCustomers.map((c) => c.name), [savedCustomers])

  const handleCustomerSelect = (name: string) => {
    const found = savedCustomers.find((c) => c.name.toLowerCase() === name.toLowerCase())
    if (found?.address) {
      setCustomerAddress(found.address)
    }
  }

  const handleSubmit = () => {
    if (customerName.trim()) {
      saveCustomer(customerName, customerAddress)
      setSavedCustomers(getCustomers())
    }
    if (freight.trim()) {
      saveFreightCompany(freight)
      setSavedFreight(getFreightCompanies())
    }
    onSubmit()
  }

  const addProduct = () => {
    setProducts((prev) => [...prev, { productType: "", batchCode: "", weight: "" }])
  }

  const removeProduct = (index: number) => {
    if (products.length <= 1) return
    setProducts((prev) => prev.filter((_, i) => i !== index))
  }

  const updateProduct = (index: number, field: keyof ProductLine, value: string) => {
    setProducts((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Outgoing Goods</h2>
        <p className="text-muted-foreground">Record product dispatch and customer deliveries</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Outgoing Goods Log</CardTitle>
          <CardDescription>Record products being shipped to customers</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>Date of Dispatch</Label>
            <Input type="date" className="max-w-xs" />
          </div>
          <div className="space-y-4">
            <h4 className="text-sm font-semibold">Product Details</h4>
            {products.map((product, index) => (
              <div key={index} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-3 p-4 border rounded-lg bg-muted/50">
                <div className="space-y-1">
                  <Label className="text-xs">Product Type</Label>
                  <Select value={product.productType} onValueChange={(v) => updateProduct(index, "productType", v)}>
                    <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                    <SelectContent>
                      {HEMP_PRODUCTS.filter((p) => p !== "Finished Goods").map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Batch Code</Label>
                  <Input placeholder="Enter batch code" value={product.batchCode} onChange={(e) => updateProduct(index, "batchCode", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Weight (kg)</Label>
                  <Input type="number" min={0} step="0.01" value={product.weight} onChange={(e) => updateProduct(index, "weight", e.target.value)} />
                </div>
                <div className="flex items-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-destructive"
                    disabled={products.length <= 1}
                    onClick={() => removeProduct(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addProduct}>
              <Plus className="h-4 w-4 mr-1" />Add Another Product
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Customer Name</Label>
              <AutocompleteInput placeholder="Enter customer name" value={customerName} onChange={setCustomerName} suggestions={customerNames} onSelect={handleCustomerSelect} />
            </div>
            <div className="space-y-2">
              <Label>Customer Address</Label>
              <Textarea placeholder="Enter delivery address" value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Freight Company</Label>
            <AutocompleteInput placeholder="Enter freight company" value={freight} onChange={setFreight} suggestions={savedFreight} />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox />
            <label className="text-sm">COA meets spec</label>
          </div>
          <Button onClick={handleSubmit}>Add Outgoing Record</Button>
        </CardContent>
      </Card>
    </div>
  )
}
