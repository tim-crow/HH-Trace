"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { TransactionRecord } from "@/lib/types"

interface RecordsTableProps {
  records: TransactionRecord[]
}

const typeVariantMap: Record<string, "default" | "success" | "destructive" | "warning" | "secondary"> = {
  Receival: "default",
  Processing: "success",
  Deletion: "destructive",
  Outgoing: "warning",
}

export function RecordsTable({ records }: RecordsTableProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Transaction Records</h2>
        <p className="text-muted-foreground">Complete history of all product movements</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>All receival, processing, and outgoing records</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Batch Code</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Partner</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="text-muted-foreground">{record.date}</TableCell>
                  <TableCell>
                    <Badge variant={typeVariantMap[record.type] || "secondary"}>
                      {record.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{record.productType}</TableCell>
                  <TableCell className="font-mono text-sm">{record.batchCode}</TableCell>
                  <TableCell>{record.quantity} kg</TableCell>
                  <TableCell className="text-muted-foreground">{record.supplier || record.processor || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={record.status === "Completed" ? "success" : "warning"}>
                      {record.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
