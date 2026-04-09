"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart3, Package } from "lucide-react"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"

interface ProcessingRun {
  id: string
  date: string
  batchId: string
  processType: string
  totalInputKg: number
  outputs: { productType: string; kg: number }[]
}

const PRODUCT_COLORS: Record<string, string> = {
  "Hemp Hearts": "#16a34a",
  "Hemp Hulls": "#854d0e",
  "Hemp Lights": "#ca8a04",
  "Overs": "#dc2626",
  "Hemp Oil (Raw)": "#059669",
  "Hemp Meal Cake": "#7c3aed",
  "Hemp Protein Cake": "#2563eb",
}

export function ProcessingAnalytics() {
  const [runs, setRuns] = React.useState<ProcessingRun[]>([])
  const [tab, setTab] = React.useState("dehulling")

  React.useEffect(() => {
    supabase
      .from("processing_runs")
      .select("*")
      .order("date", { ascending: true })
      .then(({ data }) => {
        if (data) {
          setRuns(data.map((r: any) => ({
            id: r.id,
            date: r.date,
            batchId: r.batch_id,
            processType: r.process_type,
            totalInputKg: Number(r.total_input_kg),
            outputs: r.outputs || [],
          })))
        }
      })
  }, [])

  const filtered = runs.filter((r) => r.processType === tab)

  // Summary stats
  const totalRuns = filtered.length
  const totalProcessed = filtered.reduce((sum, r) => sum + r.totalInputKg, 0)

  // Per-product yield averages
  const productYields = React.useMemo(() => {
    const totals = new Map<string, { totalKg: number; totalInput: number; count: number }>()
    filtered.forEach((r) => {
      r.outputs.forEach((o) => {
        const existing = totals.get(o.productType) || { totalKg: 0, totalInput: 0, count: 0 }
        existing.totalKg += o.kg
        existing.totalInput += r.totalInputKg
        existing.count += 1
        totals.set(o.productType, existing)
      })
    })
    return [...totals.entries()].map(([product, data]) => ({
      product,
      avgYield: data.totalInput > 0 ? (data.totalKg / data.totalInput) * 100 : 0,
      totalKg: data.totalKg,
      count: data.count,
    })).sort((a, b) => b.avgYield - a.avgYield)
  }, [filtered])

  // Trend data for chart
  const trendData = React.useMemo(() => {
    const byDate = new Map<string, Record<string, number>>()
    filtered.forEach((r) => {
      const dateKey = r.date
      const existing = byDate.get(dateKey) || {}
      r.outputs.forEach((o) => {
        const yieldPct = r.totalInputKg > 0 ? (o.kg / r.totalInputKg) * 100 : 0
        existing[o.productType] = (existing[o.productType] || 0) + yieldPct
      })
      byDate.set(dateKey, existing)
    })
    return [...byDate.entries()].map(([date, products]) => ({
      date,
      ...products,
    }))
  }, [filtered])

  const allProductTypes = React.useMemo(() => {
    const types = new Set<string>()
    filtered.forEach((r) => r.outputs.forEach((o) => types.add(o.productType)))
    return [...types]
  }, [filtered])

  if (runs.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Processing Analytics</h2>
          <p className="text-muted-foreground">Yield analysis and trends from processing operations</p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium">No processing data yet</p>
            <p className="text-sm text-muted-foreground mt-1">Submit dehulling or pressing records to see yield analytics here</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Processing Analytics</h2>
        <p className="text-muted-foreground">Yield analysis and trends from processing operations</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="dehulling">Dehulling</TabsTrigger>
          <TabsTrigger value="pressing">Pressing</TabsTrigger>
        </TabsList>

        <div className="mt-4 space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard label="Total Runs" value={totalRuns.toString()} icon={BarChart3} description={tab} />
            <StatCard label="Total Processed" value={`${totalProcessed.toLocaleString()} kg`} icon={Package} description="total input volume" />
          </div>

          {/* Product Yield Cards */}
          {productYields.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Yield by Product</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {productYields.map((p) => (
                  <Card key={p.product}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium">{p.product}</p>
                        <Badge variant={p.avgYield > 30 ? "success" : p.avgYield > 15 ? "warning" : "destructive"}>
                          {p.avgYield.toFixed(1)}%
                        </Badge>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(p.avgYield, 100)}%`,
                            backgroundColor: PRODUCT_COLORS[p.product] || "#6b7280",
                          }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1.5">{p.totalKg.toFixed(1)} kg from {p.count} run{p.count !== 1 ? "s" : ""}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Trend Chart */}
          {trendData.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Yield Trends</CardTitle>
                <CardDescription>Yield % by product over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} unit="%" />
                      <Tooltip />
                      <Legend />
                      {allProductTypes.map((type) => (
                        <Line
                          key={type}
                          type="monotone"
                          dataKey={type}
                          stroke={PRODUCT_COLORS[type] || "#6b7280"}
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          connectNulls
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Per-Batch Table */}
          <Card>
            <CardHeader>
              <CardTitle>Processing Runs</CardTitle>
              <CardDescription>{filtered.length} run{filtered.length !== 1 ? "s" : ""} recorded</CardDescription>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Batch ID</TableHead>
                    <TableHead className="text-right">Input (kg)</TableHead>
                    {allProductTypes.map((type) => (
                      <TableHead key={type} className="text-right">
                        <div className="text-xs">{type}</div>
                        <div className="text-[10px] text-muted-foreground font-normal">kg / yield%</div>
                      </TableHead>
                    ))}
                    <TableHead className="text-right">Waste %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...filtered].reverse().map((run) => {
                    const totalOut = run.outputs.reduce((s, o) => s + o.kg, 0)
                    const wastePct = run.totalInputKg > 0 ? ((run.totalInputKg - totalOut) / run.totalInputKg) * 100 : 0
                    return (
                      <TableRow key={run.id}>
                        <TableCell className="whitespace-nowrap text-sm">{run.date}</TableCell>
                        <TableCell className="font-mono text-sm font-medium">{run.batchId}</TableCell>
                        <TableCell className="text-right text-sm font-medium">{run.totalInputKg.toFixed(1)}</TableCell>
                        {allProductTypes.map((type) => {
                          const output = run.outputs.find((o) => o.productType === type)
                          if (!output) return <TableCell key={type} className="text-right text-sm text-muted-foreground">—</TableCell>
                          const yieldPct = run.totalInputKg > 0 ? (output.kg / run.totalInputKg) * 100 : 0
                          return (
                            <TableCell key={type} className="text-right text-sm">
                              <span className="font-medium">{output.kg.toFixed(1)}</span>
                              <span className="text-muted-foreground ml-1 text-xs">({yieldPct.toFixed(1)}%)</span>
                            </TableCell>
                          )
                        })}
                        <TableCell className="text-right">
                          <Badge variant={wastePct < 20 ? "success" : wastePct < 30 ? "warning" : "destructive"}>
                            {wastePct.toFixed(1)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </Tabs>
    </div>
  )
}

// ── Stat Card ──────────────────────────────────────────────────────

interface StatCardProps {
  label: string
  value: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  alert?: boolean
}

function StatCard({ label, value, description, icon: Icon, alert }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className={cn("text-2xl font-bold tracking-tight", alert && "text-amber-700")}>{value}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl", alert ? "bg-amber-100" : "bg-muted")}>
            <Icon className={cn("h-5 w-5", alert ? "text-amber-600" : "text-muted-foreground")} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
