"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, AlertCircle } from "lucide-react"
import { AutocompleteInput } from "@/components/ui/autocomplete-input"
import { HEMP_PRODUCTS, FINISHED_GOODS, BOX_SIZES, PALLET_SIZES, PRODUCT_UNIT_WEIGHTS } from "@/lib/constants"
import { getCustomers, saveCustomer, getFreightCompanies, saveFreightCompany } from "@/lib/remembered-entries"
import type { InventoryItem, Order } from "@/lib/types"

interface ProductLine {
  productType: string
  batchCode: string
  weight: string
  units: string
}

interface OutgoingFormProps {
  inventory: InventoryItem[]
  orders: Order[]
  onSubmit: (products: {productType: string; batchCode: string; weight: number}[], customerName: string, customerAddress: string, freight: string, fromOrderId?: string) => void
  onError: (msg: string) => void
  prefill?: {
    orderId: string
    items: {productType: string; quantity: number; units?: number}[]
    customer: string
    customerAddress: string
    freight?: string
    freightCarrier?: string
  } | null
}

export function OutgoingForm({ inventory, orders, onSubmit, onError, prefill }: OutgoingFormProps) {
  const [products, setProducts] = React.useState<ProductLine[]>([
    { productType: "", batchCode: "", weight: "", units: "" },
  ])
  const [customerName, setCustomerName] = React.useState("")
  const [customerAddress, setCustomerAddress] = React.useState("")
  const [freight, setFreight] = React.useState("")
  const [freightMethod, setFreightMethod] = React.useState<"Courier" | "Auspost" | "Bulk" | "">("")
  const [boxSize, setBoxSize] = React.useState("")
  const [customBoxSize, setCustomBoxSize] = React.useState("")
  const [boxCount, setBoxCount] = React.useState("")
  const [boxWeights, setBoxWeights] = React.useState<number[]>([])
  const [palletSize, setPalletSize] = React.useState("")
  const [palletCount, setPalletCount] = React.useState("")
  const [isPrefilled, setIsPrefilled] = React.useState(false)
  const [selectedOrderId, setSelectedOrderId] = React.useState("")
  const [savedCustomers, setSavedCustomers] = React.useState(getCustomers())
  const [savedFreight, setSavedFreight] = React.useState(getFreightCompanies())

  const openOrders = React.useMemo(
    () => orders.filter((o) => !o.deleted && o.status !== "Completed"),
    [orders]
  )

  const handleOrderSelect = (orderId: string) => {
    setSelectedOrderId(orderId)
    if (!orderId || orderId === "none") {
      setProducts([{ productType: "", batchCode: "", weight: "", units: "" }])
      setCustomerName("")
      setCustomerAddress("")
      setFreightMethod("")
      setFreight("")
      setIsPrefilled(false)
      return
    }
    const order = orders.find((o) => o.id === orderId)
    if (!order) return
    const items = (order.items || []).filter((i) => !i.fulfilled)
    if (items.length > 0) {
      setProducts(
        items.map((item) => ({
          productType: item.productType,
          batchCode: "",
          weight: String(item.quantity),
          units: item.units ? String(item.units) : "",
        }))
      )
    } else {
      setProducts([{ productType: "", batchCode: "", weight: "", units: "" }])
    }
    setCustomerName(order.customer)
    setCustomerAddress(order.customerAddress || "")
    if (order.freight) {
      setFreightMethod(order.freight as "Courier" | "Auspost" | "Bulk")
    }
    if (order.freightCarrier) {
      setFreight(order.freightCarrier)
    }
    setIsPrefilled(true)
  }

  React.useEffect(() => {
    setSavedCustomers(getCustomers())
    setSavedFreight(getFreightCompanies())
  }, [])

  React.useEffect(() => {
    if (prefill) {
      setProducts(
        prefill.items.map((item) => ({
          productType: item.productType,
          batchCode: "",
          weight: String(item.quantity),
          units: item.units ? String(item.units) : "",
        }))
      )
      setCustomerName(prefill.customer)
      setCustomerAddress(prefill.customerAddress)
      setFreight(prefill.freight || "")
      setIsPrefilled(true)
    }
  }, [prefill])

  const totalProductKg = React.useMemo(
    () => products.reduce((sum, p) => sum + (parseFloat(p.weight) || 0), 0),
    [products]
  )

  const handleBoxCountChange = (count: string) => {
    setBoxCount(count)
    const n = parseInt(count) || 0
    if (n > 0 && totalProductKg > 0) {
      const perBox = Math.round((totalProductKg / n) * 100) / 100
      setBoxWeights(Array(n).fill(perBox))
    } else {
      setBoxWeights([])
    }
  }

  const updateBoxWeight = (index: number, value: string) => {
    setBoxWeights((prev) => {
      const updated = [...prev]
      updated[index] = parseFloat(value) || 0
      return updated
    })
  }

  const customerNames = React.useMemo(() => savedCustomers.map((c) => c.name), [savedCustomers])

  const handleCustomerSelect = (name: string) => {
    const found = savedCustomers.find((c) => c.name.toLowerCase() === name.toLowerCase())
    if (found?.address) {
      setCustomerAddress(found.address)
    }
  }

  const getAvailableStock = React.useCallback(
    (batchCode: string) => {
      return inventory
        .filter((item) => item.batchCode === batchCode && !item.deleted)
        .reduce((sum, item) => sum + item.quantity, 0)
    },
    [inventory]
  )

  const getBatchCodesForProduct = React.useCallback(
    (productType: string) => {
      const items = inventory.filter(
        (item) => item.productType === productType && !item.deleted && item.quantity > 0
      )
      const map = new Map<string, number>()
      for (const item of items) {
        map.set(item.batchCode, (map.get(item.batchCode) || 0) + item.quantity)
      }
      return Array.from(map.entries()).map(([code, qty]) => ({
        label: `${code} (${qty} kg available)`,
        value: code,
        qty,
      }))
    },
    [inventory]
  )

  const stockErrors = React.useMemo(() => {
    return products.map((p) => {
      if (!p.batchCode || !p.weight) return null
      const requested = parseFloat(p.weight)
      if (isNaN(requested) || requested <= 0) return null
      const available = getAvailableStock(p.batchCode)
      if (requested > available) {
        return `Exceeds available stock (${available} kg available)`
      }
      return null
    })
  }, [products, getAvailableStock])

  const handleSubmit = () => {
    const errors = products
      .map((p, i) => {
        if (!p.batchCode || !p.weight) return null
        const requested = parseFloat(p.weight)
        const available = getAvailableStock(p.batchCode)
        if (requested > available) {
          return `Line ${i + 1}: Batch ${p.batchCode} requires ${requested} kg but only ${available} kg available`
        }
        return null
      })
      .filter(Boolean)

    if (errors.length > 0) {
      onError(errors.join("; "))
      return
    }

    if (customerName.trim()) {
      saveCustomer(customerName, customerAddress)
      setSavedCustomers(getCustomers())
    }
    if (freight.trim()) {
      saveFreightCompany(freight)
      setSavedFreight(getFreightCompanies())
    }

    let formattedFreight = ""
    if (freightMethod === "Courier" || freightMethod === "Auspost") {
      const resolvedBoxSize = boxSize === "Other" ? customBoxSize : boxSize
      const packagingDetail = resolvedBoxSize && boxCount ? ` (${resolvedBoxSize} x${boxCount})` : ""
      const weightsDetail = boxWeights.length > 0 ? ` [${boxWeights.map((w, i) => `Box${i + 1}:${w}kg`).join(", ")}]` : ""
      formattedFreight = `${freightMethod}${packagingDetail}${weightsDetail}`
    } else if (freightMethod === "Bulk") {
      const packagingDetail = palletSize && palletCount ? ` (${palletSize} pallet x${palletCount})` : ""
      formattedFreight = `Bulk - ${freight}${packagingDetail}`
    } else {
      formattedFreight = freight
    }

    const resolvedOrderId = selectedOrderId && selectedOrderId !== "none" ? selectedOrderId : undefined
    onSubmit(
      products.map((p) => ({
        productType: p.productType,
        batchCode: p.batchCode,
        weight: parseFloat(p.weight) || 0,
      })),
      customerName,
      customerAddress,
      formattedFreight,
      resolvedOrderId
    )
  }

  const addProduct = () => {
    setProducts((prev) => [...prev, { productType: "", batchCode: "", weight: "", units: "" }])
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
      {isPrefilled && (
        <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Pre-filled from order — edit quantities or remove items before submitting
        </div>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Outgoing Goods Log</CardTitle>
          <CardDescription>Record products being shipped to customers</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date of Dispatch</Label>
              <Input type="date" className="max-w-xs" />
            </div>
            {openOrders.length > 0 && (
              <div className="space-y-2">
                <Label>Fill from Order (optional)</Label>
                <Select value={selectedOrderId} onValueChange={handleOrderSelect}>
                  <SelectTrigger><SelectValue placeholder="Select an order..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Manual entry —</SelectItem>
                    {openOrders.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.orderNumber} — {o.customer}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="space-y-4">
            <h4 className="text-sm font-semibold">Product Details</h4>
            {products.map((product, index) => {
              const batchOptions = getBatchCodesForProduct(product.productType)
              const batchSuggestions = batchOptions.map((b) => b.label)
              return (
                <div key={index} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-3 p-4 border rounded-lg bg-muted/50">
                  <div className="space-y-1">
                    <Label className="text-xs">Product Type</Label>
                    <Select
                      value={product.productType}
                      onValueChange={(v) => {
                        updateProduct(index, "productType", v)
                        updateProduct(index, "batchCode", "")
                        updateProduct(index, "weight", "")
                        updateProduct(index, "units", "")
                      }}
                    >
                      <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                      <SelectContent>
                        {[...HEMP_PRODUCTS, ...FINISHED_GOODS].map((p) => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Batch Code</Label>
                    <AutocompleteInput
                      placeholder="Enter batch code"
                      value={product.batchCode}
                      onChange={(v) => updateProduct(index, "batchCode", v)}
                      suggestions={batchSuggestions}
                      onSelect={(selected) => {
                        const match = batchOptions.find((b) => b.label === selected)
                        if (match) updateProduct(index, "batchCode", match.value)
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    {product.productType && PRODUCT_UNIT_WEIGHTS[product.productType] ? (
                      <>
                        <Label className="text-xs">Units</Label>
                        <Input
                          type="number"
                          min={0}
                          step="1"
                          value={product.units}
                          onChange={(e) => {
                            const units = e.target.value
                            const computed = units ? String(parseFloat(units) * PRODUCT_UNIT_WEIGHTS[product.productType]) : ""
                            setProducts((prev) => {
                              const updated = [...prev]
                              updated[index] = { ...updated[index], units, weight: computed }
                              return updated
                            })
                          }}
                        />
                        {product.units && (
                          <p className="text-xs text-muted-foreground">= {parseFloat(product.weight || "0").toFixed(1)} kg</p>
                        )}
                      </>
                    ) : (
                      <>
                        <Label className="text-xs">Weight (kg)</Label>
                        <Input type="number" min={0} step="0.01" value={product.weight} onChange={(e) => updateProduct(index, "weight", e.target.value)} />
                      </>
                    )}
                    {stockErrors[index] && (
                      <p className="text-xs text-destructive">{stockErrors[index]}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-destructive"
                      disabled={products.length <= 1}
                      onClick={() => removeProduct(index)}
                      title={isPrefilled ? "Remove — this item will remain unfulfilled on the order" : undefined}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    {isPrefilled && products.length > 1 && (
                      <span className="text-[10px] text-muted-foreground leading-tight text-center">Partial<br/>fulfillment</span>
                    )}
                  </div>
                </div>
              )
            })}
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
            <Label>Freight Method</Label>
            <Select value={freightMethod} onValueChange={(v) => setFreightMethod(v as typeof freightMethod)}>
              <SelectTrigger className="max-w-xs"><SelectValue placeholder="Select freight method" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Courier">Courier</SelectItem>
                <SelectItem value="Auspost">Auspost</SelectItem>
                <SelectItem value="Bulk">Bulk</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {freightMethod === "Bulk" && (
            <div className="space-y-2">
              <Label>Freight Company</Label>
              <AutocompleteInput placeholder="Enter freight company" value={freight} onChange={setFreight} suggestions={savedFreight} />
            </div>
          )}
          {(freightMethod === "Courier" || freightMethod === "Auspost") && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Packaging</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Box Size</Label>
                  <Select value={boxSize} onValueChange={(v) => { setBoxSize(v); if (v !== "Other") setCustomBoxSize("") }}>
                    <SelectTrigger><SelectValue placeholder="Select box size" /></SelectTrigger>
                    <SelectContent>
                      {BOX_SIZES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {boxSize === "Other" && (
                  <div className="space-y-1">
                    <Label className="text-xs">Custom Size (LxWxH cm)</Label>
                    <Input placeholder="e.g. 50x30x20cm" value={customBoxSize} onChange={(e) => setCustomBoxSize(e.target.value)} />
                  </div>
                )}
                <div className="space-y-1">
                  <Label className="text-xs">Number of Boxes</Label>
                  <Input type="number" min={1} value={boxCount} onChange={(e) => handleBoxCountChange(e.target.value)} placeholder="0" />
                </div>
              </div>
              {boxWeights.length > 0 && (
                <div className="space-y-2 mt-3">
                  <Label className="text-xs text-muted-foreground">Weight per box (auto-calculated — editable)</Label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {boxWeights.map((w, i) => (
                      <div key={i} className="space-y-0.5">
                        <Label className="text-[10px] text-muted-foreground">Box {i + 1}</Label>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={w}
                          onChange={(e) => updateBoxWeight(i, e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Total: {boxWeights.reduce((s, w) => s + w, 0).toFixed(2)} kg
                    {Math.abs(boxWeights.reduce((s, w) => s + w, 0) - totalProductKg) > 0.01 && (
                      <span className="text-amber-600 ml-2">
                        (product total: {totalProductKg.toFixed(2)} kg)
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>
          )}
          {freightMethod === "Bulk" && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Packaging</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Pallet Size</Label>
                  <Select value={palletSize} onValueChange={setPalletSize}>
                    <SelectTrigger><SelectValue placeholder="Select pallet size" /></SelectTrigger>
                    <SelectContent>
                      {PALLET_SIZES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Number of Pallets</Label>
                  <Input type="number" min={1} value={palletCount} onChange={(e) => setPalletCount(e.target.value)} placeholder="0" />
                </div>
              </div>
            </div>
          )}
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
