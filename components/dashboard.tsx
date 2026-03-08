"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Package,
  PackageCheck,
  PackageX,
  Warehouse,
  ClipboardList,
  AlertTriangle,
  ArrowRight,
  Plus,
  Leaf,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { getAuditLog } from "@/lib/audit-log"
import type { InventoryItem, Order, OrderStatus } from "@/lib/types"

interface DashboardProps {
  inventory: InventoryItem[]
  orders: Order[]
  onNavigate: (section: string) => void
}

const statusVariant = (status: OrderStatus): "default" | "secondary" | "warning" | "success" => {
  switch (status) {
    case "New": return "secondary"
    case "In Progress": return "warning"
    case "Packed": return "default"
    case "Dispatched": return "success"
    case "Completed": return "success"
    default: return "secondary"
  }
}

export function Dashboard({ inventory, orders, onNavigate }: DashboardProps) {
  const today = new Date().toISOString().split("T")[0]
  const activeOrders = orders.filter((o) => !o.deleted)
  const openOrders = activeOrders.filter((o) => !["Dispatched", "Completed"].includes(o.status))
  const overdueOrders = openOrders.filter((o) => o.dueDate < today)
  const totalKg = inventory.reduce((sum, item) => sum + item.quantity, 0)
  const todayUpdated = inventory.filter((item) => item.lastUpdated.startsWith(today)).length

  // Low stock: aggregate by product type, threshold 50kg — except Packaging which is per-batch at 100 units
  const lowStockAlerts = React.useMemo(() => {
    const alerts: { label: string; sublabel: string; value: number; unit: string }[] = []

    // Packaging: check each batch individually (each batch = different packaging type)
    inventory
      .filter((item) => item.productType === "Packaging" && item.quantity > 0 && item.quantity < 100)
      .forEach((item) => {
        alerts.push({ label: "Packaging", sublabel: item.batchCode, value: item.quantity, unit: "units" })
      })

    // All other products: aggregate total per product type
    const totals = new Map<string, number>()
    inventory
      .filter((item) => item.productType !== "Packaging" && item.quantity > 0)
      .forEach((item) => {
        totals.set(item.productType, (totals.get(item.productType) || 0) + item.quantity)
      })
    totals.forEach((total, productType) => {
      if (total < 50) {
        alerts.push({ label: productType, sublabel: `${total} kg total`, value: total, unit: "kg" })
      }
    })

    return alerts
  }, [inventory])

  const recentAudit = React.useMemo(() => getAuditLog().reverse().slice(0, 5), [])

  // Australian financial quarter ends: Sep 30, Dec 31, Mar 31, Jun 30
  const stocktakeDue = React.useMemo(() => {
    const now = new Date()
    const year = now.getFullYear()
    const quarterEnds = [
      new Date(year, 2, 31),   // Mar 31
      new Date(year, 5, 30),   // Jun 30
      new Date(year, 8, 30),   // Sep 30
      new Date(year, 11, 31),  // Dec 31
      new Date(year + 1, 2, 31), // Mar 31 next year
    ]
    for (const end of quarterEnds) {
      const diff = (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      if (diff >= 0 && diff <= 7) {
        return end.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
      }
    }
    return null
  }, [])

  // Annual recurring notifications — 7-day advance warning
  const annualAlerts = React.useMemo(() => {
    const now = new Date()
    const year = now.getFullYear()
    const alerts: { label: string; detail: string; date: string }[] = []
    const events = [
      { month: 5, day: 19, label: "Annual Refresher Training", detail: "Annual refresher training is due" },
      { month: 7, day: 1, label: "Internal Audits Due", detail: "Internal audits due — see manual for details" },
    ]
    for (const evt of events) {
      const target = new Date(year, evt.month, evt.day)
      let diff = (target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      if (diff < -1) {
        // Already passed this year — check next year
        const nextTarget = new Date(year + 1, evt.month, evt.day)
        diff = (nextTarget.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        if (diff >= 0 && diff <= 7) {
          alerts.push({ label: evt.label, detail: evt.detail, date: nextTarget.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) })
        }
      } else if (diff >= 0 && diff <= 7) {
        alerts.push({ label: evt.label, detail: evt.detail, date: target.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) })
      }
    }
    return alerts
  }, [])

  // Urgent orders: overdue first, then by due date
  const urgentOrders = [...openOrders]
    .sort((a, b) => {
      const aOverdue = a.dueDate < today ? 0 : 1
      const bOverdue = b.dueDate < today ? 0 : 1
      return aOverdue - bOverdue || a.dueDate.localeCompare(b.dueDate)
    })
    .slice(0, 6)

  return (
    <div className="space-y-8">
      {/* Stocktake banner — shows in the week leading up to quarter end */}
      {stocktakeDue && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-900">Stocktake Due on {stocktakeDue}</p>
            <p className="text-xs text-amber-700">End of quarter approaching — please complete a full inventory stocktake</p>
          </div>
        </div>
      )}
      {annualAlerts.map((alert) => (
        <div key={alert.label} className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-900">{alert.label} — {alert.date}</p>
            <p className="text-xs text-amber-700">{alert.detail}</p>
          </div>
        </div>
      ))}

      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <Leaf className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
          <p className="text-muted-foreground">Here&apos;s what&apos;s happening today</p>
        </div>
      </div>

      {/* Stat cards — all clickable */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Open Orders"
          value={openOrders.length.toString()}
          description={`${overdueOrders.length} overdue`}
          icon={ClipboardList}
          onClick={() => onNavigate("orders")}
          alert={overdueOrders.length > 0}
        />
        <StatCard
          label="Total Inventory"
          value={`${totalKg.toLocaleString()} kg`}
          description={`${inventory.length} active batches`}
          icon={Warehouse}
          onClick={() => onNavigate("inventory")}
        />
        <StatCard
          label="Low Stock"
          value={lowStockAlerts.length.toString()}
          description="products below threshold"
          icon={AlertTriangle}
          onClick={() => onNavigate("inventory")}
          alert={lowStockAlerts.length > 0}
        />
        <StatCard
          label="Today's Activity"
          value={todayUpdated.toString()}
          description="batches updated today"
          icon={PackageCheck}
          onClick={() => onNavigate("records")}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Left: Open orders */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Open Orders</h3>
            <Button variant="ghost" size="sm" onClick={() => onNavigate("orders")}>
              View All <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {urgentOrders.map((order) => {
                    const isOverdue = order.dueDate < today
                    return (
                      <TableRow
                        key={order.id}
                        className={cn("cursor-pointer hover:bg-muted/50", isOverdue && "bg-destructive/5")}
                        onClick={() => onNavigate("orders")}
                      >
                        <TableCell className="font-mono text-sm font-medium">{order.orderNumber}</TableCell>
                        <TableCell>{order.customer}</TableCell>
                        <TableCell className={cn("whitespace-nowrap text-sm", isOverdue && "text-destructive font-medium")}>
                          {order.dueDate}
                          {isOverdue && <span className="ml-1 text-[10px]">OVERDUE</span>}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(order.status)}>{order.status}</Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {urgentOrders.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                        No open orders — nice work!
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Low stock alerts */}
          {lowStockAlerts.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Low Stock
              </h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {lowStockAlerts.map((alert, i) => (
                  <Card
                    key={`${alert.label}-${alert.sublabel}-${i}`}
                    className="cursor-pointer hover:shadow-sm transition-shadow"
                    onClick={() => onNavigate("inventory")}
                  >
                    <CardContent className="p-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{alert.label}</p>
                        <p className="text-xs text-muted-foreground">{alert.sublabel}</p>
                      </div>
                      <Badge variant="warning" className="text-xs">{alert.value} {alert.unit}</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar: Recent activity + Quick actions */}
        <div className="space-y-6">
          {/* Quick actions */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Quick Actions</h3>
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start gap-3 h-10" onClick={() => onNavigate("receival")}>
                <Package className="h-4 w-4 text-primary" /> Add Receival
              </Button>
              <Button variant="outline" className="w-full justify-start gap-3 h-10" onClick={() => onNavigate("processing")}>
                <PackageCheck className="h-4 w-4 text-primary" /> Add Processing
              </Button>
              <Button variant="outline" className="w-full justify-start gap-3 h-10" onClick={() => onNavigate("outgoing")}>
                <PackageX className="h-4 w-4 text-primary" /> Record Outgoing
              </Button>
              <Button variant="outline" className="w-full justify-start gap-3 h-10" onClick={() => onNavigate("orders")}>
                <ClipboardList className="h-4 w-4 text-primary" /> View Orders
              </Button>
            </div>
          </div>

          {/* Recent activity */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Recent Activity</h3>
            <Card>
              <CardContent className="p-0">
                {recentAudit.length > 0 ? (
                  <div className="divide-y">
                    {recentAudit.map((entry) => (
                      <div key={entry.id} className="px-3 py-2.5">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-medium">{entry.userName}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(entry.timestamp).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {entry.action} — {entry.target}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No activity yet
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Stat Card ──────────────────────────────────────────────────────

interface StatCardProps {
  label: string
  value: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  onClick: () => void
  alert?: boolean
}

function StatCard({ label, value, description, icon: Icon, onClick, alert }: StatCardProps) {
  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md hover:border-primary/20",
        alert && "border-amber-300 bg-amber-50/30"
      )}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className={cn("text-2xl font-bold tracking-tight", alert && "text-amber-700")}>{value}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <div className={cn(
            "flex h-11 w-11 items-center justify-center rounded-xl",
            alert ? "bg-amber-100" : "bg-muted"
          )}>
            <Icon className={cn("h-5 w-5", alert ? "text-amber-600" : "text-muted-foreground")} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
