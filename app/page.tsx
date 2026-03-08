"use client"

import * as React from "react"
import { Menu, LogOut } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

import { AuthProvider, useAuth } from "@/lib/auth"
import { logAction } from "@/lib/audit-log"
import { Sidebar } from "@/components/sidebar"
import { Dashboard } from "@/components/dashboard"
import { LoginScreen } from "@/components/login-screen"
import { ReceivalForm } from "@/components/receival-form"
import { ProcessingForms } from "@/components/processing-forms"
import { OutgoingForm } from "@/components/outgoing-form"
import { InventoryTable } from "@/components/inventory-table"
import { RecordsTable } from "@/components/records-table"
import { OrderManagement } from "@/components/order-management"
import { AuditLogView } from "@/components/audit-log-view"
import { AssistantChat } from "@/components/assistant-chat"
import { generateId } from "@/lib/utils"
import { SAMPLE_INVENTORY, SAMPLE_RECORDS, SAMPLE_ORDERS_DATA } from "@/lib/constants"
import type { InventoryItem, TransactionRecord, BulkProduct, FinishedProduct, Order } from "@/lib/types"

export default function HempTraceabilityDashboard() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

function AppContent() {
  const { user, logout, isAdmin } = useAuth()

  const [activeSection, setActiveSection] = React.useState("dashboard")
  const [inventory, setInventory] = React.useState<InventoryItem[]>([...SAMPLE_INVENTORY])
  const [records, setRecords] = React.useState<TransactionRecord[]>([...SAMPLE_RECORDS])
  const [orders, setOrders] = React.useState<Order[]>([...SAMPLE_ORDERS_DATA])
  const [sidebarOpen, setSidebarOpen] = React.useState(true)
  const [message, setMessage] = React.useState("")
  const [messageOpen, setMessageOpen] = React.useState(false)
  const [itemToDelete, setItemToDelete] = React.useState<InventoryItem | null>(null)
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [confirmAction, setConfirmAction] = React.useState<{ title: string; description: string; onConfirm: () => void } | null>(null)

  if (!user) return <LoginScreen />

  const showMessage = (msg: string) => {
    setMessage(msg)
    setMessageOpen(true)
  }

  const activeInventory = inventory.filter((item) => !item.deleted)

  const handleReceivalSubmit = (formData: {
    date: string
    supplier: string
    productType: string
    batchCode: string
    quantity: string
    location: string
  }) => {
    const newItem: InventoryItem = {
      id: generateId("INV"),
      productType: formData.productType || "Whole Seeds",
      batchCode: formData.batchCode,
      quantity: Number.parseFloat(formData.quantity),
      location: formData.location || "Factory",
      lastUpdated: new Date().toISOString(),
    }
    const newRecord: TransactionRecord = {
      id: generateId("REC"),
      type: "Receival",
      date: formData.date,
      productType: newItem.productType,
      batchCode: formData.batchCode,
      quantity: newItem.quantity,
      supplier: formData.supplier,
      status: "Completed",
    }
    setInventory((prev) => [...prev, newItem])
    setRecords((prev) => [...prev, newRecord])
    logAction(user.name, user.role, "Created Receival", formData.batchCode, `${formData.productType || "Whole Seeds"} — ${formData.quantity} kg from ${formData.supplier || "unknown supplier"} at ${formData.location || "Factory"}`)
    showMessage("Receival record added successfully!")
  }

  const handleProcessingSubmit = (
    formData: { date: string; batchId: string; staffCount: string; staffNames: string },
    processType: string,
    bulkProducts: BulkProduct[],
    finishedProducts: FinishedProduct[]
  ) => {
    const doProcess = () => {
      const newInventoryItems: InventoryItem[] = []

      if (processType === "dehulling") {
        finishedProducts.forEach((product, index) => {
          const entries: { field: keyof FinishedProduct; type: string; suffix: string }[] = [
            { field: "hearts", type: "Hemp Hearts", suffix: "H" },
            { field: "hulls", type: "Hemp Hulls", suffix: "HL" },
            { field: "lights", type: "Hemp Lights", suffix: "L" },
            { field: "overs", type: "Overs", suffix: "O" },
          ]
          entries.forEach(({ field, type, suffix }) => {
            const value = product[field]
            if (value && Number.parseFloat(value) > 0) {
              newInventoryItems.push({
                id: generateId("INV"),
                productType: type,
                batchCode: `${formData.batchId}-${suffix}${index + 1}`,
                quantity: Number.parseFloat(value),
                location: "Factory",
                lastUpdated: new Date().toISOString(),
              })
            }
          })
        })
      } else if (processType === "pressing") {
        finishedProducts.forEach((product, index) => {
          if (product.oil && Number.parseFloat(product.oil) > 0) {
            newInventoryItems.push({
              id: generateId("INV"),
              productType: "Hemp Oil",
              batchCode: `${formData.batchId}-OIL${index + 1}`,
              quantity: Number.parseFloat(product.oil),
              location: "Factory",
              lastUpdated: new Date().toISOString(),
            })
          }
          if (product.mealProteinKg && Number.parseFloat(product.mealProteinKg) > 0) {
            const productType = product.mealProtein === "protein" ? "Hemp Protein 65" : "Hemp Meal"
            newInventoryItems.push({
              id: generateId("INV"),
              productType,
              batchCode: `${formData.batchId}-${product.mealProtein?.toUpperCase() || "MEAL"}${index + 1}`,
              quantity: Number.parseFloat(product.mealProteinKg),
              location: "Factory",
              lastUpdated: new Date().toISOString(),
            })
          }
        })
      }

      bulkProducts.forEach((product) => {
        if (product.kg && Number.parseFloat(product.kg) > 0) {
          setInventory((prev) =>
            prev.map((item) =>
              item.batchCode === product.batchCode
                ? { ...item, quantity: Math.max(0, item.quantity - Number.parseFloat(product.kg)), lastUpdated: new Date().toISOString() }
                : item
            )
          )
        }
      })

      setInventory((prev) => [...prev, ...newInventoryItems])

      const totalKg = bulkProducts.reduce((sum, p) => sum + (Number.parseFloat(p.kg) || 0), 0)
      const newRecord: TransactionRecord = {
        id: generateId("REC"),
        type: "Processing",
        date: formData.date,
        productType: `${processType.charAt(0).toUpperCase() + processType.slice(1)} Processing`,
        batchCode: formData.batchId,
        quantity: totalKg,
        processor: `${formData.staffNames} (${formData.staffCount} staff)`,
        status: "Completed",
      }
      setRecords((prev) => [...prev, newRecord])
      logAction(user.name, user.role, "Created Processing", formData.batchId, `${processType} — ${totalKg} kg input, ${newInventoryItems.length} outputs created`)
      showMessage(`${processType.charAt(0).toUpperCase() + processType.slice(1)} record saved successfully!`)
    }

    const totalKg = bulkProducts.reduce((sum, p) => sum + (Number.parseFloat(p.kg) || 0), 0)
    setConfirmAction({
      title: `Confirm ${processType.charAt(0).toUpperCase() + processType.slice(1)} Record`,
      description: `This will deduct ${totalKg} kg from input batches and create finished product inventory items. This action is recorded in the audit log.`,
      onConfirm: doProcess,
    })
  }

  const handleInventorySave = (id: string, data: Partial<InventoryItem>) => {
    const item = inventory.find((i) => i.id === id)
    if (!isAdmin) {
      showMessage("Only admins can edit inventory records. Please ask an admin to make this change.")
      return
    }
    setInventory((prev) =>
      prev.map((i) => (i.id === id ? { ...i, ...data, lastUpdated: new Date().toISOString() } : i))
    )
    logAction(user.name, user.role, "Updated Inventory", item?.batchCode || id, `Quantity: ${data.quantity ?? item?.quantity} kg, Location: ${data.location ?? item?.location}`)
    showMessage("Record updated successfully!")
  }

  const handleDeleteRequest = (item: InventoryItem) => {
    if (!isAdmin) {
      showMessage("Only admins can delete inventory items. Please flag this item for an admin to review.")
      return
    }
    setItemToDelete(item)
    setDeleteOpen(true)
  }

  const confirmDelete = () => {
    if (itemToDelete) {
      // Soft delete — mark as deleted but keep the data
      setInventory((prev) =>
        prev.map((item) =>
          item.id === itemToDelete.id
            ? { ...item, deleted: true, deletedAt: new Date().toISOString(), deletedBy: user.name }
            : item
        )
      )
      const newRecord: TransactionRecord = {
        id: generateId("REC"),
        type: "Deletion",
        date: new Date().toISOString().split("T")[0],
        productType: itemToDelete.productType,
        batchCode: itemToDelete.batchCode,
        quantity: itemToDelete.quantity,
        status: "Completed",
      }
      setRecords((prev) => [...prev, newRecord])
      logAction(user.name, user.role, "Deleted Inventory", itemToDelete.batchCode, `Soft-deleted ${itemToDelete.productType} — ${itemToDelete.quantity} kg from ${itemToDelete.location}`)
      showMessage(`Inventory item ${itemToDelete.batchCode} deleted successfully!`)
    }
    setDeleteOpen(false)
    setItemToDelete(null)
  }

  const handleRestore = (item: InventoryItem) => {
    setInventory((prev) =>
      prev.map((i) =>
        i.id === item.id
          ? { ...i, deleted: false, deletedAt: undefined, deletedBy: undefined, lastUpdated: new Date().toISOString() }
          : i
      )
    )
    logAction(user.name, user.role, "Restored Inventory", item.batchCode, `Restored ${item.productType} — ${item.quantity} kg`)
    showMessage(`Inventory item ${item.batchCode} restored!`)
  }

  const renderContent = () => {
    switch (activeSection) {
      case "receival":
        return <ReceivalForm onSubmit={handleReceivalSubmit} onError={showMessage} />
      case "processing":
        return (
          <ProcessingForms
            inventory={activeInventory}
            onSubmit={handleProcessingSubmit}
            onError={showMessage}
            onAdditionalSubmit={() => {
              logAction(user.name, user.role, "Created Processing", "Additional", "Additional processing record submitted")
              showMessage("Additional processing record saved!")
            }}
          />
        )
      case "outgoing":
        return <OutgoingForm onSubmit={() => {
          logAction(user.name, user.role, "Created Outgoing", "Dispatch", "Outgoing goods record submitted")
          showMessage("Outgoing record saved!")
        }} />
      case "orders":
        return (
          <OrderManagement
            orders={orders}
            onOrdersChange={setOrders}
            isAdmin={isAdmin}
            userName={user.name}
            onAuditLog={(action, target, details) => logAction(user.name, user.role, action, target, details)}
            onMessage={showMessage}
          />
        )
      case "inventory":
        return (
          <InventoryTable
            inventory={activeInventory}
            onSave={handleInventorySave}
            onDelete={handleDeleteRequest}
            isAdmin={isAdmin}
            deletedItems={isAdmin ? inventory.filter((i) => i.deleted) : []}
            onRestore={handleRestore}
          />
        )
      case "records":
        return <RecordsTable records={records} />
      case "audit":
        return isAdmin ? <AuditLogView /> : null
      default:
        return <Dashboard inventory={activeInventory} orders={orders} onNavigate={setActiveSection} />
    }
  }

  return (
    <div className="flex h-screen bg-muted/30">
      <Sidebar activeSection={activeSection} onNavigate={setActiveSection} isOpen={sidebarOpen} isAdmin={isAdmin} />

      <main className="flex-1 overflow-auto">
        <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b px-6 py-3 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <Menu className="h-5 w-5" />
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <h1 className="font-semibold text-lg">Hemp Harvests Traceability System</h1>
          <div className="ml-auto flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium leading-tight">{user.name}</p>
              <Badge variant={isAdmin ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
                {user.role}
              </Badge>
            </div>
            <Button variant="ghost" size="icon" onClick={logout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>
        <div className="p-6 max-w-7xl mx-auto">{renderContent()}</div>
      </main>

      <Dialog open={messageOpen} onOpenChange={setMessageOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>System Message</DialogTitle>
            <DialogDescription>{message}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setMessageOpen(false)}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the inventory item &quot;{itemToDelete?.batchCode}&quot; (
              {itemToDelete?.productType}) with {itemToDelete?.quantity}kg from {itemToDelete?.location}.
              The record will be kept and can be restored later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation dialog for critical actions */}
      <AlertDialog open={!!confirmAction} onOpenChange={(open) => { if (!open) setConfirmAction(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmAction?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmAction?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { confirmAction?.onConfirm(); setConfirmAction(null) }}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AssistantChat inventory={activeInventory} records={records} />
    </div>
  )
}
